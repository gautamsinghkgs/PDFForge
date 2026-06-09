import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Please fill all fields'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) { toast.error('Password must contain uppercase, lowercase, and a number'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to PDFForge 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <h2>Create your account</h2>
        <p className={styles.sub}>Free forever. No credit card required.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label>Full Name</label>
            <input
              type="text" name="name" placeholder="Your Name"
              value={form.name} onChange={handleChange}
            />
          </div>
          <div className={styles.group}>
            <label>Email</label>
            <input
              type="email" name="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange}
            />
          </div>
          <div className={styles.group}>
            <label>Password</label>
            <input
              type="password" name="password" placeholder="Min 8 chars, upper+lower+number"
              value={form.password} onChange={handleChange}
            />
          </div>
          <div className={styles.group}>
            <label>Confirm Password</label>
            <input
              type="password" name="confirm" placeholder="Re-enter password"
              value={form.confirm} onChange={handleChange}
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <><div className="spinner"/> Creating account…</> : 'Create Free Account'}
          </button>
        </form>

        <p className={styles.link}>
          Already have an account? <Link to="/login">Sign in →</Link>
        </p>
      </motion.div>
    </div>
  );
}
