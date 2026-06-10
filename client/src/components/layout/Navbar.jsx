import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiClock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setDrop(false); };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7" fill="#ff2116"/>
              <path d="M9 10h8.5a4 4 0 0 1 0 8H14v5H9V10z" fill="white"/>
              <circle cx="17" cy="14" r="2" fill="#ff2116"/>
            </svg>
          </div>
          <span className={styles.logoText}>PDFForge</span>
        </Link>

        <div className={styles.links}>
          <Link to="/" className={styles.link}>Tools</Link>
          <Link to="/pricing" className={styles.link}>Pricing</Link>
          <Link to="/about" className={styles.link}>About</Link>
        </div>

        <div className={styles.actions}>
          {user ? (
            <div className={styles.userWrap}>
              <button className={styles.userBtn} onClick={() => setDrop(!drop)}>
                <div className={styles.avatar}>{user.name?.[0]?.toUpperCase()}</div>
                <span>{user.name?.split(' ')[0]}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
              </button>
              {drop && (
                <div className={styles.dropdown}>
                  <div className={styles.dropInfo}>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <span className={`badge ${user.plan !== 'free' ? 'badge-pro' : ''}`} style={user.plan === 'free' ? { background:'#f0f0f4', color:'#888' } : {}}>
                      {user.plan?.toUpperCase()} PLAN
                    </span>
                  </div>
                  <div className={styles.dropDivider}/>
                  <Link to="/dashboard" className={styles.dropItem} onClick={() => setDrop(false)}><FiGrid size={14}/> Dashboard</Link>
                  <Link to="/history" className={styles.dropItem} onClick={() => setDrop(false)}><FiClock size={14}/> History</Link>
                  <Link to="/profile" className={styles.dropItem} onClick={() => setDrop(false)}><FiUser size={14}/> Profile</Link>
                  <div className={styles.dropDivider}/>
                  <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={handleLogout}><FiLogOut size={14}/> Log out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className={styles.loginLink}>Log in</Link>
              <Link to="/register" className={styles.signupBtn}>Sign up Free</Link>
            </>
          )}
          <button className={styles.burger} onClick={() => setOpen(!open)}>
            {open ? <FiX size={20}/> : <FiMenu size={20}/>}
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.mobile}>
          <Link to="/" className={styles.mLink} onClick={() => setOpen(false)}>All Tools</Link>
          <Link to="/pricing" className={styles.mLink} onClick={() => setOpen(false)}>Pricing</Link>
          <Link to="/about" className={styles.mLink} onClick={() => setOpen(false)}>About</Link>
          {user
            ? <><Link to="/dashboard" className={styles.mLink} onClick={() => setOpen(false)}>Dashboard</Link><button className={styles.mLink} style={{border:'none',background:'none',textAlign:'left',color:'var(--accent)',cursor:'pointer'}} onClick={handleLogout}>Log out</button></>
            : <div style={{display:'flex',gap:'10px',padding:'12px 0 0'}}><Link to="/login" className="btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={() => setOpen(false)}>Log in</Link><Link to="/register" className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={() => setOpen(false)}>Sign up</Link></div>
          }
        </div>
      )}
    </nav>
  );
}
