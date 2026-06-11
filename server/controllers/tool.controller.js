/**
 * PDFForge — Local PDF Processing Engine
 * 100% Free, No API Key Required
 *
 * Libraries used:
 *  - pdf-lib      : merge, split, rotate, watermark, page numbers, unlock, jpg→pdf
 *  - archiver     : zip output for split / pdf→jpg
 *  - sharp        : image resize/convert helper
 *  - pdf2pic      : PDF → JPG (uses Ghostscript under the hood)
 *  - tesseract.js : OCR (pure JS, no system install)
 *  - puppeteer    : HTML → PDF
 *  - mammoth      : DOCX → HTML (for docx preview)
 *  - child_process: LibreOffice for office conversions, Ghostscript for compress
 */

'use strict';

const path        = require('path');
const fs          = require('fs');
const dns         = require('dns').promises;
const net         = require('net');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { v4: uuidv4 } = require('uuid');
const archiver    = require('archiver');

const { PDFDocument, degrees, rgb, StandardFonts } = require('pdf-lib');

const History = require('../models/History.model');
const Tool    = require('../models/Tool.model');
const User    = require('../models/User.model');
const { UPLOAD_ROOT } = require('../config/paths');
const { getGhostscriptPath, getLibreOfficePath } = require('../utils/resolveBinaries');
const { runLibreOffice } = require('../utils/libreofficeRun');
const { createDownloadUrl } = require('../utils/downloads');

const errNoGhostscript = () =>
  new Error(
    'Ghostscript not found. It is required for real PDF compression and some other tools.\n\n' +
    'Install: https://www.ghostscript.com/releases/gsdnload.html\n' +
    'After install, ensure gswin64c.exe is on your PATH, or set GHOSTSCRIPT_PATH in server/.env to the full path (e.g. C:\\\\Program Files\\\\gs\\\\gs10.05.0\\\\bin\\\\gswin64c.exe).\n\n' +
    'Note: Without Ghostscript the app can only re-save the PDF (almost no size change).'
  );

const errNoLibreOffice = () =>
  new Error(
    'LibreOffice not found. PDF to Word/Excel/PPT (and reverse) uses LibreOffice in the background.\n\n' +
    'Install: https://www.libreoffice.org/download/\n' +
    'Then restart the server. If it still fails, set LIBREOFFICE_PATH in server/.env to soffice.exe — e.g.\n' +
    'LIBREOFFICE_PATH=C:\\\\Program Files\\\\LibreOffice\\\\program\\\\soffice.exe'
  );

// ─────────────────────────────────────────────────────────────────
// Path helpers
// ─────────────────────────────────────────────────────────────────
const getOutputDir = (userId) => {
  const dir = path.join(UPLOAD_ROOT, userId || 'guest', 'output');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const secureDownloadUrl = (filepath, filename) => createDownloadUrl(filepath, filename);

const cleanupInputFiles = (files) => {
  files.forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* File may already be gone after a failed processor. */
    }
  });
};

const safeStem = (filename = 'output') => {
  const stem = path.basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
  return stem || 'output';
};

const friendlyOutputName = (file, filepath, fallback = 'output') =>
  `PDFForge_${safeStem(file?.originalname || fallback)}${path.extname(filepath)}`;

const badRequest = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

const UNAVAILABLE_TOOLS = new Map([
  ['crop', 'Crop PDF has been removed.'],
  ['edit', 'Edit PDF is not available yet.'],
  ['compare', 'PDF comparison is not available yet.'],
  ['redact', 'Secure PDF redaction is not available yet.'],
  ['sign', 'Electronic signatures are not available yet.'],
  ['ai-summarize', 'AI summarization is not configured yet.'],
  ['ai-translate', 'AI translation is not configured yet.'],
]);

const isPrivateIp = (address) => {
  const ip = String(address || '').toLowerCase();
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return (
    net.isIP(ip) === 6 &&
    (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:'))
  );
};

const assertSafeRemoteUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw badRequest('Enter a valid http:// or https:// webpage URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw badRequest('Only public http:// and https:// webpage URLs are allowed.');
  }

  const addresses = await dns.lookup(parsed.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw badRequest('Private or local network URLs are not allowed.');
  }
  return parsed.toString();
};

// ─────────────────────────────────────────────────────────────────
// pdf-lib helpers
// ─────────────────────────────────────────────────────────────────
const readPDF = async (fp) => {
  const bytes = fs.readFileSync(fp);
  return PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
};

const savePDF = async (doc, outPath) => {
  const bytes = await doc.save({ useObjectStreams: true });
  fs.writeFileSync(outPath, bytes);
};

// ─────────────────────────────────────────────────────────────────
// ZIP helper
// ─────────────────────────────────────────────────────────────────
const createZip = (entries, outPath) =>
  new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const arc    = archiver('zip', { zlib: { level: 9 } });
    arc.pipe(output);
    entries.forEach(({ buffer, name }) => arc.append(buffer, { name }));
    output.on('close', resolve);
    arc.on('error', reject);
    arc.finalize();
  });

const writeJpegCanvasAsPdf = async (jpegBuffer, outPath, width, height) => {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(jpegBuffer);
  const page = doc.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  await savePDF(doc, outPath);
};

// ─────────────────────────────────────────────────────────────────
// OUTPUT EXTENSION MAP
// ─────────────────────────────────────────────────────────────────
const EXT_MAP = {
  'split':        '.zip',
  'pdf-to-word':  '.docx',
  'pdf-to-excel': '.xlsx',
  'pdf-to-ppt':   '.pptx',
  'pdf-to-jpg':   '.zip',
  'jpg-to-pdf':   '.pdf',
  'merge-image':  '.pdf',
  'word-to-pdf':  '.pdf',
  'excel-to-pdf': '.pdf',
  'ppt-to-pdf':   '.pdf',
  'html-to-pdf':  '.pdf',
  'ocr':          '.txt',
};
const getExt = (slug) => EXT_MAP[slug] || '.pdf';

let ocrWorker = null;
let ocrWorkerInitializing = false;
let ocrWorkerLang = null;

const getOcrWorker = async (lang = 'eng') => {
  if (ocrWorker && ocrWorkerLang === lang) return ocrWorker;
  if (ocrWorkerInitializing) {
    // Wait for existing initialization to complete
    while (ocrWorkerInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return getOcrWorker(lang);
  }
  
  ocrWorkerInitializing = true;
  try {
    const Tesseract = require('tesseract.js');
    console.log('🔍 Creating Tesseract OCR worker...');
    if (ocrWorker) await ocrWorker.terminate();
    
    // Use simpler configuration for v5.x
    ocrWorker = await Tesseract.createWorker(lang);
    ocrWorkerLang = lang;
    console.log('✅ Tesseract OCR worker created successfully');
    return ocrWorker;
  } catch (error) {
    console.error('❌ Failed to create OCR worker:', error.message);
    throw new Error(`OCR worker initialization failed: ${error.message}`);
  } finally {
    ocrWorkerInitializing = false;
  }
};

// Helper function with timeout for OCR operations
const recognizeWithTimeout = async (worker, imagePath, timeoutMs = 30000) => {
  return Promise.race([
    worker.recognize(imagePath),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR operation timed out after 30 seconds')), timeoutMs)
    )
  ]);
};

// ─────────────────────────────────────────────────────────────────
// MAIN PROCESSOR — one function per tool
// ─────────────────────────────────────────────────────────────────
async function processLocally(toolSlug, files, outputDir, options) {
  console.log('=== PROCESS LOCALLY STARTED ===');
  console.log('Tool slug:', toolSlug);
  console.log('Files count:', files.length);
  
  const outFilename = `${uuidv4()}${getExt(toolSlug)}`;
  const outPath     = path.join(outputDir, outFilename);
  let   finalPath   = outPath;

  switch (toolSlug) {

    // ─── MERGE ─────────────────────────────────────────────────
    case 'merge': {
      const merged = await PDFDocument.create();
      for (const file of files) {
        try {
          const doc   = await readPDF(file.path);
          const pages = await merged.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        } catch (e) {
          console.warn(`Skipping unreadable file: ${file.originalname} — ${e.message}`);
        }
      }
      if (merged.getPageCount() === 0) throw new Error('No readable PDF pages found in uploaded files.');
      await savePDF(merged, outPath);
      break;
    }

    // ─── SPLIT ─────────────────────────────────────────────────
    case 'split': {
      const doc   = await readPDF(files[0].path);
      const total = doc.getPageCount();
      const raw   = options.splitBy || 'all';
      // UI sends: pages | fixed_range | remove_pages — backend legacy: all | range | extract
      const splitBy =
        raw === 'pages' ? 'all' :
        raw === 'fixed_range' ? 'range' :
        raw === 'remove_pages' ? 'remove' :
        raw;

      const fixedRange = Math.max(1, parseInt(String(options.fixed_range), 10) || 1);

      // Remove listed pages → single PDF (1-based page numbers in remove_pages or pages)
      if (splitBy === 'remove') {
        const spec = (options.remove_pages || options.pages || '').trim();
        const removeIdx = new Set(
          spec.split(',').map(s => parseInt(s.trim(), 10))
            .filter(n => !Number.isNaN(n) && n >= 1 && n <= total)
            .map(n => n - 1)
        );
        if (!removeIdx.size) {
          throw new Error('Enter page numbers to remove (e.g. 1,3,5).');
        }
        const keep = Array.from({ length: total }, (_, i) => i).filter(i => !removeIdx.has(i));
        if (!keep.length) throw new Error('Cannot remove every page.');
        const nd = await PDFDocument.create();
        const copied = await nd.copyPages(doc, keep);
        copied.forEach(p => nd.addPage(p));
        const singleOut = path.join(outputDir, `${uuidv4()}_output.pdf`);
        await savePDF(nd, singleOut);
        finalPath = singleOut;
        break;
      }

      const entries = [];

      if (splitBy === 'all') {
        for (let i = 0; i < total; i++) {
          const single = await PDFDocument.create();
          const [pg]   = await single.copyPages(doc, [i]);
          single.addPage(pg);
          entries.push({ buffer: Buffer.from(await single.save()), name: `page_${String(i+1).padStart(3,'0')}.pdf` });
        }
      } else if (splitBy === 'range') {
        for (let start = 0; start < total; start += fixedRange) {
          const end    = Math.min(start + fixedRange, total);
          const chunk  = await PDFDocument.create();
          const idxs   = Array.from({ length: end - start }, (_, k) => start + k);
          const copied = await chunk.copyPages(doc, idxs);
          copied.forEach(p => chunk.addPage(p));
          const label  = `pages_${start+1}_to_${end}.pdf`;
          entries.push({ buffer: Buffer.from(await chunk.save()), name: label });
        }
      } else {
        const pageNums = (options.pages || '')
          .split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => n >= 0 && n < total);
        if (pageNums.length === 0) {
          for (let i = 0; i < total; i++) {
            const s  = await PDFDocument.create();
            const [p] = await s.copyPages(doc, [i]);
            s.addPage(p);
            entries.push({ buffer: Buffer.from(await s.save()), name: `page_${i+1}.pdf` });
          }
        } else {
          const extracted = await PDFDocument.create();
          const copied    = await extracted.copyPages(doc, pageNums);
          copied.forEach(p => extracted.addPage(p));
          entries.push({ buffer: Buffer.from(await extracted.save()), name: 'extracted_pages.pdf' });
        }
      }

      const zipPath = path.join(outputDir, `${uuidv4()}_split.zip`);
      await createZip(entries, zipPath);
      finalPath = zipPath;
      break;
    }

    // ─── ROTATE ────────────────────────────────────────────────
    case 'rotate': {
      const doc = await readPDF(files[0].path);
      const deg = parseInt(options.angle) || 90;
      doc.getPages().forEach(pg => {
        const current = pg.getRotation().angle;
        pg.setRotation(degrees((current + deg + 360) % 360));
      });
      await savePDF(doc, outPath);
      break;
    }

    // ─── COMPRESS ──────────────────────────────────────────────
    case 'compress': {
      const gsExe = getGhostscriptPath();
      if (!gsExe) throw errNoGhostscript();

      const level = options.level || 'recommended';
      const gsSettings = {
        extreme:     '/screen',     // 72 dpi, smallest
        recommended: '/ebook',      // 150 dpi, balanced
        low:         '/printer',    // 300 dpi, high quality
      };
      const setting = gsSettings[level] || '/ebook';

      // Use compression strategy based on user's selected level
      let selectedStrategy;
      
      if (level === 'extreme') {
        selectedStrategy = {
          name: 'extreme',
          args: [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            '-dPDFSETTINGS=/screen',
            '-dDownScaleFactor=3.0',
            '-dImageResolution=72',
            '-dColorImageDownsampleType=/Bicubic',
            '-dGrayImageDownsampleType=/Bicubic',
            '-dMonoImageDownsampleType=/Bicubic',
            '-dColorConversionStrategy=/Gray',
            '-dProcessColorModel=/DeviceGray',
            '-dDetectDuplicateImages=true',
            '-dCompressFonts=true',
            '-dSubsetFonts=true',
            '-dEmbedAllFonts=false',
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH',
            `-sOutputFile=${outPath}`,
            files[0].path
          ]
        };
      } else if (level === 'recommended') {
        selectedStrategy = {
          name: 'recommended',
          args: [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            '-dPDFSETTINGS=/ebook',
            '-dDownScaleFactor=2.0',
            '-dImageResolution=120',
            '-dColorImageDownsampleType=/Bicubic',
            '-dGrayImageDownsampleType=/Bicubic',
            '-dMonoImageDownsampleType=/Bicubic',
            '-dDetectDuplicateImages=true',
            '-dCompressFonts=true',
            '-dSubsetFonts=true',
            '-dEmbedAllFonts=false',
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH',
            `-sOutputFile=${outPath}`,
            files[0].path
          ]
        };
      } else { // low compression
        selectedStrategy = {
          name: 'low',
          args: [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            '-dPDFSETTINGS=/printer',
            '-dDownScaleFactor=1.5',
            '-dImageResolution=200',
            '-dDetectDuplicateImages=true',
            '-dCompressFonts=true',
            '-dSubsetFonts=true',
            '-dEmbedAllFonts=false',
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH',
            `-sOutputFile=${outPath}`,
            files[0].path
          ]
        };
      }

      const originalSize = fs.statSync(files[0].path).size;
      console.log(`Original file size: ${originalSize} bytes`);
      console.log(`Using compression strategy: ${selectedStrategy.name} (user selected: ${level})`);

      try {
        const result = await execFileAsync(gsExe, selectedStrategy.args, { maxBuffer: 50 * 1024 * 1024 });
        
        if (fs.existsSync(outPath)) {
          const compressedSize = fs.statSync(outPath).size;
          const compressionRatio = ((compressedSize/originalSize)*100).toFixed(1);
          console.log(`${selectedStrategy.name} compression result: ${originalSize} -> ${compressedSize} bytes (${compressionRatio}%)`);
          
          if (compressedSize < originalSize) {
            console.log(`✅ Compression successful!`);
          } else {
            console.log(`Compression didn't reduce size, using original file`);
            console.log('This PDF might already be optimized or contain mostly text');
            fs.copyFileSync(files[0].path, outPath);
          }
        }
      } catch (e) {
        console.error('Compression error:', e.message);
        throw new Error(
          `Ghostscript could not compress this file: ${e.message}\n` +
          'If Ghostscript is installed, check GHOSTSCRIPT_PATH in server/.env.'
        );
      }
      break;
    }

    // ─── WATERMARK ─────────────────────────────────────────────
    case 'watermark': {
      const doc   = await readPDF(files[0].path);
      const font  = await doc.embedFont(StandardFonts.HelveticaBold);
      const label = options.text || 'CONFIDENTIAL';
      const size  = parseInt(options.font_size) || 52;
      const opacity = parseFloat(options.transparency || 0.25);
      const colorHex = (options.font_color || '#808080').replace('#', '');
      const r = parseInt(colorHex.substring(0,2),16)/255;
      const g = parseInt(colorHex.substring(2,4),16)/255;
      const b = parseInt(colorHex.substring(4,6),16)/255;

      doc.getPages().forEach(pg => {
        const { width, height } = pg.getSize();
        const textWidth = font.widthOfTextAtSize(label, size);
        pg.drawText(label, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size, font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(45),
        });
      });
      await savePDF(doc, outPath);
      break;
    }

    // ─── PAGE NUMBERS ──────────────────────────────────────────
    case 'pagenumbers': {
      const doc   = await readPDF(files[0].path);
      const font  = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const pos   = options.position || 'bottom-center';
      const fontSize = parseInt(options.font_size) || 12;

      pages.forEach((pg, i) => {
        const { width, height } = pg.getSize();
        const text = `${i + 1}`;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        let x, y;

        if (pos === 'bottom-center') { x = (width - textWidth) / 2; y = 20; }
        else if (pos === 'bottom-left')  { x = 36; y = 20; }
        else if (pos === 'bottom-right') { x = width - 36 - textWidth; y = 20; }
        else if (pos === 'top-center')   { x = (width - textWidth) / 2; y = height - 28; }
        else if (pos === 'top-left')     { x = 36; y = height - 28; }
        else if (pos === 'top-right')    { x = width - 36 - textWidth; y = height - 28; }
        else { x = (width - textWidth) / 2; y = 20; }

        pg.drawText(text, { x, y, size: fontSize, font, color: rgb(0.35, 0.35, 0.35) });
      });
      await savePDF(doc, outPath);
      break;
    }

    // ─── PROTECT ───────────────────────────────────────────────
    case 'protect': {
      // pdf-lib does not support encryption natively.
      // We use Ghostscript for password protection.
      const password = String(options.password || '').trim();
      if (!password) throw badRequest('Enter a password before protecting the PDF.');
      const gsExe = getGhostscriptPath();
      try {
        if (!gsExe) throw errNoGhostscript();
        const args = [
          '-sDEVICE=pdfwrite',
          '-dNOPAUSE',
          '-dQUIET',
          '-dBATCH',
          `-sOwnerPassword=${password}`,
          `-sUserPassword=${password}`,
          '-dEncryptionR=3',
          '-dKeyLength=128',
          `-sOutputFile=${outPath}`,
          files[0].path
        ];
        await execFileAsync(gsExe, args);
      } catch (err) {
        throw new Error(`PDF protection failed: ${err.message}`);
      }
      break;
    }

    // ─── UNLOCK ────────────────────────────────────────────────
    case 'unlock': {
      const bytes = fs.readFileSync(files[0].path);
      const pw = options.password || undefined;
      const doc   = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        password: pw,
      });
      const nd    = await PDFDocument.create();
      const pages = await nd.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => nd.addPage(p));
      await savePDF(nd, outPath);
      break;
    }

    // ─── PDF/A CONVERSION ──────────────────────────────────────
    case 'pdfa': {
      try {
        const loExe = getLibreOfficePath();
        if (!loExe) throw errNoLibreOffice();
        const tmpDir = path.dirname(outPath);
        await runLibreOffice(loExe, [
          '--convert-to', 'pdf:writer_pdf_Export:EmbedStandardFonts=true,SelectPdfVersion=2',
          path.resolve(files[0].path),
          '--outdir', path.resolve(tmpDir),
        ]);
        const baseName = path.basename(files[0].path, path.extname(files[0].path)) + '.pdf';
        const loOut    = path.join(tmpDir, baseName);
        if (!fs.existsSync(loOut)) {
          throw new Error('LibreOffice did not produce a PDF/A output file.');
        }
        fs.renameSync(loOut, outPath);
      } catch (err) {
        throw new Error(`PDF/A conversion failed: ${err.message}`);
      }
      break;
    }

    // ─── JPG → PDF ─────────────────────────────────────────────
    case 'jpg-to-pdf': {
      const doc = await PDFDocument.create();
      const sharp = require('sharp');
      
      for (const file of files) {
        try {
          // Process image with sharp to reduce size and ensure optimal compression
          // Resize to max 2000px while maintaining aspect ratio, and use 75% JPEG quality
          const processedBuffer = await sharp(file.path)
            .resize(2000, 2000, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 75, progressive: true })
            .toBuffer();

          const img = await doc.embedJpg(processedBuffer);
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          // Create page with exact image dimensions to prevent distortion
          const page = doc.addPage([imgWidth, imgHeight]);
          
          // Draw image at full size without any scaling
          page.drawImage(img, {
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight
          });
          
          console.log(`✅ Processed & Embedded image: ${imgWidth}x${imgHeight}`);
        } catch (e) { 
          console.error('❌ Image embed failed:', e.message); 
        }
      }
      if (doc.getPageCount() === 0) throw new Error('No valid images could be embedded.');
      await savePDF(doc, outPath);
      console.log(`✅ JPG to PDF completed with optimization: ${outPath}`);
      break;
    }

    // ─── MERGE IMAGE ───────────────────────────────────────────
    case 'merge-image': {
      console.log(`🖼️ Merge Image: Processing ${files.length} files`);
      console.log(`📋 Received options:`, JSON.stringify(options));
      
      const direction = options.direction || 'vertical';
      const quality = options.quality || 'high';
      const a4mode = options.a4mode === 'true' || options.a4mode === true;
      const multipage = options.multipage === 'true' || options.multipage === true;
      
      console.log(`⚙️ Direction: ${direction}, Quality: ${quality}, A4 Mode: ${a4mode}, Multi-Page: ${multipage}`);
      
      try {
        const sharp = require('sharp');
        
        // A4 dimensions at 150 DPI (good quality, reasonable file size)
        const A4_WIDTH = 1240;  // 210mm at 150 DPI
        const A4_HEIGHT = 1754; // 297mm at 150 DPI
        
        if (a4mode || multipage) {
          // A4 Mode: Images arranged on A4 pages with equal space
          console.log(`📄 A4 Mode: Creating A4 layout for ${files.length} images`);
          
          // Load all images
          const images = [];
          for (const file of files) {
            try {
              const metadata = await sharp(file.path).metadata();
              images.push({
                path: file.path,
                originalWidth: metadata.width,
                originalHeight: metadata.height,
                aspectRatio: metadata.width / metadata.height,
                name: file.originalname
              });
            } catch (e) {
              console.error(`❌ Failed to load ${file.originalname}:`, e.message);
            }
          }
          
          if (images.length === 0) throw new Error('No valid images could be loaded.');
          
          if (multipage) {
            // Multi-Page Mode: Greedy masonry layout to maximize images per page
            const padding = 6;
            const pdfDoc = await PDFDocument.create();
            
            let currentImageIdx = 0;
            let pageCount = 0;

            while (currentImageIdx < images.length) {
              pageCount++;
              const cols = 2; // Always 2 columns for A4 distribution
              const availableWidth = A4_WIDTH - (padding * (cols + 1));
              const slotWidth = Math.floor(availableWidth / cols);
              
              const colCurrentY = new Array(cols).fill(padding);
              const composites = [];
              const imagesOnThisPage = [];

              // Create canvas for current page
              const canvas = sharp({
                create: {
                  width: A4_WIDTH,
                  height: A4_HEIGHT,
                  channels: 3,
                  background: { r: 255, g: 255, b: 255 }
                }
              });

              // Try to fit as many images as possible on the current page
              while (currentImageIdx < images.length) {
                const img = images[currentImageIdx];
                const col = colCurrentY.indexOf(Math.min(...colCurrentY));
                
                // Calculate height at slot width
                const targetHeight = Math.round(slotWidth / img.aspectRatio);
                
                // Check if it fits in this column
                if (colCurrentY[col] + targetHeight + padding > A4_HEIGHT) {
                  // If it doesn't fit in the shortest column, this page is full
                  // Unless it's the first image on the page, then we must fit it (rare case)
                  if (composites.length === 0) {
                    console.log(`⚠️ Image ${currentImageIdx} is too tall for A4, scaling to fit...`);
                  } else {
                    break; 
                  }
                }

                const xOffset = padding + (col * (slotWidth + padding));
                const yOffset = colCurrentY[col];

                const outputQuality = quality === 'low' ? 70 : 95;
                const resizedBuffer = await sharp(img.path)
                  .resize(slotWidth, null, {
                    fit: 'inside',
                    withoutEnlargement: false
                  })
                  .jpeg({ quality: outputQuality })
                  .toBuffer();
                
                const resizedMeta = await sharp(resizedBuffer).metadata();

                composites.push({
                  input: resizedBuffer,
                  left: xOffset,
                  top: yOffset
                });

                colCurrentY[col] += resizedMeta.height + padding;
                imagesOnThisPage.push(img.name);
                currentImageIdx++;
              }

              console.log(`📄 Page ${pageCount}: ${composites.length} images added. (${imagesOnThisPage.join(', ')})`);

              const pageBuffer = await canvas.composite(composites).jpeg({ quality: 95 }).toBuffer();
              const jpgImage = await pdfDoc.embedJpg(pageBuffer);
              const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
              page.drawImage(jpgImage, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });
            }

            const pdfBytes = await pdfDoc.save();
            const pdfPath = outPath.replace(/\.jpg$/, '.pdf').replace(/\.jpeg$/, '.pdf').replace(/\.png$/, '.pdf');
            fs.writeFileSync(pdfPath, pdfBytes);
            finalPath = pdfPath;

            console.log(`✅ Multi-Page PDF completed: ${finalPath} (${pageCount} pages)`);
            break;
          } else {
            // Single Page A4 Mode: Greedy masonry layout
            const padding = 6;
            
            const cols = 2; // Always 2 columns for A4 distribution
            const availableWidth = A4_WIDTH - (padding * (cols + 1));
            const slotWidth = Math.floor(availableWidth / cols);
            
            // Calculate height for each image to maintain aspect ratio
            const imageCalcs = images.map(img => ({
              ...img,
              targetHeight: Math.round(slotWidth / img.aspectRatio)
            }));

            // Track current Y position for each column
            const colCurrentY = new Array(cols).fill(padding);
            const composites = [];

            // Calculate scale factor if images exceed A4 height
            // We need to know if the total content will fit
            let totalHeightInCol0 = padding;
            let totalHeightInCol1 = padding;
            for (let i = 0; i < imageCalcs.length; i++) {
              if (totalHeightInCol0 <= totalHeightInCol1) {
                totalHeightInCol0 += imageCalcs[i].targetHeight + padding;
              } else {
                totalHeightInCol1 += imageCalcs[i].targetHeight + padding;
              }
            }
            const maxContentHeight = Math.max(totalHeightInCol0, totalHeightInCol1);
            const availableA4Height = A4_HEIGHT - (padding * 2);
            
            // Scale if content is taller than A4
            const scaleFactor = maxContentHeight > A4_HEIGHT ? availableA4Height / (maxContentHeight - padding) : 1;
            const finalSlotWidth = Math.floor(slotWidth * scaleFactor);
            const finalPadding = 6; // Keep padding constant

            // Create A4 canvas
            const canvas = sharp({
              create: {
                width: A4_WIDTH,
                height: A4_HEIGHT,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
              }
            });

            // Reset columns for placement
            const finalColCurrentY = new Array(cols).fill(finalPadding);

            for (let i = 0; i < images.length; i++) {
              const img = images[i];
              // Pick column with minimum height
              const col = finalColCurrentY.indexOf(Math.min(...finalColCurrentY));
              
              const xOffset = finalPadding + (col * (finalSlotWidth + finalPadding));
              const yOffset = finalColCurrentY[col];

              const outputQuality = quality === 'low' ? 70 : 95;
              const resizedBuffer = await sharp(img.path)
                .resize(finalSlotWidth, null, {
                  fit: 'inside',
                  withoutEnlargement: false
                })
                .jpeg({ quality: outputQuality })
                .toBuffer();
              
              const resizedMeta = await sharp(resizedBuffer).metadata();

              // Safety check for height
              if (yOffset + resizedMeta.height > A4_HEIGHT) {
                console.log(`⚠️ Image ${i} skipped in single page: exceeds height`);
                continue;
              }

              composites.push({
                input: resizedBuffer,
                left: xOffset,
                top: yOffset
              });

              finalColCurrentY[col] += resizedMeta.height + finalPadding;
              console.log(`✅ Single Page Image ${i} (Col ${col}): ${resizedMeta.width}x${resizedMeta.height} at (${xOffset},${yOffset})`);
            }

            if (composites.length === 0) throw new Error('No images could fit on A4 single page');

            const finalQuality = quality === 'low' ? 70 : 95;
            const pageBuffer = await canvas.composite(composites).jpeg({ quality: finalQuality }).toBuffer();
            await writeJpegCanvasAsPdf(pageBuffer, outPath, A4_WIDTH, A4_HEIGHT);
            finalPath = outPath;
            
            console.log(`✅ A4 Single Page Merge completed: ${finalPath}`);
          }
        } else {
          // Default to A4 Single Page masonry layout (Vertical/Horizontal options removed)
          console.log('ℹ️ No mode selected, defaulting to A4 Single Page layout');
          
          // Load images first (same as A4 mode)
          const images = [];
          for (const file of files) {
            try {
              const metadata = await sharp(file.path).metadata();
              images.push({
                path: file.path,
                originalWidth: metadata.width,
                originalHeight: metadata.height,
                aspectRatio: metadata.width / metadata.height,
                name: file.originalname
              });
            } catch (e) {
              console.error(`❌ Failed to load ${file.originalname}:`, e.message);
            }
          }
          
          if (images.length === 0) throw new Error('No valid images could be loaded.');
          
          // A4 Single Page masonry layout (duplicated from above for default behavior)
          const padding = 6;
          const cols = 2;
          const availableWidth = A4_WIDTH - (padding * (cols + 1));
          const slotWidth = Math.floor(availableWidth / cols);

          const imageCalcs = images.map(img => ({
            ...img,
            targetHeight: Math.round(slotWidth / img.aspectRatio)
          }));

          let totalHeightInCol0 = padding;
          let totalHeightInCol1 = padding;
          for (let i = 0; i < imageCalcs.length; i++) {
            if (totalHeightInCol0 <= totalHeightInCol1) {
              totalHeightInCol0 += imageCalcs[i].targetHeight + padding;
            } else {
              totalHeightInCol1 += imageCalcs[i].targetHeight + padding;
            }
          }
          const maxContentHeight = Math.max(totalHeightInCol0, totalHeightInCol1);
          const availableA4Height = A4_HEIGHT - (padding * 2);
          
          const scaleFactor = maxContentHeight > A4_HEIGHT ? availableA4Height / (maxContentHeight - padding) : 1;
          const finalSlotWidth = Math.floor(slotWidth * scaleFactor);
          const finalPadding = 6;

          const canvas = sharp({
            create: {
              width: A4_WIDTH,
              height: A4_HEIGHT,
              channels: 3,
              background: { r: 255, g: 255, b: 255 }
            }
          });

          const finalColCurrentY = new Array(cols).fill(finalPadding);
          const composites = [];

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const col = finalColCurrentY.indexOf(Math.min(...finalColCurrentY));
            
            const xOffset = finalPadding + (col * (finalSlotWidth + finalPadding));
            const yOffset = finalColCurrentY[col];

            const outputQuality = quality === 'low' ? 70 : 95;
            const resizedBuffer = await sharp(img.path)
              .resize(finalSlotWidth, null, {
                fit: 'inside',
                withoutEnlargement: false
              })
              .jpeg({ quality: outputQuality })
              .toBuffer();
            
            const resizedMeta = await sharp(resizedBuffer).metadata();

            if (yOffset + resizedMeta.height > A4_HEIGHT) {
              console.log(`⚠️ Image ${i} skipped: exceeds height`);
              continue;
            }

            composites.push({
              input: resizedBuffer,
              left: xOffset,
              top: yOffset
            });

            finalColCurrentY[col] += resizedMeta.height + finalPadding;
          }

          if (composites.length === 0) throw new Error('No images could fit on A4 single page');

          const finalQuality = quality === 'low' ? 70 : 95;
          const pageBuffer = await canvas.composite(composites).jpeg({ quality: finalQuality }).toBuffer();
          await writeJpegCanvasAsPdf(pageBuffer, outPath, A4_WIDTH, A4_HEIGHT);
          finalPath = outPath;
          
          console.log(`✅ Default A4 Single Page Merge completed: ${finalPath}`);
        }
      } catch (e) {
        console.error('❌ Merge Image failed:', e.message);
        throw new Error(`Image merge failed: ${e.message}`);
      }
      break;
    }

    // ─── PDF → JPG ─────────────────────────────────────────────
    case 'pdf-to-jpg': {
      const dpi     = parseInt(options.dpi) || 150;
      const imgDir  = path.join(outputDir, `${uuidv4()}_imgs`);
      fs.mkdirSync(imgDir, { recursive: true });

      let imgFiles = [];
      try {
        const gsExe = getGhostscriptPath();
        if (!gsExe) throw new Error('Ghostscript not installed');
        const args = [
          '-sDEVICE=jpeg',
          `-r${dpi}`,
          '-dNOPAUSE',
          '-dQUIET',
          '-dBATCH',
          `-sOutputFile=${path.join(imgDir, 'page_%03d.jpg')}`,
          files[0].path
        ];
        await execFileAsync(gsExe, args);
        imgFiles = fs.readdirSync(imgDir).filter(f => f.endsWith('.jpg')).sort();
      } catch (gsErr) {
        console.warn('Ghostscript failed, using pdf2pic:', gsErr.message);
        try {
          const { fromPath } = require('pdf2pic');
          const convert = fromPath(files[0].path, { density: dpi, saveFilename: 'page', savePath: imgDir, format: 'jpg' });
          await convert.bulk(-1);
          imgFiles = fs.readdirSync(imgDir).filter(f => f.endsWith('.jpg')).sort();
        } catch (p2pErr) {
          throw new Error('PDF to JPG failed. Make sure Ghostscript is installed.');
        }
      }

      if (imgFiles.length === 0) throw new Error('No images were generated from the PDF.');

      const entries = imgFiles.map((f, i) => ({
        buffer: fs.readFileSync(path.join(imgDir, f)),
        name: `page_${String(i+1).padStart(3,'0')}.jpg`,
      }));
      const zipPath = path.join(outputDir, `${uuidv4()}_pdf_images.zip`);
      await createZip(entries, zipPath);
      finalPath = zipPath;

      // Cleanup temp images
      imgFiles.forEach(f => { try { fs.unlinkSync(path.join(imgDir, f)); } catch {} });
      try { fs.rmdirSync(imgDir); } catch {}
      break;
    }

    // ─── WORD / EXCEL / PPT → PDF ──────────────────────────────
    case 'word-to-pdf':
    case 'excel-to-pdf':
    case 'ppt-to-pdf': {
      const loExe = getLibreOfficePath();
      if (!loExe) throw errNoLibreOffice();
      const fileDir = path.dirname(files[0].path);
      try {
        await runLibreOffice(loExe, [
          '--convert-to', 'pdf',
          path.resolve(files[0].path),
          '--outdir', path.resolve(fileDir),
        ]);
        const baseName = path.basename(files[0].path, path.extname(files[0].path)) + '.pdf';
        const loOut    = path.join(fileDir, baseName);
        if (fs.existsSync(loOut)) {
          fs.renameSync(loOut, outPath);
        } else {
          throw new Error('LibreOffice did not produce output file.');
        }
      } catch (err) {
        throw new Error(
          `Office to PDF conversion failed.\n` +
          `Make sure LibreOffice is installed.\n` +
          `Windows: choco install libreoffice\n` +
          `Linux: sudo apt install libreoffice\n` +
          `Error: ${err.message}`
        );
      }
      break;
    }

    // ─── PDF → WORD / EXCEL / PPT ──────────────────────────────
    case 'pdf-to-word':
    case 'pdf-to-excel':
    case 'pdf-to-ppt': {
      console.log('=== PDF TO OFFICE CONVERSION STARTED ===');
      console.log('Tool slug:', toolSlug);
      console.log('Files count:', files.length);
      console.log('File types:', files.map(f => f.mimetype || 'unknown'));
      console.log('File paths:', files.map(f => f.path));
      
      // Check if it's actually a PDF file
      const isPdfFile = files[0] && (
        files[0].mimetype === 'application/pdf' || 
        files[0].originalname.toLowerCase().endsWith('.pdf')
      );
      
      if (!isPdfFile) {
        console.log('❌ ERROR: Not a PDF file - mimetype:', files[0]?.mimetype);
        throw new Error('Please upload a PDF file for conversion to Word format.');
      }
      
      try {
        // Try Python microservice first
        console.log('🐍 Attempting Python microservice conversion...');
        const PDFMicroserviceClient = require('../utils/pdfMicroserviceClient');
        const pdfClient = new PDFMicroserviceClient();
        
        // Check if microservice is available
        try {
          await pdfClient.checkHealth();
          console.log('✅ Python microservice is available');
          
          // Use Python microservice for conversion
          if (toolSlug === 'pdf-to-word') {
            await pdfClient.convertPdfToWord(files[0].path, outPath);
            console.log('✅ PDF to Word conversion completed using Python microservice');
          } else if (toolSlug === 'pdf-to-excel') {
            await pdfClient.convertPdfToExcel(files[0].path, outPath);
            console.log('✅ PDF to Excel conversion completed using Python microservice');
          } else if (toolSlug === 'pdf-to-ppt') {
            await pdfClient.convertPdfToPowerPoint(files[0].path, outPath);
            console.log('✅ PDF to PowerPoint conversion completed using Python microservice');
          }
          
          // Verify the output file was created successfully
          if (fs.existsSync(outPath)) {
            const stats = fs.statSync(outPath);
            console.log('✅ File created successfully using Python microservice, size:', stats.size, 'bytes');
            console.log('✅ File is ready for download at:', outPath);
          } else {
            throw new Error('Python microservice conversion failed - output file not created');
          }
          
        } catch (healthError) {
          console.log('❌ Python microservice not available, falling back to Node.js solution');
          console.log('Health check error:', healthError.message);
          
          // Fallback to enhanced Node.js solution
          if (toolSlug === 'pdf-to-word') {
            console.log('🔍 Using enhanced PDF text extraction for Word conversion...');
            
            // Use enhanced PDF text extraction with better formatting
            const { writePdfAsOffice } = require('../utils/pdfOfficeFallback');
            const pdfBuffer = fs.readFileSync(files[0].path);
            
            console.log('PDF buffer size:', pdfBuffer.length, 'bytes');
            console.log('Starting enhanced Word conversion...');
            
            await writePdfAsOffice(toolSlug, pdfBuffer, outPath);
            console.log('✅ Enhanced Word conversion completed');
            
            // Verify the output file was created successfully
            if (fs.existsSync(outPath)) {
              const stats = fs.statSync(outPath);
              console.log('✅ DOCX file created successfully, size:', stats.size, 'bytes');
              console.log('✅ File is ready for download at:', outPath);
            } else {
              console.log('❌ ERROR: DOCX file was not created');
              throw new Error('Word conversion failed - output file not created');
            }
            
          } else {
            console.log('Using enhanced fallback for Excel/PPT conversion...');
            // Use enhanced fallback for Excel/PPT
            const { writePdfAsOffice } = require('../utils/pdfOfficeFallback');
            const pdfBuffer = fs.readFileSync(files[0].path);
            
            await writePdfAsOffice(toolSlug, pdfBuffer, outPath);
            console.log(`✅ Enhanced fallback ${toolSlug === 'pdf-to-excel' ? 'xlsx' : 'pptx'} conversion completed`);
          }
        }
        
      } catch (err) {
        console.log(`❌ Conversion failed: ${err.message}`);
        console.error('Full error:', err);
        
        throw new Error(
          `PDF to Office conversion failed.\n${err.message}\n\n` +
          'Enhanced text extraction was used. For scanned PDFs, use OCR first.'
        );
      }
      break;
    }

    // ─── HTML → PDF ────────────────────────────────────────────
    case 'html-to-pdf': {
      const { pathToFileURL } = require('url');
      let targetUrl = (options.url || options.html_url || '').trim();
      if (!targetUrl && files[0]) {
        const m = files[0].mimetype || '';
        const name = (files[0].originalname || '').toLowerCase();
        if (m === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) {
          targetUrl = pathToFileURL(path.resolve(files[0].path)).href;
        }
      }
      if (!targetUrl) {
        throw badRequest('Enter a webpage URL, or upload an .html file.');
      }
      const isRemoteUrl = /^https?:\/\//i.test(targetUrl);
      if (isRemoteUrl) targetUrl = await assertSafeRemoteUrl(targetUrl);
      let browser;
      try {
        const puppeteer = require('puppeteer');
        const browserArgs = ['--disable-dev-shm-usage'];
        if (process.env.PUPPETEER_DISABLE_SANDBOX === 'true') {
          browserArgs.push('--no-sandbox', '--disable-setuid-sandbox');
        }
        browser = await puppeteer.launch({
          headless: 'new',
          args: browserArgs,
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', async (request) => {
          try {
            const requestUrl = request.url();
            if (/^https?:\/\//i.test(requestUrl)) await assertSafeRemoteUrl(requestUrl);
            else if (requestUrl === targetUrl && /^file:/i.test(requestUrl)) {
              /* Allow only the uploaded HTML document itself. */
            } else if (!/^(data:|about:|blob:)/i.test(requestUrl)) {
              throw new Error('Blocked URL protocol');
            }
            request.continue();
          } catch {
            request.abort('blockedbyclient');
          }
        });
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top:'20mm', bottom:'20mm', left:'15mm', right:'15mm' } });
      } catch (err) {
        throw new Error(`HTML to PDF failed: ${err.message}\nMake sure Puppeteer is installed (npm install in server/).`);
      } finally {
        if (browser) await browser.close();
      }
      break;
    }

    // ─── OCR ───────────────────────────────────────────────────
    case 'ocr': {
      const lang = options.lang || 'eng';
      const txtPath = outPath; // .txt output

      try {
        const Tesseract = require('tesseract.js');
        let allText = '';

        // If input is PDF, convert to images first using Ghostscript
        if (files[0].mimetype === 'application/pdf') {
          const imgDir = path.join(outputDir, `${uuidv4()}_ocr_imgs`);
          fs.mkdirSync(imgDir, { recursive: true });

          try {
            const gsExe = getGhostscriptPath();
            if (!gsExe) throw new Error('no gs');
            const args = [
              '-sDEVICE=png16m',
              '-r200',
              '-dNOPAUSE',
              '-dQUIET',
              '-dBATCH',
              `-sOutputFile=${path.join(imgDir, 'page_%03d.png')}`,
              files[0].path
            ];
            await execFileAsync(gsExe, args);
          } catch {
            // Ghostscript failed — try pdf2pic
            const { fromPath } = require('pdf2pic');
            const conv = fromPath(files[0].path, { density: 200, saveFilename: 'page', savePath: imgDir, format: 'png' });
            await conv.bulk(-1);
          }

          const imgFiles = fs.readdirSync(imgDir).filter(f => f.match(/\.(png|jpg)$/i)).sort();
          for (const imgFile of imgFiles) {
            const { data: { text } } = await Tesseract.recognize(path.join(imgDir, imgFile), lang, { logger: () => {} });
            allText += text + '\n\n';
          }
          imgFiles.forEach(f => { try { fs.unlinkSync(path.join(imgDir, f)); } catch {} });
          try { fs.rmdirSync(imgDir); } catch {}
        } else {
        // Direct image OCR
        const worker = await getOcrWorker(lang);
        const { data: { text } } = await worker.recognize(files[0].path);
        allText = text;
        }

        fs.writeFileSync(txtPath, allText.trim() || '(No text detected)');
      } catch (err) {
        throw new Error(`OCR failed: ${err.message}`);
      }
      break;
    }

    default: {
      throw new Error(`Tool processor "${toolSlug}" is not implemented.`);
    }
  }

  return {
    finalPath,
    filename: friendlyOutputName(files[0], finalPath, toolSlug === 'html-to-pdf' ? 'webpage' : 'output'),
  };
}

exports.processTool = async (req, res) => {
  const { toolSlug } = req.params;
  const files = req.files || (req.file ? [req.file] : []);
  const urlOnlyHtml =
    toolSlug === 'html-to-pdf' &&
    String(req.body.url || req.body.html_url || '').trim().length > 0;
  if (!files.length && !urlOnlyHtml) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  let historyEntry = null;
  try {
    const tool = await Tool.findOne({ slug: toolSlug });
    if (!tool) {
      cleanupInputFiles(files);
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }
    if (UNAVAILABLE_TOOLS.has(toolSlug)) {
      cleanupInputFiles(files);
      return res.status(501).json({ success: false, message: UNAVAILABLE_TOOLS.get(toolSlug) });
    }
    // ── Task limit & subscription check ──
    if (req.user) {
      const user = await User.findById(req.user._id);
      user.checkSubscription();

      if (tool.isPremium && user.plan === 'free') {
        cleanupInputFiles(files);
        return res.status(403).json({
          success: false,
          message: 'This tool requires a Pro or Enterprise plan.',
        });
      }

      if (!user.canRunTask()) {
        cleanupInputFiles(files);
        return res.status(429).json({ success: false, message: 'Daily task limit reached. Upgrade your plan.' });
      }
      user.tasksToday += 1; user.lastTaskDate = new Date();
      await user.save();
    } else {
      // ── Guest usage limit ──
      const GuestUsage = require('../models/GuestUsage.model');
      const guestId = req.body.guestId;
      if (!guestId) {
        return res.json({ success: false, needGuestId: true, message: 'Guest ID required' });
      }
      let record = await GuestUsage.findOne({ guestId });
      if (!record) {
        record = await GuestUsage.create({ guestId, count: 0 });
      }
      if (record.count >= 5) {
        cleanupInputFiles(files);
        return res.status(403).json({ success: false, message: 'GUEST_LIMIT_REACHED' });
      }
      record.count += 1;
      await record.save();
      req.guestRemaining = 5 - record.count;
    }

    const toolLabel = tool.label;

    // ── Save to history ──
    if (req.user) {
      historyEntry = await History.create({
        user: req.user._id, toolName: toolSlug, toolLabel, status: 'processing',
        inputFiles: files.map(f => ({ originalName: f.originalname, size: f.size, mimetype: f.mimetype })),
        options: Object.fromEntries(
          Object.entries(req.body).filter(([key]) => key.toLowerCase() !== 'password')
        ),
      });
    }

    const userId    = req.user ? req.user._id.toString() : 'guest';
    const outputDir = getOutputDir(userId);

    // ── Process locally ──
    const result = await processLocally(toolSlug, files, outputDir, req.body);
    
    // Check if result returned extra data (like ocrData)
    const ocrData = result.ocrData;

    const stat = fs.statSync(result.finalPath);
    let sizeBytes = Math.max(0, Math.trunc(Number(stat.size)) || 0);
    // OOXML / pptx: some Windows setups report odd stat.size; use real file length for small/medium outputs.
    if (/\.pptx$/i.test(result.filename)) {
      try {
        const cap = 40 * 1024 * 1024;
        if (sizeBytes <= cap) {
          sizeBytes = fs.readFileSync(result.finalPath).length;
        }
      } catch {
        /* keep stat-based size */
      }
    }
    const downloadUrl = secureDownloadUrl(result.finalPath, result.filename);
    const resultOcrData = result.ocrData;

    // Check if this was a compression operation that didn't actually compress
    let compressionNote = null;
    if (toolSlug === 'compress' && files.length > 0) {
      try {
        const originalSize = fs.statSync(files[0].path).size;
        if (sizeBytes >= originalSize) {
          compressionNote = 'This PDF is already optimized and cannot be compressed further. The file contains mostly text or is already efficiently compressed.';
        }
      } catch {
        // ignore
      }
    }

    // ── Update history ──
    if (historyEntry) {
      await History.findByIdAndUpdate(historyEntry._id, {
        status: 'completed',
        outputFile: { filename: result.filename, size: sizeBytes, downloadUrl },
      });
    }
    if (tool) await Tool.findByIdAndUpdate(tool._id, { $inc: { totalUsage: 1 } });

    // ── Cleanup uploaded input files ──
    cleanupInputFiles(files);

    const responseData = {
      downloadUrl,
      filename: result.filename,
      size: sizeBytes,
      fileSizeBytes: sizeBytes,
      historyId: historyEntry?._id,
      compressionNote,
      ... (result.ocrData ? { ocrData: result.ocrData } : {}),
    };
    if (req.guestRemaining !== undefined) {
      responseData.guestRemaining = req.guestRemaining;
    }
    res.json({
      success: true,
      message: `${toolLabel} completed successfully`,
      data: responseData,
    });

  } catch (err) {
    console.error(`[${toolSlug}] ERROR:`, err.message);
    if (historyEntry) {
      await History.findByIdAndUpdate(historyEntry._id, { status: 'failed', errorMessage: err.message });
    }
    // Cleanup files on error too
    cleanupInputFiles(files);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// OTHER EXPORTS
// ─────────────────────────────────────────────────────────────────
exports.getAllTools = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { slug: { $nin: [...UNAVAILABLE_TOOLS.keys()] } };
    if (category && category !== 'all') filter.category = category;
    const tools  = await Tool.find(filter).sort({ totalUsage: -1 });
    res.json({ success: true, tools });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getToolBySlug = async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug });
    if (!tool || UNAVAILABLE_TOOLS.has(tool.slug)) {
      return res.status(404).json({ success: false, message: 'Tool not found' });
    }
    res.json({ success: true, tool });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
