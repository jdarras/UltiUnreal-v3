import { useCallback } from "react";
import { renderFavoriteStorageKey } from "./renderListUtils";

function useRenderFavorites({
  renderFavorites = {},
  setRenderFavorites = null,
} = {}) {
  const renderFavoriteKey = useCallback((render) => (
    renderFavoriteStorageKey(render)
  ), []);

  const isRenderFavorite = useCallback((render) => {
    const key = renderFavoriteKey(render);
    if (!key) return false;
    return !!renderFavorites?.[key];
  }, [renderFavoriteKey, renderFavorites]);

  const toggleRenderFavorite = useCallback((render) => {
    const key = renderFavoriteKey(render);
    if (!key || typeof setRenderFavorites !== "function") return;
    setRenderFavorites((prev) => {
      const current = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: true };
    });
  }, [renderFavoriteKey, setRenderFavorites]);

  return {
    isRenderFavorite,
    toggleRenderFavorite,
  };
}

export { useRenderFavorites };
export default useRenderFavorites;

