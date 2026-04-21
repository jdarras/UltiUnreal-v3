import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeThumbnailPath } from "../../../../../utils/projects-helpers";
import { safeT } from "../../../shared/helpers";

const VIEW_MODE_RGB = "rgb";
const VIEW_MODE_ALPHA = "alpha";
const VIEW_MODE_SPLIT = "split";
const VIEW_MODE_CHECKER = "checker";

const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toSafeFps(value, fallback = 25) {
  const n = toNumber(value, fallback);
  return n > 0 ? n : fallback;
}

function toSafeFrames(value, fallback = 0) {
  const n = Math.trunc(toNumber(value, fallback));
  return n > 0 ? n : 0;
}

function toFsPath(rawValue = "") {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^[A-Za-z]:[\\/]/.test(raw)) return raw;
  if (/^\\\\/.test(raw)) return raw;
  let normalized = raw;
  if (/^uu-media:/i.test(normalized)) {
    normalized = normalized.replace(/^uu-media:/i, "file:");
  }
  if (/^file:/i.test(normalized)) {
    const noProto = normalized.replace(/^file:\/*/i, "");
    if (!noProto) return "";
    let decoded = noProto;
    try { decoded = decodeURIComponent(decoded); } catch {}
    const withSlashes = decoded.replace(/\//g, "\\");
    if (/^[A-Za-z]:\\/.test(withSlashes)) return withSlashes;
    if (withSlashes.startsWith("\\\\")) return withSlashes;
  }
  return "";
}

function normalizeVideoSource(raw = "") {
  const src = normalizeThumbnailPath(raw);
  if (!src) return "";
  return src.replace(/^file:/i, "uu-media:");
}

function normalizeImageSource(raw = "") {
  const src = normalizeThumbnailPath(raw);
  if (!src) return "";
  return src.replace(/^file:/i, "uu-media:");
}

function isTemplateToken(value = "") {
  return /^\s*\{\{[^{}]+\}\}\s*$/i.test(String(value || "").trim());
}

function resolveOutputDirFromRender(render = null) {
  const raw = String(render?.outputPath || "").trim();
  if (!raw || isTemplateToken(raw)) return "";
  const normalized = raw.replace(/\//g, "\\");
  const idx = normalized.lastIndexOf("\\");
  if (idx <= 0) return "";
  return normalized.slice(0, idx);
}

function joinWindowsPath(base = "", leaf = "") {
  const left = String(base || "").trim().replace(/[\\/]+$/g, "");
  const right = String(leaf || "").trim().replace(/^[\\/]+/g, "");
  if (!left) return right;
  if (!right) return left;
  return `${left}\\${right}`;
}

function pickFirstString(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const text = String(value || "").trim();
    if (!text || isTemplateToken(text)) continue;
    return text;
  }
  return "";
}

function parseRenderDateMs(render = null) {
  const raw = String(
    render?.updatedAt
    || render?.finishedAt
    || render?.createdAt
    || ""
  ).trim();
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function renderId(value) {
  const n = Math.trunc(Number(value || 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatTimecode(secondsRaw = 0, fpsRaw = 25) {
  const seconds = Math.max(0, toNumber(secondsRaw, 0));
  const fps = Math.max(1, Math.round(toSafeFps(fpsRaw, 25)));
  const whole = Math.floor(seconds);
  const frames = Math.floor((seconds - whole) * fps + 1e-6);
  const hh = String(Math.floor(whole / 3600)).padStart(2, "0");
  const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
  const ss = String(whole % 60).padStart(2, "0");
  const ff = String(Math.min(fps - 1, Math.max(0, frames))).padStart(2, "0");
  return `${hh}:${mm}:${ss}:${ff}`;
}

function readPixelFromVideo(videoEl, canvasEl, sourceX, sourceY) {
  if (!videoEl || !canvasEl) return null;
  if (videoEl.readyState < 2) return null;
  const width = Number(videoEl.videoWidth || 0);
  const height = Number(videoEl.videoHeight || 0);
  if (width <= 0 || height <= 0) return null;
  const sx = clamp(Math.floor(sourceX), 0, width - 1);
  const sy = clamp(Math.floor(sourceY), 0, height - 1);
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  if (canvasEl.width !== 1) canvasEl.width = 1;
  if (canvasEl.height !== 1) canvasEl.height = 1;
  ctx.clearRect(0, 0, 1, 1);
  try {
    ctx.drawImage(videoEl, sx, sy, 1, 1, 0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1)?.data;
    if (!data || data.length < 4) return null;
    return {
      r: Math.trunc(data[0] || 0),
      g: Math.trunc(data[1] || 0),
      b: Math.trunc(data[2] || 0),
      a: Math.trunc(data[3] || 0),
    };
  } catch {
    return null;
  }
}

function findPreviousRender(allRenders = [], render = null) {
  const currentId = renderId(render?.id);
  const projectName = String(render?.projectName || "").trim();
  const templateName = String(render?.templateName || "").trim();
  if (currentId <= 0 || !projectName || !templateName) return null;

  const related = (Array.isArray(allRenders) ? allRenders : [])
    .filter((entry) => {
      if (!entry || typeof entry !== "object") return false;
      if (String(entry?.projectName || "").trim() !== projectName) return false;
      if (String(entry?.templateName || "").trim() !== templateName) return false;
      return true;
    })
    .sort((a, b) => {
      const tsA = parseRenderDateMs(a);
      const tsB = parseRenderDateMs(b);
      if (tsA !== tsB) return tsB - tsA;
      return renderId(b?.id) - renderId(a?.id);
    });

  const currentIndex = related.findIndex((entry) => renderId(entry?.id) === currentId);
  if (currentIndex < 0) return null;
  return related[currentIndex + 1] || null;
}

function resolveRenderProxyRawPaths(render = null) {
  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};
  return {
    proxyPath: pickFirstString([
      payload?.proxyPath,
      payload?.proxyVideoPath,
      payload?.previewPath,
      payload?.outputPreview,
    ]),
    alphaPath: pickFirstString([
      payload?.alphaPath,
      payload?.proxyAlphaPath,
      payload?.previewAlphaPath,
    ]),
    thumbPath: pickFirstString([
      payload?.thumbPath,
      payload?.thumbnailPath,
      payload?.previewImage,
      payload?.outputThumbnail,
    ]),
  };
}

function resolveRenderProxyFallbackCandidates(render = null) {
  const outputDir = resolveOutputDirFromRender(render);
  if (!outputDir) {
    return {
      proxy: [],
      alpha: [],
      thumb: [],
    };
  }
  return {
    proxy: [
      joinWindowsPath(outputDir, "proxy\\proxy.mp4"),
      joinWindowsPath(outputDir, "_proxy\\proxy.mp4"),
    ],
    alpha: [
      joinWindowsPath(outputDir, "proxy\\proxy_alpha.mp4"),
      joinWindowsPath(outputDir, "_proxy\\proxy_alpha.mp4"),
    ],
    thumb: [
      joinWindowsPath(outputDir, "images\\thumbnail.jpg"),
      joinWindowsPath(outputDir, "proxy\\thumbnail.jpg"),
      joinWindowsPath(outputDir, "_proxy\\thumbnail.jpg"),
    ],
  };
}

function resolveGeneratingFlag(render = null) {
  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};
  if (payload?.proxyGenerating === true) return true;
  const raw = String(
    payload?.proxyGenerationStatus
    || payload?.proxy_status
    || payload?.proxyStatus
    || ""
  ).trim().toLowerCase();
  return raw === "generating" || raw === "running" || raw === "pending";
}

function RenderDetailPreviewPanel({
  t,
  render = null,
  proxyPath = "",
  alphaPath = "",
  thumbPath = "",
  totalFrames = 0,
  frameRate = 25,
  proxyWidth = 0,
  proxyHeight = 0,
  proxyGenerating = false,
  onGenerateProxy = null,
  onFrameChange = null,
  allRenders = [],
}) {
  const renderProxyPaths = useMemo(() => resolveRenderProxyRawPaths(render), [render]);

  const externalProxyRaw = pickFirstString([proxyPath, renderProxyPaths.proxyPath]);
  const externalAlphaRaw = pickFirstString([alphaPath, renderProxyPaths.alphaPath]);
  const externalThumbRaw = pickFirstString([thumbPath, renderProxyPaths.thumbPath]);

  const [detectedProxyRaw, setDetectedProxyRaw] = useState("");
  const [detectedAlphaRaw, setDetectedAlphaRaw] = useState("");
  const [detectedThumbRaw, setDetectedThumbRaw] = useState("");
  const [manualGenerating, setManualGenerating] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);

  const rgbRef = useRef(null);
  const alphaRef = useRef(null);
  const compareRef = useRef(null);
  const stageRef = useRef(null);
  const mediaRef = useRef(null);
  const rgbSampleCanvasRef = useRef(null);
  const alphaSampleCanvasRef = useRef(null);

  const [viewMode, setViewMode] = useState(VIEW_MODE_RGB);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSplitPercent, setCompareSplitPercent] = useState(50);
  const [pixelInfo, setPixelInfo] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingCompare, setIsDraggingCompare] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubFrame, setScrubFrame] = useState(0);

  const panStartRef = useRef({ x: 0, y: 0, baseX: 0, baseY: 0 });
  const scrubRef = useRef(false);
  const scrubFrameRef = useRef(0);
  const rafSeekRef = useRef(null);

  const previousRender = useMemo(() => findPreviousRender(allRenders, render), [allRenders, render]);
  const previousPaths = useMemo(() => resolveRenderProxyRawPaths(previousRender), [previousRender]);
  const fallbackCandidates = useMemo(() => resolveRenderProxyFallbackCandidates(render), [render]);
  const previousFallbackCandidates = useMemo(
    () => resolveRenderProxyFallbackCandidates(previousRender),
    [previousRender]
  );
  const previousCompareProxyRaw = pickFirstString([
    previousPaths.proxyPath,
    ...(Array.isArray(previousFallbackCandidates?.proxy) ? previousFallbackCandidates.proxy : []),
  ]);
  const compareProxySrc = useMemo(() => normalizeVideoSource(previousCompareProxyRaw), [previousCompareProxyRaw]);
  const canCompare = !!compareProxySrc;

  const effectiveProxyRaw = pickFirstString([detectedProxyRaw, externalProxyRaw]);
  const effectiveAlphaRaw = pickFirstString([detectedAlphaRaw, externalAlphaRaw]);
  const effectiveThumbRaw = pickFirstString([detectedThumbRaw, externalThumbRaw]);

  const proxySrc = useMemo(() => normalizeVideoSource(effectiveProxyRaw), [effectiveProxyRaw]);
  const alphaSrc = useMemo(() => normalizeVideoSource(effectiveAlphaRaw), [effectiveAlphaRaw]);
  const thumbSrc = useMemo(() => normalizeImageSource(effectiveThumbRaw), [effectiveThumbRaw]);

  const hasProxy = !!proxySrc;

  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};

  const hasAlpha = !!alphaSrc || payload?.hasAlpha === true;

  const effectiveFrameRate = useMemo(() => {
    const payloadFps = toNumber(
      payload?.proxyFrameRate ?? payload?.frameRate ?? payload?.fps,
      0
    );
    const propFps = toNumber(frameRate, 0);
    return toSafeFps(propFps > 0 ? propFps : payloadFps, 25);
  }, [frameRate, payload]);

  const derivedTotalFrames = useMemo(() => {
    const byDuration = duration > 0 ? Math.max(0, Math.round(duration * effectiveFrameRate)) : 0;
    const payloadFrames = toSafeFrames(payload?.proxyTotalFrames ?? payload?.totalFrames, 0);
    const propFrames = toSafeFrames(totalFrames, 0);
    return Math.max(0, propFrames, payloadFrames, byDuration);
  }, [duration, effectiveFrameRate, payload, totalFrames]);

  const currentFrame = useMemo(() => {
    const frame = Math.max(0, Math.round(currentTime * effectiveFrameRate));
    if (derivedTotalFrames > 0) return Math.min(derivedTotalFrames, frame);
    return frame;
  }, [currentTime, derivedTotalFrames, effectiveFrameRate]);

  const proxyMetaWidth = toSafeFrames(proxyWidth || payload?.proxyWidth || payload?.width, 0);
  const proxyMetaHeight = toSafeFrames(proxyHeight || payload?.proxyHeight || payload?.height, 0);

  const viewHasNoAlpha = (viewMode === VIEW_MODE_ALPHA || viewMode === VIEW_MODE_SPLIT || viewMode === VIEW_MODE_CHECKER) && !hasAlpha;

  const effectiveGenerating = proxyGenerating === true
    || resolveGeneratingFlag(render)
    || manualGenerating
    || generateBusy;

  const viewerTimecode = useMemo(
    () => formatTimecode(currentTime, effectiveFrameRate),
    [currentTime, effectiveFrameRate]
  );

  const syncSecondaryVideos = useCallback((timeValue) => {
    const nextTime = Math.max(0, toNumber(timeValue, 0));

    const alphaVideo = alphaRef.current;
    if (alphaVideo && Number.isFinite(alphaVideo.currentTime)) {
      try {
        if (Math.abs(alphaVideo.currentTime - nextTime) > 0.016) {
          alphaVideo.currentTime = nextTime;
        }
      } catch {}
    }

    const compareVideo = compareRef.current;
    if (compareVideo && Number.isFinite(compareVideo.currentTime)) {
      try {
        if (Math.abs(compareVideo.currentTime - nextTime) > 0.016) {
          compareVideo.currentTime = nextTime;
        }
      } catch {}
    }
  }, []);

  const pauseSecondaryVideos = useCallback(() => {
    try { alphaRef.current?.pause(); } catch {}
    try { compareRef.current?.pause(); } catch {}
  }, []);

  const playSecondaryVideos = useCallback(() => {
    const alphaVideo = alphaRef.current;
    if (alphaVideo && hasAlpha) {
      try { alphaVideo.play().catch(() => {}); } catch {}
    }
    const compareVideo = compareRef.current;
    if (compareVideo && canCompare) {
      try { compareVideo.play().catch(() => {}); } catch {}
    }
  }, [canCompare, hasAlpha]);

  const emitFrameChange = useCallback((frameNumber) => {
    if (typeof onFrameChange !== "function") return;
    try {
      onFrameChange(Math.max(0, Math.trunc(Number(frameNumber) || 0)));
    } catch {}
  }, [onFrameChange]);

  const seekToTime = useCallback((timeValue) => {
    const rgbVideo = rgbRef.current;
    if (!rgbVideo) return;
    const durationValue = Number.isFinite(rgbVideo.duration) && rgbVideo.duration > 0
      ? rgbVideo.duration
      : duration;
    const nextTime = clamp(timeValue, 0, durationValue > 0 ? durationValue : Math.max(0, timeValue));
    try {
      rgbVideo.currentTime = nextTime;
    } catch {}
    setCurrentTime(nextTime);
    syncSecondaryVideos(nextTime);
    emitFrameChange(Math.round(nextTime * effectiveFrameRate));
  }, [duration, emitFrameChange, effectiveFrameRate, syncSecondaryVideos]);

  const togglePlayPause = useCallback(() => {
    const rgbVideo = rgbRef.current;
    if (!rgbVideo) return;
    if (rgbVideo.paused) {
      try {
        rgbVideo.play().then(() => {
          setIsPlaying(true);
          playSecondaryVideos();
        }).catch(() => {});
      } catch {}
      return;
    }
    try { rgbVideo.pause(); } catch {}
    pauseSecondaryVideos();
    setIsPlaying(false);
  }, [pauseSecondaryVideos, playSecondaryVideos]);

  const stepFrame = useCallback((direction = 1) => {
    const rgbVideo = rgbRef.current;
    if (!rgbVideo) return;
    const step = 1 / Math.max(1, effectiveFrameRate);
    const baseTime = Number.isFinite(rgbVideo.currentTime) ? rgbVideo.currentTime : currentTime;
    const targetTime = baseTime + (direction < 0 ? -step : step);

    if (!rgbVideo.paused) {
      const p = rgbVideo.pause();
      pauseSecondaryVideos();
      setIsPlaying(false);
      if (p && typeof p.then === "function") {
        p.then(() => seekToTime(targetTime)).catch(() => seekToTime(targetTime));
        return;
      }
    }
    seekToTime(targetTime);
  }, [currentTime, effectiveFrameRate, pauseSecondaryVideos, seekToTime]);

  const handleFit = useCallback(() => {
    setZoomPercent(100);
    setPanX(0);
    setPanY(0);
  }, []);

  const applyCompareSplitFromClientX = useCallback((clientX) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setCompareSplitPercent(clamp(ratio, 0, 100));
  }, []);

  useEffect(() => {
    if (!isPanning && !isDraggingCompare && !scrubbing) return undefined;
    const onMove = (event) => {
      if (isDraggingCompare) {
        applyCompareSplitFromClientX(event.clientX);
        return;
      }
      if (isPanning) {
        const start = panStartRef.current;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        setPanX(start.baseX + dx);
        setPanY(start.baseY + dy);
      }
    };
    const onUp = () => {
      if (scrubbing) {
        scrubRef.current = false;
        setScrubbing(false);
        if (rafSeekRef.current !== null) {
          cancelAnimationFrame(rafSeekRef.current);
          rafSeekRef.current = null;
        }
        seekToTime(scrubFrameRef.current / Math.max(1, effectiveFrameRate));
      }
      setIsPanning(false);
      setIsDraggingCompare(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [applyCompareSplitFromClientX, effectiveFrameRate, isDraggingCompare, isPanning, scrubbing, seekToTime]);

  const handleMouseDownStage = useCallback((event) => {
    if (event.button !== 0) return;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      baseX: panX,
      baseY: panY,
    };
    setIsPanning(true);
  }, [panX, panY]);

  const handleCompareHandleMouseDown = useCallback((event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    applyCompareSplitFromClientX(event.clientX);
    setIsDraggingCompare(true);
  }, [applyCompareSplitFromClientX]);

  const handleWheelZoom = useCallback((event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 10 : -10;
    setZoomPercent((previous) => clamp(previous + delta, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handleRgbVideoError = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSliderChange = useCallback((event) => {
    const nextFrame = Math.max(0, Math.trunc(Number(event.target.value || 0)));
    scrubFrameRef.current = nextFrame;
    setScrubFrame(nextFrame);
    if (rafSeekRef.current !== null) return;
    rafSeekRef.current = requestAnimationFrame(() => {
      rafSeekRef.current = null;
      seekToTime(scrubFrameRef.current / Math.max(1, effectiveFrameRate));
    });
  }, [effectiveFrameRate, seekToTime]);

  const handleSliderMouseDown = useCallback(() => {
    scrubRef.current = true;
    setScrubbing(true);
    scrubFrameRef.current = currentFrame;
    setScrubFrame(currentFrame);
  }, [currentFrame]);

  const handleSliderMouseUp = useCallback(() => {
    scrubRef.current = false;
    setScrubbing(false);
    if (rafSeekRef.current !== null) {
      cancelAnimationFrame(rafSeekRef.current);
      rafSeekRef.current = null;
    }
    seekToTime(scrubFrameRef.current / Math.max(1, effectiveFrameRate));
  }, [effectiveFrameRate, seekToTime]);

  const handleViewerKeyDown = useCallback((event) => {
    const key = String(event.key || "").toLowerCase();
    if (key === " " || key === "spacebar") {
      event.preventDefault();
      togglePlayPause();
      return;
    }
    if (key === "arrowleft") {
      event.preventDefault();
      stepFrame(-1);
      return;
    }
    if (key === "arrowright") {
      event.preventDefault();
      stepFrame(1);
      return;
    }
    if (key === "f") {
      event.preventDefault();
      handleFit();
      return;
    }
    if (key === "1") {
      event.preventDefault();
      setViewMode(VIEW_MODE_RGB);
      return;
    }
    if (key === "2" && hasAlpha) {
      event.preventDefault();
      setViewMode(VIEW_MODE_ALPHA);
      return;
    }
    if (key === "3" && hasAlpha) {
      event.preventDefault();
      setViewMode(VIEW_MODE_SPLIT);
      return;
    }
    if (key === "4" && hasAlpha) {
      event.preventDefault();
      setViewMode(VIEW_MODE_CHECKER);
    }
  }, [handleFit, hasAlpha, stepFrame, togglePlayPause]);

  const handleGenerateProxy = useCallback(async () => {
    const renderNumericId = renderId(render?.id);
    if (renderNumericId <= 0 || typeof onGenerateProxy !== "function" || generateBusy) return;
    setGenerateBusy(true);
    setManualGenerating(true);
    try {
      await Promise.resolve(onGenerateProxy(renderNumericId));
    } catch {
      setManualGenerating(false);
    } finally {
      setGenerateBusy(false);
    }
  }, [generateBusy, onGenerateProxy, render]);

  useEffect(() => {
    if (!hasProxy) return;
    setManualGenerating(false);
  }, [hasProxy]);

  useEffect(() => {
    setCompareEnabled((prev) => prev && canCompare);
  }, [canCompare]);

  useEffect(() => {
    if (!hasAlpha && viewMode !== VIEW_MODE_RGB) {
      setViewMode(VIEW_MODE_RGB);
    }
  }, [hasAlpha, viewMode]);

  useEffect(() => {
    const rgbVideo = rgbRef.current;
    if (!rgbVideo) return undefined;

    const onLoadedMetadata = () => {
      const videoDuration = toNumber(rgbVideo.duration, 0);
      setDuration(videoDuration > 0 ? videoDuration : 0);
      setCurrentTime(toNumber(rgbVideo.currentTime, 0));
      syncSecondaryVideos(rgbVideo.currentTime);
    };
    const onCanPlay = () => {
      const d = toNumber(rgbVideo.duration, 0);
      if (d > 0) setDuration(d);
    };
    const onTimeUpdate = () => {
      if (scrubRef.current) return;
      const nextTime = toNumber(rgbVideo.currentTime, 0);
      setCurrentTime(nextTime);
      syncSecondaryVideos(nextTime);
      emitFrameChange(Math.round(nextTime * effectiveFrameRate));
    };
    const onPlay = () => {
      setIsPlaying(true);
      playSecondaryVideos();
    };
    const onPause = () => {
      setIsPlaying(false);
      pauseSecondaryVideos();
    };
    const onSeeked = () => {
      if (scrubRef.current) return;
      const nextTime = toNumber(rgbVideo.currentTime, 0);
      setCurrentTime(nextTime);
      syncSecondaryVideos(nextTime);
    };
    const onRateChange = () => {
      const alphaVideo = alphaRef.current;
      if (alphaVideo) {
        try { alphaVideo.playbackRate = rgbVideo.playbackRate; } catch {}
      }
      const compareVideo = compareRef.current;
      if (compareVideo) {
        try { compareVideo.playbackRate = rgbVideo.playbackRate; } catch {}
      }
    };

    rgbVideo.addEventListener("loadedmetadata", onLoadedMetadata);
    rgbVideo.addEventListener("canplay", onCanPlay);
    rgbVideo.addEventListener("timeupdate", onTimeUpdate);
    rgbVideo.addEventListener("play", onPlay);
    rgbVideo.addEventListener("pause", onPause);
    rgbVideo.addEventListener("seeked", onSeeked);
    rgbVideo.addEventListener("ratechange", onRateChange);

    return () => {
      rgbVideo.removeEventListener("loadedmetadata", onLoadedMetadata);
      rgbVideo.removeEventListener("canplay", onCanPlay);
      rgbVideo.removeEventListener("timeupdate", onTimeUpdate);
      rgbVideo.removeEventListener("play", onPlay);
      rgbVideo.removeEventListener("pause", onPause);
      rgbVideo.removeEventListener("seeked", onSeeked);
      rgbVideo.removeEventListener("ratechange", onRateChange);
    };
  }, [effectiveFrameRate, emitFrameChange, pauseSecondaryVideos, playSecondaryVideos, syncSecondaryVideos]);

  useEffect(() => {
    const checker = window?.electron?.checkFileExists;
    const proxyCandidates = [
      externalProxyRaw,
      ...(Array.isArray(fallbackCandidates?.proxy) ? fallbackCandidates.proxy : []),
    ].map((entry) => toFsPath(entry)).filter(Boolean);
    const alphaCandidates = [
      externalAlphaRaw,
      ...(Array.isArray(fallbackCandidates?.alpha) ? fallbackCandidates.alpha : []),
    ].map((entry) => toFsPath(entry)).filter(Boolean);
    const thumbCandidates = [
      externalThumbRaw,
      ...(Array.isArray(fallbackCandidates?.thumb) ? fallbackCandidates.thumb : []),
    ].map((entry) => toFsPath(entry)).filter(Boolean);

    if (proxyCandidates.length <= 0 && alphaCandidates.length <= 0 && thumbCandidates.length <= 0) {
      setDetectedProxyRaw("");
      setDetectedAlphaRaw("");
      setDetectedThumbRaw("");
      return undefined;
    }

    let cancelled = false;
    let intervalId = null;

    const findExistingPath = async (candidates = []) => {
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof checker !== "function") return candidate;
        try {
          const exists = await checker(candidate);
          if (exists?.exists === true) return candidate;
        } catch {}
      }
      return "";
    };

    const checkExists = async () => {
      if (cancelled) return false;
      const foundProxy = await findExistingPath(proxyCandidates);
      const foundAlpha = await findExistingPath(alphaCandidates);
      const foundThumb = await findExistingPath(thumbCandidates);
      if (!cancelled) {
        setDetectedProxyRaw(foundProxy || "");
        setDetectedAlphaRaw(foundAlpha || "");
        setDetectedThumbRaw(foundThumb || "");
      }
      return !!foundProxy;
    };

    void checkExists().then((hasFoundProxy) => {
      if (cancelled) return;
      if (!effectiveGenerating || hasFoundProxy) return;
      intervalId = setInterval(() => {
        void checkExists();
      }, 5000);
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    effectiveGenerating,
    externalAlphaRaw,
    externalProxyRaw,
    externalThumbRaw,
    fallbackCandidates,
    render?.id,
  ]);

  useEffect(() => {
    setScrubbing(false);
    scrubRef.current = false;
    scrubFrameRef.current = 0;
    if (rafSeekRef.current !== null) {
      cancelAnimationFrame(rafSeekRef.current);
      rafSeekRef.current = null;
    }
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setViewMode(VIEW_MODE_RGB);
    setZoomPercent(100);
    setPanX(0);
    setPanY(0);
    setPixelInfo(null);
    setCompareSplitPercent(50);
    setCompareEnabled(false);
    setDetectedProxyRaw("");
    setDetectedAlphaRaw("");
    setDetectedThumbRaw("");
    setManualGenerating(false);
    setGenerateBusy(false);
  }, [render?.id]);

  const handleMouseMoveForPixelInfo = useCallback((event) => {
    const mediaElement = mediaRef.current;
    const rgbVideo = rgbRef.current;
    if (!mediaElement || !rgbVideo || rgbVideo.readyState < 2) {
      setPixelInfo(null);
      return;
    }
    const rect = mediaElement.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      setPixelInfo(null);
      return;
    }
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;
    if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
      setPixelInfo(null);
      return;
    }
    const width = Number(rgbVideo.videoWidth || proxyMetaWidth || 0);
    const height = Number(rgbVideo.videoHeight || proxyMetaHeight || 0);
    if (width <= 0 || height <= 0) {
      setPixelInfo(null);
      return;
    }
    const sourceX = Math.floor((relX / rect.width) * width);
    const sourceY = Math.floor((relY / rect.height) * height);
    const rgbPixel = readPixelFromVideo(rgbVideo, rgbSampleCanvasRef.current, sourceX, sourceY);
    if (!rgbPixel) {
      setPixelInfo(null);
      return;
    }
    let alphaValue = 255;
    const alphaVideo = alphaRef.current;
    if (alphaVideo && hasAlpha && alphaVideo.readyState >= 2) {
      const alphaPixel = readPixelFromVideo(alphaVideo, alphaSampleCanvasRef.current, sourceX, sourceY);
      if (alphaPixel) {
        alphaValue = Math.round((alphaPixel.r + alphaPixel.g + alphaPixel.b) / 3);
      }
    }
    setPixelInfo({
      x: sourceX,
      y: sourceY,
      r: rgbPixel.r,
      g: rgbPixel.g,
      b: rgbPixel.b,
      a: alphaValue,
    });
  }, [hasAlpha, proxyMetaHeight, proxyMetaWidth]);

  const stageClassName = [
    "uu-render-viewer-stage",
    viewMode === VIEW_MODE_CHECKER ? "is-checker" : "",
  ].join(" ").trim();

  const transformStyle = {
    transform: `translate(${Math.round(panX)}px, ${Math.round(panY)}px) scale(${zoomPercent / 100})`,
  };

  const showGeneratingOverlay = effectiveGenerating && !hasProxy;
  const showNoProxyState = !hasProxy && !showGeneratingOverlay;

  return (
    <section className="uu-render-detail-preview-block">
      <h4 className="uu-h3 uu-block-title" style={{ margin: "0 0 8px 0" }}>
        {safeT(t, "postprod.renders.preview.title", "Apercu rendu")}
      </h4>

      <div className="uu-render-viewer-shell">
        <div className="uu-render-viewer-toolbar">
          <div className="uu-render-viewer-modes" role="radiogroup" aria-label="Viewer modes">
            <button
              type="button"
              className={`uu-btn-ghost uu-render-viewer-mode-btn ${viewMode === VIEW_MODE_RGB ? "is-active" : ""}`}
              onClick={() => setViewMode(VIEW_MODE_RGB)}
              title={safeT(t, "postprod.renders.viewer.modeRgb", "RGB")}
            >
              🎨 {safeT(t, "postprod.renders.viewer.modeRgb", "RGB")}
            </button>
            {hasAlpha && (
              <button
                type="button"
                className={`uu-btn-ghost uu-render-viewer-mode-btn ${viewMode === VIEW_MODE_ALPHA ? "is-active" : ""}`}
                onClick={() => setViewMode(VIEW_MODE_ALPHA)}
                title={safeT(t, "postprod.renders.viewer.modeAlpha", "Alpha")}
              >
                ⬜ {safeT(t, "postprod.renders.viewer.modeAlpha", "Alpha")}
              </button>
            )}
            {hasAlpha && (
              <button
                type="button"
                className={`uu-btn-ghost uu-render-viewer-mode-btn ${viewMode === VIEW_MODE_SPLIT ? "is-active" : ""}`}
                onClick={() => setViewMode(VIEW_MODE_SPLIT)}
                title={safeT(t, "postprod.renders.viewer.modeSplit", "Split")}
              >
                🔲 {safeT(t, "postprod.renders.viewer.modeSplit", "Split")}
              </button>
            )}
            {hasAlpha && (
              <button
                type="button"
                className={`uu-btn-ghost uu-render-viewer-mode-btn ${viewMode === VIEW_MODE_CHECKER ? "is-active" : ""}`}
                onClick={() => setViewMode(VIEW_MODE_CHECKER)}
                title={safeT(t, "postprod.renders.viewer.modeChecker", "Checker")}
              >
                🌓 {safeT(t, "postprod.renders.viewer.modeChecker", "Checker")}
              </button>
            )}
          </div>

          <div className="uu-render-viewer-toolbar-right">
            <button type="button" className="uu-btn-ghost" onClick={handleFit}>
              {safeT(t, "postprod.renders.viewer.fit", "Ajuster")}
            </button>
            <span className="uu-render-viewer-zoom-label">
              {safeT(t, "postprod.renders.viewer.zoom", "Zoom")} {Math.round(zoomPercent)}%
            </span>
          </div>
        </div>

        <div
          ref={stageRef}
          className={stageClassName}
          tabIndex={0}
          onKeyDown={handleViewerKeyDown}
          onWheel={handleWheelZoom}
          onMouseDown={handleMouseDownStage}
          onMouseMove={handleMouseMoveForPixelInfo}
          onMouseLeave={() => setPixelInfo(null)}
        >
          {thumbSrc ? (
            <img
              className="uu-render-viewer-thumb-bg"
              src={thumbSrc}
              alt=""
              aria-hidden="true"
            />
          ) : null}

          {hasProxy ? (
            <div ref={mediaRef} className="uu-render-viewer-media" style={transformStyle}>
              <video
                ref={rgbRef}
                src={proxySrc}
                preload="auto"
                className={[
                  "uu-render-viewer-video",
                  (viewMode === VIEW_MODE_ALPHA || (viewMode === VIEW_MODE_SPLIT && hasAlpha)) ? "is-hidden" : "",
                ].join(" ").trim()}
                onError={handleRgbVideoError}
              />

              {hasAlpha ? (
                <video
                  ref={alphaRef}
                  src={alphaSrc}
                  preload="metadata"
                  muted
                  className={[
                    "uu-render-viewer-video",
                    viewMode === VIEW_MODE_ALPHA || viewMode === VIEW_MODE_SPLIT ? "" : "is-hidden",
                    viewMode === VIEW_MODE_SPLIT ? "is-alpha-split" : "",
                  ].join(" ").trim()}
                />
              ) : null}

              {viewMode === VIEW_MODE_SPLIT && hasAlpha ? (
                <video
                  src={proxySrc}
                  preload="metadata"
                  muted
                  className="uu-render-viewer-video is-rgb-split"
                />
              ) : null}

              {compareEnabled && canCompare ? (
                <>
                  <video
                    ref={compareRef}
                    src={compareProxySrc}
                    preload="metadata"
                    muted
                    className="uu-render-viewer-video is-compare"
                    style={{ clipPath: `inset(0 0 0 ${compareSplitPercent}%)` }}
                  />
                  <button
                    type="button"
                    className="uu-render-viewer-compare-handle"
                    style={{ left: `${compareSplitPercent}%` }}
                    onMouseDown={handleCompareHandleMouseDown}
                    aria-label={safeT(t, "postprod.renders.viewer.compare", "Comparer")}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {showGeneratingOverlay ? (
            <div className="uu-render-viewer-overlay">
              <div className="uu-render-viewer-spinner" />
              <span>{safeT(t, "postprod.renders.viewer.generating", "Proxy en cours de génération...")}</span>
            </div>
          ) : null}

          {showNoProxyState ? (
            <div className="uu-render-viewer-overlay">
              <span>{safeT(t, "postprod.renders.viewer.noProxy", "Aucun proxy disponible")}</span>
              <button
                type="button"
                className="uu-btn"
                onClick={handleGenerateProxy}
                disabled={typeof onGenerateProxy !== "function" || generateBusy || renderId(render?.id) <= 0}
              >
                {safeT(t, "postprod.renders.viewer.generateProxy", "Générer le proxy")}
              </button>
            </div>
          ) : null}

          {viewHasNoAlpha ? (
            <div className="uu-render-viewer-alpha-missing">
              {safeT(t, "postprod.renders.viewer.noAlpha", "Pas de canal alpha")}
            </div>
          ) : null}

          {pixelInfo ? (
            <div className="uu-render-viewer-pixel-badge">
              R:{pixelInfo.r} G:{pixelInfo.g} B:{pixelInfo.b} A:{pixelInfo.a}
            </div>
          ) : null}
        </div>

        <div className="uu-render-viewer-controls">
          <div className="uu-render-viewer-controls-left">
            <button
              type="button"
              className="uu-btn-ghost"
              onClick={togglePlayPause}
              disabled={!hasProxy}
              title={isPlaying
                ? safeT(t, "postprod.renders.viewer.pause", "Pause")
                : safeT(t, "postprod.renders.viewer.play", "Lecture")}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              className="uu-btn-ghost"
              onClick={() => stepFrame(-1)}
              disabled={!hasProxy}
              title={safeT(t, "postprod.renders.viewer.prevFrame", "Image précédente")}
            >
              ◀
            </button>
            <button
              type="button"
              className="uu-btn-ghost"
              onClick={() => stepFrame(1)}
              disabled={!hasProxy}
              title={safeT(t, "postprod.renders.viewer.nextFrame", "Image suivante")}
            >
              ▶
            </button>
          </div>

          <div className="uu-render-viewer-controls-center">
            <input
              type="range"
              min={0}
              max={Math.max(1, derivedTotalFrames)}
              step={1}
              value={Math.max(0, Math.min(Math.max(1, derivedTotalFrames), scrubbing ? scrubFrame : currentFrame))}
              onChange={handleSliderChange}
              onMouseDown={handleSliderMouseDown}
              onMouseUp={handleSliderMouseUp}
              disabled={!hasProxy}
            />
          </div>

          <div className="uu-render-viewer-controls-right">
            <span className="uu-render-viewer-timecode">{viewerTimecode}</span>
            <span className="uu-render-viewer-frame-count">
              {Math.max(0, currentFrame)} / {Math.max(0, derivedTotalFrames)}
            </span>
          </div>
        </div>
      </div>

      <canvas ref={rgbSampleCanvasRef} className="uu-hidden-canvas" aria-hidden="true" />
      <canvas ref={alphaSampleCanvasRef} className="uu-hidden-canvas" aria-hidden="true" />
    </section>
  );
}

export { RenderDetailPreviewPanel };
export default RenderDetailPreviewPanel;
