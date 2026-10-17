import { safeT } from "../../../shared/helpers";
import {
  buildPreviewStateAfterAdvance,
  buildPreviewStateOnOpen,
  toRenderId,
} from "./renderDetailHelpers";

async function openRenderOutputExternallyAction(render = null) {
  const outputPath = String(render?.outputPath || "").trim();
  if (!outputPath) return;
  try {
    if (typeof window !== "undefined" && typeof window.electron?.openPath === "function") {
      await window.electron.openPath(outputPath);
    }
  } catch {}
}

function openRenderDetailAction({
  render = null,
  openRenderDetailById = null,
  setPreviewStateByRenderId = null,
  loadRenderTransitionsForDetail = null,
} = {}) {
  const renderId = toRenderId(render?.id);
  if (renderId <= 0) return;
  if (typeof openRenderDetailById === "function") {
    openRenderDetailById(renderId);
  }
  if (typeof setPreviewStateByRenderId === "function") {
    setPreviewStateByRenderId((prev) => buildPreviewStateOnOpen(prev, renderId));
  }
  if (typeof loadRenderTransitionsForDetail === "function") {
    void loadRenderTransitionsForDetail(renderId);
  }
}

function advancePreviewCandidateAction({
  t,
  renderId = 0,
  candidateCount = 0,
  setPreviewStateByRenderId = null,
} = {}) {
  const normalizedRenderId = toRenderId(renderId);
  if (normalizedRenderId <= 0 || typeof setPreviewStateByRenderId !== "function") return;

  const unsupportedMessage = safeT(
    t,
    "postprod.renders.preview.unsupported",
    "Lecture interne indisponible pour ce format. Ouvre le fichier en externe."
  );

  setPreviewStateByRenderId((prev) => {
    return buildPreviewStateAfterAdvance({
      previousState: prev,
      renderId: normalizedRenderId,
      candidateCount,
      unsupportedMessage,
    });
  });
}

export {
  openRenderOutputExternallyAction,
  openRenderDetailAction,
  advancePreviewCandidateAction,
};
