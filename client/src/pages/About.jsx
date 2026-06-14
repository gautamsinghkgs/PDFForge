import { Link } from 'react-router-dom';
import styles from './About.module.css';
import SeoHelmet from '../components/SeoHelmet';

export default function About() {
  return (
    <>
    <SeoHelmet title="About PDFForge - Free Online PDF Tools" description="Learn about PDFForge, a free online PDF toolkit built by Gautam Kumar Singh. 20+ PDF tools in your browser." canonical="/about" />
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>About PDFForge</span>
        <h1>Built for People Who Work With PDFs</h1>
        <p>PDFForge provides 20+ PDF tools — merge, split, compress, convert, edit, and secure your documents. Fast, reliable, and free to use.</p>
      </div>
      <div className={styles.grid}>
        {[
          { icon:'🚀', title:'Our Mission', desc:'Make common PDF tasks accessible through a clean, fast web interface — no software installation needed. Processing happens on our secure servers.' },
          { icon:'🔒', title:'Your Privacy', desc:'Outputs use expiring signed links and are automatically removed after 1 hour. We never share your files with third parties.' },
          { icon:'🛠️', title:'20+ PDF Tools', desc:'From merging and splitting to OCR and format conversion — everything you need in one place. Tools are added regularly.' },
          { icon:'⚡', title:'Fast Processing', desc:'Built for speed. Upload, process, and download your files in seconds. Premium users get priority processing.' },
          { icon:'🌐', title:'Works Everywhere', desc:'Use PDFForge on any device — desktop, tablet, or phone. No installation needed, just a web browser.' },
          { icon:'💎', title:'Free & Premium', desc:'Start with free tools. Upgrade to Pro or Enterprise for higher limits, priority support, and advanced features.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className={styles.card}>
            <span className={styles.cardIcon}>{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto 60px', padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>What You Can Do With PDFForge</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, textAlign: 'left' }}>
          {[
            'Merge multiple PDFs into one',
            'Split PDF pages into separate files',
            'Compress PDF files for smaller size',
            'Convert PDF to Word, Excel, PPT, JPG',
            'Convert Word, Excel, PPT, JPG to PDF',
            'Add page numbers and watermarks',
            'Protect PDFs with passwords',
            'Unlock password-protected PDFs',
            'Sign PDF documents',
            'Compare two PDF files',
            'OCR — extract text from scanned PDFs',
            'Edit PDF content',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--accent)' }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.cta}>
        <h2>Ready to get started?</h2>
        <p>Create an account to unlock premium features and track your PDF tasks.</p>
        <Link to="/register" className="btn-primary" style={{ padding:'14px 32px', fontSize:'1rem' }}>Create Free Account</Link>
      </div>
    </div>
    </>
  );
}
