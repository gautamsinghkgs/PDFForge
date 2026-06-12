import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiDownload, FiCheckCircle, FiAlertCircle, FiFile, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import FileDropzone from '../components/ui/FileDropzone';
import LoginModal from '../components/ui/LoginModal';
import api from '../utils/api';
import { downloadOutputFile } from '../utils/downloadFile';
import { parseByteSize, formatFileSize } from '../utils/byteSize';
import { getToolIcon } from '../utils/toolIcons';
import { useAuth } from '../context/AuthContext';
import { getGuestId, GUEST_LIMIT } from '../utils/guestLimit';
import styles from './ToolPage.module.css';

const CAT_COLORS = {
  organize:'#ff6b35', optimize:'#4caf50', convert:'#2196f3',
  edit:'#9c27b0', security:'#f44336', ai:'#6c63ff',
};

export default function ToolPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [tool, setTool] = useState(null);
  const [files, setFiles] = useState([]);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toolLoading, setToolLoading] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [guestRemaining, setGuestRemaining] = useState(5);

  useEffect(() => {
    setFiles([]); setResult(null); setError('');
    setOptions(slug === 'ocr' ? { lang: 'eng' } : {});
    setToolLoading(true);
    api.get(`/tools/${slug}/info`)
      .then(({ data }) => setTool(data.tool))
      .catch(() => setTool(null))
      .finally(() => setToolLoading(false));
    // Fetch guest remaining uses
    if (!user) {
      api.get(`/tools/guest-remaining?guestId=${getGuestId()}`)
        .then(({ data }) => {
          if (data.remaining !== undefined) setGuestRemaining(data.remaining);
        })
        .catch(() => {});
    }
  }, [slug]);

  const handleProcess = async () => {
    const htmlByUrl =
      slug === 'html-to-pdf' && String(options.url || options.html_url || '').trim().length > 0;
    if (!files.length && !htmlByUrl) {
      toast.error('Please select a file first');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    Object.entries(options).forEach(([k,v]) => fd.append(k, v));
    if (!user) {
      fd.append('guestId', getGuestId());
    }
    try {
      const { data } = await api.post(`/tools/${slug}/process`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.needGuestId) {
        fd.set('guestId', data.guestId || getGuestId());
        const retry = await api.post(`/tools/${slug}/process`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (retry.data.success) {
          setResult(retry.data.data);
          if (retry.data.data?.guestRemaining !== undefined) {
            setGuestRemaining(retry.data.data.guestRemaining);
          }
        } else {
          throw new Error(retry.data.message || 'Processing failed');
        }
        return;
      }
      const payload = data?.data;
      if (payload) {
        const bytes = parseByteSize(payload.fileSizeBytes ?? payload.size);
        setResult({ ...payload, size: bytes });
        if (payload.guestRemaining !== undefined) {
          setGuestRemaining(payload.guestRemaining);
        }
        
        // Show compression note if present
        if (payload.compressionNote) {
          toast(payload.compressionNote, { 
            icon: 'ℹ️',
            duration: 5000,
            style: {
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #0ea5e9'
            }
          });
        }
      } else {
        setResult(null);
      }
      toast.success('Done!');
    } catch(err) {
      const msg = err.response?.data?.message || 'Processing failed.';
      if (msg === 'GUEST_LIMIT_REACHED') {
        setShowLoginModal(true);
        setLoading(false);
        return;
      }
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleDownload = async () => {
    if (!result?.downloadUrl) return;
    setDownloadBusy(true);
    try {
      const blobSize = await downloadOutputFile({
        downloadUrl: result.downloadUrl,
        filename: result.filename,
      });
      if (blobSize > 0) {
        setResult((r) => (r ? { ...r, size: blobSize } : r));
      }
    } catch (e) {
      toast.error(e.message || 'Download failed');
    } finally {
      setDownloadBusy(false);
    }
  };

  if (toolLoading) return (
    <div style={{ display:'flex',justifyContent:'center',padding:'100px 0' }}>
      <div className="spinner" style={{ width:32,height:32,borderWidth:3 }}/>
    </div>
  );
  if (!tool) return (
    <div style={{ textAlign:'center',padding:'80px 24px' }}>
      <p style={{ fontSize:'3rem', marginBottom:'12px' }}>🔍</p>
      <h2 style={{ marginBottom:'16px', fontWeight:800 }}>Tool not found</h2>
      <Link to="/" className="btn-primary">← Browse all tools</Link>
    </div>
  );

  const color = CAT_COLORS[tool.category] || '#ff2116';
  const hasHtmlUrl =
    slug === 'html-to-pdf' && String(options.url || options.html_url || '').trim().length > 0;
  const canProcess = (files.length > 0 || hasHtmlUrl);
  const acceptMap = (tool.acceptedFormats||[]).reduce((acc,ext) => {
    const m = {
      '.pdf':'application/pdf',
      '.doc':'application/msword',
      '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls':'application/vnd.ms-excel',
      '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt':'application/vnd.ms-powerpoint',
      '.html':'text/html',
      '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp',
    }[ext] || 'application/octet-stream';
    acc[m] = []; return acc;
  }, {});

  const isMulti = ['merge', 'jpg-to-pdf', 'compare', 'merge-image'].includes(slug);
  const primaryFormat = tool.acceptedFormats?.[0]?.replace('.', '').toUpperCase() || 'file';
  const dropzoneLabel = `Select ${primaryFormat} file`;

  return (
    <>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <div className="container">
          <Link to="/">PDF Tools</Link>
          <span>/</span>
          <span>{tool.label}</span>
        </div>
      </div>

      <div className={styles.pageWrap}>
        <div className="container">
          <div className={styles.layout}>
            {/* ── Main panel ── */}
            <div className={styles.main}>
              {/* Tool header */}
              <div className={styles.toolHeader}>
                <div className={styles.toolIconBig} style={{ background:`${color}18`, color }}>
                  {getToolIcon(slug)}
                </div>
                <div>
                  <div className={styles.toolTitleRow}>
                    <h1 className={styles.toolTitle}>{tool.label}</h1>
                    {tool.isNew     && <span className="badge badge-new">NEW</span>}
                    {tool.isPremium && <span className="badge badge-pro">PRO</span>}
                  </div>
                  <p className={styles.toolDesc}>{tool.description}</p>
                  <div className={styles.toolMeta}>
                    <span>Input: {tool.acceptedFormats?.join(', ')}</span>
                    <span>·</span>
                    <span>Output: .{tool.outputFormat}</span>
                  </div>
                </div>
              </div>

              <div className={styles.uploadCard}>
                  <FileDropzone
                    files={files}
                    setFiles={setFiles}
                    accept={acceptMap}
                    multiple={isMulti}
                    label={dropzoneLabel}
                  />
                  <ToolOptions slug={slug} options={options} setOptions={setOptions}/>

                  {!user && (
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center', marginBottom:8 }}>
                      {guestRemaining} / {GUEST_LIMIT} free uses remaining · <Link to="/login" style={{ color:'var(--accent)' }}>Log in</Link> for unlimited
                    </div>
                  )}
                  <button
                    className={styles.processBtn}
                    onClick={handleProcess}
                    disabled={loading || !canProcess}
                    style={{ '--btn-color': color }}
                  >
                    {loading
                      ? <><div className={styles.spinner}/> Processing…</>
                      : <>{tool.label} →</>
                    }
                  </button>

                  {error && (
                    <motion.div className={styles.errorBox} initial={{ opacity:0 }} animate={{ opacity:1 }}>
                      <FiAlertCircle size={16}/>
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {result && (
                    <motion.div className={styles.resultBox} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}>
                      <FiCheckCircle size={28} color="#4caf50"/>
                      <div className={styles.resultInfo}>
                        <h3>Your file is ready!</h3>
                        <p className={styles.resultMeta}>
                          <FiFile size={13}/> {result.filename} — {formatFileSize(result.size)}
                        </p>
                        
                        {/* Layout preservation notice for PDF to Office conversions */}
                        {(slug === 'pdf-to-word' || slug === 'pdf-to-excel') && (
                          <div style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            background: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#856404'
                          }}>
                            <strong>📋 Note:</strong> This preserves text content and basic table structure. 
                            Complex layouts, images, and advanced formatting may differ from the original PDF.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.downloadBtn}
                        disabled={downloadBusy}
                        onClick={handleDownload}
                      >
                        {downloadBusy ? <><div className={styles.spinner} style={{borderTopColor:'#fff',borderWidth:2,marginRight:8}}/>Downloading…</> : <><FiDownload size={15}/> Download</>}
                      </button>
                    </motion.div>
                  )}
                </div>
            </div>

            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>
              <div className={styles.sideCard}>
                <h4><FiInfo size={14}/> How to use</h4>
                <ol className={styles.howList}>
                  <li>Upload your {tool.acceptedFormats?.[0] || 'file'}{isMulti ? '(s)' : ''}</li>
                  {slug !== 'merge' && slug !== 'split' && <li>Adjust settings if needed</li>}
                  <li>Click "{tool.label}"</li>
                  <li>Download your result</li>
                </ol>
              </div>

              <div className={styles.sideCard}>
                <h4>🔒 Privacy</h4>
                <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.7 }}>
                  Output files are available through expiring links and deleted after 1 hour.
                  We never read or share your documents.
                </p>
              </div>

              {tool.isPremium && (
                <div className={styles.sideCard} style={{ borderColor:'#ffe082', background:'#fffde7' }}>
                  <h4 style={{ color:'#f57f17' }}>⭐ Premium Feature</h4>
                  <p style={{ fontSize:'0.82rem', color:'#795548', lineHeight:1.7 }}>
                    Upgrade to Pro for unlimited access to this tool.
                  </p>
                  <Link to="/pricing" style={{ display:'inline-block', marginTop:'10px', fontSize:'0.84rem', color:'#f57f17', fontWeight:700 }}>
                    View Pricing →
                  </Link>
                </div>
              )}

              {['pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt'].includes(slug) && (
                <div className={styles.sideCard} style={{ borderColor:'#bbdefb', background:'#f3f8ff' }}>
                  <h4 style={{ color:'#1565c0' }}>PDF → Office: expectations</h4>
                  <p style={{ fontSize:'0.82rem', color:'#37474f', lineHeight:1.75 }}>
                    On your own server we mainly recover text. Fonts, exact tables, and page layout often change — that is normal for LibreOffice and text-based fallbacks.
                    {slug === 'pdf-to-ppt' && (
                      <> When LibreOffice cannot build a deck, the text fallback builds slides from each PDF page (long pages split across slides), A4-sized like the first PDF page orientation. Output file size grows with page count and text length. </>
                    )}
                    Services like iLovePDF run proprietary cloud pipelines tuned for layout; their REST API is documented publicly, but their server implementation is not open source.
                  </p>
                </div>
              )}
            </aside>
          </div>
          <ToolSeoContent slug={slug} tool={tool} />
        </div>
      </div>

    {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
}

// ── SEO content per tool ─────────────────────────────────────
const SEO_CONTENT = {
  'merge': {
    title: 'Merge PDF Files Online Free',
    paragraphs: [
      'Combine multiple PDF files into a single document with PDFForge free Merge PDF tool. Upload two or more PDF files, arrange them in your preferred order, and instantly download the merged result. No signup required for basic use.',
      'Our Merge PDF tool supports unlimited PDF files in a single session. The files are processed in the order you upload them. Use this tool to combine chapters, consolidate reports, merge scanned documents, or create a unified PDF from multiple sources.',
      'Merging PDFs is useful for professionals who receive separate attachments and need one cohesive file. Students can combine lecture notes, business users can merge invoices, and anyone can consolidate related documents into one organized PDF.',
    ],
  },
  'split': {
    title: 'Split PDF Pages Online Free',
    paragraphs: [
      'Split a large PDF into multiple smaller files using PDFForge free Split PDF tool. Choose to split every page into individual files, extract specific page ranges, or remove unwanted pages from your document.',
      'The Split PDF tool offers three modes: "Split all pages" creates one file per page, "By fixed ranges" groups pages into chunks (e.g., every 2 pages), and "Remove pages" deletes selected pages while keeping the rest. All processing happens on our secure servers.',
      'Splitting PDFs helps when you need to share only specific sections of a document. Remove cover pages, extract chapters, or break a large report into manageable parts. Your files are automatically deleted after processing.',
    ],
  },
  'compress': {
    title: 'Compress PDF Files Online Free — Reduce PDF Size',
    paragraphs: [
      'Reduce the size of your PDF files without losing quality using PDFForge free Compress PDF tool. Choose from three compression levels: Extreme for maximum size reduction, Recommended for balanced quality and size, or Less compression for minimal changes.',
      'Large PDF files can be difficult to email or upload. Our compression tool reduces file size by optimizing images, removing redundant data, and applying efficient encoding. Perfect for making documents email-friendly or saving storage space.',
      'Compressed PDFs load faster on websites and use less bandwidth when shared. Whether you need to meet an email attachment limit or free up disk space, PDFForge compression delivers results in seconds.',
    ],
  },
  'rotate': {
    title: 'Rotate PDF Pages Online Free',
    paragraphs: [
      'Fix incorrectly oriented PDF pages with PDFForge free Rotate PDF tool. Rotate pages 90 degrees clockwise, 180 degrees, or 90 degrees counter-clockwise. All pages in the document are rotated uniformly.',
      'Scanned documents often come out sideways or upside down. Instead of straining your neck or printing and re-scanning, use our Rotate PDF tool to fix orientation in one click. Works with any PDF file.',
      'Rotating PDFs is essential when dealing with documents from different sources — scanned contracts, imported images, or downloaded files may have mixed page orientations. Set them right with PDFForge.',
    ],
  },
  'pagenumbers': {
    title: 'Add Page Numbers to PDF Online Free',
    paragraphs: [
      'Add page numbers to your PDF documents with PDFForge free Page Numbers tool. Choose where to display numbers — bottom center, bottom right, top center, and more. Customize the starting number and format.',
      'Professional documents need page numbers for easy reference. Add them to reports, ebooks, manuals, theses, or legal documents. Our tool inserts page numbers without affecting the existing content.',
      'Page numbers make navigation easier for readers. Whether you are preparing a business proposal or formatting a book manuscript, PDFForge helps you add page numbers quickly and accurately.',
    ],
  },
  'watermark': {
    title: 'Add Watermark to PDF Online Free',
    paragraphs: [
      'Protect your PDF documents by adding text watermarks with PDFForge free Watermark tool. Type your watermark text — such as "CONFIDENTIAL", "DRAFT", or "SAMPLE" — and it will be applied across all pages.',
      'Watermarks help protect your intellectual property and indicate document status. Mark drafts as "DRAFT" to prevent premature distribution, or mark sensitive documents as "CONFIDENTIAL" to remind readers of handling requirements.',
      'Adding watermarks is a simple yet effective way to communicate document status or ownership. Use PDFForge to watermark contracts, proposals, designs, or any PDF before sharing.',
    ],
  },
  'pdfa': {
    title: 'Convert PDF to PDF/A Online Free',
    paragraphs: [
      'Convert your PDF files to PDF/A format for long-term archiving with PDFForge free PDF/A tool. Choose from PDF/A-1b, PDF/A-2b, or PDF/A-3b compliance levels depending on your archiving requirements.',
      'PDF/A is an ISO-standardized version of PDF designed for digital preservation. It ensures documents look the same when viewed years later by embedding all fonts, prohibiting external dependencies, and requiring self-contained metadata.',
      'Government agencies, legal firms, and archives often require PDF/A submission. Convert your regular PDFs to PDF/A compliant format with PDFForge and ensure your documents stand the test of time.',
    ],
  },
  'pdf-to-word': {
    title: 'Convert PDF to Word (DOC/DOCX) Online Free',
    paragraphs: [
      'Convert PDF files to editable Word documents with PDFForge free PDF to Word converter. Extract text content from PDFs and get DOCX files that you can edit in Microsoft Word, Google Docs, or LibreOffice.',
      'Need to edit text from a PDF but do not have the original source file? Our PDF to Word converter extracts text content while preserving basic structure. Perfect for repurposing content from reports, articles, or scanned documents.',
      'PDF to Word conversion is one of the most requested document tasks. Students convert research papers, professionals repurpose reports, and anyone who needs to edit a PDF without starting from scratch uses this tool.',
    ],
  },
  'pdf-to-ppt': {
    title: 'Convert PDF to PowerPoint (PPT/PPTX) Online Free',
    paragraphs: [
      'Turn your PDF files into editable PowerPoint presentations with PDFForge free PDF to PPT converter. Each PDF page becomes a slide in the resulting PPTX file, ready for further editing.',
      'Converting PDF to PPT is useful when you receive a presentation in PDF format but need to edit or present it in PowerPoint. Our tool rebuilds slides from PDF pages, preserving text content and basic structure.',
      'Business professionals and educators frequently need to convert PDFs back to editable formats. PDFForge makes it simple — upload, convert, and download your editable PowerPoint file in seconds.',
    ],
  },
  'pdf-to-excel': {
    title: 'Convert PDF to Excel (XLS/XLSX) Online Free',
    paragraphs: [
      'Extract tables and data from PDF files into editable Excel spreadsheets with PDFForge free PDF to Excel converter. Get XLSX files that you can edit in Microsoft Excel, Google Sheets, or LibreOffice Calc.',
      'PDF to Excel conversion helps when you receive financial reports, data tables, or forms in PDF format but need to analyze the data in a spreadsheet. Our tool recovers text content and basic table structure.',
      'Data analysts, accountants, and researchers frequently need to convert PDF tables into editable spreadsheets. PDFForge simplifies this workflow — upload your PDF and download a working Excel file.',
    ],
  },
  'pdf-to-jpg': {
    title: 'Convert PDF to JPG Images Online Free',
    paragraphs: [
      'Convert each page of your PDF into high-quality JPG images with PDFForge free PDF to JPG converter. Choose from 72 DPI (low), 150 DPI (medium), or 300 DPI (high) output quality depending on your needs.',
      'PDF to JPG conversion is useful when you need to use PDF pages as images in presentations, websites, social media posts, or documents. Each page is rendered as a separate JPG image file.',
      'Whether you need thumbnails for quick previews or high-resolution images for printing, PDFForge PDF to JPG converter handles it. Upload your PDF, select quality, and download individual JPG files per page.',
    ],
  },
  'html-to-pdf': {
    title: 'Convert HTML to PDF Online Free — Webpage to PDF',
    paragraphs: [
      'Convert any webpage or HTML file to PDF with PDFForge free HTML to PDF converter. Enter a URL or upload an HTML file, and get a clean PDF rendering of the web content.',
      'Save web articles, documentation pages, receipts, or any online content as PDF files for offline reading or archiving. Our tool renders the page using a full browser engine for accurate results.',
      'HTML to PDF conversion is essential for saving online content, creating printable versions of web pages, or generating PDF invoices from HTML templates. PDFForge makes it easy and free.',
    ],
  },
  'word-to-pdf': {
    title: 'Convert Word to PDF Online Free — DOC/DOCX to PDF',
    paragraphs: [
      'Convert Microsoft Word documents (DOC/DOCX) to PDF format with PDFForge free Word to PDF converter. Upload your file and download a perfectly formatted PDF — no software installation needed.',
      'Word to PDF conversion ensures your document looks the same on any device. Fonts, layout, images, and formatting are preserved in the PDF output. Perfect for sharing documents professionally.',
      'Whether you are sending a resume, a business proposal, or a report, converting Word to PDF ensures the recipient sees exactly what you intended. PDFForge handles the conversion quickly and securely.',
    ],
  },
  'ppt-to-pdf': {
    title: 'Convert PowerPoint to PDF Online Free — PPT/PPTX to PDF',
    paragraphs: [
      'Convert PowerPoint presentations (PPT/PPTX) to PDF format with PDFForge free PPT to PDF converter. Each slide becomes a PDF page, preserving your presentation layout and content.',
      'Converting PowerPoint to PDF is ideal when you need to share presentations that cannot be edited. PDF files are smaller, universal, and professional. Perfect for distributing slide decks to clients or colleagues.',
      'PPT to PDF conversion locks in your formatting so slides look identical on any device. Use PDFForge to convert presentations for handouts, archives, or distribution without worrying about font or version issues.',
    ],
  },
  'excel-to-pdf': {
    title: 'Convert Excel to PDF Online Free — XLS/XLSX to PDF',
    paragraphs: [
      'Convert Excel spreadsheets (XLS/XLSX) to PDF format with PDFForge free Excel to PDF converter. Your tables, charts, and data are preserved in the PDF output.',
      'Excel to PDF conversion is useful when sharing financial data, reports, or invoices. PDF ensures the recipient sees exactly your formatting — no missing fonts or shifted columns.',
      'Send professional PDF reports from your Excel data. PDFForge converts spreadsheets to clean PDF files that can be viewed on any device. Upload, convert, and download in seconds.',
    ],
  },
  'jpg-to-pdf': {
    title: 'Convert JPG Images to PDF Online Free — Image to PDF',
    paragraphs: [
      'Convert JPG, PNG, WEBP, and other images to PDF format with PDFForge free Image to PDF converter. Upload one or multiple images and combine them into a single PDF document.',
      'Our Image to PDF tool supports multiple images in one session. Arrange images in your preferred order and download them as a unified PDF. Perfect for creating photo albums, scanning documents, or converting camera shots to PDF.',
      'Whether you are digitizing printed documents, creating a portfolio, or combining scanned pages, PDFForge Image to PDF converter handles multiple formats and delivers a clean PDF output.',
    ],
  },
  'merge-image': {
    title: 'Merge Images into PDF Online Free',
    paragraphs: [
      'Combine multiple images into a single PDF document with PDFForge free Merge Images tool. Choose between A4 single page layout (all images on one page) or A4 multi-page (images distributed across pages).',
      'Our Merge Images tool offers two layout options: Single Page arranges all images on one A4 page, while Multi-Page distributes images across multiple A4 pages. Choose High or Low quality output depending on your needs.',
      'Merging images into PDF is useful for creating photo albums, combining scanned documents, or preparing image collections for sharing. PDFForge gives you flexible layout options.',
    ],
  },
  'protect': {
    title: 'Protect PDF with Password Online Free',
    paragraphs: [
      'Add password protection to your PDF files with PDFForge free Protect PDF tool. Set a password that recipients must enter to open your document. Choose any password you like.',
      'Password-protecting PDFs prevents unauthorized access to sensitive documents. Use this tool to secure contracts, financial statements, personal records, or any confidential information before sharing.',
      'PDF protection is essential for document security. PDFForge applies strong encryption to your PDF, ensuring only people with the password can view the content. Your privacy matters.',
    ],
  },
  'unlock': {
    title: 'Unlock PDF — Remove Password from PDF Online Free',
    paragraphs: [
      'Remove password protection from PDF files with PDFForge free Unlock PDF tool. If you know the password, you can remove it to create an unrestricted PDF that anyone can open.',
      'Forgot you password-protected a PDF and need to open it? Or received a protected document and have the password? Our Unlock PDF tool removes the password restriction so the file opens freely.',
      'Unlocking PDFs is useful when password protection is no longer needed. Remove passwords from your own documents for easier sharing and access. PDFForge handles the process securely.',
    ],
  },
  'ocr': {
    title: 'OCR PDF Online Free — Extract Text from Scanned PDF',
    paragraphs: [
      'Extract text from scanned PDFs and images using PDFForge free OCR (Optical Character Recognition) tool. Convert scanned documents into searchable and editable text.',
      'OCR technology recognizes text in scanned images and makes it editable. Use OCR to digitize printed documents, extract quotes from books, or make scanned paperwork searchable.',
      'PDFForge OCR uses Tesseract.js to recognize English text from scanned PDFs. Transform your paper documents into digital, searchable text — perfect for archiving and data extraction.',
    ],
  },
};

function ToolSeoContent({ slug, tool }) {
  const content = SEO_CONTENT[slug];
  if (!content || !tool) return null;
  return (
    <section style={{ marginTop: 40, marginBottom: 40 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 800, marginBottom: 16 }}>{content.title}</h2>
      {content.paragraphs.map((p, i) => (
        <p key={i} style={{ color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 12, fontSize: "0.92rem" }}>{p}</p>
      ))}
    </section>
  );
}

// ── Per-tool options ──────────────────────────────────────────
function ToolOptions({ slug, options, setOptions }) {
  const set = useCallback((k,v) => setOptions(p => ({ ...p, [k]:v })), [setOptions]);

  const Group = ({ label, children }) => (
    <div className={styles.optGroup}>
      <p className={styles.optLabel}>{label}</p>
      <div className={styles.optRow}>{children}</div>
    </div>
  );
  const Btn = ({ label, field, value, onClick }) => {
    const isSelected = options[field] === value;
    const handleClick = () => {
      if (onClick) {
        onClick();
      } else {
        // Toggle: if already selected, deselect it
        set(field, isSelected ? null : value);
      }
    };
    return (
      <button
        className={`${styles.optBtn} ${isSelected ? styles.optBtnOn : ''}`}
        onClick={handleClick}
      >{label}</button>
    );
  };

  switch(slug) {
    case 'compress': return (
      <Group label="Compression Level">
        <Btn label="Extreme" field="level" value="extreme"/>
        <Btn label="Recommended ✓" field="level" value="recommended"/>
        <Btn label="Less compression" field="level" value="low"/>
      </Group>
    );
    case 'merge-image': return (
      <>
        <Group label="Merge Layout">
          <Btn 
            label="A4 Single Page" 
            field="a4mode" 
            value="true"
            onClick={() => {
              if (options.a4mode === 'true') {
                set('a4mode', null);
              } else {
                set('a4mode', 'true');
                set('multipage', null);
              }
            }}
          />
          <Btn 
            label="A4 Multi-Page 📄" 
            field="multipage" 
            value="true"
            onClick={() => {
              if (options.multipage === 'true') {
                set('multipage', null);
              } else {
                set('multipage', 'true');
                set('a4mode', null);
              }
            }}
          />
        </Group>
        <Group label="Output Quality">
          <Btn label="High Quality" field="quality" value="high"/>
          <Btn label="Low Quality" field="quality" value="low"/>
        </Group>
        {(options.a4mode || options.multipage) && (
          <Group label="Layout Info">
            <p style={{color: '#666', fontSize: '12px', margin: 0}}>
              {options.multipage 
                ? 'Images distributed across multiple A4 pages with equal space.'
                : 'Images arranged on single A4 page with equal space.'}
            </p>
          </Group>
        )}
      </>
    );
    case 'rotate': return (
      <Group label="Rotation">
        <Btn label="90° Clockwise" field="angle" value="90"/>
        <Btn label="180°" field="angle" value="180"/>
        <Btn label="90° Counter-clockwise" field="angle" value="-90"/>
      </Group>
    );
    case 'split': return (
      <>
        <Group label="Split Mode">
          <Btn label="Split all pages" field="splitBy" value="pages"/>
          <Btn label="By fixed ranges" field="splitBy" value="fixed_range"/>
          <Btn label="Remove pages" field="splitBy" value="remove_pages"/>
        </Group>
        {options.splitBy === 'fixed_range' && (
          <Group label="Pages per file">
            <input
              className={styles.optInput}
              type="number"
              min={1}
              placeholder="e.g. 2"
              value={options.fixed_range ?? ''}
              onChange={(e) => set('fixed_range', e.target.value)}
            />
          </Group>
        )}
        {options.splitBy === 'remove_pages' && (
          <Group label="Pages to remove (1-based, comma-separated)">
            <input
              className={styles.optInput}
              type="text"
              placeholder="e.g. 1,3,5"
              value={options.remove_pages ?? ''}
              onChange={(e) => set('remove_pages', e.target.value)}
            />
          </Group>
        )}
      </>
    );
    case 'watermark': return (
      <Group label="Watermark Text">
        <input
          className={styles.optInput}
          type="text"
          placeholder="Enter watermark text (e.g. CONFIDENTIAL)"
          value={options.text || ''}
          onChange={e => set('text', e.target.value)}
        />
      </Group>
    );
    case 'pdf-to-jpg': return (
      <Group label="Image Quality">
        <Btn label="Low (72 DPI)" field="dpi" value="72"/>
        <Btn label="Medium (150 DPI)" field="dpi" value="150"/>
        <Btn label="High (300 DPI)" field="dpi" value="300"/>
      </Group>
    );
    case 'ocr': return (
      <div style={{ fontSize:'12px', color:'#666', padding:'8px 0' }}>
        Extracts English text from scanned PDFs.
      </div>
    );
    case 'protect': return (
      <Group label="Password Protection">
        <input
          className={styles.optInput}
          type="password"
          placeholder="Set password"
          value={options.password || ''}
          onChange={(e) => set('password', e.target.value)}
          autoFocus
        />
      </Group>
    );
    case 'unlock': return (
      <Group label="PDF Password (if known)">
        <input
          className={styles.optInput}
          type="password"
          placeholder="Enter PDF password"
          value={options.password || ''}
          onChange={(e) => set('password', e.target.value)}
        />
      </Group>
    );
    case 'pdfa': return (
      <Group label="Conformance Level">
        <Btn label="PDF/A-1b" field="conformance" value="pdfa-1b"/>
        <Btn label="PDF/A-2b" field="conformance" value="pdfa-2b"/>
        <Btn label="PDF/A-3b" field="conformance" value="pdfa-3b"/>
      </Group>
    );
    case 'html-to-pdf': return (
      <Group label="Webpage URL (optional if you upload an .html file)">
        <input
          className={styles.optInput}
          type="url"
          placeholder="https://example.com"
          value={options.url ?? ''}
          onChange={(e) => set('url', e.target.value)}
        />
      </Group>
    );
    default: return null;
  }
}
