import { useCallback } from "react";
import {
  taskFavoriteKey,
} from "./taskListUtils";

function useTaskFavorites({
  taskFavorites = {},
  setTaskFavorites = null,
} = {}) {
  const isTaskFavorite = useCallback((task) => {
    const key = taskFavoriteKey(task);
    return !!taskFavorites?.[key];
  }, [taskFavorites]);

  const toggleTaskFavorite = useCallback((task) => {
    const key = taskFavoriteKey(task);
    if (!key) return;
    if (typeof setTaskFavorites !== "function") return;
    setTaskFavorites((prev) => {
      const next = { ...(prev && typeof prev === "object" ? prev : {}) };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }, [setTaskFavorites]);

  return {
    isTaskFavorite,
    toggleTaskFavorite,
  };
}

export { useTaskFavorites };
export default useTaskFavorites;
