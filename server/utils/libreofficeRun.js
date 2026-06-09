/**
 * Run LibreOffice without shell quoting issues (critical on Windows paths with spaces).
 * Uses a dedicated user profile under os.tmpdir() so --headless works reliably.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { pathToFileURL } = require('url');

const execFileAsync = promisify(execFile);

const PROFILE_DIR = path.join(os.tmpdir(), 'pdfforge-libreoffice-profile');

/**
 * Use scalc/swriter/simpress so ODS/ODT/ODP are handled by Calc/Writer/Impress, not Draw
 * (soffice would keep treating PDF-sourced files as Draw → OOXML save fails).
 */
function resolveModuleExe(sofficePath, module = 'soffice') {
  if (module === 'soffice' || !module) return sofficePath;
  const dir = path.dirname(sofficePath);
  const ext = process.platform === 'win32' ? '.exe' : '';
  const names = { calc: `scalc${ext}`, writer: `swriter${ext}`, impress: `simpress${ext}` };
  const name = names[module];
  if (!name) return sofficePath;
  const sameDir = path.join(dir, name);
  if (fs.existsSync(sameDir)) return sameDir;
  const nested = path.join(dir, 'program', name);
  if (fs.existsSync(nested)) return nested;
  return sofficePath;
}

/**
 * 8.3 short path on Windows — avoids LibreOffice save failures (Io Write / spaces / long paths).
 */
function windowsShortPath(longPath) {
  if (process.platform !== 'win32' || !longPath) return longPath;
  try {
    const abs = path.resolve(longPath);
    if (!fs.existsSync(abs)) return longPath;
    const { execSync } = require('child_process');
    const escaped = abs.replace(/"/g, '""');
    const out = execSync(`cmd /c for %I in ("${escaped}") do @echo %~sI`, {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const line = out.trim().split(/\r?\n/).pop();
    const short = line && line.trim();
    if (short && fs.existsSync(short)) return short;
  } catch {
    /* ignore */
  }
  return longPath;
}

/**
 * @param {{ freshProfile?: boolean }} [opts]
 */
function userInstallationUrl(opts = {}) {
  const dir = opts.freshProfile
    ? path.join(__dirname, '..', 'temp-libreoffice') // Use project directory instead of temp
    : PROFILE_DIR;
  fs.mkdirSync(dir, { recursive: true });
  return pathToFileURL(dir).href;
}

/**
 * @param {string} loExe - Absolute path to soffice.exe
 * @param {string[]} conversionArgs - e.g. ['--convert-to','docx', input, '--outdir', outDir]
 * @param {{
 *   timeout?: number,
 *   useSvp?: boolean,
 *   freshProfile?: boolean,
 *   module?: 'soffice' | 'calc' | 'writer' | 'impress',
 * }} [options]
 * useSvp=false: needed on Windows so Draw→DOCX can save (SVP backend often hits Io Write 0xc10).
 * module: use calc/writer/impress for second-stage OOXML export from ODS/ODT/ODP.
 */
async function runLibreOffice(loExe, conversionArgs, options = {}) {
  const binary = resolveModuleExe(loExe, options.module || 'soffice');
  const userInst = userInstallationUrl({ freshProfile: options.freshProfile });
  const args = [
    `-env:UserInstallation=${userInst}`,
    '--headless',
    '--norestore',
    '--nologo',
    '--nodefault',
    '--nofirststartwizard',
    '--nolockcheck',
    ...conversionArgs,
  ];

  const spawnEnv = { ...process.env };
  delete spawnEnv.PYTHONHOME;
  delete spawnEnv.PYTHONPATH;
  if (options.useSvp !== false) {
    spawnEnv.SAL_USE_VCLPLUGIN = 'svp';
  }

  try {
    // Fix for Windows paths with spaces - use proper array format
    console.log('LibreOffice Command:', binary);
    console.log('LibreOffice Args:', args);
    
    // Fix: Remove quotes from infilter and convert-to arguments
    const fixedArgs = args.map(arg => {
      if (arg.includes('--infilter=') || arg.includes('--convert-to=')) {
        return arg.replace(/"/g, '');
      }
      return arg;
    });
    
    console.log('Fixed Args:', fixedArgs);
    
    const result = await execFileAsync(binary, fixedArgs, {
      timeout: options.timeout || 180000,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
      cwd: path.dirname(binary),
      env: spawnEnv,
      // Critical fix: shell: false to avoid path issues
      shell: false,
      encoding: 'utf8'
    });
    
    console.log('LibreOffice stdout:', result);
    return result;
  } catch (err) {
    console.error('LibreOffice execution failed:', err);
    console.error('Command:', binary, args.join(' '));
    throw err;
  }
}

module.exports = { runLibreOffice, PROFILE_DIR, windowsShortPath, resolveModuleExe };
