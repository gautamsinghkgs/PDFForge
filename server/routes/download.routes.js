const express = require('express');
const path = require('path');
const { resolveDownload } = require('../utils/downloads');

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp',
  '.html', '.htm', '.zip', '.txt', '.csv', '.ods', '.odt', '.odp',
]);

router.get('/:token', (req, res) => {
  try {
    const { filepath, filename } = resolveDownload(req.params.token);
    const ext = path.extname(filename || filepath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(403).json({ success: false, message: 'File type not allowed' });
    }
    res.download(filepath, filename);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
