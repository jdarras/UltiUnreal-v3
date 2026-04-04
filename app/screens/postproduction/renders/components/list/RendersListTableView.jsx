import { safeT } from "../../../shared/helpers";
import { RendersListTableRow } from "./RendersListTableRow";

function RendersListTableView({
  t,
  sortedDisplayedRenders = [],
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
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "8%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "4%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>{safeT(t, "postprod.renders.table.thumbnail", "Miniature")}</th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("file")}>
                {safeT(t, "postprod.renders.table.file", "Fichier")}
                {typeof listSortIndicator === "function" ? listSortIndicator("file") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("project")}>
                {safeT(t, "postprod.renders.table.project", "Projet")}
                {typeof listSortIndicator === "function" ? listSortIndicator("project") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("linkedTask")}>
                {safeT(t, "postprod.renders.table.linkedTask", "Tache")}
                {typeof listSortIndicator === "function" ? listSortIndicator("linkedTask") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("requester")}>
                {safeT(t, "postprod.renders.table.requester", "Demandeur")}
                {typeof listSortIndicator === "function" ? listSortIndicator("requester") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("reviewStatus")}>
                {safeT(t, "postprod.renders.table.reviewStatus", "Validation")}
                {typeof listSortIndicator === "function" ? listSortIndicator("reviewStatus") : ""}
              </button>
            </th>
            <th style={{ textAlign: "center" }}>
              {safeT(t, "resources.detail.labels.favorite", "Favoris")}
            </th>
            <th style={{ textAlign: "center" }}>
              {safeT(t, "postprod.renders.table.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedDisplayedRenders.map((render) => (
            <RendersListTableRow
              key={`postprod-render-validation-row-${Number(render?.id || 0)}`}
              t={t}
              render={render}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { RendersListTableView };
