import { Link } from 'react-router-dom';
import styles from './About.module.css';
import SeoHelmet from '../components/SeoHelmet';

export default function Privacy() {
  return (
    <SeoHelmet title="Privacy Policy - PDFForge" description="PDFForge Privacy Policy. Learn how we collect, use, and protect your personal data and uploaded documents." canonical="/privacy" />
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Privacy Policy</span>
        <h1>Privacy Policy</h1>
        <p>Last updated: June 12, 2026</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>1. Introduction</h2>
        <p>Welcome to PDFForge (pdf-forge-k6sd.vercel.app). We respect your privacy and are committed to protecting your personal data and uploaded documents. This Privacy Policy explains how we collect, use, store, and protect your information when you use our online PDF tools.</p>
        <p>By using our website, you agree to the practices described in this policy.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>2. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul>
          <li><strong>Account Information</strong>: If you create an account, we collect your name, email address, and password.</li>
          <li><strong>Uploaded Files</strong>: PDFs and other documents you upload for processing (merge, compress, split, etc.). These files are processed temporarily.</li>
          <li><strong>Usage Data</strong>: Which tools you use, number of files processed, IP address, browser type, device information, and analytics data.</li>
          <li><strong>Cookies & Tracking</strong>: Essential cookies for session management and functionality. We do not use tracking cookies for advertising at present.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>3. How We Use Your Information</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Process your PDF files as requested (compression, merging, etc.).</li>
          <li>Provide, maintain, and improve our services.</li>
          <li>Authenticate users and manage accounts.</li>
          <li>Send important transactional emails (password reset, account notifications).</li>
          <li>Analyze usage to improve user experience.</li>
        </ul>
        <p>We <strong>do not sell</strong> your personal data or uploaded documents to any third party.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>4. File Storage & Automatic Deletion</h2>
        <ul>
          <li>Uploaded files are stored temporarily on secure servers only for the duration of processing.</li>
          <li>Input files are deleted immediately after processing.</li>
          <li>Output files are available via expiring links and are <strong>automatically deleted within 1 hour</strong>.</li>
          <li>We never open, read, or manually access your documents except as required for processing.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>5. Third-Party Services</h2>
        <p>We use the following trusted third-party services:</p>
        <ul>
          <li><strong>Razorpay</strong>: For payment processing (if you opt for premium). We do not store your payment card details.</li>
          <li><strong>MongoDB Atlas</strong>: For database hosting.</li>
          <li><strong>Vercel</strong>: For hosting the application.</li>
        </ul>
        <p>These third parties have their own privacy policies and security standards. We ensure they comply with appropriate data protection measures.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>6. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>HTTPS encryption for all data in transit.</li>
          <li>Secure authentication and input validation.</li>
          <li>Regular security updates.</li>
          <li>Restricted access to servers.</li>
        </ul>
        <p>However, no method of transmission over the internet is 100% secure. We strive to protect your data but cannot guarantee absolute security.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>7. Cookies</h2>
        <p>We use only essential cookies for the website to function properly (login sessions, preferences). You can manage cookie preferences through your browser settings.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>8. User Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access, correct, or delete your personal data.</li>
          <li>Withdraw consent where applicable.</li>
          <li>Request deletion of your account and associated data.</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a>.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>9. Children's Privacy</h2>
        <p>Our services are not directed to children under 13 years of age. We do not knowingly collect data from children.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>10. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page with an updated "Last updated" date.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>11. Contact Us</h2>
        <p>For any questions or concerns regarding this Privacy Policy, please contact us at:</p>
        <p><strong>Email</strong>: <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a></p>
      </div>
      <div className={styles.cta}>
        <h2>Ready to get started?</h2>
        <p>Your privacy matters. Create an account with confidence.</p>
        <Link to="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>Create Free Account</Link>
      </div>
    </div>
  );
}
