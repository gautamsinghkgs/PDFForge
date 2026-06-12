import { Link } from 'react-router-dom';
import styles from './About.module.css';

export default function Refund() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Refund Policy</span>
        <h1>Refund Policy</h1>
        <p>Last updated: June 2026</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>1. Overview</h2>
        <p>PDFForge offers paid plans (Pro ₹49 and Enterprise ₹199) as one-time purchases for additional features and higher usage limits. This policy outlines the terms for refunds on paid plans.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>2. Eligibility</h2>
        <p>Refunds are considered on a case-by-case basis. The following conditions may qualify for a refund:</p>
        <ul>
          <li>Duplicate payment due to technical error.</li>
          <li>Service was unavailable during the paid period due to a confirmed server issue on our end.</li>
          <li>Accidental purchase of the wrong plan (if reported within 48 hours).</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>3. Non-Refundable Situations</h2>
        <p>Refunds will not be issued for:</p>
        <ul>
          <li>Change of mind after the plan has been activated.</li>
          <li>Dissatisfaction with features that are clearly described on the pricing page.</li>
          <li>Requests made more than 7 days after purchase.</li>
          <li>Violation of our Terms of Service.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>4. How to Request a Refund</h2>
        <p>To request a refund, contact us at <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a> within 7 days of purchase with your registered email, transaction ID, and reason for the request. We will review and respond within 5-7 business days.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>5. Payment Disputes</h2>
        <p>If you believe there has been an unauthorized charge, please contact us immediately. All payments are processed through Razorpay, and we follow their dispute resolution process when applicable.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>6. Contact</h2>
        <p>For any questions about this refund policy, email <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a>.</p>
      </div>
      <div className={styles.cta}>
        <h2>Have questions?</h2>
        <p>Reach out to us and we will help you out.</p>
        <Link to="/contact" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>Contact Us</Link>
      </div>
    </div>
  );
}
