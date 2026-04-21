'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MAX_SPAWN_TIMEOUT_MS = 30 * 60 * 1000;
const FFPROBE_TIMEOUT_MS = 15000;

const PROXY_RESOLUTION_ALLOWED = new Set([25, 50, 75]);
const PROXY_CRF_ALLOWED = new Set([18, 23, 28]);

const VIDEO_EXTS = new Set(['.mov', '.mp4', '.mxf', '.m4v', '.avi', '.mkv', '.webm']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.exr', '.bmp', '.tif', '.tiff', '.webp', '.gif']);
const IMAGE_SEQUENCE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.exr', '.bmp', '.tif', '.tiff', '.webp']);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : Number(fallback) || 0;
}

function clampTimeoutMs(value, fallbackMs = MAX_SPAWN_TIMEOUT_MS) {
  const raw = toNumber(value, fallbackMs);
  const normalized = Math.trunc(raw);
  if (!Number.isFinite(normalized) || normalized <= 0) return fallbackMs;
  return Math.min(normalized, MAX_SPAWN_TIMEOUT_MS);
}

function normalizeResolutionPercent(value, fallback = 50) {
  const normalized = Math.trunc(toNumber(value, fallback));
  return PROXY_RESOLUTION_ALLOWED.has(normalized) ? normalized : 50;
}

function normalizeQualityCrf(value, fallback = 23) {
  const normalized = Math.trunc(toNumber(value, fallback));
  return PROXY_CRF_ALLOWED.has(normalized) ? normalized : 23;
}

function safeLog(logLine, level = 'info', action = 'ffmpeg', message = '', data = null) {
  const payload = {
    level: String(level || 'info'),
    src: 'postprod',
    action: String(action || 'ffmpeg'),
    message: String(message || ''),
  };
  if (data && typeof data === 'object') payload.data = data;

  if (typeof logLine === 'function') {
    try {
      logLine(payload);
      return;
    } catch {}
  }

  const line = `[postprod/${payload.action}] ${payload.message}`;
  if (payload.level === 'error') {
    try { console.error(line, payload.data || ''); } catch {}
    return;
  }
  if (payload.level === 'warn') {
    try { console.warn(line, payload.data || ''); } catch {}
    return;
  }
  try { console.log(line, payload.data || ''); } catch {}
}

function quoteCommandArg(arg) {
  const raw = String(arg == null ? '' : arg);
  if (!raw) return '""';
  if (/[\s"']/g.test(raw)) {
    return `"${raw.replace(/"/g, '\\"')}"`;
  }
  return raw;
}

function buildCommandString(command, args = []) {
  const cmd = quoteCommandArg(command);
  const suffix = (Array.isArray(args) ? args : []).map((arg) => quoteCommandArg(arg)).join(' ');
  return suffix ? `${cmd} ${suffix}` : cmd;
}

function emitMissingBinaryWarning(binaryName, searchedPath) {
  const msg = `Binary not found: ${binaryName}`;
  const data = { path: String(searchedPath || '') };
  safeLog(null, 'warn', 'ffmpeg_binary_missing', msg, data);
}

function getElectronAppSafe() {
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app;
    }
  } catch {}
  return null;
}

function pushUniquePath(list = [], value = '') {
  const raw = String(value || '').trim();
  if (!raw) return;
  if (!list.includes(raw)) list.push(raw);
}

function resolvePackagedBinaryPaths(fileName = '') {
  const out = [];
  const app = getElectronAppSafe();
  if (!app || app.isPackaged !== true) return out;

  const resourcesPath = String(process?.resourcesPath || '').trim();
  if (resourcesPath) {
    pushUniquePath(out, path.join(resourcesPath, 'ffmpeg', fileName));
  }

  try {
    const exePath = String(app.getPath('exe') || '').trim();
    if (exePath) {
      pushUniquePath(out, path.join(exePath, '..', 'resources', 'ffmpeg', fileName));
    }
  } catch {}

  try {
    const appPath = String(typeof app.getAppPath === 'function' ? app.getAppPath() : '').trim();
    if (appPath) {
      pushUniquePath(out, path.join(appPath, '..', 'ffmpeg', fileName));
    }
  } catch {}

  return out;
}

function resolveDevBinaryPaths(fileName = '') {
  const out = [];
  pushUniquePath(out, path.join(__dirname, '..', 'tools', 'ffmpeg', 'win', fileName));
  try {
    pushUniquePath(out, path.join(process.cwd(), 'tools', 'ffmpeg', 'win', fileName));
  } catch {}
  pushUniquePath(out, path.join(__dirname, '..', 'ffmpeg', fileName));
  return out;
}

function resolveBinaryPath(fileName = '') {
  const app = getElectronAppSafe();
  const isPackaged = app?.isPackaged === true;
  const packagedCandidates = resolvePackagedBinaryPaths(fileName);
  const devCandidates = resolveDevBinaryPaths(fileName);
  const candidates = isPackaged
    ? [...packagedCandidates, ...devCandidates]
    : [...devCandidates, ...packagedCandidates];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;
    try {
      if (fs.existsSync(value)) return path.resolve(value);
    } catch {}
  }
  emitMissingBinaryWarning(fileName, candidates[0] || '');
  return null;
}

function resolveFfmpegPath() {
  return resolveBinaryPath('ffmpeg.exe');
}

function resolveFfprobePath() {
  return resolveBinaryPath('ffprobe.exe');
}

function parseRatio(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (!raw.includes('/')) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  const [numRaw, denRaw] = raw.split('/');
  const num = Number(numRaw);
  const den = Number(denRaw);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  const ratio = num / den;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 0;
}

function toSafePositiveInt(value, fallback = 0) {
  const n = Math.trunc(toNumber(value, fallback));
  return Number.isFinite(n) && n > 0 ? n : Math.max(0, Math.trunc(fallback));
}

function toSafePositiveFloat(value, fallback = 0) {
  const n = toNumber(value, fallback);
  return Number.isFinite(n) && n > 0 ? n : Math.max(0, toNumber(fallback, 0));
}

function hasLikelyAlphaChannel(stream = {}) {
  const pixFmt = String(stream?.pix_fmt || '').toLowerCase();
  const alphaMode = String(stream?.alpha_mode || stream?.tags?.alpha_mode || '').toLowerCase();
  if (alphaMode === '1' || alphaMode === 'true' || alphaMode === 'yes') return true;
  const alphaTokens = ['rgba', 'bgra', 'argb', 'abgr', 'yuva', 'gbrap', 'ya'];
  if (alphaTokens.some((token) => pixFmt.includes(token))) return true;
  if (pixFmt.endsWith('a')) return true;
  return false;
}

function parseFfprobeStreams(outputText = '') {
  try {
    const parsed = JSON.parse(String(outputText || '').trim() || '{}');
    if (Array.isArray(parsed?.streams)) return parsed.streams;
  } catch {}
  return [];
}

function runProcess(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const commandPath = String(command || '').trim();
    if (!commandPath) {
      resolve({
        ok: false,
        code: null,
        stdout: '',
        stderr: '',
        error: 'missing_command',
        timedOut: false,
      });
      return;
    }

    const timeoutMs = clampTimeoutMs(options?.timeoutMs, MAX_SPAWN_TIMEOUT_MS);
    const cwd = String(options?.cwd || '').trim();

    let child = null;
    let done = false;
    let timedOut = false;
    let stdout = '';
    let stderr = '';
    let stderrBuffer = '';
    let stdoutBuffer = '';

    const finish = (payload) => {
      if (done) return;
      done = true;
      try { clearTimeout(timer); } catch {}
      resolve(payload);
    };

    const captureChunk = (target, chunk) => {
      const next = target + String(chunk || '');
      return next.length > 1024 * 1024 ? next.slice(-1024 * 1024) : next;
    };

    const flushLines = (source, callback) => {
      const parts = source.split(/\r|\n/g);
      const rest = parts.pop() || '';
      for (const line of parts) {
        const normalized = String(line || '').trim();
        if (!normalized) continue;
        try { callback(normalized); } catch {}
      }
      return rest;
    };

    try {
      child = spawn(commandPath, Array.isArray(args) ? args : [], {
        windowsHide: true,
        shell: false,
        ...(cwd ? { cwd } : {}),
      });
    } catch (err) {
      finish({
        ok: false,
        code: null,
        stdout: '',
        stderr: '',
        error: String(err?.message || err || 'spawn_failed'),
        timedOut: false,
      });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      const text = String(chunk || '');
      stdout = captureChunk(stdout, text);
      if (typeof options?.onStdoutData === 'function') {
        try { options.onStdoutData(text); } catch {}
      }
      if (typeof options?.onStdoutLine === 'function') {
        stdoutBuffer += text;
        stdoutBuffer = flushLines(stdoutBuffer, options.onStdoutLine);
      }
    });

    child.stderr?.on('data', (chunk) => {
      const text = String(chunk || '');
      stderr = captureChunk(stderr, text);
      if (typeof options?.onStderrData === 'function') {
        try { options.onStderrData(text); } catch {}
      }
      if (typeof options?.onStderrLine === 'function') {
        stderrBuffer += text;
        stderrBuffer = flushLines(stderrBuffer, options.onStderrLine);
      }
    });

    child.on('error', (err) => {
      finish({
        ok: false,
        code: null,
        stdout,
        stderr,
        error: String(err?.message || err || 'process_error'),
        timedOut,
      });
    });

    child.on('close', (code) => {
      if (typeof options?.onStdoutLine === 'function') {
        const trailing = String(stdoutBuffer || '').trim();
        if (trailing) {
          try { options.onStdoutLine(trailing); } catch {}
        }
      }
      if (typeof options?.onStderrLine === 'function') {
        const trailing = String(stderrBuffer || '').trim();
        if (trailing) {
          try { options.onStderrLine(trailing); } catch {}
        }
      }
      finish({
        ok: Number(code) === 0 && !timedOut,
        code: Number.isFinite(Number(code)) ? Number(code) : null,
        stdout,
        stderr,
        error: timedOut ? 'timeout' : '',
        timedOut,
      });
    });
  });
}

function parseDurationToSeconds(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return toSafePositiveFloat(raw, 0);
  const m = /^(\d+):(\d+):(\d+)(\.\d+)?$/.exec(raw);
  if (!m) return 0;
  const h = toSafePositiveInt(m[1], 0);
  const mm = toSafePositiveInt(m[2], 0);
  const s = toSafePositiveInt(m[3], 0);
  const frac = toSafePositiveFloat(m[4], 0);
  return h * 3600 + mm * 60 + s + frac;
}

async function probeMediaInfo(filePath) {
  const base = {
    ok: false,
    width: 0,
    height: 0,
    duration: 0,
    frameRate: 0,
    totalFrames: 0,
    hasAlpha: false,
    codec: '',
    error: '',
  };

  try {
    const target = String(filePath || '').trim();
    if (!target) return { ...base, error: 'invalid_file_path' };
    const ffprobePath = resolveFfprobePath();
    if (!ffprobePath) return { ...base, error: 'ffprobe_not_found' };
    if (!fs.existsSync(target)) return { ...base, error: 'file_not_found' };

    const args = ['-v', 'quiet', '-print_format', 'json', '-show_streams', target];
    const run = await runProcess(ffprobePath, args, { timeoutMs: FFPROBE_TIMEOUT_MS });
    if (!run.ok) {
      const detail = String(run.stderr || run.error || `ffprobe_exit_${run.code}`);
      return { ...base, error: detail || 'ffprobe_failed' };
    }

    const streams = parseFfprobeStreams(run.stdout);
    const video = streams.find((stream) => String(stream?.codec_type || '').toLowerCase() === 'video') || {};
    const width = toSafePositiveInt(video?.width, 0);
    const height = toSafePositiveInt(video?.height, 0);
    const duration = toSafePositiveFloat(video?.duration, 0);
    const frameRate = parseRatio(video?.avg_frame_rate || video?.r_frame_rate);
    const framesFromProbe = toSafePositiveInt(video?.nb_frames, 0);
    const totalFrames = framesFromProbe > 0
      ? framesFromProbe
      : (duration > 0 && frameRate > 0 ? Math.max(0, Math.round(duration * frameRate)) : 0);
    const codec = String(video?.codec_name || '').trim();
    const hasAlpha = hasLikelyAlphaChannel(video);

    return {
      ok: true,
      width,
      height,
      duration,
      frameRate,
      totalFrames,
      hasAlpha,
      codec,
      error: '',
    };
  } catch (err) {
    return {
      ...base,
      error: String(err?.message || err || 'probe_failed'),
    };
  }
}

function detectOutputType(outputPath) {
  const raw = String(outputPath || '').trim();
  const ext = String(path.extname(raw || '') || '').toLowerCase();
  const baseName = String(path.basename(raw || '') || '').toLowerCase();
  const hasSequenceToken = /%0?\d*d/i.test(baseName) || /#+/.test(baseName) || baseName.includes('*');

  if (hasSequenceToken && IMAGE_SEQUENCE_EXTS.has(ext)) {
    return { type: 'image_sequence', ext };
  }
  if (VIDEO_EXTS.has(ext)) {
    return { type: 'video', ext };
  }
  if (IMAGE_EXTS.has(ext)) {
    return { type: 'image', ext };
  }
  return { type: 'unknown', ext };
}

function escapeRegExp(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listFilesSafe(dirPath = '') {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry && entry.isFile && entry.isFile())
      .map((entry) => String(entry.name || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function listSequenceFiles(patternPath = '') {
  const raw = String(patternPath || '').trim();
  if (!raw) return [];
  const dir = path.dirname(raw);
  const base = path.basename(raw);
  const files = listFilesSafe(dir);
  if (files.length <= 0) return [];

  const buildFileObjects = (matcher, extractor = null) => {
    const out = [];
    for (const fileName of files) {
      const match = matcher.exec(fileName);
      if (!match) continue;
      const frame = typeof extractor === 'function' ? toSafePositiveInt(extractor(match), 0) : 0;
      const fullPath = path.join(dir, fileName);
      out.push({ path: fullPath, frame, name: fileName });
    }
    out.sort((a, b) => {
      if (a.frame > 0 && b.frame > 0 && a.frame !== b.frame) return a.frame - b.frame;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });
    return out;
  };

  if (base.includes('*')) {
    const regex = new RegExp(`^${escapeRegExp(base).replace(/\\\*/g, '.*')}$`, 'i');
    const out = buildFileObjects(regex, (match) => {
      const token = String(match?.[0] || '');
      const digits = token.match(/(\d+)/g);
      if (!digits || digits.length <= 0) return 0;
      return Number(digits[digits.length - 1]);
    });
    return out;
  }

  const printfMatch = /%0?(\d*)d/i.exec(base);
  if (printfMatch) {
    const width = toSafePositiveInt(printfMatch[1], 0);
    const prefix = base.slice(0, printfMatch.index);
    const suffix = base.slice(printfMatch.index + printfMatch[0].length);
    const frameToken = width > 0 ? `\\d{${width}}` : '\\d+';
    const regex = new RegExp(`^${escapeRegExp(prefix)}(${frameToken})${escapeRegExp(suffix)}$`, 'i');
    return buildFileObjects(regex, (match) => match?.[1]);
  }

  const hashMatch = /(#+)/.exec(base);
  if (hashMatch) {
    const width = String(hashMatch[1] || '').length;
    const prefix = base.slice(0, hashMatch.index);
    const suffix = base.slice(hashMatch.index + width);
    const frameToken = width > 0 ? `\\d{${width}}` : '\\d+';
    const regex = new RegExp(`^${escapeRegExp(prefix)}(${frameToken})${escapeRegExp(suffix)}$`, 'i');
    return buildFileObjects(regex, (match) => match?.[1]);
  }

  return [];
}

function toSequenceFfmpegInput(outputPath = '') {
  const raw = String(outputPath || '').trim();
  const base = path.basename(raw);
  if (!raw) return { ok: false, error: 'invalid_output_path', inputArgs: [] };

  if (base.includes('*')) {
    return { ok: true, inputArgs: ['-pattern_type', 'glob', '-i', raw] };
  }

  if (/%0?\d*d/i.test(base)) {
    return { ok: true, inputArgs: ['-i', raw] };
  }

  if (/(#+)/.test(base)) {
    const convertedBase = base.replace(/(#+)/, (_, token) => `%0${String(token || '').length}d`);
    const converted = path.join(path.dirname(raw), convertedBase);
    return { ok: true, inputArgs: ['-i', converted] };
  }

  return { ok: false, error: 'unsupported_sequence_pattern', inputArgs: [] };
}

function ensureDirectorySafe(dirPath = '') {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function scaleExpressionFromPercent(resolutionPercent = 50) {
  const pct = normalizeResolutionPercent(resolutionPercent, 50);
  const ratio = (pct / 100).toFixed(2).replace(/\.?0+$/g, '');
  return `scale=iw*${ratio}:ih*${ratio}`;
}

function parseProgressPercentFromLine(line, totalDuration, totalFrames) {
  const raw = String(line || '');
  const timeMatch = /time=\s*([0-9:.]+)/i.exec(raw);
  if (timeMatch && totalDuration > 0) {
    const sec = parseDurationToSeconds(timeMatch[1]);
    if (sec > 0) {
      const ratio = Math.max(0, Math.min(1, sec / totalDuration));
      return Math.round(ratio * 100);
    }
  }
  const frameMatch = /frame=\s*(\d+)/i.exec(raw);
  if (frameMatch && totalFrames > 0) {
    const frame = toSafePositiveInt(frameMatch[1], 0);
    if (frame > 0) {
      const ratio = Math.max(0, Math.min(1, frame / totalFrames));
      return Math.round(ratio * 100);
    }
  }
  return null;
}

async function runFfmpegCommand({
  ffmpegPath,
  args = [],
  timeoutMs = MAX_SPAWN_TIMEOUT_MS,
  onProgress = null,
  totalDuration = 0,
  totalFrames = 0,
  logLine = null,
  action = 'ffmpeg_run',
} = {}) {
  const commandString = buildCommandString(ffmpegPath, args);
  safeLog(logLine, 'info', action, commandString);

  let lastProgress = -1;
  const handleProgress = (line) => {
    if (typeof onProgress !== 'function') return;
    const parsed = parseProgressPercentFromLine(line, totalDuration, totalFrames);
    if (parsed == null) return;
    const next = Math.max(lastProgress, Math.max(0, Math.min(100, parsed)));
    if (next === lastProgress) return;
    lastProgress = next;
    try { onProgress(next); } catch {}
  };

  const result = await runProcess(ffmpegPath, args, {
    timeoutMs,
    onStderrLine: handleProgress,
  });

  if (result.ok && typeof onProgress === 'function') {
    try { onProgress(100); } catch {}
  }

  if (!result.ok) {
    const detail = String(result.stderr || result.error || `ffmpeg_exit_${result.code}`).trim();
    return { ok: false, error: detail || 'ffmpeg_failed' };
  }

  return { ok: true, error: '' };
}

async function generateProxy(options = {}) {
  const base = {
    ok: false,
    proxyPath: '',
    alphaPath: '',
    width: 0,
    height: 0,
    totalFrames: 0,
    frameRate: 0,
    error: '',
  };

  try {
    const outputPath = String(options?.outputPath || '').trim();
    const explicitDestDir = String(options?.destDir || '').trim();
    const destDir = explicitDestDir || path.dirname(outputPath);
    const resolutionPercent = normalizeResolutionPercent(options?.resolutionPercent, 50);
    const qualityCrf = normalizeQualityCrf(options?.qualityCrf, 23);
    const onProgress = typeof options?.onProgress === 'function' ? options.onProgress : null;
    const logLine = typeof options?.logLine === 'function' ? options.logLine : null;
    if (!outputPath || !destDir) return { ...base, error: 'invalid_output_path' };

    const ffmpegPath = resolveFfmpegPath();
    if (!ffmpegPath) return { ...base, error: 'ffmpeg_not_found' };

    const outputType = detectOutputType(outputPath);
    if (outputType.type === 'unknown') {
      return { ...base, error: 'unsupported_output_type' };
    }

    const proxyDir = path.join(destDir, 'proxy');
    if (!ensureDirectorySafe(proxyDir)) {
      return { ...base, error: 'proxy_dir_create_failed' };
    }

    const proxyPath = path.join(proxyDir, 'proxy.mp4');
    const alphaPath = path.join(proxyDir, 'proxy_alpha.mp4');
    const scaleFilter = scaleExpressionFromPercent(resolutionPercent);

    let width = 0;
    let height = 0;
    let totalFrames = 0;
    let frameRate = 0;
    let shouldBuildAlpha = false;

    if (outputType.type === 'image_sequence') {
      const sequenceFiles = listSequenceFiles(outputPath);
      if (sequenceFiles.length <= 0) {
        return { ...base, error: 'sequence_not_found' };
      }
      totalFrames = sequenceFiles.length;
      const probe = await probeMediaInfo(sequenceFiles[0].path);
      if (probe.ok) {
        width = probe.width;
        height = probe.height;
        frameRate = probe.frameRate;
      }

      const sequenceInput = toSequenceFfmpegInput(outputPath);
      if (!sequenceInput.ok) return { ...base, error: sequenceInput.error || 'invalid_sequence_pattern' };

      const isExr = outputType.ext === '.exr';
      const commonArgs = [
        '-y',
        '-hide_banner',
        ...(isExr ? ['-apply_trc', 'iec61966_2_1'] : []),
        ...sequenceInput.inputArgs,
      ];

      const proxyVf = isExr
        ? `${scaleFilter}:flags=lanczos,zscale=transfer=bt709:matrix=bt709:primaries=bt709:range=limited`
        : scaleFilter;

      const proxyArgs = [
        ...commonArgs,
        '-vf', proxyVf,
        '-c:v', 'libx264',
        '-crf', String(qualityCrf),
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        proxyPath,
      ];

      const proxyRun = await runFfmpegCommand({
        ffmpegPath,
        args: proxyArgs,
        timeoutMs: MAX_SPAWN_TIMEOUT_MS,
        onProgress,
        totalDuration: 0,
        totalFrames,
        logLine,
        action: 'ffmpeg_generate_proxy',
      });
      if (!proxyRun.ok) {
        return { ...base, error: proxyRun.error || 'proxy_generation_failed' };
      }

      shouldBuildAlpha = true;
      const alphaVf = isExr
        ? `${scaleFilter}:flags=lanczos,extractplanes=a,format=gray`
        : `${scaleFilter},extractplanes=a,format=gray`;
      const alphaArgs = [
        ...commonArgs,
        '-vf', alphaVf,
        '-c:v', 'libx264',
        '-crf', String(qualityCrf),
        '-preset', 'fast',
        alphaPath,
      ];
      const alphaRun = await runFfmpegCommand({
        ffmpegPath,
        args: alphaArgs,
        timeoutMs: MAX_SPAWN_TIMEOUT_MS,
        onProgress: null,
        totalDuration: 0,
        totalFrames,
        logLine,
        action: 'ffmpeg_generate_proxy_alpha',
      });
      if (!alphaRun.ok) {
        return { ...base, proxyPath, error: alphaRun.error || 'proxy_alpha_generation_failed' };
      }
    } else if (outputType.type === 'video') {
      const probe = await probeMediaInfo(outputPath);
      if (probe.ok) {
        width = probe.width;
        height = probe.height;
        totalFrames = probe.totalFrames;
        frameRate = probe.frameRate;
        shouldBuildAlpha = outputType.ext === '.mov' && probe.hasAlpha === true;
      }

      const proxyArgs = [
        '-y',
        '-hide_banner',
        '-i', outputPath,
        '-vf', scaleFilter,
        '-c:v', 'libx264',
        '-crf', String(qualityCrf),
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        proxyPath,
      ];
      const proxyRun = await runFfmpegCommand({
        ffmpegPath,
        args: proxyArgs,
        timeoutMs: MAX_SPAWN_TIMEOUT_MS,
        onProgress,
        totalDuration: probe.ok ? probe.duration : 0,
        totalFrames: probe.ok ? probe.totalFrames : 0,
        logLine,
        action: 'ffmpeg_generate_proxy',
      });
      if (!proxyRun.ok) {
        return { ...base, error: proxyRun.error || 'proxy_generation_failed' };
      }

      if (shouldBuildAlpha) {
        const alphaArgs = [
          '-y',
          '-hide_banner',
          '-i', outputPath,
          '-vf', `${scaleFilter},extractplanes=a,format=gray`,
          '-c:v', 'libx264',
          '-crf', String(qualityCrf),
          '-preset', 'fast',
          alphaPath,
        ];
        const alphaRun = await runFfmpegCommand({
          ffmpegPath,
          args: alphaArgs,
          timeoutMs: MAX_SPAWN_TIMEOUT_MS,
          onProgress: null,
          totalDuration: probe.ok ? probe.duration : 0,
          totalFrames: probe.ok ? probe.totalFrames : 0,
          logLine,
          action: 'ffmpeg_generate_proxy_alpha',
        });
        if (!alphaRun.ok) {
          return { ...base, proxyPath, error: alphaRun.error || 'proxy_alpha_generation_failed' };
        }
      }
    } else if (outputType.type === 'image') {
      const probe = await probeMediaInfo(outputPath);
      if (probe.ok) {
        width = probe.width;
        height = probe.height;
        totalFrames = probe.totalFrames;
        frameRate = probe.frameRate;
        shouldBuildAlpha = probe.hasAlpha === true;
      }
      const isExr = outputType.ext === '.exr';
      const imageInputArgs = [
        '-y',
        '-hide_banner',
        ...(isExr ? ['-apply_trc', 'iec61966_2_1'] : []),
        '-loop', '1',
        '-i', outputPath,
      ];
      const imageProxyVf = isExr
        ? `${scaleFilter}:flags=lanczos,zscale=transfer=bt709:matrix=bt709:primaries=bt709:range=limited`
        : scaleFilter;
      const proxyArgs = [
        ...imageInputArgs,
        '-vf', imageProxyVf,
        '-t', '1',
        '-c:v', 'libx264',
        '-crf', String(qualityCrf),
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        proxyPath,
      ];
      const proxyRun = await runFfmpegCommand({
        ffmpegPath,
        args: proxyArgs,
        timeoutMs: MAX_SPAWN_TIMEOUT_MS,
        onProgress,
        totalDuration: 1,
        totalFrames: 1,
        logLine,
        action: 'ffmpeg_generate_proxy',
      });
      if (!proxyRun.ok) {
        return { ...base, error: proxyRun.error || 'proxy_generation_failed' };
      }

      if (shouldBuildAlpha) {
        const imageAlphaVf = isExr
          ? `${scaleFilter}:flags=lanczos,extractplanes=a,format=gray`
          : `${scaleFilter},extractplanes=a,format=gray`;
        const alphaArgs = [
          ...imageInputArgs,
          '-vf', imageAlphaVf,
          '-t', '1',
          '-c:v', 'libx264',
          '-crf', String(qualityCrf),
          '-preset', 'fast',
          alphaPath,
        ];
        const alphaRun = await runFfmpegCommand({
          ffmpegPath,
          args: alphaArgs,
          timeoutMs: MAX_SPAWN_TIMEOUT_MS,
          onProgress: null,
          totalDuration: 1,
          totalFrames: 1,
          logLine,
          action: 'ffmpeg_generate_proxy_alpha',
        });
        if (!alphaRun.ok) {
          return { ...base, proxyPath, error: alphaRun.error || 'proxy_alpha_generation_failed' };
        }
      }
    } else {
      return { ...base, error: 'unsupported_output_type' };
    }

    return {
      ok: true,
      proxyPath,
      alphaPath: shouldBuildAlpha ? alphaPath : '',
      hasAlpha: shouldBuildAlpha,
      width,
      height,
      totalFrames,
      frameRate,
      error: '',
    };
  } catch (err) {
    return {
      ...base,
      error: String(err?.message || err || 'proxy_generation_failed'),
    };
  }
}

async function generateThumbnail(options = {}) {
  const base = {
    ok: false,
    thumbPath: '',
    error: '',
  };

  try {
    const outputPath = String(options?.outputPath || '').trim();
    const explicitDestDir = String(options?.destDir || '').trim();
    const destDir = explicitDestDir || path.dirname(outputPath);
    const resolutionPercent = normalizeResolutionPercent(options?.resolutionPercent, 50);
    const logLine = typeof options?.logLine === 'function' ? options.logLine : null;
    if (!outputPath || !destDir) return { ...base, error: 'invalid_output_path' };

    const ffmpegPath = resolveFfmpegPath();
    if (!ffmpegPath) return { ...base, error: 'ffmpeg_not_found' };

    const outputType = detectOutputType(outputPath);
    if (outputType.type === 'unknown') return { ...base, error: 'unsupported_output_type' };

    const imagesDir = path.join(destDir, 'images');
    if (!ensureDirectorySafe(imagesDir)) {
      return { ...base, error: 'images_dir_create_failed' };
    }
    const thumbPath = path.join(imagesDir, 'thumbnail.jpg');
    const scaleFilter = scaleExpressionFromPercent(resolutionPercent);

    let args = [];
    if (outputType.type === 'image_sequence') {
      const sequenceFiles = listSequenceFiles(outputPath);
      if (sequenceFiles.length <= 0) return { ...base, error: 'sequence_not_found' };
      const middleIndex = Math.max(0, Math.floor((sequenceFiles.length - 1) / 2));
      const middleFrame = sequenceFiles[middleIndex]?.path;
      if (!middleFrame) return { ...base, error: 'sequence_frame_not_found' };
      const isExr = outputType.ext === '.exr';
      const thumbVfSeq = isExr
        ? `${scaleFilter}:flags=lanczos,zscale=transfer=bt709:matrix=bt709:primaries=bt709:range=limited`
        : scaleFilter;
      args = [
        '-y',
        '-hide_banner',
        ...(isExr ? ['-apply_trc', 'iec61966_2_1'] : []),
        '-i', middleFrame,
        '-vf', thumbVfSeq,
        '-frames:v', '1',
        '-q:v', '2',
        thumbPath,
      ];
    } else if (outputType.type === 'video') {
      const probe = await probeMediaInfo(outputPath);
      const duration = probe.ok ? probe.duration : 0;
      const seekSec = duration > 0 ? Math.max(0, duration / 2) : 0;
      args = [
        '-y',
        '-hide_banner',
        '-ss', String(seekSec),
        '-i', outputPath,
        '-vf', scaleFilter,
        '-frames:v', '1',
        '-q:v', '2',
        thumbPath,
      ];
    } else if (outputType.type === 'image') {
      const isExr = outputType.ext === '.exr';
      const thumbVfImg = isExr
        ? `${scaleFilter}:flags=lanczos,zscale=transfer=bt709:matrix=bt709:primaries=bt709:range=limited`
        : scaleFilter;
      args = [
        '-y',
        '-hide_banner',
        ...(isExr ? ['-apply_trc', 'iec61966_2_1'] : []),
        '-i', outputPath,
        '-vf', thumbVfImg,
        '-frames:v', '1',
        '-q:v', '2',
        thumbPath,
      ];
    } else {
      return { ...base, error: 'unsupported_output_type' };
    }

    const run = await runFfmpegCommand({
      ffmpegPath,
      args,
      timeoutMs: MAX_SPAWN_TIMEOUT_MS,
      logLine,
      action: 'ffmpeg_generate_thumbnail',
    });
    if (!run.ok) {
      return { ...base, error: run.error || 'thumbnail_generation_failed' };
    }

    return {
      ok: true,
      thumbPath,
      error: '',
    };
  } catch (err) {
    return {
      ...base,
      error: String(err?.message || err || 'thumbnail_generation_failed'),
    };
  }
}

module.exports = {
  resolveFfmpegPath,
  resolveFfprobePath,
  probeMediaInfo,
  detectOutputType,
  generateProxy,
  generateThumbnail,
};
