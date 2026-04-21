import { RenderDetailHeader } from "./renderDetail/RenderDetailHeader";
import { RenderDetailPreviewPanel } from "./renderDetail/RenderDetailPreviewPanel";
import { RenderDetailInfoPanel } from "./renderDetail/RenderDetailInfoPanel";
import { RenderDetailLogsPanel } from "./renderDetail/RenderDetailLogsPanel";

function pickFirst(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const text = String(value || "").trim();
    if (!text || /^\s*\{\{[^{}]+\}\}\s*$/i.test(text)) continue;
    return text;
  }
  return "";
}

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toSafeInt(value, fallback = 0) {
  return Math.trunc(toSafeNumber(value, fallback));
}

function resolveRenderViewerMeta(render = null) {
  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};
  const proxyPath = pickFirst([
    payload?.proxyPath,
    payload?.proxyVideoPath,
    payload?.previewPath,
    payload?.outputPreview,
  ]);
  const alphaPath = pickFirst([
    payload?.alphaPath,
    payload?.proxyAlphaPath,
    payload?.previewAlphaPath,
  ]);
  const thumbPath = pickFirst([
    payload?.thumbPath,
    payload?.thumbnailPath,
    payload?.previewImage,
    payload?.outputThumbnail,
  ]);
  const totalFrames = Math.max(
    0,
    toSafeInt(payload?.proxyTotalFrames, 0),
    toSafeInt(payload?.totalFrames, 0)
  );
  const frameRate = Math.max(
    0,
    toSafeNumber(payload?.proxyFrameRate, 0),
    toSafeNumber(payload?.frameRate, 0),
    toSafeNumber(payload?.fps, 0)
  );
  const proxyWidth = Math.max(0, toSafeInt(payload?.proxyWidth ?? payload?.width, 0));
  const proxyHeight = Math.max(0, toSafeInt(payload?.proxyHeight ?? payload?.height, 0));
  const proxyGenerating = payload?.proxyGenerating === true
    || String(
      payload?.proxyGenerationStatus
      || payload?.proxy_status
      || payload?.proxyStatus
      || ""
    ).trim().toLowerCase() === "generating";

  return {
    proxyPath,
    alphaPath,
    thumbPath,
    totalFrames,
    frameRate,
    proxyWidth,
    proxyHeight,
    proxyGenerating,
  };
}

function RenderDetailModal({
  t,
  render = null,
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
  projectLabelByRef = new Map(),
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
  onRequestOpenTasks = null,
  tasks = [],
  renderForms = [],
  renderExportDestinationOptions = [],
  onUpdateRenderExportDestinations = null,
  onGenerateProxy = null,
  allRenders = [],
  embedded = false,
}) {
  if (!render) return null;

  const renderOutputName = typeof outputFilename === "function" ? outputFilename(render) : "-";
  const detailTransitions = Array.isArray(transitions) ? transitions : [];
  const viewerMeta = resolveRenderViewerMeta(render);

  const detailBody = (
    <>
      <RenderDetailHeader
        t={t}
        render={render}
        renderOutputName={renderOutputName}
        onOpenOutputExternally={onOpenOutputExternally}
        onClose={onClose}
      />

      <div className="uu-render-detail-stack mt-12">
        <RenderDetailPreviewPanel
          t={t}
          render={render}
          proxyPath={viewerMeta.proxyPath}
          alphaPath={viewerMeta.alphaPath}
          thumbPath={viewerMeta.thumbPath}
          totalFrames={viewerMeta.totalFrames}
          frameRate={viewerMeta.frameRate}
          proxyWidth={viewerMeta.proxyWidth}
          proxyHeight={viewerMeta.proxyHeight}
          proxyGenerating={viewerMeta.proxyGenerating}
          onGenerateProxy={onGenerateProxy}
          allRenders={allRenders}
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
          onScheduleRender={onScheduleRender}
          projectLabelByRef={projectLabelByRef}
          onNavigateToProject={onNavigateToProject}
          onNavigateToRenderForm={onNavigateToRenderForm}
          onRequestOpenTasks={onRequestOpenTasks}
          tasks={tasks}
          renderForms={renderForms}
          renderExportDestinationOptions={renderExportDestinationOptions}
          onUpdateRenderExportDestinations={onUpdateRenderExportDestinations}
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
