function normalizeRenderReviewStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "validated") return "validated";
  if (normalized === "to_validate") return "to_validate";
  if (normalized === "to_modify" || normalized === "rejected") return "to_modify";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "";
}

function renderReviewStatusClassName(reviewStatus = "") {
  const key = normalizeRenderReviewStatus(reviewStatus);
  if (key === "validated") return "status-validated";
  if (key === "to_modify" || key === "canceled") return "status-rejected";
  return "status-to-validate";
}

function isRenderReviewToModify(reviewStatus = "") {
  return normalizeRenderReviewStatus(reviewStatus) === "to_modify";
}

export {
  normalizeRenderReviewStatus,
  renderReviewStatusClassName,
  isRenderReviewToModify,
};
