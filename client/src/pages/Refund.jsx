import { Link } from 'react-router-dom';
import styles from './About.module.css';
import SeoHelmet from '../components/SeoHelmet';

export default function Refund() {
  return (
    <>
    <SeoHelmet title="Refund Policy - PDFForge" description="PDFForge Refund Policy for paid plans (Pro ₹49 and Enterprise ₹199). Terms and conditions for refunds." canonical="/refund" />
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Refund Policy</span>
        <h1>Refund Policy</h1>
        <p>Last updated: June 12, 2026</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>1. Overview</h2>
        <p>PDFForge offers paid plans (Pro ₹49 and Enterprise ₹199) as one-time purchases for additional features and higher usage limits. This Refund Policy explains the conditions under which refunds may be issued. All payments are processed securely through Razorpay.</p>
        <p>Please note that all purchases are generally <strong>non-refundable</strong> except in specific cases mentioned below.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>2. Eligibility for Refund</h2>
        <p>We may consider refunds only in the following limited situations:</p>
        <ul>
          <li>Duplicate payment made due to a technical error.</li>
          <li>Service was completely unavailable for a significant portion of the paid period due to a confirmed outage on our end.</li>
          <li>Accidental purchase of the wrong plan, if reported within <strong>48 hours</strong> of purchase and the plan has not been substantially used.</li>
        </ul>
        <p>All refund requests are reviewed on a <strong>case-by-case basis</strong>. We reserve the right to approve or deny any refund request.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>3. Non-Refundable Situations</h2>
        <p>Refunds will <strong>not</strong> be issued in the following cases:</p>
        <ul>
          <li>Change of mind after the plan has been activated.</li>
          <li>Dissatisfaction with the service or features that were clearly described on the pricing page.</li>
          <li>Requests made more than <strong>7 days</strong> after the date of purchase.</li>
          <li>Any violation of our Terms of Service or Privacy Policy.</li>
          <li>Partial use of the plan or features.</li>
          <li>Any purchase made during promotional offers or discounts (unless otherwise stated).</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>4. How to Request a Refund</h2>
        <p>To request a refund:</p>
        <ol>
          <li>Email us at <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a> within <strong>7 days</strong> of purchase.</li>
          <li>Include the following details:
            <ul>
              <li>Registered email address</li>
              <li>Razorpay Transaction ID / Order ID</li>
              <li>Reason for refund request</li>
              <li>Any supporting information</li>
            </ul>
          </li>
        </ol>
        <p>We will review your request and respond within <strong>5-7 business days</strong>. If approved, the refund will be processed back to your original payment method within 7-10 business days (depending on Razorpay's processing time).</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>5. Payment Disputes / Chargebacks</h2>
        <p>If you initiate a chargeback or dispute with your bank/card issuer without contacting us first, we reserve the right to suspend or terminate your account and deny future services. We follow Razorpay's dispute resolution process in such cases.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>6. Changes to Refund Policy</h2>
        <p>We may update this Refund Policy from time to time. Any changes will be posted on this page with the updated date.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>7. Contact Us</h2>
        <p>If you have any questions regarding this Refund Policy, please contact us at:</p>
        <p><strong>Email</strong>: <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a></p>
      </div>
      <div className={styles.cta}>
        <h2>Have questions?</h2>
        <p>Reach out to us and we will help you out.</p>
        <Link to="/contact" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>Contact Us</Link>
      </div>
    </div>
    </>
  );
}
