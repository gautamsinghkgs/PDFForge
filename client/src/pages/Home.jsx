import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import api from '../utils/api';
import { getToolIcon } from '../utils/toolIcons';
import styles from './Home.module.css';

const CATS = [
  { key:'all',      label:'All PDF Tools', icon:'⬡' },
  { key:'organize', label:'Organize',       icon:'🗂' },
  { key:'optimize', label:'Optimize',       icon:'⚡' },
  { key:'convert',  label:'Convert',        icon:'🔄' },
  { key:'edit',     label:'Edit',           icon:'✏️' },
  { key:'security', label:'Security',       icon:'🔒' },
];

// Color palette per category (ilovepdf style)
const CAT_COLORS = {
  organize: '#ff6b35',
  optimize: '#4caf50',
  convert:  '#2196f3',
  edit:     '#9c27b0',
  security: '#f44336',
  ai:       '#6c63ff',
};

export default function Home() {
  const [tools, setTools]     = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const retryCountRef         = useRef(0);

  const loadTools = () => {
    setLoading(true);
    setError('');
    api.get('/tools')
      .then(({ data }) => {
        setTools(data.tools || []);
        retryCountRef.current = 0;
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 503 || status === 502 || !status) {
          setError('Server is starting up. Please wait a moment and try again.');
        } else {
          setError('Failed to load tools. Check your connection.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTools();
  }, []);

  // Auto-retry then full page reload as final fallback
  useEffect(() => {
    if (error && error.includes('starting up')) {
      retryCountRef.current += 1;
      if (retryCountRef.current >= 2) {
        window.location.reload();
        return;
      }
      const timer = setTimeout(loadTools, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const filtered = useMemo(() => {
    let list = tools;
    if (activeTab !== 'all') list = list.filter(t => t.category === activeTab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t =>
        t.label.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tools, activeTab, query]);

  return (
    <div>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className="container">
          <motion.div className={styles.heroContent} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
            <h1 className={styles.heroTitle}>
              Every PDF tool you need,
              <span className={styles.heroAccent}> in one place</span>
            </h1>
            <p className={styles.heroSub}>
              Merge, split, compress, convert, edit, sign and secure your PDF files.
            </p>

            {/* ── SEARCH BOX ── */}
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} size={18}/>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search PDF tools… (e.g. compress, word to pdf)"
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveTab('all'); }}
              />
              {query && (
                <button className={styles.searchClear} onClick={() => setQuery('')}>
                  <FiX size={16}/>
                </button>
              )}
            </div>

            {/* Quick stats */}
            <div className={styles.statsRow}>
              <span className={styles.stat}><b>{tools.length}</b> Enabled Tools</span>
              <span className={styles.statDot}/>
              <span className={styles.stat}><b>100%</b> Free</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TOOLS SECTION ── */}
      <section className={styles.toolsSection}>
        <div className="container">
          {/* Category tabs */}
          {!query && (
            <div className={styles.tabs}>
              {CATS.map(c => (
                <button
                  key={c.key}
                  className={`${styles.tab} ${activeTab === c.key ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(c.key)}
                >
                  <span className={styles.tabIcon}>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Search results header */}
          {query && (
            <div className={styles.searchHeader}>
              <span>Results for "<strong>{query}</strong>"</span>
              <span className={styles.resultCount}>{filtered.length} tool{filtered.length !== 1 ? 's' : ''} found</span>
            </div>
          )}

          {/* Tools grid */}
          {loading ? (
            <div>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.85rem' }}>
                Loading tools{loading ? '…' : ''}
              </p>
              <div className={styles.grid}>
                {[...Array(12)].map((_, i) => <div key={i} className={styles.skeletonCard}/>)}
              </div>
            </div>
          ) : error ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>⚠️</span>
              <p>{error}</p>
              <button className={styles.emptyBtn} onClick={loadTools}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🔍</span>
              <p>No tools found for "<strong>{query}</strong>"</p>
              <button className={styles.emptyBtn} onClick={() => { setQuery(''); setActiveTab('all'); }}>
                Show all tools
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + query}
                className={styles.grid}
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration: 0.2 }}
              >
                {filtered.map((tool, i) => (
                  <ToolCard key={tool.slug} tool={tool} index={i}/>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* ── SEO CONTENT ── */}
      <section style={{ padding:'48px 24px', background:'#fff', borderTop:'1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth:720, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:800, marginBottom:16 }}>Free Online PDF Tools — No Installation Required</h2>
          <p style={{ color:'var(--text-muted)', lineHeight:1.8, marginBottom:16 }}>
            PDFForge is a free online PDF toolkit that lets you merge, split, compress, convert, edit, sign, and secure PDF files directly in your browser. No software download or installation needed. Upload a file, choose your tool, and download the result — it's that simple.
          </p>
          <p style={{ color:'var(--text-muted)', lineHeight:1.8, marginBottom:16 }}>
            Need to convert a PDF to Word for editing? Use our PDF to Word converter. Want to combine multiple PDFs into one? The Merge PDF tool handles it in seconds. Compress large PDF files for email, unlock protected PDFs, add watermarks, extract text with OCR, and more — all from one place.
          </p>
          <p style={{ color:'var(--text-muted)', lineHeight:1.8 }}>
            PDFForge works on any device: desktop, tablet, or phone. Files are processed securely on our servers and automatically deleted within one hour. Create a free account to unlock higher usage limits, file history, and priority processing. Upgrade to Pro or Enterprise for unlimited access.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>How PDFForge works</h2>
          <div className={styles.steps}>
            {[
              { n:'1', icon:'📁', title:'Select your file', desc:'Upload from device, Google Drive, or Dropbox.' },
              { n:'2', icon:'⚙️', title:'Process your PDF', desc:'Our servers handle the work — fast and secure.' },
              { n:'3', icon:'⬇️', title:'Download result', desc:'Download the generated file through an expiring private link.' },
            ].map((s,i) => (
              <div key={i} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <div className={styles.stepIconWrap}>{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST SECTION ── */}
      <section className={styles.trustSection}>
        <div className="container">
          <div className={styles.trustGrid}>
            {[
              { icon:'🔐', title:'Private links', desc:'Downloads use expiring signed links instead of public upload paths.' },
              { icon:'🗑️', title:'Auto-deleted', desc:'Output files are deleted from the server after 1 hour.' },
              { icon:'📱', title:'Works anywhere', desc:'Use on any device — desktop, tablet, or phone.' },
            ].map((t,i) => (
              <div key={i} className={styles.trustItem}>
                <span className={styles.trustIcon}>{t.icon}</span>
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaBox}>
            <h2>Work with PDFs more efficiently</h2>
            <p>Create a free account to access premium tools, batch processing, and file history.</p>
            <div className={styles.ctaBtns}>
              <Link to="/register" className="btn-primary" style={{ padding:'12px 28px', fontSize:'0.95rem' }}>
                Get Started Free
              </Link>
              <Link to="/pricing" className="btn-ghost" style={{ padding:'12px 28px', fontSize:'0.95rem' }}>
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Tool Card ──────────────────────────────────────────────
function ToolCard({ tool, index }) {
  const color = CAT_COLORS[tool.category] || '#ff2116';
  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link to={`/tools/${tool.slug}`} className={styles.card}>
        <div className={styles.cardIcon} style={{ background: `${color}15`, color }}>
          {getToolIcon(tool.slug)}
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>{tool.label}</h3>
            <div className={styles.cardBadges}>
              {tool.isNew     && <span className="badge badge-new">NEW</span>}
              {tool.isPremium && <span className="badge badge-pro">PRO</span>}
            </div>
          </div>
          <p className={styles.cardDesc}>{tool.description}</p>
        </div>
        <div className={styles.cardArrow} style={{ color }}>→</div>
      </Link>
    </motion.div>
  );
}
