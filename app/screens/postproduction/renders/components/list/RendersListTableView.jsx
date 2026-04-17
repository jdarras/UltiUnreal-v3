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
  onDeleteRender = null,
  onRequestOpenTasks = null,
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "8%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "12%" }} />
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
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("station")}>
                {safeT(t, "postprod.renders.columns.station", "Station")}
                {typeof listSortIndicator === "function" ? listSortIndicator("station") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("reviewStatus")}>
                {safeT(t, "postprod.renders.table.reviewStatus", "Validation")}
                {typeof listSortIndicator === "function" ? listSortIndicator("reviewStatus") : ""}
              </button>
            </th>
            <th style={{ textAlign: "right" }}>
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
              onDeleteRender={onDeleteRender}
              onRequestOpenTasks={onRequestOpenTasks}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { RendersListTableView };
