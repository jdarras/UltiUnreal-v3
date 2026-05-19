import { useEffect, useState } from "react";
import { safeT } from "../../shared/helpers";
import { RenderFormsConfirmDialog } from "../../catalogs/components/RenderFormsConfirmDialog";
import { RendersListTableView } from "./list/RendersListTableView";
import { RendersThumbsView } from "./list/RendersThumbsView";

const RENDERS_LIST_HEADER_STYLE = {
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "8px",
};
const RENDERS_LIST_TITLE_STYLE = { margin: 0 };

function RendersListPanel({
  t,
  sortedDisplayedRenders = [],
  renderForms = [],
  title = "",
  emptyLabel = "",
  viewMode = "thumbs",
  listSortIndicator = null,
  toggleListSort = null,
  buildRenderThumbCandidates = null,
  renderOutputFilename = null,
  renderLinkedTaskValue = null,
  renderReviewStatusKey = null,
  renderReviewStatusLabel = null,
  reviewFlow = [],
  busyRenderId = 0,
  rendersLoading = false,
  onTransitionRender = null,
  canReviewRenders = false,
  onApplyReviewStatus = null,
  onOpenRenderDetail = null,
  onDeleteRender = null,
  onRequestOpenRenderEditor = null,
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
  projectLabelByRef = new Map(),
}) {
  const [deleteDialogRender, setDeleteDialogRender] = useState(null);
  const [deleteDialogBusy, setDeleteDialogBusy] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const deleteDialogOpen = !!(deleteDialogRender && typeof deleteDialogRender === "object");

  useEffect(() => {
    if (!rendersLoading) setShowInitialLoading(false);
  }, [rendersLoading]);

  const requestDeleteRender = (render = null) => {
    if (typeof onDeleteRender !== "function") return;
    const renderId = Number(render?.id || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) return;
    setDeleteDialogRender(render);
  };

  const closeDeleteDialog = () => {
    if (deleteDialogBusy) return;
    setDeleteDialogRender(null);
  };

  const confirmDeleteRender = async () => {
    if (!deleteDialogOpen || deleteDialogBusy || typeof onDeleteRender !== "function") return;
    const render = deleteDialogRender;
    const renderId = Number(render?.id || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      setDeleteDialogRender(null);
      return;
    }
    setDeleteDialogBusy(true);
    try {
      const deleted = await Promise.resolve(onDeleteRender(renderId, render));
      if (deleted !== false) setDeleteDialogRender(null);
    } finally {
      setDeleteDialogBusy(false);
    }
  };

  const fileLabel = typeof renderOutputFilename === "function"
    ? String(renderOutputFilename(deleteDialogRender) || "").trim()
    : "";
  const deleteDialogMessage = fileLabel
    ? safeT(t, "postprod.renders.delete.confirmWithName", "Supprimer le rendu {name} ?", { name: fileLabel })
    : safeT(t, "postprod.renders.delete.confirm", "Supprimer ce rendu ?");

  return (
    <>
      <RenderFormsConfirmDialog
        t={t}
        open={deleteDialogOpen}
        title=""
        message={deleteDialogMessage}
        busy={deleteDialogBusy}
        cancelLabel={safeT(t, "common.cancel", "Annuler")}
        confirmLabel={deleteDialogBusy ? safeT(t, "postprod.renders.delete.running", "Suppression...") : safeT(t, "postprod.renders.delete.button", "Supprimer")}
        onCancel={closeDeleteDialog}
        onConfirm={() => { void confirmDeleteRender(); }}
      />
      <div className="uu-card mt-12">
        <div className="uu-row" style={RENDERS_LIST_HEADER_STYLE}>
          <h4 className="uu-h3 uu-block-title" style={RENDERS_LIST_TITLE_STYLE}>
            {String(title || "").trim() || safeT(t, "postprod.renders.list.title", "Rendus à valider")}
          </h4>
        </div>
        {rendersLoading && showInitialLoading ? (
          <div className="uu-muted mb-8">{safeT(t, "postprod.renders.loading", "Chargement des rendus...")}</div>
        ) : null}
        {!rendersLoading && sortedDisplayedRenders.length === 0 ? (
          <div className="uu-muted">
            {String(emptyLabel || "").trim() || safeT(t, "postprod.renders.empty", "Aucun rendu.")}
          </div>
        ) : viewMode === "list" ? (
          <RendersListTableView
            t={t}
            sortedDisplayedRenders={sortedDisplayedRenders}
            renderForms={renderForms}
            listSortIndicator={listSortIndicator}
            toggleListSort={toggleListSort}
            buildRenderThumbCandidates={buildRenderThumbCandidates}
            renderOutputFilename={renderOutputFilename}
            renderLinkedTaskValue={renderLinkedTaskValue}
            renderReviewStatusKey={renderReviewStatusKey}
            renderReviewStatusLabel={renderReviewStatusLabel}
            reviewFlow={reviewFlow}
            busyRenderId={busyRenderId}
            rendersLoading={rendersLoading}
            onTransitionRender={onTransitionRender}
            canReviewRenders={canReviewRenders}
            onApplyReviewStatus={onApplyReviewStatus}
            onOpenRenderDetail={onOpenRenderDetail}
            onDeleteRender={requestDeleteRender}
            onRequestOpenRenderEditor={onRequestOpenRenderEditor}
            onNavigateToRenderForm={onNavigateToRenderForm}
          />
        ) : (
          <RendersThumbsView
            t={t}
            sortedDisplayedRenders={sortedDisplayedRenders}
            renderForms={renderForms}
            buildRenderThumbCandidates={buildRenderThumbCandidates}
            renderOutputFilename={renderOutputFilename}
            renderLinkedTaskValue={renderLinkedTaskValue}
            renderReviewStatusKey={renderReviewStatusKey}
            renderReviewStatusLabel={renderReviewStatusLabel}
            reviewFlow={reviewFlow}
            busyRenderId={busyRenderId}
            rendersLoading={rendersLoading}
            onTransitionRender={onTransitionRender}
            canReviewRenders={canReviewRenders}
            onApplyReviewStatus={onApplyReviewStatus}
            onOpenRenderDetail={onOpenRenderDetail}
            onDeleteRender={requestDeleteRender}
            onRequestOpenRenderEditor={onRequestOpenRenderEditor}
            onNavigateToProject={onNavigateToProject}
            onNavigateToRenderForm={onNavigateToRenderForm}
            projectLabelByRef={projectLabelByRef}
          />
        )}
      </div>
    </>
  );
}

export { RendersListPanel };
