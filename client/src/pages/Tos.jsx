import { Link } from 'react-router-dom';
import styles from './About.module.css';

export default function Tos() {
  return (
    <div className="page-enter">
      <div className={styles.hero}>
        <span className={styles.tag}>Terms of Service</span>
        <h1>Terms of Service</h1>
        <p>Last updated: June 12, 2026</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>1. Acceptance of Terms</h2>
        <p>By accessing or using PDFForge (pdf-forge-k6sd.vercel.app), you agree to be bound by these Terms of Service. If you do not agree to any part of these terms, please do not use our service.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>2. Description of Service</h2>
        <p>PDFForge is an online platform that provides free and premium PDF processing tools, including merging, splitting, compressing, converting, editing, signing, and securing PDF documents. The service is offered "as is" and may be modified or discontinued at any time.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>3. User Accounts</h2>
        <p>You may create an account to access additional features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>4. User Responsibilities and Prohibited Activities</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload any illegal, infringing, obscene, defamatory, or malicious files.</li>
          <li>Use the service to process documents you do not have legal rights to.</li>
          <li>Attempt to bypass usage limits, security measures, or abuse the service.</li>
          <li>Use automated tools, bots, or scripts to access the service without permission.</li>
          <li>Reverse engineer, copy, or modify any part of the PDFForge platform.</li>
          <li>Upload files containing viruses, malware, or harmful code.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>5. Intellectual Property</h2>
        <p>You retain full ownership and rights to all files you upload. PDFForge does not claim any ownership over your documents. All software, design, logos, trademarks, and content on PDFForge are owned by Gautam Kumar Singh and are protected by copyright laws.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>6. File Processing and Deletion</h2>
        <p>Uploaded files are processed temporarily. Input files are deleted immediately after processing, and output files are automatically deleted within 1 hour. However, we are not responsible for any loss or corruption of your files.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>7. Limitation of Liability & Disclaimer</h2>
        <p>The service is provided on an "AS IS" and "AS AVAILABLE" basis without any warranties. PDFForge shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of your use of the service, including data loss, file corruption, or business interruption. Always keep original backups of your important documents.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>8. Paid Plans and Payments</h2>
        <ul>
          <li>Premium plans are available with additional features and higher limits.</li>
          <li>All payments are processed securely through Razorpay.</li>
          <li>Pricing is subject to change with prior notice.</li>
          <li>Refunds are handled on a case-by-case basis and are not guaranteed.</li>
        </ul>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>9. Termination</h2>
        <p>We reserve the right to suspend or terminate your access to the service at any time, with or without notice, for violation of these terms or for any other reason.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>10. Changes to Terms</h2>
        <p>We may update these Terms of Service at any time. We will notify you of significant changes by posting the updated terms on this page. Your continued use of the service after such changes constitutes your acceptance of the new terms.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>11. Governing Law</h2>
        <p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Patna, India.</p>

        <h2 style={{ color: 'var(--text)', marginTop: 32 }}>12. Contact Us</h2>
        <p>If you have any questions about these Terms of Service, please contact us at:</p>
        <p><strong>Email</strong>: <a href="mailto:gautam16ksingh@gmail.com" style={{ color: 'var(--accent)' }}>gautam16ksingh@gmail.com</a></p>
        <p style={{ marginTop: 24, fontStyle: 'italic' }}>By using PDFForge, you acknowledge that you have read, understood, and agreed to these Terms of Service.</p>
      </div>
      <div className={styles.cta}>
        <h2>Agree and get started</h2>
        <p>Create your free account and start using PDFForge today.</p>
        <Link to="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>Create Free Account</Link>
      </div>
    </div>
  );
}
