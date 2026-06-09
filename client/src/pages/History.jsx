import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiDownload, FiCheckCircle, FiXCircle, FiLoader, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { downloadOutputFile } from '../utils/downloadFile';
import { parseByteSize, formatFileSize } from '../utils/byteSize';
import styles from './History.module.css';

const STATUS_CONFIG = {
  completed:  { icon: <FiCheckCircle size={15}/>, color: '#10b981', label: 'Completed' },
  failed:     { icon: <FiXCircle size={15}/>,     color: '#ef4444', label: 'Failed' },
  processing: { icon: <FiLoader size={15}/>,      color: '#f59e0b', label: 'Processing' },
};

export default function History() {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({});
  const [clearing, setClearing] = useState(false);

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/history?page=${p}&limit=15`);
      setHistory(data.history);
      setPagination(data.pagination);
      setPage(p);
    } catch (err) {
      toast.error('Failed to load history');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const deleteEntry = async (id) => {
    try {
      await api.delete(`/history/${id}`);
      setHistory(h => h.filter(e => e._id !== id));
      toast.success('Entry deleted');
    } catch { toast.error('Delete failed'); }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all history? This cannot be undone.')) return;
    setClearing(true);
    try {
      await api.delete('/history');
      setHistory([]);
      toast.success('History cleared');
    } catch { toast.error('Failed to clear history'); }
    finally { setClearing(false); }
  };

  const formatBytes = (b) => {
    const n = parseByteSize(b);
    if (!n) return '—';
    return formatFileSize(n);
  };

  const handleHistoryDownload = async (url, filename) => {
    try {
      await downloadOutputFile({ downloadUrl: url, filename: filename || 'download' });
    } catch (e) {
      toast.error(e.message || 'Download failed');
    }
  };

  return (
    <div className="page-enter">
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerRow}>
            <div>
              <h1>Task History</h1>
              <p>{pagination.total ?? 0} total tasks</p>
            </div>
            {history.length > 0 && (
              <button className="btn-danger" onClick={clearAll} disabled={clearing}>
                <FiTrash2 size={14}/> {clearing ? 'Clearing…' : 'Clear All'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: '80px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}>
            <div className="spinner"/>
          </div>
        ) : history.length === 0 ? (
          <div className={styles.empty}>
            <FiAlertTriangle size={40} color="var(--text-muted)"/>
            <h3>No history yet</h3>
            <p>Your processed files will appear here after you use any tool.</p>
            <Link to="/" className="btn-primary">Start Using Tools</Link>
          </div>
        ) : (
          <>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Tool</span>
                <span>Files</span>
                <span>Output Size</span>
                <span>Status</span>
                <span>Time</span>
                <span>Actions</span>
              </div>

              <AnimatePresence>
                {history.map((entry, i) => {
                  const sc = STATUS_CONFIG[entry.status] || STATUS_CONFIG.processing;
                  return (
                    <motion.div
                      key={entry._id}
                      className={styles.tableRow}
                      initial={{ opacity:0, x:-10 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:10 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <span className={styles.toolName}>{entry.toolLabel}</span>
                      <span className={styles.fileCount}>
                        {entry.inputFiles?.length ?? 0} file{entry.inputFiles?.length !== 1 ? 's' : ''}
                      </span>
                      <span className={styles.fileSize}>{formatBytes(entry.outputFile?.size)}</span>
                      <span className={styles.status} style={{ color: sc.color }}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className={styles.time}>{timeAgo(entry.createdAt)}</span>
                      <div className={styles.actions}>
                        {entry.status === 'completed' && entry.outputFile?.downloadUrl && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            title="Download"
                            onClick={() =>
                              handleHistoryDownload(
                                entry.outputFile.downloadUrl,
                                entry.outputFile.filename
                              )
                            }
                          >
                            <FiDownload size={15}/>
                          </button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => deleteEntry(entry._id)}
                          title="Delete"
                        >
                          <FiTrash2 size={15}/>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ── Pagination ── */}
            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className="btn-ghost" style={{ padding:'8px 18px' }}
                  disabled={page <= 1}
                  onClick={() => fetchHistory(page - 1)}
                >
                  ← Prev
                </button>
                <span style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>
                  Page {page} of {pagination.pages}
                </span>
                <button
                  className="btn-ghost" style={{ padding:'8px 18px' }}
                  disabled={page >= pagination.pages}
                  onClick={() => fetchHistory(page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
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
