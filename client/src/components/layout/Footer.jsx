import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <div className={styles.brand}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><rect width="22" height="22" rx="5" fill="#ff2116"/><path d="M6 7h6a3 3 0 0 1 0 6H8v4H6V7z" fill="white"/></svg>
              <strong>PDFForge</strong>
            </div>
            <p className={styles.tagline}>Every PDF tool you need, free and easy to use.</p>
          </div>
          <div>
            <p className={styles.colTitle}>PDF Tools</p>
            <Link to="/tools/merge" className={styles.link}>Merge PDF</Link>
            <Link to="/tools/split" className={styles.link}>Split PDF</Link>
            <Link to="/tools/compress" className={styles.link}>Compress PDF</Link>
            <Link to="/tools/pdf-to-word" className={styles.link}>PDF to Word</Link>
            <Link to="/tools/word-to-pdf" className={styles.link}>Word to PDF</Link>
          </div>
          <div>
            <p className={styles.colTitle}>Convert</p>
            <Link to="/tools/pdf-to-jpg" className={styles.link}>PDF to JPG</Link>
            <Link to="/tools/jpg-to-pdf" className={styles.link}>JPG to PDF</Link>
            <Link to="/tools/pdf-to-excel" className={styles.link}>PDF to Excel</Link>
            <Link to="/tools/excel-to-pdf" className={styles.link}>Excel to PDF</Link>
            <Link to="/tools/pdf-to-ppt" className={styles.link}>PDF to PPT</Link>
          </div>
          <div>
            <p className={styles.colTitle}>Company</p>
            <Link to="/pricing" className={styles.link}>Pricing</Link>
            <Link to="/about" className={styles.link}>About</Link>
            <Link to="/login" className={styles.link}>Log in</Link>
            <Link to="/register" className={styles.link}>Sign up</Link>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} PDFForge. All rights reserved.</p>
          <div className={styles.bottomLinks}>
            <a href="#" className={styles.link}>Privacy Policy</a>
            <a href="#" className={styles.link}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
