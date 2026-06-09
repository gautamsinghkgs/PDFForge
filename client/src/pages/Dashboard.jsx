import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiActivity, FiClock, FiStar, FiZap, FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './Dashboard.module.css';

const PLAN_COLORS = { free: '#8888a0', pro: '#f59e0b', enterprise: '#6c63ff' };
const STATUS_ICON = {
  completed:  <FiCheckCircle color="#10b981" size={16}/>,
  failed:     <FiXCircle color="#ef4444" size={16}/>,
  processing: <FiLoader color="#f59e0b" size={16}/>,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user/dashboard')
      .then(({ data }) => setData(data.dashboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'120px 0' }}>
      <div className="spinner"/>
    </div>
  );

  const taskPct = data?.taskLimit === Infinity ? 0
    : Math.round((data?.tasksToday / data?.taskLimit) * 100);

  return (
    <div className="page-enter">
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerInner}>
            <div>
              <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
              <p>Here's your activity overview</p>
            </div>
            <Link to="/" className="btn-primary">
              <FiZap size={15}/> Use a Tool
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: '80px' }}>

        {/* ── Stats Cards ── */}
        <div className={styles.statsGrid}>
          <motion.div className={`${styles.statCard} card`} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.05 }}>
            <div className={styles.statIcon} style={{ background:'rgba(108,99,255,0.15)', color:'#6c63ff' }}>
              <FiActivity size={20}/>
            </div>
            <div>
              <p className={styles.statLabel}>Total Tasks</p>
              <p className={styles.statVal}>{data?.totalTasks ?? 0}</p>
            </div>
          </motion.div>

          <motion.div className={`${styles.statCard} card`} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}>
            <div className={styles.statIcon} style={{ background:'rgba(16,185,129,0.15)', color:'#10b981' }}>
              <FiClock size={20}/>
            </div>
            <div>
              <p className={styles.statLabel}>Tasks Today</p>
              <p className={styles.statVal}>{data?.tasksToday ?? 0} / {data?.taskLimit === Infinity ? '∞' : data?.taskLimit}</p>
            </div>
          </motion.div>

          <motion.div className={`${styles.statCard} card`} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.15 }}>
            <div className={styles.statIcon} style={{ background:`rgba(245,158,11,0.15)`, color:'#f59e0b' }}>
              <FiStar size={20}/>
            </div>
            <div>
              <p className={styles.statLabel}>Current Plan</p>
              <p className={styles.statVal} style={{ color: PLAN_COLORS[data?.plan] ?? '#fff', textTransform:'capitalize' }}>
                {data?.plan}
              </p>
            </div>
          </motion.div>

          <motion.div className={`${styles.statCard} card`} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}>
            <div className={styles.statIcon} style={{ background:'rgba(236,72,153,0.15)', color:'#ec4899' }}>
              <FiZap size={20}/>
            </div>
            <div>
              <p className={styles.statLabel}>Storage Used</p>
              <p className={styles.statVal}>{formatBytes(data?.storageUsed ?? 0)}</p>
            </div>
          </motion.div>
        </div>

        {/* ── Task Progress Bar ── */}
        {data?.taskLimit !== Infinity && (
          <div className="card" style={{ marginBottom:'24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'0.88rem', fontWeight:600 }}>Daily Task Usage</span>
              <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
                {data?.tasksToday}/{data?.taskLimit} tasks
              </span>
            </div>
            <div className={styles.progressTrack}>
              <motion.div
                className={styles.progressFill}
                style={{ background: taskPct > 80 ? '#ef4444' : 'var(--accent)' }}
                initial={{ width:0 }}
                animate={{ width:`${taskPct}%` }}
                transition={{ duration:0.8, ease:'easeOut' }}
              />
            </div>
            {data?.plan === 'free' && (
              <p style={{ marginTop:'8px', fontSize:'0.8rem', color:'var(--text-muted)' }}>
                Need more tasks? <Link to="/pricing" style={{ color:'var(--accent)' }}>Upgrade to Pro →</Link>
              </p>
            )}
          </div>
        )}

        <div className={styles.bottomGrid}>
          {/* ── Recent History ── */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem' }}>Recent Activity</h3>
              <Link to="/history" style={{ fontSize:'0.82rem', color:'var(--accent)' }}>View all →</Link>
            </div>
            {data?.recentHistory?.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:'0.88rem', textAlign:'center', padding:'32px 0' }}>
                No activity yet. <Link to="/" style={{ color:'var(--accent)' }}>Try a tool!</Link>
              </p>
            ) : (
              <ul className={styles.historyList}>
                {data?.recentHistory?.map((h, i) => (
                  <li key={h._id || i} className={styles.historyItem}>
                    <span className={styles.historyIcon}>{STATUS_ICON[h.status]}</span>
                    <div className={styles.historyInfo}>
                      <span className={styles.historyTool}>{h.toolLabel}</span>
                      <span className={styles.historyTime}>{timeAgo(h.createdAt)}</span>
                    </div>
                    <span className={`${styles.historyStatus} ${styles[h.status]}`}>{h.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Top Tools ── */}
          <div className="card">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', marginBottom:'20px' }}>Your Top Tools</h3>
            {data?.topTools?.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:'0.88rem', textAlign:'center', padding:'32px 0' }}>
                No data yet.
              </p>
            ) : (
              <ul className={styles.topToolsList}>
                {data?.topTools?.map((t, i) => (
                  <li key={t._id} className={styles.topToolItem}>
                    <span className={styles.topToolRank}>#{i + 1}</span>
                    <Link to={`/tools/${t._id}`} className={styles.topToolName}>{t._id}</Link>
                    <span className={styles.topToolCount}>{t.count} uses</span>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ marginTop:'24px', paddingTop:'20px', borderTop:'1px solid var(--border)' }}>
              <Link to="/" className="btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                Explore All Tools
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
