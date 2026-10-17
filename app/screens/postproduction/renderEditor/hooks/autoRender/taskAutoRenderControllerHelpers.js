import {
  buildTaskExpectedRenderNamesPreview,
  normalizeTaskExpectedRenderCountInput,
} from "../../helpers";

function buildVisibleAutoRenderFormFields(autoRenderFormFields = []) {
  const list = Array.isArray(autoRenderFormFields) ? autoRenderFormFields : [];
  return list
    .filter((field) => field?.isVisible !== false)
    .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
}

function inferOutputTypeFromProfile(outputProfile = "") {
  const p = String(outputProfile || "").toLowerCase();
  if (!p) return null;
  const imageExts = ["png", "exr", "tga", "bmp", "jpg", "jpeg", "dpx", "hdr"];
  const videoExts = ["prores", "h264", "h265", "hevc", "mov", "mp4", "avi", "dnxhd", "dnxhr"];
  if (imageExts.some((ext) => p.includes(ext))) return "image_sequence";
  if (videoExts.some((ext) => p.includes(ext))) return "clip";
  return null;
}

function inferExpectedExtFromProfile(outputProfile = "") {
  const p = String(outputProfile || "").toLowerCase();
  const type = inferOutputTypeFromProfile(outputProfile);
  if (type === "image_sequence") {
    if (p.includes("exr")) return ".exr";
    if (p.includes("jpg") || p.includes("jpeg")) return ".jpg";
    return ".png";
  }
  if (p.includes("h264") || p.includes("h265") || p.includes("hevc") || p.includes("mp4")) return ".mp4";
  if (p.includes("mxf") || p.includes("dnxhd") || p.includes("dnxhr")) return ".mxf";
  if (p.includes("avi")) return ".avi";
  if (p.includes("webm")) return ".webm";
  return ".mov";
}

function buildExpectedRenderMeta({
  title = "",
  expectedRenderCountInput = "1",
  outputProfile = "",
} = {}) {
  const expectedRenderCountForForm = normalizeTaskExpectedRenderCountInput(expectedRenderCountInput);
  const expectedRenderNamesPreview = buildTaskExpectedRenderNamesPreview(title, expectedRenderCountForForm);
  const ext = inferExpectedExtFromProfile(outputProfile);
  const autoExpectedRenderName = String(expectedRenderNamesPreview[0] || "").trim()
    ? `${expectedRenderNamesPreview[0]}${ext}`
    : "";
  const autoOutputType = inferOutputTypeFromProfile(outputProfile);
  return {
    expectedRenderCountForForm,
    expectedRenderNamesPreview,
    autoExpectedRenderName,
    autoOutputType,
  };
}

function applyAutoRenderStateSetters(stateSetters = {}, nextState = {}) {
  stateSetters.setExpectedRenderCountInput?.(nextState.expectedRenderCountInput);
  stateSetters.setAutoRenderProjectRef?.(nextState.autoRenderProjectRef);
  stateSetters.setAutoRenderWorkerKey?.(nextState.autoRenderWorkerKey);
  stateSetters.setAutoRenderFormId?.(nextState.autoRenderFormId);
  stateSetters.setAutoRenderTemplateId?.(nextState.autoRenderTemplateId);
  stateSetters.setAutoRenderFormValues?.(nextState.autoRenderFormValues);
  stateSetters.setAutoRenderLaunchMode?.(nextState.autoRenderLaunchMode);
  stateSetters.setAutoRenderScheduledMode?.(nextState.autoRenderScheduledMode ?? "");
  stateSetters.setAutoRenderScheduledAt?.(nextState.autoRenderScheduledAt ?? "");
  stateSetters.setTaskSequenceName?.(nextState.taskSequenceName ?? "");
  stateSetters.setAutoRenderOffscreen?.(nextState.autoRenderOffscreen === true);
  stateSetters.setAutoRenderExportDestinationIds?.(
    Array.isArray(nextState.autoRenderExportDestinationIds)
      ? nextState.autoRenderExportDestinationIds
      : []
  );
}

export {
  applyAutoRenderStateSetters,
  buildExpectedRenderMeta,
  buildVisibleAutoRenderFormFields,
};
