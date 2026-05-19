import { useCallback, useEffect, useState } from "react";
import { toRenderId } from "./renderDetailHelpers";

export function useRenderDetailModalState({
  renders = [],
} = {}) {
  const [detailRenderId, setDetailRenderId] = useState(0);

  const openRenderDetailById = useCallback((renderIdRaw) => {
    const renderId = toRenderId(renderIdRaw);
    if (renderId <= 0) return;
    setDetailRenderId(renderId);
  }, []);

  const closeRenderDetail = useCallback(() => {
    setDetailRenderId(0);
  }, []);

  useEffect(() => {
    const renderId = toRenderId(detailRenderId);
    if (renderId <= 0) return;
    const exists = (Array.isArray(renders) ? renders : []).some((render) => toRenderId(render?.id) === renderId);
    if (!exists) {
      setDetailRenderId(0);
    }
  }, [detailRenderId, renders]);

  useEffect(() => {
    if (toRenderId(detailRenderId) <= 0) return undefined;
    function onKeyDown(event) {
      if (String(event?.key || "").toLowerCase() === "escape") {
        setDetailRenderId(0);
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
      };
    }
    return undefined;
  }, [detailRenderId]);

  return {
    detailRenderId,
    openRenderDetailById,
    closeRenderDetail,
  };
}
