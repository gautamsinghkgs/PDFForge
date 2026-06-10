/**
 * When LibreOffice cannot convert a PDF (Draw/CLI limits, scanned PDFs, etc.),
 * build Word/Excel/PowerPoint from extracted text so users still get a usable file.
 */

'use strict';

const fs = require('fs');

// ── Polyfill DOMMatrix for pdf-parse (pdfjs-dist needs it in Node.js) ──
if (typeof globalThis.DOMMatrix === 'undefined') {
  try {
    const { DOMMatrix } = require('canvas');
    globalThis.DOMMatrix = DOMMatrix;
  } catch {
    // Minimal DOMMatrix polyfill for pdfjs text extraction
    class DOMMatrixPolyfill {
      constructor(init) {
        if (typeof init === 'string') {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        } else if (init) {
          const m = init.length >= 6 ? init : [1, 0, 0, 1, 0, 0];
          this.a = m[0]; this.b = m[1]; this.c = m[2]; this.d = m[3]; this.e = m[4]; this.f = m[5];
        } else {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
      }
      translate(tx, ty) {
        return new DOMMatrixPolyfill([this.a, this.b, this.c, this.d, this.e + tx, this.f + ty]);
      }
      scale(sx, sy) {
        return new DOMMatrixPolyfill([this.a * sx, this.b * sx, this.c * sy, this.d * sy, this.e, this.f]);
      }
      multiply(other) {
        const m1 = this, m2 = other;
        return new DOMMatrixPolyfill([
          m1.a * m2.a + m1.c * m2.b,
          m1.b * m2.a + m1.d * m2.b,
          m1.a * m2.c + m1.c * m2.d,
          m1.b * m2.c + m1.d * m2.d,
          m1.a * m2.e + m1.c * m2.f + m1.e,
          m1.b * m2.e + m1.d * m2.f + m1.f
        ]);
      }
      inverse() {
        const d = this.a * this.d - this.b * this.c;
        if (Math.abs(d) < 1e-12) return new DOMMatrixPolyfill();
        return new DOMMatrixPolyfill([
          this.d / d, -this.b / d, -this.c / d, this.a / d,
          (this.c * this.f - this.d * this.e) / d,
          (this.b * this.e - this.a * this.f) / d
        ]);
      }
      toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
    }
    globalThis.DOMMatrix = DOMMatrixPolyfill;
    console.log('DOMMatrix polyfill applied for pdf-parse');
  }
}

const { PDFParse } = require('pdf-parse');

const NO_TEXT =
  'No selectable text found in this PDF (often image-only / scanned). Use the OCR PDF tool first, then convert again.';

async function extractText(buffer) {
  const parser = new PDFParse({ data: buffer });
  
  try {
    // Try different parsing strategies
    const strategies = [
      {
        name: 'Standard parsing',
        options: { normalizeWhitespace: false, disableCombineTextItems: false }
      },
      {
        name: 'Conservative parsing',
        options: { normalizeWhitespace: false, disableCombineTextItems: true, preserveWhitespace: true }
      },
      {
        name: 'Aggressive parsing',
        options: { normalizeWhitespace: false, disableCombineTextItems: true, preserveWhitespace: true, max: 1000 }
      }
    ];
    
    for (const strategy of strategies) {
      try {
        console.log(`Trying ${strategy.name}...`);
        const result = await parser.getText(strategy.options);
        const extractedText = String(result.text || '');
        
        if (extractedText.trim()) {
          console.log(`✅ ${strategy.name} successful: ${extractedText.length} chars`);
          console.log(`First 300 chars:\n`, extractedText.substring(0, 300));
          
          // Better structure preservation
          const text = extractedText
            .replace(/\u0000/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Preserve ALL spaces and special characters
            .replace(/ {2,}/g, match => match)
            .replace(/\n{1,2}/g, match => match)
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          
          console.log(`Final text length: ${text.length} chars`);
          return text;
        }
      } catch (err) {
        console.log(`❌ ${strategy.name} failed: ${err.message}`);
      }
    }
    
    return '';
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}

/** Per-page text so PPT slide count tracks the PDF (not one fixed chunking for every file). */
async function extractTextPerPage(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText({ pageJoiner: '' });
    const pages = result.pages || [];
    const normalize = (s) =>
      String(s || '')
        .replace(/\u0000/g, '')
        .replace(/\r\n/g, '\n')
        .trim();
    
    console.log(`PDF pages found: ${pages.length}`);
    
    if (pages.length) {
      const pageData = pages
        .map((p) => ({ num: p.num, text: normalize(p.text) }))
        .sort((a, b) => a.num - b.num);
      
      // Log first page text length for debugging
      if (pageData.length > 0) {
        console.log(`Page 1 text length: ${pageData[0].text.length} chars`);
      }
      
      return pageData;
    }
    
    const full = normalize(result.text);
    console.log(`No page data, using full text: ${full.length} chars`);
    return full ? [{ num: 1, text: full }] : [];
  } catch (error) {
    console.error('Error in extractTextPerPage:', error.message);
    return [];
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}

/** @param {'pdf-to-word'|'pdf-to-excel'|'pdf-to-ppt'} slug */
async function writePdfAsOffice(slug, pdfBuffer, outPath) {
  if (slug === 'pdf-to-ppt') {
    await writePdfToPptx(pdfBuffer, outPath);
    return;
  }

  const text = await extractText(pdfBuffer);
  if (!text) {
    throw new Error(NO_TEXT);
  }

  if (slug === 'pdf-to-word') {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = require('docx');
    const lines = text.split('\n');
    
    // Enhanced structure preservation with better formatting
    const children = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines but add paragraph breaks
      if (!trimmed) {
        children.push(new Paragraph({ 
          children: [new TextRun('')]
        }));
        continue;
      }
      
      // Enhanced heading detection
      const words = trimmed.split(/\s+/);
      const isAllCaps = /^[A-Z\s\d\W]+$/.test(trimmed.replace(/[^A-Z\s\d\W]/g, ''));
      const isHeading = words.length <= 8 && (
        isAllCaps ||
        trimmed.endsWith(':') ||
        words.length <= 3 ||
        /^(CHAPTER|SECTION|PART|ARTICLE|UNIT|TOPIC|DAA)\s*\d*/i.test(trimmed)
      );
      
      // Enhanced table detection
      const hasTableStructure = /\s{3,}|\t/.test(line);
      const isTableRow = hasTableStructure && words.length >= 2;
      
      // List detection
      const isList = /^[\-\*\•]\s/.test(line) || /^\d+\.\s/.test(line);
      
      // Definition/meaning detection
      const isDefinition = /^(Meaning|Definition|Example|Summary|Simple example)\s*:/i.test(trimmed);
      const isSubPoint = /^•/.test(line) || /^[\-\*]\s/.test(line);
      
      if (isHeading) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: trimmed,
            bold: true,
            size: 14
          })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { before: 240, after: 120 }
        }));
      } else if (isDefinition) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: trimmed,
            bold: true,
            size: 12,
            color: '2E5090' // Blue for definitions
          })],
          spacing: { before: 120, after: 80 }
        }));
      } else if (isList || isSubPoint) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: trimmed,
            size: 11
          })],
          spacing: { before: 60, after: 60 },
          indent: { left: 360 }
        }));
      } else if (isTableRow) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: line, // Keep original spacing for tables
            font: 'Consolas',
            size: 10
          })],
          spacing: { before: 40, after: 40 }
        }));
      } else {
        // Regular paragraph with better formatting
        children.push(new Paragraph({
          children: [new TextRun({
            text: trimmed.length > 1000 ? `${trimmed.slice(0, 1000)}…` : trimmed,
            size: 11
          })],
          spacing: { before: 80, after: 80 },
          alignment: AlignmentType.JUSTIFIED
        }));
      }
    }
    
    // Enhanced document structure with better compatibility
    const doc = new Document({
      sections: [{ 
        children,
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720
            },
            size: {
              orientation: 'portrait',
              width: 12240,
              height: 15840
            }
          }
        }
      }],
      // Compatibility settings for better MS Word support
      compatibility: {
        // Target Word 2013+ format for better compatibility
        target: 'docx',
        // Use standard features for better compatibility
        features: {
          // Use basic features for better compatibility
          updateFields: false,
          forms: false,
          protection: false
        }
      }
    });
    
    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buf);
    console.log(`Enhanced Word conversion: ${text.length} chars → ${buf.length} bytes`);
    return;
  }

  function createRTFFromText(text) {
    const lines = text.split('\n');
    const rtfLines = lines.map(line => {
      // Basic RTF escaping
      const escaped = line
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\n/g, '\\line ');
      
      return escaped;
    });
    
    return `\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}\\f1\\fnil\\fcharset0 Arial;}}{\\colortbl;\\red0\\green0\\blue0;}{\\*\\generator PDFForge;}{\\pard\\tx360\\tx720\\fi360\\fi720\\sl240\\sl360\\slmult1\\slmult0\\cf1\\lang1033\\f1\\fs24\\lang255 {\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}\\f1\\fnil\\fcharset0 Arial;}}{\\colortbl;\\red0\\green0\\blue0;}{\\*\\generator PDFForge;}{\\pard\\tx360\\tx720\\fi360\\fi720\\sl240\\sl360\\slmult1\\slmult0\\cf1\\lang1033\\f1\\fs24\\lang255 ${rtfLines.join('\\par ')}\\par}`;
  }

  if (slug === 'pdf-to-html') {
    // Convert to HTML for universal compatibility
    const lines = text.split('\n');
    const htmlLines = lines.map(line => {
      // Basic HTML escaping
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
      
      return escaped;
    });
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted PDF Content</title>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        font-size: 11pt; 
        line-height: 1.2;
        margin: 20px;
        color: #333;
      }
      .heading { 
        font-weight: bold; 
        font-size: 14pt; 
        color: #2E5090;
        margin: 16px 0;
      }
      .definition { 
        font-weight: bold; 
        color: #2E5090;
        margin: 12px 0;
      }
      .list { 
        margin-left: 20px;
        color: #555;
      }
      .table { 
        font-family: Consolas, monospace;
        border-collapse: collapse;
        margin: 10px 0;
      }
    </style>
</head>
<body>
    ${htmlLines.join('<br>')}
</body>
</html>`;
    
    const htmlPath = outPath.replace('.docx', '.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`HTML conversion: ${text.length} chars → ${htmlContent.length} bytes`);
    return;
  }

  if (slug === 'pdf-to-excel') {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('PDF Content');
    
    // Enhanced table detection and structure preservation
    const lines = text.split('\n');
    let currentRow = 1;
    let hasHeaders = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        currentRow++;
        continue;
      }
      
      // Enhanced table detection
      const columns = trimmed.split(/\s{2,}|\t/).filter(col => col.trim());
      
      if (columns.length > 1) {
        // This looks like a table row
        columns.forEach((column, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = column.trim();
          
          // Auto-detect headers (first row with multiple columns)
          if (currentRow === 1 && !hasHeaders) {
            cell.font = { bold: true, size: 12 };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6E6FA' } // Light purple background
            };
            hasHeaders = true;
          } else {
            cell.font = { size: 11 };
          }
          
          // Add borders for table structure
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'left',
            wrapText: true 
          };
        });
        
        const row = worksheet.getRow(currentRow);
        row.height = 20; // Row height for better readability
        row.commit();
      } else {
        // Regular text line - put in first column with full width
        const cell = worksheet.getCell(currentRow, 1);
        cell.value = trimmed;
        cell.font = { size: 11 };
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left',
          wrapText: true 
        };
        
        // Merge cells for full-width content
        if (trimmed.length > 30 || trimmed.includes('.')) {
          worksheet.mergeCells(currentRow, 1, currentRow, 5);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }
        
        const row = worksheet.getRow(currentRow);
        row.height = Math.max(20, Math.ceil(trimmed.length / 50) * 15); // Auto-height
        row.commit();
      }
      
      currentRow++;
    }
    
    // Enhanced column formatting
    worksheet.columns.forEach((column, index) => {
      column.width = Math.max(15, Math.min(50, index === 0 ? 30 : 20));
      column.font = { size: 11 };
    });
    
    // Add header row styling
    if (hasHeaders) {
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        cell.font = { bold: true, size: 12 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };
      });
    }
    
    await workbook.xlsx.writeFile(outPath);
    console.log(`Enhanced Excel conversion: ${text.length} chars → Excel file`);
    return;
  }

  throw new Error('Unknown PDF→Office tool');
}

async function writePdfToPptx(pdfBuffer, outPath) {
  console.log('Starting PPTX conversion...');
  const pageChunks = await extractTextPerPage(pdfBuffer);
  if (!pageChunks.length) {
    throw new Error(NO_TEXT);
  }

  console.log(`Creating PPTX with ${pageChunks.length} pages of content`);
  
  const pptxgen = require('pptxgenjs');
  const { PDFDocument } = require('pdf-lib');

  const A4_PORTRAIT = { w: 8.267, h: 11.693 };
  const A4_LANDSCAPE = { w: 11.693, h: 8.267 };

  let slideW = A4_PORTRAIT.w;
  let slideH = A4_PORTRAIT.h;
  let layoutName = 'PDFFORGE_A4_P';
  try {
    const doc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    if (doc.getPageCount() > 0) {
      const { width, height } = doc.getPage(0).getSize();
      if (width > height) {
        layoutName = 'PDFFORGE_A4_L';
        slideW = A4_LANDSCAPE.w;
        slideH = A4_LANDSCAPE.h;
      }
    }
  } catch (error) {
    console.error('Error reading PDF for layout:', error.message);
    /* keep A4 portrait */
  }

  const sanitizePptx = (s) => {
    const t = String(s)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n');
    return t.length ? t : ' ';
  };

  const margin = 0.5;
  const textW = slideW - 2 * margin;
  const textH = slideH - 2 * margin - 0.1;
  const maxLinesPerSlide = Math.min(46, Math.max(14, Math.round((textH / 5.15) * 18)));
  const maxChars = Math.min(6000, Math.max(2200, Math.round((textW / 9) * 2800)));

  console.log(`Slide layout: ${layoutName}, max chars per slide: ${maxChars}`);

  const pptx = new pptxgen();
  pptx.defineLayout({ name: layoutName, width: slideW, height: slideH });
  pptx.layout = layoutName;
  pptx.author = 'PDFForge';
  pptx.title = 'Converted from PDF';
  pptx.subject = 'Text extracted from PDF';
  pptx.revision = '1';

  const addSlide = (body) => {
    const slide = pptx.addSlide();
    const raw = sanitizePptx(body);
    const chunk = raw.length > maxChars ? `${raw.slice(0, maxChars)}…` : raw;
    slide.addText(chunk, {
      x: margin,
      y: margin + 0.05,
      w: textW,
      h: textH,
      fontSize: 12,
      color: '333333',
      align: 'left',
      valign: 'top',
      breakLine: true,
    });
  };

  const anyText = pageChunks.some((p) => p.text.length);
  if (!anyText) {
    addSlide('No readable text in this PDF (often image-only). Use OCR first.');
  } else {
    let totalSlides = 0;
    for (const { num, text: pageText } of pageChunks) {
      if (!pageText) {
        addSlide(`Page ${num}\n\n(No selectable text on this page — try OCR for scans.)`);
        totalSlides++;
        continue;
      }
      const lines = pageText.split('\n');
      for (let i = 0; i < lines.length; i += maxLinesPerSlide) {
        const part = lines.slice(i, i + maxLinesPerSlide).join('\n');
        const header =
          i === 0 ? `Page ${num}` : `Page ${num} (continued)`;
        addSlide(`${header}\n\n${part}`);
        totalSlides++;
      }
    }
    console.log(`Created ${totalSlides} slides`);
  }

  console.log('Generating PPTX file...');
  const data = await pptx.write({ outputType: 'nodebuffer', compression: false });
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  fs.writeFileSync(outPath, buf);
  console.log(`PPTX saved to ${outPath}, size: ${buf.length} bytes`);
}

module.exports = {
  writePdfAsOffice,
  extractText
};
