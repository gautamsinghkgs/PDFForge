import { Link } from 'react-router-dom';
import styles from './About.module.css';

export default function Contact() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Contact Us</span>
        <h1>Get in Touch</h1>
        <p>Have questions, feedback, or need help? We'd love to hear from you.</p>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ marginBottom: 8 }}>Email</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)', fontWeight: 600 }}>gautam16ksingh@gmail.com</a>
            </p>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ marginBottom: 8 }}>Instagram</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              <a href="https://www.instagram.com/gautamsinghkgs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>@gautamsinghkgs</a>
            </p>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ marginBottom: 8 }}>LinkedIn</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              <a href="https://www.linkedin.com/in/gautam-singh-631700332/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>Gautam Singh</a>
            </p>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ marginBottom: 8 }}>Developer</h3>
            <p style={{ color: 'var(--text-muted)' }}>Developed by <strong>Gautam Kumar Singh</strong>. Built with the MERN stack (MongoDB, Express, React, Node.js) and deployed on Vercel + Render.</p>
          </div>
        </div>
      </div>
      <div className={styles.cta}>
        <h2>Ready to try PDFForge?</h2>
        <p>Start using our free PDF tools — no registration required.</p>
        <Link to="/" className="btn-primary" style={{ padding:'14px 32px', fontSize:'1rem' }}>Browse Tools</Link>
      </div>
    </div>
  );
}
