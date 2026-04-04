import { useCallback, useMemo, useState } from "react";
import { canEditRenderReviewStatus } from "../../shared/helpers";
import { renderReviewStatusKey } from "../helpers";

export function useRenderReviewController({
  user = null,
  onTransitionRender = null,
} = {}) {
  const canReviewRenders = useMemo(() => canEditRenderReviewStatus(user), [user]);
  const [busyRenderId, setBusyRenderId] = useState(0);

  const applyReviewStatus = useCallback(async (render, nextReviewStatus) => {
    if (!canReviewRenders) return;
    const renderId = Number(render?.id || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) return;
    const currentReviewStatus = renderReviewStatusKey(render);
    if (String(nextReviewStatus || "").trim() === currentReviewStatus) return;
    if (typeof onTransitionRender !== "function") return;

    setBusyRenderId(renderId);
    try {
      const currentStatus = String(render?.status || "").trim();
      if (nextReviewStatus === "validated") {
        if (currentStatus !== "Done") {
          await Promise.resolve(onTransitionRender(renderId, {
            toStatus: "Done",
            comment: "validation_ready",
          }));
        }
        await Promise.resolve(onTransitionRender(renderId, {
          action: "validate",
          toStatus: "Done",
          comment: "render_validated",
        }));
        return;
      }

      if (nextReviewStatus === "to_modify") {
        await Promise.resolve(onTransitionRender(renderId, {
          toStatus: "Failed",
          comment: "validation_to_modify",
        }));
        return;
      }

      if (nextReviewStatus === "canceled") {
        await Promise.resolve(onTransitionRender(renderId, {
          toStatus: "Canceled",
          comment: "validation_canceled",
        }));
        return;
      }

      if (currentStatus === "Done") {
        const validatedByUserId = Number(render?.validatedByUserId || 0);
        if (Number.isFinite(validatedByUserId) && validatedByUserId > 0) {
          await Promise.resolve(onTransitionRender(renderId, {
            action: "mark_pending",
            toStatus: "Done",
            comment: "render_marked_pending",
          }));
          return;
        }
      }
      await Promise.resolve(onTransitionRender(renderId, {
        toStatus: "Done",
        comment: "validation_pending",
      }));
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
