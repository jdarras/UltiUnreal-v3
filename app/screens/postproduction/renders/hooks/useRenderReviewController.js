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
        await Promise.resolve(onTransitionRender(renderId, transitionPayload));
      }
    } finally {
      setBusyRenderId(0);
    }
  }, [canReviewRenders, onTransitionRender]);

  return {
    canReviewRenders,
    busyRenderId,
    applyReviewStatus,
  };
}

export default useRenderReviewController;
