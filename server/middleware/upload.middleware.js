const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const fs     = require('fs');
const { UPLOAD_ROOT } = require('../config/paths');

const UPLOAD_DIR = UPLOAD_ROOT;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(UPLOAD_DIR, req.user ? req.user._id.toString() : 'guest');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const MIME_EXT_MAP = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tif', '.tiff'],
  'image/bmp': ['.bmp'],
  'text/html': ['.html', '.htm'],
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = MIME_EXT_MAP[file.mimetype];

  if (allowedExts && allowedExts.includes(ext)) {
    cb(null, true);
  } else if (allowedExts) {
    cb(new Error(`File extension "${ext}" does not match type "${file.mimetype}".`), false);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not supported.`), false);
  }
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024;

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = upload;
