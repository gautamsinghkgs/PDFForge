import { Link } from 'react-router-dom';
import SeoHelmet from '../components/SeoHelmet';

export default function NotFound() {
  return (
    <>
    <SeoHelmet title="Page Not Found - PDFForge" description="The page you are looking for does not exist." />
    <div style={{
      textAlign: 'center', padding: '120px 24px',
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px'
    }}>
      <div style={{ fontSize: '6rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'rgba(108,99,255,0.3)', lineHeight: 1 }}>
        404
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary" style={{ marginTop: '8px' }}>
        ← Back to Home
      </Link>
    </div>
    </>
  );
}
