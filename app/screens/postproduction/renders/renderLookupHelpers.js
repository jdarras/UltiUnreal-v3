// Résolutions communes aux vues des rendus (liste, vignettes, détail) :
// libellés de projet, formulaire lié, données du rendu. Auparavant recopiées à
// l'identique dans plusieurs composants.
import { toPositiveInt } from "../../../utils/coerce.js";

export function normalizeProjectLookupKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function normalizeProjectNumericKey(value = "") {
  const raw = String(value || "").trim();
  if (!raw || !/^\d+$/.test(raw)) return "";
  return String(Math.trunc(Number(raw)));
}

export function readProjectLabel(projectLabelByRef = new Map(), rawValue = "") {
  if (!(projectLabelByRef instanceof Map)) return "";
  const key = normalizeProjectLookupKey(rawValue);
  if (!key) return "";
  const direct = String(projectLabelByRef.get(key) || "").trim();
  if (direct) return direct;
  const numericKey = normalizeProjectNumericKey(rawValue);
  if (!numericKey) return "";
  return String(projectLabelByRef.get(numericKey) || "").trim();
}

export function resolveLinkedRenderFormEntry(formId = 0, renderForms = []) {
  const normalizedFormId = Number.isFinite(Number(formId)) && Number(formId) > 0
    ? Math.trunc(Number(formId))
    : 0;
  if (normalizedFormId <= 0) return null;
  const list = Array.isArray(renderForms) ? renderForms : [];
  return list.find((entry) => Number(entry?.id || 0) === normalizedFormId) || null;
}

export function extractFormIdFromTemplateLike(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const match = /^form[\s\-_#]*(\d+)$/i.exec(raw);
  if (!match) return 0;
  return toPositiveInt(match[1]);
}

export function resolveRenderPayload(render = null) {
  const payload = render?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}
