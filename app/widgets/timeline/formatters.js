// Utility helpers for timeline formatting and parsing

// Frames -> TC (HH:MM:SS:FF)
export function framesToTimecode(frames, fpsVal) {
  const fpsSafe = Math.max(1, Math.round(Number(fpsVal) || 0));
  const f = Math.max(0, Math.round(Number(frames) || 0));
  const totalSeconds = Math.floor(f / fpsSafe);
  const ff = f % fpsSafe;
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

// TC -> Frames (accepts HH:MM:SS:FF, MM:SS:FF, SS:FF, FF)
function timecodeToFrames(tc, fpsVal) {
  const fpsSafe = Math.max(1, Math.round(Number(fpsVal) || 0));
  const parts = String(tc || '')
    .trim()
    .split(':')
    .map((p) => Number(p));
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null;
  let hh = 0;
  let mm = 0;
  let ss = 0;
  let ff = 0;
  if (parts.length === 4) [hh, mm, ss, ff] = parts;
  else if (parts.length === 3) [mm, ss, ff] = parts;
  else if (parts.length === 2) [ss, ff] = parts;
  else if (parts.length === 1) ff = parts[0];

  const frames =
    Math.max(0, Math.round(hh)) * 3600 * fpsSafe +
    Math.max(0, Math.round(mm)) * 60 * fpsSafe +
    Math.max(0, Math.round(ss)) * fpsSafe +
    Math.max(0, Math.round(ff));
  return frames;
}

// Shorthand parser used in TC mode:
// "05" => 5 frames
// "05." => 5 seconds ; "05.." => 5 minutes ; "05..." => 5 hours
// Supports +/- prefix for deltas when allowDelta = true
export function parseTcShorthand(raw, fpsVal, baseFrame = 0, allowDelta = true) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    return timecodeToFrames(trimmed, fpsVal);
  }

  const signMatch = trimmed.match(/^([+-]?)(.*)$/);
  const sign = signMatch?.[1] === '-' ? -1 : signMatch?.[1] === '+' ? 1 : 0;
  const body = signMatch?.[2] ?? trimmed;
  const dotMatch = body.match(/\.{1,}$/);
  const dotCount = dotMatch ? dotMatch[0].length : 0;
  const numStr = dotMatch ? body.slice(0, -dotCount) : body;
  const value = Number(numStr);
  if (!Number.isFinite(value)) return null;

  const fpsSafe = Math.max(1, Math.round(Number(fpsVal) || 0));
  let frames = value;
  if (dotCount === 1) frames = value * fpsSafe; // seconds
  else if (dotCount === 2) frames = value * 60 * fpsSafe; // minutes
  else if (dotCount >= 3) frames = value * 3600 * fpsSafe; // hours

  const total = sign && allowDelta ? baseFrame + sign * frames : frames;
  return Math.max(0, Math.round(total));
}
