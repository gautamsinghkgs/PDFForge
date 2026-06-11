import { Link } from 'react-router-dom';
import styles from './About.module.css';

export default function Tos() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Terms of Service</span>
        <h1>Terms of Service</h1>
        <p>Last updated: June 2026</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>1. Acceptance of Terms</h2>
        <p>By accessing or using PDFForge, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>2. Description of Service</h2>
        <p>PDFForge provides online PDF processing tools including merging, splitting, compressing, converting, editing, signing, and securing PDF documents. The service is provided free of charge with optional paid plans for additional features.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>3. User Responsibilities</h2>
        <ul>
          <li>You must not upload illegal, infringing, or malicious files.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must not use the service to process documents you do not have the right to process.</li>
          <li>You must not attempt to bypass usage limits or security measures.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>4. Intellectual Property</h2>
        <p>You retain all rights to the files you upload. PDFForge does not claim ownership of your documents. The PDFForge software, design, and brand are owned by Gautam Kumar Singh.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>5. Limitation of Liability</h2>
        <p>PDFForge is provided "as is" without any warranty. We are not responsible for any data loss, corruption, or damages arising from use of the service. Always keep backups of your important documents.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>6. Paid Plans & Payments</h2>
        <p>Paid plans are processed securely through Razorpay. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with notice.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>7. Termination</h2>
        <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>8. Changes to Terms</h2>
        <p>We may update these terms at any time. Continued use after changes constitutes acceptance of the new terms.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>9. Contact</h2>
        <p>For questions about these terms, contact <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a>.</p>
      </div>
      <div className={styles.cta}>
        <h2>Agree and get started</h2>
        <p>Create your free account and start using PDFForge today.</p>
        <Link to="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>Create Free Account</Link>
      </div>
    </div>
  );
}
