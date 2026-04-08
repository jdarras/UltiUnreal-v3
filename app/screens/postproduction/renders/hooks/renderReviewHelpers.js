function toRenderId(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function isSameReviewStatus(currentReviewStatus, nextReviewStatus) {
  return String(nextReviewStatus || "").trim() === String(currentReviewStatus || "").trim();
}

function buildRenderReviewTransitionSteps(render = null, nextReviewStatus = "") {
  const currentStatus = String(render?.status || "").trim();

  if (nextReviewStatus === "validated") {
    const steps = [];
    if (currentStatus !== "Done") {
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

  if (nextReviewStatus === "to_modify") {
    return [{
      toStatus: "Failed",
      comment: "validation_to_modify",
    }];
  }

  if (nextReviewStatus === "canceled") {
    return [{
      toStatus: "Canceled",
      comment: "validation_canceled",
    }];
  }

  if (currentStatus === "Done") {
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

