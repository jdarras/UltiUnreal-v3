const RENDER_OUTPUT_VIDEO_EXTS = ['.mp4', '.mov', '.mxf', '.avi', '.webm', '.mkv'];
const RENDER_OUTPUT_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.exr', '.tga', '.bmp', '.dpx', '.hdr'];
const RENDER_OUTPUT_ALL_EXTS = [...RENDER_OUTPUT_VIDEO_EXTS, ...RENDER_OUTPUT_IMAGE_EXTS];

function waitMs(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

function summarizeProcessFailure(procRes = {}) {
  const code = Number(procRes?.code);
  const timedOut = procRes?.timedOut === true;
  const stderr = String(procRes?.stderr || '').trim();
  const error = String(procRes?.error || '').trim();
  if (timedOut) return 'worker_process_timeout';
  if (stderr) return stderr.slice(0, 400);
  if (error) return error.slice(0, 400);
  if (Number.isFinite(code)) return `worker_process_exit_${code}`;
  return 'worker_process_failed';
}

function compactProcessLogText(value = '', maxChars = 700) {
  const raw = String(value || '').replace(/\r\n/g, '\n').trim();
  const maxLen = Number.isFinite(Number(maxChars)) ? Math.max(80, Math.trunc(Number(maxChars))) : 700;
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  return `...${raw.slice(raw.length - maxLen)}`;
}

function compactProcessLogTextMiddle(value = '', maxChars = 1200) {
  const raw = String(value || '').replace(/\r\n/g, '\n').trim();
  const maxLen = Number.isFinite(Number(maxChars)) ? Math.max(120, Math.trunc(Number(maxChars))) : 1200;
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  const half = Math.max(40, Math.floor((maxLen - 12) / 2));
  const head = raw.slice(0, half);
  const tail = raw.slice(raw.length - half);
  return `${head}\n...[snip]...\n${tail}`;
}

function extractProcessDiagnosticLines(value = '', maxLines = 18) {
  const raw = String(value || '').replace(/\r\n/g, '\n');
  if (!raw) return [];
  const lines = raw.split('\n');
  const out = [];
  const seen = new Set();
  const rx = /(error|fatal|exception|failed|moviepipeline|uurender|remote ?control|not bound|invalid|missing|unknown|warning)/i;
  for (const line of lines) {
    const trimmed = String(line || '').trim();
    if (!trimmed) continue;
    if (/metadata set\s*:\s*commandline/i.test(trimmed)) continue;
    if (/^logcsvprofiler:/i.test(trimmed) && /commandline/i.test(trimmed)) continue;
    if (!rx.test(trimmed)) continue;
    const normalizedLine = trimmed.length > 340 ? `${trimmed.slice(0, 340)} ...` : trimmed;
    const key = normalizedLine.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalizedLine);
    if (out.length >= maxLines) break;
  }
  return out;
}

function buildWorkerProcessEventComment({
  command = '',
  args = [],
  procRes = {},
  workerLogPath = '',
  workerLogText = '',
} = {}) {
  const safeCommand = String(command || '').trim();
  const resolvedCommand = String(procRes?.command || '').trim();
  const safeArgs = Array.isArray(args)
    ? args.map((arg) => String(arg || '').trim()).filter(Boolean)
    : [];
  const cmdLine = [safeCommand, ...safeArgs].filter(Boolean).join(' ');
  const cmdLineShort = compactProcessLogTextMiddle(cmdLine, 1400);
  const exitCodeRaw = Number(procRes?.code);
  const hasExitCode = Number.isFinite(exitCodeRaw);
  const timedOut = procRes?.timedOut === true;
  const ok = procRes?.ok === true;
  const stdoutRaw = String(procRes?.stdout || '');
  const stderrRaw = String(procRes?.stderr || '');
  const stdoutTail = compactProcessLogText(stdoutRaw, 2400);
  const stderrTail = compactProcessLogText(stderrRaw, 2400);
  const stdoutHead = String(stdoutRaw || '').replace(/\r\n/g, '\n').slice(0, 900).trim();
  const stderrHead = String(stderrRaw || '').replace(/\r\n/g, '\n').slice(0, 900).trim();
  const diagnostics = [
    ...extractProcessDiagnosticLines(stderrRaw, 20),
    ...extractProcessDiagnosticLines(stdoutRaw, 20),
    ...extractProcessDiagnosticLines(workerLogText, 28),
  ].slice(0, 24);
  const out = [];
  if (cmdLineShort) out.push(`cmd: ${cmdLineShort}`);
  if (resolvedCommand && resolvedCommand !== safeCommand) {
    out.push(`cmd_resolved: ${resolvedCommand}`);
  }
  if (String(workerLogPath || '').trim()) out.push(`workerlog: ${String(workerLogPath).trim()}`);
  if (ok) out.push(`exit: ok${hasExitCode ? ` (${Math.trunc(exitCodeRaw)})` : ''}`);
  else if (timedOut) out.push('exit: timeout');
  else out.push(`exit: failed${hasExitCode ? ` (${Math.trunc(exitCodeRaw)})` : ''}`);
  if (diagnostics.length > 0) {
    out.push(`diagnostics:\n${diagnostics.join('\n')}`);
  }
  if (stderrHead) out.push(`stderr(head):\n${stderrHead}`);
  if (stderrTail) out.push(`stderr:\n${stderrTail}`);
  if (stdoutHead) out.push(`stdout(head):\n${stdoutHead}`);
  if (stdoutTail) out.push(`stdout:\n${stdoutTail}`);
  if (workerLogText) {
    const logHead = String(workerLogText || '').replace(/\r\n/g, '\n').slice(0, 900).trim();
    const logTail = compactProcessLogText(workerLogText, 2400);
    if (logHead) out.push(`workerlog(head):\n${logHead}`);
    if (logTail) out.push(`workerlog(tail):\n${logTail}`);
  }
  if (!out.length) return '';
  return out.join('\n');
}

function replaceProcessTemplateVars(input = '', context = {}) {
  const source = String(input == null ? '' : input);
  if (!source) return '';
  const values = context && typeof context === 'object' ? context : {};
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|%([a-zA-Z0-9_]+)%/g, (_match, p1, p2) => {
    const keyRaw = String(p1 || p2 || '').trim();
    if (!keyRaw) return '';
    const key = keyRaw.toLowerCase();
    const value = values[key];
    if (value == null) return '';
    return String(value);
  });
}

function hasProcessTemplateToken(value = '') {
  const input = String(value || '');
  if (!input) return false;
  return /\{\{\s*[a-zA-Z0-9_]+\s*\}\}|%[a-zA-Z0-9_]+%/.test(input);
}

function encodeBase64Utf8(value = '') {
  const source = String(value == null ? '' : value);
  if (!source) return '';
  try {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(source, 'utf8').toString('base64');
    }
  } catch {}
  try {
    if (typeof TextEncoder === 'function' && typeof btoa === 'function') {
      const bytes = new TextEncoder().encode(source);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }
  } catch {}
  return '';
}

function ensureRenderOutputExt(fileName = '', fallbackExt = '.mov') {
  const raw = String(fileName || '').trim();
  if (!raw) return '';
  if (/[\\/]\s*$/.test(raw)) return raw;
  if (/\.[a-z0-9]{2,6}$/i.test(raw)) return raw;
  return `${raw}${String(fallbackExt || '.mov')}`;
}

function getRenderPathExtension(filePath = '') {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  const clean = raw.replace(/[\\/]+$/g, '');
  const fileName = clean.split(/[\\/]/).pop() || clean;
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0) return '';
  return fileName.slice(idx).toLowerCase();
}

function replaceRenderPathExtension(filePath = '', nextExt = '') {
  const raw = String(filePath || '').trim();
  const ext = String(nextExt || '').trim().toLowerCase();
  if (!raw || !ext) return raw;
  const slashIdx = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
  const head = slashIdx >= 0 ? raw.slice(0, slashIdx + 1) : '';
  const tail = slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw;
  const dotIdx = tail.lastIndexOf('.');
  const base = dotIdx > 0 ? tail.slice(0, dotIdx) : tail;
  return `${head}${base}${ext}`;
}

function inferExpectedRenderOutputExt(outputProfile = '') {
  const profile = String(outputProfile || '').trim().toLowerCase();
  if (!profile) return '.mov';
  if (profile.includes('h264') || profile.includes('h265') || profile.includes('hevc') || profile.includes('mp4')) {
    return '.mp4';
  }
  if (profile.includes('mxf') || profile.includes('dnxhd') || profile.includes('dnxhr')) {
    return '.mxf';
  }
  if (profile.includes('avi')) return '.avi';
  if (profile.includes('webm')) return '.webm';
  if (profile.includes('jpg') || profile.includes('jpeg')) return '.jpg';
  if (profile.includes('exr')) return '.exr';
  if (profile.includes('png')) return '.png';
  return '.mov';
}

function isLikelyRenderOutputMedia(filePath = '') {
  const ext = getRenderPathExtension(filePath);
  return RENDER_OUTPUT_ALL_EXTS.includes(ext);
}

function buildRenderOutputPathCandidates(filePath = '') {
  const raw = String(filePath || '').trim();
  if (!raw) return [];
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const next = String(value || '').trim();
    if (!next) return;
    const key = next.replace(/\\/g, '/').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(next);
  };
  push(raw);
  const currentExt = getRenderPathExtension(raw);
  if (currentExt) {
    for (const altExt of RENDER_OUTPUT_ALL_EXTS) {
      push(replaceRenderPathExtension(raw, altExt));
    }
  } else {
    for (const ext of RENDER_OUTPUT_ALL_EXTS) {
      push(`${raw}${ext}`);
    }
  }
  return out;
}

function joinRenderOutputPath(baseDir = '', fileName = '') {
  const dir = String(baseDir || '').trim().replace(/[\\/]+$/g, '');
  const name = String(fileName || '').trim().replace(/^[\\/]+/g, '');
  if (dir && name) return `${dir}/${name}`;
  if (dir) return dir;
  return name;
}

function normalizeUnrealMapLaunchArg(rawMapName = '') {
  let mapArg = String(rawMapName || '').trim();
  if (!mapArg) return '';
  mapArg = mapArg.replace(/\\/g, '/');
  if (mapArg.startsWith('/Game/')) {
    // already normalized
  } else if (mapArg.startsWith('/Maps/')) mapArg = `/Game${mapArg}`;
  else if (mapArg.startsWith('Maps/')) mapArg = `/Game/${mapArg}`;
  else if (mapArg.startsWith('/')) mapArg = `/Game${mapArg}`;
  mapArg = mapArg.replace(/\.umap$/i, '');
  if (mapArg.startsWith('/Game/') && mapArg.includes('.')) {
    mapArg = mapArg.split('.')[0];
  }
  return mapArg;
}

function normalizeUnrealPresetName(rawPreset = '') {
  const input = String(rawPreset || '').trim();
  if (!input) return '';
  const normalized = input.replace(/\\/g, '/');
  const tail = normalized.split('/').filter(Boolean).pop() || normalized;
  if (tail.includes('.')) {
    const parts = tail.split('.');
    return String(parts[parts.length - 1] || tail).trim();
  }
  return String(tail || input).trim();
}

function normalizeBooleanFlag(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'number') return value !== 0;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback === true;
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
  return fallback === true;
}

function withJobContextProcessArgs(execution = null, hasFormData = false) {
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) return null;
  const args = Array.isArray(execution.args) ? [...execution.args] : [];
  const hasJobB64 = args.some((a) => String(a || '').toLowerCase().includes('renderjobb64'));
  const hasFormB64 = args.some((a) => String(a || '').toLowerCase().includes('formdatab64'));
  const hasOutputDir = args.some((a) => String(a || '').toLowerCase().includes('uurenderoutputdir'));
  const hasMovieFolder = args.some((a) => String(a || '').toLowerCase().includes('moviefolder'));
  const hasMovieName = args.some((a) => String(a || '').toLowerCase().includes('moviename'));
  if (!hasJobB64) args.push('-UURenderJobB64={{renderjobb64}}');
  if (hasFormData && !hasFormB64) args.push('-UURenderFormDataB64={{formdatab64}}');
  if (!hasMovieFolder) args.push('-MovieFolder={{outputdir}}');
  if (!hasMovieName) args.push('-MovieName={{expectedrendername}}');
  if (!hasOutputDir) args.push('-UURenderOutputDir={{outputdir}}');
  return { ...execution, args };
}

function withRenderOffscreenProcessArgs(execution = null, renderOffscreen = false) {
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) return null;
  const offscreen = normalizeBooleanFlag(renderOffscreen, false);
  const cloned = {
    ...execution,
    renderOffscreen: offscreen,
  };
  const args = Array.isArray(execution?.args) ? execution.args : [];
  if (args.length <= 0) {
    if (offscreen) cloned.args = ['-RenderOffscreen'];
    return cloned;
  }
  const nextArgs = args
    .map((arg) => String(arg || '').trim())
    .filter(Boolean)
    .filter((arg) => String(arg || '').trim().toLowerCase() !== '-renderoffscreen');
  if (offscreen) nextArgs.push('-RenderOffscreen');
  cloned.args = nextArgs;
  return cloned;
}

function buildRenderProcessTemplateContext({
  render = null,
  payload = null,
  execution = null,
  workerKey = '',
  defaultUnrealEditorPath = '',
} = {}) {
  const renderObj = render && typeof render === 'object' ? render : {};
  const payloadObj = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const executionObj = execution && typeof execution === 'object' && !Array.isArray(execution) ? execution : {};
  const renderId = Number(renderObj?.id || 0);
  const linkedTaskId = Number(renderObj?.linkedTaskId || payloadObj?.taskId || 0);
  const taskExpectedCount = Number(payloadObj?.taskExpectedRenderCount || renderObj?.taskExpectedRenderCount || 0);
  const taskDetectedCount = Number(payloadObj?.taskDetectedRenderCount || renderObj?.taskDetectedRenderCount || 0);
  const fallbackExpectedName = renderId > 0 ? `render-${renderId}` : '';
  const expectedRenderNameRaw = String(
    payloadObj?.matchedExpectedRenderName ||
    renderObj?.matchedExpectedRenderName ||
    fallbackExpectedName
  ).trim();
  const expectedExt = inferExpectedRenderOutputExt(payloadObj?.outputProfile || '');
  const expectedRenderName = ensureRenderOutputExt(expectedRenderNameRaw, expectedExt);
  const outputDir = String(
    payloadObj?.outputDir ||
    payloadObj?.renderOutputDir ||
    executionObj?.outputDir ||
    ''
  ).trim();
  const projectPath = String(
    payloadObj?.projectPath ||
    payloadObj?.uprojectPath ||
    executionObj?.projectPath ||
    executionObj?.uprojectPath ||
    ''
  ).trim();
  const unrealEditorPath = String(
    payloadObj?.unrealEditorPath ||
    payloadObj?.unrealExe ||
    executionObj?.unrealEditorPath ||
    executionObj?.unrealExe ||
    defaultUnrealEditorPath ||
    ''
  ).trim();
  const outputPathRaw = String(
    executionObj?.outputPath ||
    payloadObj?.outputPath ||
    ''
  ).trim();
  const outputPathFallback = joinRenderOutputPath(outputDir, expectedRenderName || fallbackExpectedName);
  const outputPath = outputPathRaw && !hasProcessTemplateToken(outputPathRaw)
    ? outputPathRaw
    : outputPathFallback;
  const workerLogPath = outputDir
    ? joinRenderOutputPath(joinRenderOutputPath(outputDir, 'logs'), `uu-worker-render-${renderId > 0 ? renderId : 'latest'}.log`)
    : '';
  const formDataObject = payloadObj?.formData && typeof payloadObj.formData === 'object' && !Array.isArray(payloadObj.formData)
    ? payloadObj.formData
    : {};
  const hasFormData = Object.keys(formDataObject).length > 0;
  const payloadWrcFiles = Array.isArray(payloadObj?.wrcFiles)
    ? payloadObj.wrcFiles
    : (Array.isArray(payloadObj?.wrc_files) ? payloadObj.wrc_files : []);
  const fallbackWrcPresetPath = payloadWrcFiles
    .map((entry) => String(entry || '').trim())
    .find(Boolean) || '';
  const presetPathRaw = String(
    payloadObj?.presetPath
    || payloadObj?.preset_path
    || executionObj?.presetPath
    || executionObj?.preset_path
    || fallbackWrcPresetPath
    || ''
  ).trim();
  const explicitPresetNameRaw = String(
    payloadObj?.presetName
    || payloadObj?.wrcPresetName
    || executionObj?.presetName
    || ''
  ).trim();
  const legacyPresetFallback = hasFormData
    ? ''
    : String(
      payloadObj?.renderModeName
      || renderObj?.templateName
      || ''
    ).trim();
  const presetNameRaw = explicitPresetNameRaw
    || normalizeUnrealPresetName(presetPathRaw)
    || legacyPresetFallback;
  const presetName = normalizeUnrealPresetName(presetNameRaw) || presetNameRaw;
  const presetPath = presetPathRaw.startsWith('/') ? presetPathRaw : '';
  let formDataJson = '';
  try {
    formDataJson = JSON.stringify(formDataObject || {});
  } catch {
    formDataJson = '{}';
  }
  if (!formDataJson) formDataJson = '{}';
  const bridgeJobPayload = {
    renderId: Number.isFinite(renderId) ? renderId : 0,
    taskId: Number.isFinite(linkedTaskId) ? linkedTaskId : 0,
    workerKey: String(workerKey || renderObj?.assignedWorkerKey || '').trim(),
    projectPath,
    unrealEditorPath,
    projectName: String(renderObj?.projectName || payloadObj?.projectName || '').trim(),
    templateName: String(renderObj?.templateName || payloadObj?.templateName || '').trim(),
    mapName: normalizeUnrealMapLaunchArg(payloadObj?.mapName || '') || String(payloadObj?.mapName || '').trim(),
    sequenceName: String(payloadObj?.sequenceName || '').trim(),
    outputProfile: String(payloadObj?.outputProfile || '').trim(),
    outputDir,
    outputPath,
    expectedRenderName: expectedRenderName || fallbackExpectedName,
    presetName,
    presetPath,
    formData: formDataObject,
    textValue: String(payloadObj?.textValue || '').trim(),
    payload: payloadObj,
  };
  let renderJobJson = '';
  try {
    renderJobJson = JSON.stringify(bridgeJobPayload || {});
  } catch {
    renderJobJson = '{}';
  }
  if (!renderJobJson) renderJobJson = '{}';
  const formDataB64 = encodeBase64Utf8(formDataJson);
  const renderJobB64 = encodeBase64Utf8(renderJobJson);
  const now = new Date();
  const isoNow = now.toISOString();
  return {
    workerkey: String(workerKey || renderObj?.assignedWorkerKey || '').trim(),
    renderid: Number.isFinite(renderId) && renderId > 0 ? String(Math.trunc(renderId)) : '',
    taskid: Number.isFinite(linkedTaskId) && linkedTaskId > 0 ? String(Math.trunc(linkedTaskId)) : '',
    tasktitle: String(payloadObj?.taskTitle || renderObj?.linkedTaskTitle || '').trim(),
    projectname: String(renderObj?.projectName || payloadObj?.projectName || '').trim(),
    templatename: String(renderObj?.templateName || payloadObj?.templateName || '').trim(),
    mapname: normalizeUnrealMapLaunchArg(payloadObj?.mapName || '') || String(payloadObj?.mapName || '').trim(),
    sequencename: String(payloadObj?.sequenceName || '').trim(),
    outputprofile: String(payloadObj?.outputProfile || '').trim(),
    presetname: presetName,
    presetpath: presetPath,
    textvalue: String(payloadObj?.textValue || '').trim(),
    formdatajson: formDataJson,
    formdatab64: formDataB64,
    renderjobjson: renderJobJson,
    renderjobb64: renderJobB64,
    projectpath: projectPath,
    uprojectpath: projectPath,
    unrealeditorpath: unrealEditorPath,
    unrealexepath: unrealEditorPath,
    outputdir: outputDir,
    expectedrendername: expectedRenderName || fallbackExpectedName,
    outputpath: outputPath,
    workerlogpath: workerLogPath,
    date: isoNow.slice(0, 10),
    datetime: isoNow,
    timestamp: String(Math.trunc(now.getTime())),
    taskexpectedrendercount: Number.isFinite(taskExpectedCount) && taskExpectedCount > 0
      ? String(Math.trunc(taskExpectedCount))
      : '',
    taskdetectedrendercount: Number.isFinite(taskDetectedCount) && taskDetectedCount >= 0
      ? String(Math.trunc(taskDetectedCount))
      : '',
  };
}

function buildDefaultUnrealProcessExecution({
  mapName = '',
  sequenceName = '',
  outputProfile = '',
  presetName = '',
  formData = null,
  textValue = '',
  renderOffscreen = false,
} = {}) {
  const safeMapName = normalizeUnrealMapLaunchArg(mapName);
  const safeSequenceName = String(sequenceName || '').trim();
  const safeOutputProfile = String(outputProfile || '').trim();
  const safePresetRaw = String(presetName || '').trim();
  const safePresetName = normalizeUnrealPresetName(safePresetRaw);
  const safePresetPath = safePresetRaw.startsWith('/') ? safePresetRaw : '';
  const safeFormData = formData && typeof formData === 'object' && !Array.isArray(formData)
    ? formData
    : {};
  const safeTextValue = String(textValue || '').trim();
  const offscreenEnabled = normalizeBooleanFlag(renderOffscreen, false);
  const hasFormData = Object.keys(safeFormData).length > 0;

  const args = [
    '{{uprojectpath}}',
  ];
  if (safeMapName) args.push('{{mapname}}');
  args.push('-game');
  args.push(
    '-NoLoadingScreen',
    '-Unattended',
    '-log',
    '-StdOut',
    '-allowStdOutLogVerbosity',
    '-FullStdOutLogOutput',
    '-RCWebControlEnable',
    '-MoviePipelineLocalExecutorClass=/Script/MovieRenderPipelineCore.MoviePipelineInProcessExecutor'
  );
  if (safeSequenceName) args.push('-LevelSequence={{sequencename}}');
  if (safeOutputProfile) args.push('-MoviePipelineConfig={{outputprofile}}');
  args.push('-MovieFolder={{outputdir}}');
  args.push('-MovieName={{expectedrendername}}');
  args.push('-UURenderOutputDir={{outputdir}}');
  args.push('-Abslog={{workerlogpath}}');
  if (safePresetName) args.push('-UURenderPreset={{presetname}}');
  if (safePresetPath) args.push('-UURenderPresetPath={{presetpath}}');
  if (hasFormData) args.push('-UURenderFormDataB64={{formdatab64}}');
  args.push('-UURenderJobB64={{renderjobb64}}');
  if (safeTextValue) args.push('-UUTextValue={{textvalue}}');
  if (offscreenEnabled) args.push('-RenderOffscreen');

  return {
    mode: 'process',
    command: '{{unrealeditorpath}}',
    commandFallback: 'UnrealEditor.exe',
    args,
    renderOffscreen: offscreenEnabled,
    timeoutMs: 4 * 60 * 60 * 1000,
    outputPath: '',
  };
}

function canReplayWorkerCompletion(render = null, workerKey = '') {
  const job = render && typeof render === 'object' ? render : null;
  if (!job) return false;
  const status = String(job?.status || '').trim();
  const assignedWorkerKey = String(job?.assignedWorkerKey || '').trim();
  const expectedWorkerKey = String(workerKey || '').trim();
  return status === 'Running' && !!assignedWorkerKey && assignedWorkerKey === expectedWorkerKey;
}

function buildWorkerCompletionReplayPayload(basePayload = {}, render = null, workerKey = '') {
  const rawPayload = basePayload && typeof basePayload === 'object' ? basePayload : {};
  const job = render && typeof render === 'object' ? render : {};
  const jobPayload = job?.payload && typeof job.payload === 'object' && !Array.isArray(job.payload)
    ? job.payload
    : {};
  const jobExecution = jobPayload?.execution && typeof jobPayload.execution === 'object' && !Array.isArray(jobPayload.execution)
    ? jobPayload.execution
    : {};
  const normalizedWorkerKey = String(workerKey || rawPayload?.workerKey || job?.assignedWorkerKey || '').trim();
  const success = rawPayload?.success !== false;

  if (success) {
    const fallbackRenderId = Number(job?.id || 0);
    const outputPathRaw = String(
      rawPayload?.outputPath ||
      job?.outputPath ||
      jobExecution?.outputPath ||
      jobPayload?.outputPath ||
      (fallbackRenderId > 0 ? `renders/render-${fallbackRenderId}.mov` : '')
    ).trim();
    const outputPath = hasProcessTemplateToken(outputPathRaw) ? '' : outputPathRaw;
    if (!outputPath) {
      return {
        ...rawPayload,
        workerKey: normalizedWorkerKey,
        success: false,
        outputPath: '',
        errorMessage: 'output_file_not_found',
        comment: String(rawPayload?.comment || '').trim() || 'worker_offline_replay_missing_output',
      };
    }
    return {
      ...rawPayload,
      workerKey: normalizedWorkerKey,
      success: true,
      outputPath,
      errorMessage: '',
      comment: String(rawPayload?.comment || '').trim() || 'worker_offline_replay_done',
    };
  }

  const errorMessage = String(
    rawPayload?.errorMessage ||
    job?.errorMessage ||
    'worker_offline_replay_failed'
  ).trim().slice(0, 400);
  return {
    ...rawPayload,
    workerKey: normalizedWorkerKey,
    success: false,
    outputPath: '',
    errorMessage: errorMessage || 'worker_offline_replay_failed',
    comment: String(rawPayload?.comment || '').trim() || 'worker_offline_replay_fail',
  };
}

export {
  RENDER_OUTPUT_VIDEO_EXTS,
  RENDER_OUTPUT_IMAGE_EXTS,
  RENDER_OUTPUT_ALL_EXTS,
  waitMs,
  summarizeProcessFailure,
  compactProcessLogText,
  compactProcessLogTextMiddle,
  extractProcessDiagnosticLines,
  buildWorkerProcessEventComment,
  replaceProcessTemplateVars,
  hasProcessTemplateToken,
  encodeBase64Utf8,
  ensureRenderOutputExt,
  getRenderPathExtension,
  replaceRenderPathExtension,
  inferExpectedRenderOutputExt,
  isLikelyRenderOutputMedia,
  buildRenderOutputPathCandidates,
  joinRenderOutputPath,
  normalizeUnrealMapLaunchArg,
  normalizeUnrealPresetName,
  normalizeBooleanFlag,
  withJobContextProcessArgs,
  withRenderOffscreenProcessArgs,
  buildRenderProcessTemplateContext,
  buildDefaultUnrealProcessExecution,
  canReplayWorkerCompletion,
  buildWorkerCompletionReplayPayload,
};
