import { Link } from 'react-router-dom';
import styles from './About.module.css';

export function About() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>About PDFForge</span>
        <h1>Built for People Who Work With PDFs</h1>
        <p>A self-hosted PDF toolkit that combines browser-based uploads with local server processing and open-source conversion tools.</p>
      </div>
      <div className={styles.grid}>
        {[
          { icon:'🚀', title:'Our Mission', desc:'Make common PDF tasks available from one self-hosted web interface.' },
          { icon:'🔒', title:'Your Privacy', desc:'Outputs use expiring signed links and are removed from the configured server after 1 hour.' },
          { icon:'⚡', title:'Local Tools', desc:'Processing uses pdf-lib, Ghostscript, LibreOffice, Tesseract, and a Python conversion service where appropriate.' },
          { icon:'🌍', title:'Flexible Setup', desc:'Run the application on a machine or server where you control the storage and system dependencies.' },
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
