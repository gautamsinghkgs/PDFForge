/**
 * Resolve Ghostscript and LibreOffice executables on Windows/macOS/Linux.
 * Caches results for the lifetime of the process.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let cachedGs = null;
let cachedLo = null;
let resolved = false;

function firstExisting(paths) {
  for (const p of paths) {
    if (!p) continue;
    try {
      const n = path.normalize(p);
      if (fs.existsSync(n)) return n;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Run `where` / `command -v` and return first existing path line (quiet on Windows). */
function which(name) {
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `where ${name}` : `command -v ${name}`;
    const out = execSync(cmd, {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const line = out.trim().split(/\r?\n/).find((l) => l && !l.startsWith('INFO:'));
    if (line && fs.existsSync(line.trim())) return path.normalize(line.trim());
  } catch {
    /* not on PATH */
  }
  return null;
}

function scanWindowsGhostscript() {
  const roots = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'gs'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'gs'),
  ];
  const candidates = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    let dirs;
    try {
      dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      continue;
    }
    for (const dir of dirs) {
      for (const exe of ['gswin64c.exe', 'gswin32c.exe']) {
        const full = path.join(root, dir, 'bin', exe);
        if (fs.existsSync(full)) candidates.push(full);
      }
    }
  }
  candidates.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return candidates[0] || null;
}

/**
 * Find gswin64c / gswin32c / gs under Program Files or PATH.
 */
function resolveGhostscript() {
  if (process.env.GHOSTSCRIPT_PATH) {
    const p = firstExisting([process.env.GHOSTSCRIPT_PATH]);
    if (p) return p;
  }

  if (process.platform === 'win32') {
    const scanned = scanWindowsGhostscript();
    if (scanned) return scanned;
  }

  return which('gswin64c.exe') || which('gswin32c.exe') || which('gs');
}

/**
 * Find LibreOffice soffice.
 */
function resolveLibreOffice() {
  if (process.env.LIBREOFFICE_PATH) {
    const p = firstExisting([process.env.LIBREOFFICE_PATH]);
    if (p) return p;
  }

  if (process.platform === 'win32') {
    const fixed = [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'LibreOffice', 'program', 'soffice.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'LibreOffice', 'program', 'soffice.exe'),
    ];
    const hit = firstExisting(fixed);
    if (hit) return hit;

    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    if (fs.existsSync(pf)) {
      try {
        const names = fs.readdirSync(pf);
        for (const name of names) {
          if (!/^libreoffice/i.test(name)) continue;
          const exe = path.join(pf, name, 'program', 'soffice.exe');
          if (fs.existsSync(exe)) return path.normalize(exe);
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (process.platform === 'darwin') {
    const mac = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    if (fs.existsSync(mac)) return mac;
  }

  return which('soffice.exe') || which('soffice');
}

function getGhostscriptPath() {
  if (!resolved) {
    cachedGs = resolveGhostscript();
    cachedLo = resolveLibreOffice();
    resolved = true;
  }
  return cachedGs;
}

function getLibreOfficePath() {
  if (!resolved) {
    cachedGs = resolveGhostscript();
    cachedLo = resolveLibreOffice();
    resolved = true;
  }
  return cachedLo;
}

/** Call after installing software in the same process (tests). */
function clearBinaryCache() {
  cachedGs = null;
  cachedLo = null;
  resolved = false;
}

module.exports = {
  getGhostscriptPath,
  getLibreOfficePath,
  clearBinaryCache,
};
