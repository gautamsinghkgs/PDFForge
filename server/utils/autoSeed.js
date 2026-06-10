const Tool = require('../models/Tool.model');

const tools = [
  { slug: 'merge',        label: 'Merge PDF',          category: 'organize', description: 'Combine multiple PDFs into one document in any order.',                     icon: 'merge', colorFrom: '#f97316', colorTo: '#fb923c', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'split',        label: 'Split PDF',          category: 'organize', description: 'Separate pages or extract sections into new PDF files.',                    icon: 'split', colorFrom: '#8b5cf6', colorTo: '#a78bfa', acceptedFormats: ['.pdf'],                         outputFormat: 'zip' },
  { slug: 'rotate',       label: 'Rotate PDF',         category: 'organize', description: 'Rotate PDF pages to any orientation.',                                      icon: 'rotate', colorFrom: '#10b981', colorTo: '#34d399', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'pagenumbers',  label: 'Page Numbers',       category: 'organize', description: 'Add customizable page numbers to your PDF.',                                icon: 'pagenumbers', colorFrom: '#f59e0b', colorTo: '#fbbf24', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'watermark',    label: 'Watermark PDF',      category: 'edit',     description: 'Stamp a text or image watermark with custom transparency.',                 icon: 'watermark',  colorFrom: '#ec4899', colorTo: '#f472b6', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'compress',     label: 'Compress PDF',       category: 'optimize', description: 'Reduce file size while preserving maximum PDF quality.',                    icon: 'compress', colorFrom: '#14b8a6', colorTo: '#2dd4bf', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'pdfa',         label: 'PDF to PDF/A',       category: 'optimize', description: 'Convert to ISO-standard PDF/A format for long-term archiving.',             icon: 'pdfa',  colorFrom: '#6366f1', colorTo: '#818cf8', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'pdf-to-word',  label: 'PDF to Word',        category: 'convert',  description: 'Convert PDFs to editable DOC/DOCX files with high accuracy.',              icon: 'pdf-to-word', colorFrom: '#2563eb', colorTo: '#60a5fa', acceptedFormats: ['.pdf'],                         outputFormat: 'docx' },
  { slug: 'pdf-to-ppt',   label: 'PDF to PowerPoint',  category: 'convert',  description: 'Turn PDF slides into fully editable PPTX presentations.',                  icon: 'pdf-to-ppt', colorFrom: '#ef4444', colorTo: '#f87171', acceptedFormats: ['.pdf'],                         outputFormat: 'pptx' },
  { slug: 'pdf-to-excel', label: 'PDF to Excel',       category: 'convert',  description: 'Pull tables and data from PDFs directly into spreadsheets.',                icon: 'pdf-to-excel', colorFrom: '#16a34a', colorTo: '#4ade80', acceptedFormats: ['.pdf'],                         outputFormat: 'xlsx' },
  { slug: 'pdf-to-jpg',   label: 'PDF to JPG',         category: 'convert',  description: 'Convert each PDF page into a JPG or extract all images.',                  icon: 'pdf-to-jpg',  colorFrom: '#d97706', colorTo: '#fcd34d', acceptedFormats: ['.pdf'],                         outputFormat: 'zip' },
  { slug: 'html-to-pdf',  label: 'HTML to PDF',        category: 'convert',  description: 'Convert any webpage to PDF by pasting the URL.',                           icon: 'html-to-pdf', colorFrom: '#dc2626', colorTo: '#fb7185', acceptedFormats: ['.html'],                        outputFormat: 'pdf' },
  { slug: 'word-to-pdf',  label: 'Word to PDF',        category: 'convert',  description: 'Convert DOC and DOCX files to PDF instantly.',                             icon: 'word-to-pdf', colorFrom: '#1d4ed8', colorTo: '#93c5fd', acceptedFormats: ['.doc', '.docx'],               outputFormat: 'pdf' },
  { slug: 'ppt-to-pdf',   label: 'PowerPoint to PDF',  category: 'convert',  description: 'Convert PPT/PPTX slide decks to PDF.',                                    icon: 'ppt-to-pdf',  colorFrom: '#b45309', colorTo: '#fbbf24', acceptedFormats: ['.ppt', '.pptx'],               outputFormat: 'pdf' },
  { slug: 'excel-to-pdf', label: 'Excel to PDF',       category: 'convert',  description: 'Turn XLSX spreadsheets into high-quality PDF files.',                      icon: 'excel-to-pdf', colorFrom: '#15803d', colorTo: '#86efac', acceptedFormats: ['.xls', '.xlsx'],               outputFormat: 'pdf' },
  { slug: 'jpg-to-pdf',   label: 'JPG to PDF',         category: 'convert',  description: 'Convert JPG images to PDF. Adjust orientation and margins.',               icon: 'jpg-to-pdf',  colorFrom: '#7c3aed', colorTo: '#c4b5fd', acceptedFormats: ['.jpg', '.jpeg', '.png'],       outputFormat: 'pdf' },
  { slug: 'merge-image',  label: 'Merge Image',        category: 'convert',  description: 'Combine multiple images (JPG, PNG) into a single PDF.',                    icon: 'merge-image', colorFrom: '#0d9488', colorTo: '#5eead4', acceptedFormats: ['.jpg', '.jpeg', '.png'],       outputFormat: 'pdf', isNew: true },
  { slug: 'protect',      label: 'Protect PDF',        category: 'security', description: 'Encrypt PDF files with a password to prevent unauthorized access.',        icon: 'protect', colorFrom: '#dc2626', colorTo: '#fca5a5', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'unlock',       label: 'Unlock PDF',         category: 'security', description: 'Remove PDF password security for free and unrestricted use.',              icon: 'unlock', colorFrom: '#ca8a04', colorTo: '#fde68a', acceptedFormats: ['.pdf'],                         outputFormat: 'pdf' },
  { slug: 'ocr',          label: 'Extract Text with OCR', category: 'optimize', description: 'Extract selectable text from scanned PDF files into a TXT document.',      icon: 'ocr', colorFrom: '#059669', colorTo: '#6ee7b7', acceptedFormats: ['.pdf'],                         outputFormat: 'txt' },
];

async function autoSeed() {
  try {
    const count = await Tool.countDocuments();
    if (count > 0) {
      console.log(`✅ Tools already seeded (${count} tools)`);
      return;
    }
    await Tool.insertMany(tools);
    console.log(`✅ Auto-seeded ${tools.length} tools`);
  } catch (err) {
    console.error('❌ Auto-seed failed:', err.message);
  }
}

module.exports = { autoSeed };
