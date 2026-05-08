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

function buildRenderReviewTransitionSteps(render = null, nextReviewStatus = "", options = {}) {
  const currentStatus = String(render?.status || "").trim();
  const currentStatusKey = normalizeRenderStatusKey(currentStatus);
  const isDone = currentStatusKey === "done";
  const rejectionReason = String(options?.rejectionReason || "").trim();

  if (nextReviewStatus === "validated") {
    const steps = [];
    if (!isDone) {
      steps.push({
        toStatus: "Done",
        comment: "Preparation a la validation",
      });
    }
    steps.push({
      action: "validate",
      toStatus: "Done",
      comment: "Rendu valide",
    });
    return steps;
  }

  if (nextReviewStatus === "rejected" || nextReviewStatus === "to_modify") {
    const steps = [];
    if (!isDone) {
      steps.push({
        toStatus: "Done",
        comment: "Preparation au rejet",
      });
    }
    steps.push({
      action: "reject",
      toStatus: "Done",
      rejectionReason,
    });
    return steps;
  }

  if (nextReviewStatus === "canceled") {
    return [{
      toStatus: "Canceled",
      comment: "Validation annulee",
    }];
  }

  if (isDone) {
    const validatedByUserId = Number(render?.validatedByUserId || 0);
    if (Number.isFinite(validatedByUserId) && validatedByUserId > 0) {
      return [{
        action: "mark_pending",
        toStatus: "Done",
        comment: "Rendu repasse a valider",
      }];
    }
  }

  return [{
    toStatus: "Done",
    comment: "Passage en rendu termine",
  }];
}

export {
  buildRenderReviewTransitionSteps,
  isSameReviewStatus,
  toRenderId,
};

export default buildRenderReviewTransitionSteps;
