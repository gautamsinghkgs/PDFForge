from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
import asyncio
from contextlib import asynccontextmanager, suppress
from http.client import HTTPConnection
import json
import logging
import os
import socket
import tempfile
import time
import uuid
from pathlib import Path

from pdf_converter import pdf_to_word, pdf_to_excel, pdf_to_powerpoint

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = Path(tempfile.gettempdir()) / "pdf-service"
TEMP_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(100 * 1024 * 1024)))
TEMP_FILE_TTL_SECONDS = int(os.getenv("TEMP_FILE_TTL_SECONDS", "3600"))


def probe_host_for_bind_host(host):
    if host in {"", "0.0.0.0"}:
        return "127.0.0.1"
    if host == "::":
        return "::1"
    return host


def port_is_in_use(host, port):
    try:
        with socket.create_connection((probe_host_for_bind_host(host), port), timeout=0.5):
            return True
    except OSError:
        return False


def existing_pdf_service_is_healthy(host, port):
    connection = HTTPConnection(probe_host_for_bind_host(host), port, timeout=1)
    try:
        connection.request("GET", "/health")
        response = connection.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        return (
            response.status == 200
            and payload.get("status") == "healthy"
            and payload.get("service") == "pdf-conversion-microservice"
        )
    except (OSError, ValueError):
        return False
    finally:
        connection.close()


def cleanup_path(filepath):
    if filepath:
        Path(filepath).unlink(missing_ok=True)


def sweep_stale_temp_files():
    cutoff = time.time() - TEMP_FILE_TTL_SECONDS
    for filepath in TEMP_DIR.iterdir():
        try:
            if filepath.is_file() and filepath.stat().st_mtime <= cutoff:
                filepath.unlink()
        except OSError:
            logger.warning("Could not remove stale temp file: %s", filepath)


async def sweep_temp_files_periodically():
    while True:
        await asyncio.sleep(min(TEMP_FILE_TTL_SECONDS, 15 * 60))
        await asyncio.to_thread(sweep_stale_temp_files)


@asynccontextmanager
async def lifespan(app: FastAPI):
    sweep_stale_temp_files()
    temp_sweeper = asyncio.create_task(sweep_temp_files_periodically())
    app.state.temp_sweeper = temp_sweeper
    try:
        yield
    finally:
        temp_sweeper.cancel()
        with suppress(asyncio.CancelledError):
            await temp_sweeper


app = FastAPI(title="PDF Conversion Microservice", version="1.0.0", lifespan=lifespan)


def save_upload(upload, destination):
    total = 0
    with open(destination, "wb") as buffer:
        while True:
            chunk = upload.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_FILE_SIZE:
                raise ValueError(f"File exceeds the {MAX_FILE_SIZE // (1024 * 1024)}MB limit")
            buffer.write(chunk)


async def run_converter(converter, input_path, output_path):
    await asyncio.to_thread(lambda: asyncio.run(converter(input_path, output_path)))


async def convert_pdf(file, output_suffix, media_type, converter):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    unique_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{unique_id}_input.pdf"
    output_path = TEMP_DIR / f"{unique_id}_output{output_suffix}"
    download_name = f"PDFForge_{Path(file.filename).stem}{output_suffix}"

    try:
        await asyncio.to_thread(save_upload, file.file, input_path)
        logger.info("Converting PDF: %s -> %s", input_path, output_path)
        await run_converter(converter, input_path, output_path)

        if not output_path.exists() or output_path.stat().st_size <= 0:
            raise RuntimeError("Conversion failed - output file not created")

        return FileResponse(
            path=output_path,
            filename=download_name,
            media_type=media_type,
            background=BackgroundTask(cleanup_path, output_path),
        )
    except ValueError as exc:
        cleanup_path(output_path)
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except HTTPException:
        cleanup_path(output_path)
        raise
    except Exception as exc:
        cleanup_path(output_path)
        logger.exception("PDF conversion failed")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {exc}") from exc
    finally:
        cleanup_path(input_path)

@app.get("/")
async def root():
    return {"message": "PDF Conversion Microservice is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pdf-conversion-microservice"}


@app.post("/api/pdf-to-word")
async def pdf_to_word_endpoint(file: UploadFile = File(...)):
    return await convert_pdf(
        file,
        ".docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        pdf_to_word,
    )


@app.post("/api/pdf-to-excel")
async def pdf_to_excel_endpoint(file: UploadFile = File(...)):
    return await convert_pdf(
        file,
        ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pdf_to_excel,
    )


@app.post("/api/pdf-to-ppt")
async def pdf_to_powerpoint_endpoint(file: UploadFile = File(...)):
    return await convert_pdf(
        file,
        ".pptx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        pdf_to_powerpoint,
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    if port_is_in_use(host, port):
        if existing_pdf_service_is_healthy(host, port):
            logger.info(
                "PDF Conversion Microservice is already running at http://%s:%s; "
                "no second instance was started.",
                probe_host_for_bind_host(host),
                port,
            )
            raise SystemExit(0)
        logger.error(
            "Port %s is already in use by another process. Stop that process or set "
            "PORT to a different value before starting this service.",
            port,
        )
        raise SystemExit(1)

    uvicorn.run(
        app,
        host=host,
        port=port,
    )
