import { Link } from 'react-router-dom';
import styles from './About.module.css';

export function About() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>About PDFForge</span>
        <h1>Built for People Who Work With PDFs</h1>
        <p>PDFForge provides 20+ PDF tools — merge, split, compress, convert, edit, and secure your documents. Fast, reliable, and free to use.</p>
      </div>
      <div className={styles.grid}>
        {[
          { icon:'🚀', title:'Our Mission', desc:'Make common PDF tasks accessible through a clean, fast web interface — no software installation needed.' },
          { icon:'🔒', title:'Your Privacy', desc:'Outputs use expiring signed links and are automatically removed after 1 hour.' },
          { icon:'🛠️', title:'20+ PDF Tools', desc:'From merging and splitting to OCR and format conversion — everything you need in one place.' },
          { icon:'⚡', title:'Fast Processing', desc:'Built for speed. Upload, process, and download your files in seconds.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className={styles.card}>
            <span className={styles.cardIcon}>{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>
      <div className={styles.cta}>
        <h2>Ready to get started?</h2>
        <p>Create an account to track your recent PDF tasks.</p>
        <Link to="/register" className="btn-primary" style={{ padding:'14px 32px', fontSize:'1rem' }}>Create Free Account</Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div style={{ textAlign:'center', padding:'120px 24px', minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px' }}>
      <div style={{ fontSize:'6rem', fontFamily:'var(--font-display)', fontWeight:800, color:'rgba(108,99,255,0.3)', lineHeight:1 }}>404</div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:800 }}>Page Not Found</h2>
      <p style={{ color:'var(--text-muted)', maxWidth:'400px' }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn-primary" style={{ marginTop:'8px' }}>← Back to Home</Link>
    </div>
  );
}

export default About;
