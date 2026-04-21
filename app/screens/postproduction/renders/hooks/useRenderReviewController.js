import { useCallback, useMemo, useState } from "react";
import { canEditRenderReviewStatus } from "../../shared/helpers";
import { renderReviewStatusKey } from "../helpers";
import {
  buildRenderReviewTransitionSteps,
  isSameReviewStatus,
  toRenderId,
} from "./renderReviewHelpers";

export function useRenderReviewController({
  user = null,
  onTransitionRender = null,
} = {}) {
  const canReviewRenders = useMemo(() => canEditRenderReviewStatus(user), [user]);
  const [busyRenderId, setBusyRenderId] = useState(0);

  const isNoChangesError = useCallback((error) => {
    const code = String(error?.code || "").trim().toLowerCase();
    if (code === "no_changes") return true;
    const message = String(error?.message || "").trim().toLowerCase();
    return message === "no_changes" || message.includes("no_changes");
  }, []);

  const applyReviewStatus = useCallback(async (render, nextReviewStatus) => {
    if (!canReviewRenders) return;
    const renderId = toRenderId(render?.id);
    if (renderId <= 0) return;
    const currentReviewStatus = renderReviewStatusKey(render);
    if (isSameReviewStatus(currentReviewStatus, nextReviewStatus)) return;
    if (typeof onTransitionRender !== "function") return;

    const transitionSteps = buildRenderReviewTransitionSteps(render, nextReviewStatus);
    if (!Array.isArray(transitionSteps) || transitionSteps.length <= 0) return;

    setBusyRenderId(renderId);
    try {
      for (const transitionPayload of transitionSteps) {
        if (!transitionPayload || typeof transitionPayload !== "object") continue;
        try {
          await Promise.resolve(onTransitionRender(renderId, transitionPayload));
        } catch (error) {
          // Ignore benign intermediate "no_changes" so subsequent validation step can still run.
          if (isNoChangesError(error)) continue;
          throw error;
        }
      }
    } finally {
      setBusyRenderId(0);
    }
  }, [canReviewRenders, onTransitionRender, isNoChangesError]);

  return {
    canReviewRenders,
    busyRenderId,
    applyReviewStatus,
  };
}

export default useRenderReviewController;
