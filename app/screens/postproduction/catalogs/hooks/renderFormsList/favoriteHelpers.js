function formFavoriteKey(form, selectedProjectRef = "") {
  const id = Number(form?.id || 0);
  if (Number.isFinite(id) && id > 0) return `id:${Math.trunc(id)}`;
  const projectKey = String(form?.projectName || selectedProjectRef || "").trim().toLowerCase();
  const nameKey = String(form?.name || "").trim().toLowerCase();
  return `project:${projectKey}|name:${nameKey}`;
}

function isFormFavorite(form, formsFavorites, selectedProjectRef = "") {
  const key = formFavoriteKey(form, selectedProjectRef);
  return !!formsFavorites?.[key];
}

function toggleFormFavorite(form, setFormsFavorites, selectedProjectRef = "") {
  const key = formFavoriteKey(form, selectedProjectRef);
  if (!key || typeof setFormsFavorites !== "function") return;
  setFormsFavorites((prev) => {
    const next = { ...(prev && typeof prev === "object" ? prev : {}) };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = true;
    }
    return next;
  });
}

export {
  formFavoriteKey,
  isFormFavorite,
  toggleFormFavorite,
};
