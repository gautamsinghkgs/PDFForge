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

              <div className={styles.sideCard}>
                <h4>🔑 Powered by</h4>
                <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.7 }}>
                  Processed on this server with pdf-lib, Ghostscript, LibreOffice, and other open tools — no third-party PDF API required.
                </p>
              </div>

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
        </div>
      </div>

    {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
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
