import { useCallback, useMemo, useState } from "react";
import {
  collectRenderThumbCandidates,
  resolveDetailPreview,
  resolveDetailPreviewState,
  resolveDetailRender,
} from "./renderDetail/renderDetailHelpers";
import { useRenderDetailModalState } from "./renderDetail/useRenderDetailModalState";
import { useRenderDetailTransitions } from "./renderDetail/useRenderDetailTransitions";
import {
  advancePreviewCandidateAction,
  openRenderDetailAction,
  openRenderOutputExternallyAction,
} from "./renderDetail/renderDetailControllerActions";
import { buildRenderDetailControllerOutput } from "./renderDetail/buildRenderDetailControllerOutput";

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
    await openRenderOutputExternallyAction(render);
  }, []);

  const openRenderDetail = useCallback((render) => {
    openRenderDetailAction({
      render,
      openRenderDetailById,
      setPreviewStateByRenderId,
      loadRenderTransitionsForDetail,
    });
  }, [loadRenderTransitionsForDetail, openRenderDetailById]);

  const advancePreviewCandidate = useCallback((renderId, candidateCount) => {
    advancePreviewCandidateAction({
      t,
      renderId,
      candidateCount,
      setPreviewStateByRenderId,
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

  return buildRenderDetailControllerOutput({
    actions: {
      buildRenderThumbCandidates,
      openRenderOutputExternally,
      openRenderDetail,
      closeRenderDetail,
      advancePreviewCandidate,
    },
    detail: {
      detailRender,
    },
    preview: {
      kind: detailPreview.kind,
      source: detailPreview.source,
      error: detailPreview.error,
      candidatesCount: detailPreview.candidates.length,
    },
    transitions: {
      items: detailTransitions,
      loading: detailTransitionsLoading,
      error: detailTransitionsError,
    },
  });
}

export default useRenderDetailController;
