'use strict';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { UPLOAD_ROOT } = require('../config/paths');

const DOWNLOAD_TTL_MS = Math.max(
  60_000,
  parseInt(process.env.DOWNLOAD_TTL_MS, 10) || 60 * 60 * 1000
);

function signingSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for secure download links.');
  }
  return process.env.JWT_SECRET;
}

function assertInsideUploadRoot(filepath) {
  const root = path.resolve(UPLOAD_ROOT);
  const resolved = path.resolve(filepath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid download path.');
  }
  return resolved;
}

function createDownloadUrl(filepath, filename) {
  const resolved = assertInsideUploadRoot(filepath);
  const relativePath = path.relative(UPLOAD_ROOT, resolved).replace(/\\/g, '/');
  const token = jwt.sign(
    {
      type: 'download',
      path: relativePath,
      filename: path.basename(filename || resolved),
    },
    signingSecret(),
    { expiresIn: Math.ceil(DOWNLOAD_TTL_MS / 1000) }
  );
  return `/api/downloads/${encodeURIComponent(token)}`;
}

function payloadFromUrl(downloadUrl) {
  const match = String(downloadUrl || '').match(/\/api\/downloads\/([^/?#]+)/);
  if (!match) return null;
  const payload = jwt.decode(decodeURIComponent(match[1]));
  return payload && payload.type === 'download' ? payload : null;
}

function pathFromPayload(payload) {
  if (!payload || typeof payload.path !== 'string') {
    throw new Error('Invalid download token.');
  }
  return assertInsideUploadRoot(path.resolve(UPLOAD_ROOT, payload.path));
}

function resolveDownload(token) {
  let payload;
  try {
    payload = jwt.verify(token, signingSecret());
  } catch {
    const err = new Error('Download link is invalid or has expired.');
    err.statusCode = 410;
    throw err;
  }

  const filepath = pathFromPayload(payload);
  if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
    const err = new Error('Download file is no longer available.');
    err.statusCode = 404;
    throw err;
  }

  return {
    filepath,
    filename: path.basename(payload.filename || filepath),
  };
}

function deleteDownloadFile(downloadUrl) {
  const payload = payloadFromUrl(downloadUrl);
  if (!payload) return false;
  try {
    const filepath = pathFromPayload(payload);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    return true;
  } catch {
    return false;
  }
}

function sweepExpiredOutputs(now = Date.now()) {
  const cutoff = now - DOWNLOAD_TTL_MS;
  let removed = 0;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          if (fs.statSync(fullPath).mtimeMs <= cutoff) {
            fs.unlinkSync(fullPath);
            removed += 1;
          }
        } catch {
          /* A concurrent request may already have removed the file. */
        }
      }
    }
  }

  walk(UPLOAD_ROOT);
  return removed;
}

module.exports = {
  DOWNLOAD_TTL_MS,
  createDownloadUrl,
  resolveDownload,
  deleteDownloadFile,
  sweepExpiredOutputs,
};
