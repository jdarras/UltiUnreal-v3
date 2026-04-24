function toRenderId(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function normalizeRenderStatusKey(value) {
  return String(value || "").trim().toLowerCase();
}

function isSameReviewStatus(currentReviewStatus, nextReviewStatus) {
  return String(nextReviewStatus || "").trim() === String(currentReviewStatus || "").trim();
}

function buildRenderReviewTransitionSteps(render = null, nextReviewStatus = "") {
  const currentStatus = String(render?.status || "").trim();
  const currentStatusKey = normalizeRenderStatusKey(currentStatus);
  const isDone = currentStatusKey === "done";

  if (nextReviewStatus === "validated") {
    const steps = [];
    if (!isDone) {
      steps.push({
        toStatus: "Done",
        comment: "validation_ready",
      });
    }
    steps.push({
      action: "validate",
      toStatus: "Done",
      comment: "render_validated",
    });
    return steps;
  }

  if (nextReviewStatus === "rejected" || nextReviewStatus === "to_modify") {
    const steps = [];
    if (!isDone) {
      steps.push({
        toStatus: "Done",
        comment: "validation_ready",
      });
    }
    steps.push({
      action: "reject",
      toStatus: "Done",
      comment: "render_rejected",
    });
    return steps;
  }

  if (nextReviewStatus === "canceled") {
    return [{
      toStatus: "Canceled",
      comment: "validation_canceled",
    }];
  }

  if (isDone) {
    const validatedByUserId = Number(render?.validatedByUserId || 0);
    if (Number.isFinite(validatedByUserId) && validatedByUserId > 0) {
      return [{
        action: "mark_pending",
        toStatus: "Done",
        comment: "render_marked_pending",
      }];
    }
  }

  return [{
    toStatus: "Done",
    comment: "validation_pending",
  }];
}

export {
  buildRenderReviewTransitionSteps,
  isSameReviewStatus,
  toRenderId,
};

export default buildRenderReviewTransitionSteps;
