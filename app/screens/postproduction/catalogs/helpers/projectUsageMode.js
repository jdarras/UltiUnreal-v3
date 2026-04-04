import { safeT } from "../../shared/helpers";

function projectUsageModeLabel(t, usageMode, fallback = "-") {
  const key = String(usageMode || "").trim();
  if (key === "live") return safeT(t, "projects.detail.usageMode.live", "Live");
  if (key === "auto_render") return safeT(t, "projects.detail.usageMode.auto_render", "Rendu automatique");
  if (key === "live_auto_render") return safeT(t, "projects.detail.usageMode.live_auto_render", "Live + Rendu automatique");
  if (key === "other") return safeT(t, "projects.detail.usageMode.other", "Autre");
  return fallback;
}

export { projectUsageModeLabel };

