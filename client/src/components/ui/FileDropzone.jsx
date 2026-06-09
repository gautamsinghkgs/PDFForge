import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiX, FiFile } from 'react-icons/fi';
import styles from './FileDropzone.module.css';

const fmtBytes = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(2)} MB`;

export default function FileDropzone({ files = [], setFiles, accept, multiple, label }) {
  const safeFiles = Array.isArray(files) ? files : [];
  
  const onDrop = useCallback(accepted => {
    if (multiple) {
      setFiles(prev => [...(Array.isArray(prev) ? prev : []), ...accepted]);
    } else {
      setFiles(accepted);
    }
  }, [multiple, setFiles]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, accept, multiple,
    maxSize: 100 * 1024 * 1024,
    noClick: safeFiles.length > 0,
    onDropRejected: rejected => {
      const err = rejected[0]?.errors[0];
      if (err?.code === 'file-too-large') console.error('File too large. Max 100MB.');
      else if (err?.code === 'file-invalid-type') console.error('Unsupported file type.');
    }
  });

  const remove = (e, i) => { e.stopPropagation(); setFiles(p => p.filter((_,j) => j !== i)); };

  return (
    <div
      {...getRootProps()}
      className={`${styles.zone} ${isDragActive ? styles.drag : ''} ${safeFiles.length ? styles.filled : ''}`}
    >
      <input {...getInputProps()}/>

      {safeFiles.length === 0 ? (
        <div className={styles.placeholder}>
          <div className={styles.uploadCircle}>
            <FiUploadCloud size={28}/>
          </div>
          <p className={styles.mainLabel}>{isDragActive ? 'Drop files here' : (label || 'Select PDF file')}</p>
          <p className={styles.subLabel}>or drag and drop here</p>
          <p className={styles.hint}>
            {multiple ? 'Multiple files · ' : ''}Max 100MB per file
          </p>
        </div>
      ) : (
        <div className={styles.fileList} onClick={e => e.stopPropagation()}>
          {safeFiles.map((f,i) => (
            <div key={`${f.name}-${i}`} className={styles.fileRow}>
              <div className={styles.fileThumb}><FiFile size={16}/></div>
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{f.name}</span>
                <span className={styles.fileSize}>{fmtBytes(f.size)}</span>
              </div>
              <button className={styles.removeBtn} onClick={e => remove(e,i)} title="Remove"><FiX size={13}/></button>
            </div>
          ))}
          {multiple && (
            <button className={styles.addMoreBtn} onClick={e => { e.stopPropagation(); open(); }}>
              + Add more files
            </button>
          )}
        </div>
      )}
    </div>
  );
}
