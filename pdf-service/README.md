# PDF Conversion Microservice

A Python FastAPI microservice for high-quality PDF to Office document conversions.

## 🚀 Features

- **PDF to Word (.docx)** - Using pdf2docx for best quality conversion
- **PDF to Excel (.xlsx)** - Using pdfplumber and xlsxwriter for extracted text
- **PDF to PowerPoint (.pptx)** - Using pdfplumber and python-pptx text boxes
- **PDF to Word fallback** - Uses text extraction when pdf2docx cannot convert a file
- **FastAPI** - Modern, fast web framework
- **Health checks** - Built-in health monitoring
- **Error handling** - Comprehensive error management

## 📦 Installation

### Prerequisites
- Python 3.9 or higher
- pip package manager

### Setup

1. Navigate to the pdf-service directory:
```bash
cd pdf-service
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the service:
```bash
python app.py
```

Or on Windows:
```bash
start.bat
```

The service will start on `http://localhost:8000`

## 🔧 API Endpoints

### Health Check
```
GET /health
```

### PDF to Word
```
POST /api/pdf-to-word
Content-Type: multipart/form-data
Body: file (PDF)
```

### PDF to Excel
```
POST /api/pdf-to-excel
Content-Type: multipart/form-data
Body: file (PDF)
```

### PDF to PowerPoint
```
POST /api/pdf-to-ppt
Content-Type: multipart/form-data
Body: file (PDF)
```

## 🐳 Docker Deployment

Build the Docker image:
```bash
docker build -t pdf-service .
```

Run the container:
```bash
docker run -p 8000:8000 pdf-service
```

## 🔗 Integration with Node.js

The Node.js server automatically detects and uses the Python microservice:

1. **Automatic health check** - Verifies Python service is available
2. **Primary conversion** - Uses Python service for best quality
3. **Graceful fallback** - Falls back to Node.js solution if Python service unavailable
4. **Error handling** - Comprehensive error management

## 📊 Benefits

### ✅ Advantages over Node.js solutions:

1. **Better PDF handling** - Python libraries are more mature for PDF processing
2. **Professional output** - pdf2docx provides much better formatting
3. **Text extraction** - pdfplumber provides a reliable fallback for selectable text
4. **Layout recovery** - PDF-to-Word uses pdf2docx before falling back to extracted text
5. **Cross-platform** - Runs separately from the Node.js API

### 🎯 Real-world benefits:

- **Better quality where possible** - pdf2docx preserves more layout than the Node fallback
- **Better compatibility** - Files open properly in MS Office applications
- **Faster processing** - Optimized Python libraries
- **Scalable architecture** - Microservice can be scaled independently
- **Easy maintenance** - Clean separation of concerns

## 🔍 Debugging

### Check service status:
```bash
curl http://localhost:8000/health
```

### View logs:
The service provides detailed logging for all conversion operations.

## 🚨 Error Handling

The service includes comprehensive error handling:

- **File validation** - Ensures only PDF files are processed
- **Size limits** - Prevents memory issues with large files
- **Format validation** - Validates output file creation
- **Graceful degradation** - Fallback methods for problematic PDFs
- **Detailed logging** - Complete error tracking

## 📈 Performance

- **Fast processing** - Optimized Python libraries
- **Memory efficient** - Proper cleanup and resource management
- **Concurrent processing** - FastAPI async support
- **Auto-cleanup** - Automatic temporary file cleanup

## 🔧 Configuration

Environment variables:
- `HOST` - Bind host for the service (default: `0.0.0.0`)
- `PORT` - Bind port for the service (default: `8000`)
- `MAX_FILE_SIZE` - Maximum file size limit
- `TEMP_FILE_TTL_SECONDS` - Cleanup age for stale temporary files

### Port already in use

If startup fails with Windows error `10048`, another process is already listening on
the configured port. Check whether the service is already healthy:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

When started with `python app.py`, the service now detects an already-healthy
PDF microservice on the same port and exits cleanly instead of attempting a
second bind.

To intentionally run a second instance on another port:

```powershell
$env:PORT = "8001"
python app.py
```

When using another port, set the Node.js server's `PDF_SERVICE_URL` to the same
address, for example `http://localhost:8001`.

## 🎉 Operational Features

This microservice includes:

- ✅ Comprehensive error handling
- ✅ Resource cleanup
- ✅ Health monitoring
- ✅ Docker support
- ✅ Detailed logging
- ✅ Size limits and stale-file cleanup
- ✅ Converter work moved off the FastAPI event loop
