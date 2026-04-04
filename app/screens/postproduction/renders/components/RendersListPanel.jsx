import { safeT } from "../../shared/helpers";
import { RendersListTableView } from "./list/RendersListTableView";
import { RendersThumbsView } from "./list/RendersThumbsView";

function RendersListPanel({
  t,
  sortedDisplayedRenders = [],
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
  isRenderFavorite = null,
  onToggleRenderFavorite = null,
}) {
  return (
    <div className="uu-card mt-12">
      <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        <h4 className="uu-h3" style={{ margin: 0 }}>
          {safeT(t, "postprod.renders.list.title", "Liste des rendus")}
        </h4>
      </div>
      {sortedDisplayedRenders.length === 0 ? (
        <div className="uu-muted">{safeT(t, "postprod.renders.empty", "Aucun rendu.")}</div>
      ) : viewMode === "list" ? (
        <RendersListTableView
          t={t}
          sortedDisplayedRenders={sortedDisplayedRenders}
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
          isRenderFavorite={isRenderFavorite}
          onToggleRenderFavorite={onToggleRenderFavorite}
        />
      ) : (
        <RendersThumbsView
          t={t}
          sortedDisplayedRenders={sortedDisplayedRenders}
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
          isRenderFavorite={isRenderFavorite}
          onToggleRenderFavorite={onToggleRenderFavorite}
        />
      )}
    </div>
  );
}

export { RendersListPanel };
