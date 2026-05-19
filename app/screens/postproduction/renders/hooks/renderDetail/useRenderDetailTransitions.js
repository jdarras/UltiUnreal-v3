import { useCallback, useState } from "react";
import {
  EMPTY_TRANSITIONS_STATE,
  buildTransitionLoadError,
  resolveDetailTransitionsState,
  toRenderId,
} from "./renderDetailHelpers";

export function useRenderDetailTransitions({
  t,
  onLoadRenderTransitions = null,
} = {}) {
  const [renderTransitionsByRenderId, setRenderTransitionsByRenderId] = useState({});

  const loadRenderTransitionsForDetail = useCallback(async (renderIdRaw, { force = false } = {}) => {
    if (typeof onLoadRenderTransitions !== "function") return [];
    const renderId = toRenderId(renderIdRaw);
    if (renderId <= 0) return [];
    let shouldSkip = false;
    setRenderTransitionsByRenderId((prev) => {
      const current = (
        prev?.[renderId]
        && typeof prev[renderId] === "object"
      ) ? prev[renderId] : EMPTY_TRANSITIONS_STATE;
      if (!force && (current.loading || current.loaded)) {
        shouldSkip = true;
        return prev || {};
      }
      return {
        ...(prev || {}),
        [renderId]: {
          ...current,
          loading: true,
          error: "",
        },
      };
    });
    if (shouldSkip) return [];
    try {
      const transitions = await Promise.resolve(onLoadRenderTransitions(renderId));
      const items = Array.isArray(transitions) ? transitions : [];
      setRenderTransitionsByRenderId((prev) => ({
        ...(prev || {}),
        [renderId]: {
          items,
          loading: false,
          error: "",
          loaded: true,
        },
      }));
      return items;
    } catch (err) {
      setRenderTransitionsByRenderId((prev) => ({
        ...(prev || {}),
        [renderId]: {
          items: [],
          loading: false,
          error: buildTransitionLoadError(t, err),
          loaded: false,
        },
      }));
      return [];
    }
  }, [onLoadRenderTransitions, t]);

  const resolveTransitionsState = useCallback((renderIdRaw) => (
    resolveDetailTransitionsState(renderTransitionsByRenderId, renderIdRaw)
  ), [renderTransitionsByRenderId]);

  return {
    loadRenderTransitionsForDetail,
    resolveTransitionsState,
  };
}
