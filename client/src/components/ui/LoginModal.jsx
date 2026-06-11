import { useState } from 'react';
import { FiX, FiLoader, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

import styles from './LoginModal.module.css';

export default function LoginModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}><FiX size={18}/></button>
        <div className={styles.icon}>🔒</div>
        <h2 className={styles.title}>Free Usage Limit Reached</h2>
        <p className={styles.desc}>
          You have used all {5} free attempts. Create an account or log in to continue using PDFForge.
        </p>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`} onClick={() => setMode('login')}>Log In</button>
          <button className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`} onClick={() => setMode('register')}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input className={styles.input} type="text" placeholder="Full Name" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
          )}
          <input className={styles.input} type="email" placeholder="Email address" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={busy} />
          <input className={styles.input} type="password" placeholder="Password" required minLength={8} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={busy} />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? <><FiLoader className="spin" size={16}/> Processing…</> : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p className={styles.hint}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className={styles.switch} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}
