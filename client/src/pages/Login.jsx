import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';
import SeoHelmet from '../components/SeoHelmet';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);
      await googleLogin(credentialResponse.credential);
      toast.success('Signed in with Google!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
    <SeoHelmet title="Sign In - PDFForge" description="Sign in to your PDFForge account to access premium PDF tools and higher usage limits." canonical="/login" />
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className={styles.logo}>
          <span>⬡</span> PDF<strong>Forge</strong>
        </Link>
        <h2>Welcome back</h2>
        <p className={styles.sub}>Sign in to access your tools and files.</p>

        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          {googleLoading ? (
            <div className="spinner" />
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              theme="filled_black"
              size="large"
              shape="pill"
              text="signin_with"
            />
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <span style={{ flex:1, height:1, background:'var(--border)' }}/>
          <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>OR</span>
          <span style={{ flex:1, height:1, background:'var(--border)' }}/>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label>Email</label>
            <input
              type="email" name="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange} onFocus={() => fetch('https://pdfforge-server-8mwu.onrender.com/healthz').catch(() => {})} autoComplete="email"
            />
          </div>
          <div className={styles.group}>
            <label>Password</label>
            <input
              type="password" name="password" placeholder="••••••••"
              value={form.password} onChange={handleChange} autoComplete="current-password"
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading || googleLoading}>
            {loading ? <><div className="spinner"/> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className={styles.link}>
          Don't have an account? <Link to="/register">Create one free →</Link>
        </p>
      </motion.div>
    </div>
    </>
  );
}
