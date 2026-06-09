import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiSave } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './Profile.module.css';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handleProfileSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/user/profile', { name: profile.name });
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async e => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    if (passwords.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwords.newPass)) { toast.error('Password must contain uppercase, lowercase, and a number'); return; }
    setPwSaving(true);
    try {
      await api.put('/user/change-password', { currentPassword: passwords.current, newPassword: passwords.newPass });
      toast.success('Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally { setPwSaving(false); }
  };

  const PLAN_BADGE = { free:'🆓 Free', pro:'⭐ Pro', enterprise:'🏢 Enterprise' };

  return (
    <div className="page-enter">
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerTop}>
            <div className={styles.avatarBig}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <h1>{user?.name}</h1>
              <p>{user?.email}</p>
              <span className={styles.planBadge}>{PLAN_BADGE[user?.plan]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom:'80px' }}>
        <div className={styles.grid}>

          {/* ── Update Profile ── */}
          <motion.div className="card" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.05 }}>
            <div className={styles.cardHeader}>
              <FiUser size={18} color="var(--accent)"/>
              <h3>Profile Information</h3>
            </div>
            <form onSubmit={handleProfileSave} className={styles.form}>
              <div className={styles.group}>
                <label>Full Name</label>
                <input
                  type="text" value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className={styles.group}>
                <label>Email (read-only)</label>
                <input type="email" value={user?.email} disabled style={{ opacity:0.5 }}/>
              </div>
              <div className={styles.group}>
                <label>Member Since</label>
                <input type="text" value={new Date(user?.createdAt).toLocaleDateString()} disabled style={{ opacity:0.5 }}/>
              </div>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <><div className="spinner"/> Saving…</> : <><FiSave size={15}/> Save Changes</>}
              </button>
            </form>
          </motion.div>

          {/* ── Change Password ── */}
          <motion.div className="card" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}>
            <div className={styles.cardHeader}>
              <FiLock size={18} color="var(--accent)"/>
              <h3>Change Password</h3>
            </div>
            <form onSubmit={handlePasswordSave} className={styles.form}>
              <div className={styles.group}>
                <label>Current Password</label>
                <input
                  type="password" value={passwords.current} placeholder="••••••••"
                  onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                />
              </div>
              <div className={styles.group}>
                <label>New Password</label>
                <input
                  type="password" value={passwords.newPass} placeholder="Min 6 characters"
                  onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                />
              </div>
              <div className={styles.group}>
                <label>Confirm New Password</label>
                <input
                  type="password" value={passwords.confirm} placeholder="Re-enter new password"
                  onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={pwSaving}>
                {pwSaving ? <><div className="spinner"/> Saving…</> : <><FiLock size={15}/> Update Password</>}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
