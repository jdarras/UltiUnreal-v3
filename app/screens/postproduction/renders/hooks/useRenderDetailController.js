import { useCallback, useMemo, useState } from "react";
import { safeT } from "../../shared/helpers";
import {
  collectRenderThumbCandidates,
  resolveDetailPreview,
  resolveDetailPreviewState,
  resolveDetailRender,
  toRenderId,
} from "./renderDetail/renderDetailHelpers";
import { useRenderDetailModalState } from "./renderDetail/useRenderDetailModalState";
import { useRenderDetailTransitions } from "./renderDetail/useRenderDetailTransitions";

export function useRenderDetailController({
  t,
  renders = [],
  onLoadRenderTransitions = null,
} = {}) {
  const [previewStateByRenderId, setPreviewStateByRenderId] = useState({});

  const {
    detailRenderId,
    openRenderDetailById,
    closeRenderDetail,
  } = useRenderDetailModalState({ renders });

  const {
    loadRenderTransitionsForDetail,
    resolveTransitionsState,
  } = useRenderDetailTransitions({
    t,
    onLoadRenderTransitions,
  });

  const openRenderOutputExternally = useCallback(async (render) => {
    const outputPath = String(render?.outputPath || "").trim();
    if (!outputPath) return;
    try {
      if (typeof window !== "undefined" && typeof window.electron?.openPath === "function") {
        await window.electron.openPath(outputPath);
      }
    } catch {}
  }, []);

  const openRenderDetail = useCallback((render) => {
    const renderId = toRenderId(render?.id);
    if (renderId <= 0) return;
    openRenderDetailById(renderId);
    setPreviewStateByRenderId((prev) => ({
      ...(prev || {}),
      [renderId]: { index: 0, error: "" },
    }));
    void loadRenderTransitionsForDetail(renderId);
  }, [loadRenderTransitionsForDetail, openRenderDetailById]);

  const advancePreviewCandidate = useCallback((renderId, candidateCount) => {
    const total = Number(candidateCount || 0);
    const normalizedRenderId = toRenderId(renderId);
    if (normalizedRenderId <= 0) return;
    setPreviewStateByRenderId((prev) => {
      const current = (
        prev?.[normalizedRenderId]
        && typeof prev[normalizedRenderId] === "object"
      ) ? prev[normalizedRenderId] : { index: 0, error: "" };
      const nextIndex = Number(current.index || 0) + 1;
      if (nextIndex < total) {
        return {
          ...(prev || {}),
          [normalizedRenderId]: { index: nextIndex, error: "" },
        };
      }
      return {
        ...(prev || {}),
        [normalizedRenderId]: {
          index: Number(current.index || 0),
          error: safeT(
            t,
            "postprod.renders.preview.unsupported",
            "Lecture interne indisponible pour ce format. Ouvre le fichier en externe."
          ),
        },
      };
    });
  }, [t]);

  const buildRenderThumbCandidates = useCallback((render) => collectRenderThumbCandidates(render), []);

  const detailRender = useMemo(() => {
    return resolveDetailRender(renders, detailRenderId);
  }, [detailRenderId, renders]);

  const detailPreviewState = resolveDetailPreviewState(previewStateByRenderId, detailRender);
  const detailPreview = resolveDetailPreview({
    detailRender,
    detailPreviewState,
  });

  const detailTransitionsState = resolveTransitionsState(detailRenderId);
  const detailTransitions = Array.isArray(detailTransitionsState?.items)
    ? detailTransitionsState.items
    : [];
  const detailTransitionsLoading = detailTransitionsState?.loading === true;
  const detailTransitionsError = String(detailTransitionsState?.error || "").trim();

  return {
    buildRenderThumbCandidates,
    openRenderOutputExternally,
    openRenderDetail,
    closeRenderDetail,
    advancePreviewCandidate,
    detailRender,
    detailPreviewKind: detailPreview.kind,
    detailPreviewSource: detailPreview.source,
    detailPreviewError: detailPreview.error,
    detailPreviewCandidatesCount: detailPreview.candidates.length,
    detailTransitions,
    detailTransitionsLoading,
    detailTransitionsError,
  };
}

export default useRenderDetailController;
