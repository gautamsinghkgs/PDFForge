import { Link } from 'react-router-dom';
import styles from './About.module.css';

export default function Privacy() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Privacy Policy</span>
        <h1>Privacy Policy</h1>
        <p>Last updated: June 2026</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>1. Information We Collect</h2>
        <p>When you use PDFForge, we may collect the following information:</p>
        <ul>
          <li><strong>Account data:</strong> name, email address, and password (if you create an account).</li>
          <li><strong>Uploaded files:</strong> PDFs and documents you upload for processing. These are temporarily stored and automatically deleted after 1 hour.</li>
          <li><strong>Usage data:</strong> which tools you use, how many files you process, and basic analytics to improve our service.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>2. How We Use Your Data</h2>
        <ul>
          <li>To process your PDF files as requested.</li>
          <li>To maintain, improve, and secure our service.</li>
          <li>To communicate with you about your account (transactional emails only).</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal data to third parties.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>3. File Storage & Deletion</h2>
        <p>Uploaded files are stored temporarily on our server for processing. All output files are automatically deleted within 1 hour. Input files are deleted immediately after processing completes.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>4. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use tracking cookies for advertising purposes.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>5. Third-Party Services</h2>
        <p>We use Razorpay for payment processing. Razorpay handles your payment details — we never store credit card information. We also use MongoDB Atlas for database hosting.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>6. Data Security</h2>
        <p>We implement appropriate security measures including HTTPS encryption, input sanitization, and secure authentication to protect your data.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>7. Contact</h2>
        <p>For privacy-related inquiries, contact us at <a href="mailto:gautamsinghkgs@gmail.com" style={{ color: 'var(--accent)' }}>gautamsinghkgs@gmail.com</a>.</p>
      </div>
      <div className={styles.cta}>
        <h2>Ready to get started?</h2>
        <p>Your privacy matters. Create an account with confidence.</p>
        <Link to="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>Create Free Account</Link>
      </div>
    </div>
  );
}
