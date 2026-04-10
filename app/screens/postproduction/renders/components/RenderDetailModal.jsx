import { RenderDetailHeader } from "./renderDetail/RenderDetailHeader";
import { RenderDetailPreviewPanel } from "./renderDetail/RenderDetailPreviewPanel";
import { RenderDetailInfoPanel } from "./renderDetail/RenderDetailInfoPanel";
import { RenderDetailLogsPanel } from "./renderDetail/RenderDetailLogsPanel";

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
  onScheduleRender = null,
  transitionsLoading = false,
  transitionsError = "",
  transitions = [],
  embedded = false,
}) {
  if (!render) return null;

  const renderId = Number(render?.id || 0);
  const renderOutputName = typeof outputFilename === "function" ? outputFilename(render) : "-";
  const detailTransitions = Array.isArray(transitions) ? transitions : [];

  const detailBody = (
    <>
      <RenderDetailHeader
        t={t}
        render={render}
        renderOutputName={renderOutputName}
        onOpenOutputExternally={onOpenOutputExternally}
        onClose={onClose}
      />

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

      <div className="uu-render-detail-bottom-layout mt-12">
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
          onScheduleRender={onScheduleRender}
        />
        <RenderDetailLogsPanel
          t={t}
          transitionsLoading={transitionsLoading}
          transitionsError={transitionsError}
          detailTransitions={detailTransitions}
        />
      </div>
    </>
  );

  if (embedded) {
    return detailBody;
  }

  return (
    <div className="uu-render-detail-overlay" onClick={() => onClose?.()}>
      <div className="uu-card uu-render-detail-modal" onClick={(e) => e.stopPropagation()}>
        {detailBody}
      </div>
    </div>
  );
}

export {
  RenderDetailModal,
};
