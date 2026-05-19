function resolveLabel(t, key, fallback) {
  if (typeof t !== "function") return fallback;
  const value = t(key);
  if (!value || value === key) return fallback;
  return value;
}

export function resolveConfirmDialogLabels(
  t,
  {
    titleKey = "production.confirm.title",
    titleFallback = "Confirmation",
    cancelKey = "production.confirm.cancel",
    cancelAltKey = "",
    cancelFallback = "Annuler",
    confirmKey = "production.confirm.ok",
    confirmFallback = "OK",
  } = {}
) {
  const title = resolveLabel(t, titleKey, titleFallback);
  const cancelPrimary = resolveLabel(t, cancelKey, "");
  const cancelAlt = cancelAltKey ? resolveLabel(t, cancelAltKey, "") : "";
  const cancelLabel = cancelPrimary || cancelAlt || cancelFallback;
  const confirmLabel = resolveLabel(t, confirmKey, confirmFallback);
  return { title, cancelLabel, confirmLabel };
}
