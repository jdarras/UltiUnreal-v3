import { RenderDetailHeader } from "./renderDetail/RenderDetailHeader";
import { RenderDetailPreviewPanel } from "./renderDetail/RenderDetailPreviewPanel";
import { RenderDetailInfoPanel } from "./renderDetail/RenderDetailInfoPanel";

function RenderDetailModal({
  t,
  render = null,
  previewKind = "none",
  previewSource = "",
  previewError = "",
  previewCandidatesCount = 0,
  onAdvancePreviewCandidate = null,
  onOpenOutputExternally = null,
  onClose = null,
  outputFilename = null,
  linkedTaskValue = null,
  reviewStatusValue = "to_validate",
  reviewFlow = [],
  reviewStatusLabel = null,
  canReviewRenders = false,
  rendersLoading = false,
  busyRenderId = 0,
  onApplyReviewStatus = null,
  transitionsLoading = false,
  transitionsError = "",
  transitions = [],
}) {
  if (!render) return null;

  const renderId = Number(render?.id || 0);
  const renderOutputName = typeof outputFilename === "function" ? outputFilename(render) : "-";
  const detailTransitions = Array.isArray(transitions) ? transitions : [];

  return (
    <div className="uu-render-detail-overlay" onClick={() => onClose?.()}>
      <div className="uu-card uu-render-detail-modal" onClick={(e) => e.stopPropagation()}>
        <RenderDetailHeader
          t={t}
          render={render}
          renderOutputName={renderOutputName}
          onOpenOutputExternally={onOpenOutputExternally}
          onClose={onClose}
        />

        <div className="uu-render-detail-layout mt-12">
          <RenderDetailPreviewPanel
            t={t}
            renderId={renderId}
            renderOutputName={renderOutputName}
            previewKind={previewKind}
            previewSource={previewSource}
            previewError={previewError}
            previewCandidatesCount={previewCandidatesCount}
            onAdvancePreviewCandidate={onAdvancePreviewCandidate}
          />

          <RenderDetailInfoPanel
            t={t}
            render={render}
            renderOutputName={renderOutputName}
            linkedTaskValue={linkedTaskValue}
            reviewStatusValue={reviewStatusValue}
            reviewFlow={reviewFlow}
            reviewStatusLabel={reviewStatusLabel}
            canReviewRenders={canReviewRenders}
            rendersLoading={rendersLoading}
            busyRenderId={busyRenderId}
            onApplyReviewStatus={onApplyReviewStatus}
            transitionsLoading={transitionsLoading}
            transitionsError={transitionsError}
            detailTransitions={detailTransitions}
          />
        </div>
      </div>
    </div>
  );
}

export {
  RenderDetailModal,
};
