import { safeT } from "../../../shared/helpers";
import { RendersListTableRow } from "./RendersListTableRow";

const RENDERS_LIST_TABLE_SCROLL_STYLE = { overflowX: "auto" };
const RENDERS_LIST_TABLE_STYLE = { width: "100%", tableLayout: "fixed" };
const RENDERS_LIST_COL_1_STYLE = { width: "8%" };
const RENDERS_LIST_COL_2_STYLE = { width: "24%" };
const RENDERS_LIST_COL_3_STYLE = { width: "20%" };
const RENDERS_LIST_COL_4_STYLE = { width: "11%" };
const RENDERS_LIST_COL_5_STYLE = { width: "9%" };
const RENDERS_LIST_COL_6_STYLE = { width: "16%" };
const RENDERS_LIST_COL_7_STYLE = { width: "12%" };
const RENDERS_LIST_TH_RIGHT_STYLE = { textAlign: "right" };

function RendersListTableView({
  t,
  sortedDisplayedRenders = [],
  renderForms = [],
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
  onNavigateToRenderForm = null,
}) {
  return (
    <div style={RENDERS_LIST_TABLE_SCROLL_STYLE}>
      <table className="uu-table" style={RENDERS_LIST_TABLE_STYLE}>
        <colgroup>
          <col style={RENDERS_LIST_COL_1_STYLE} />
          <col style={RENDERS_LIST_COL_2_STYLE} />
          <col style={RENDERS_LIST_COL_3_STYLE} />
          <col style={RENDERS_LIST_COL_4_STYLE} />
          <col style={RENDERS_LIST_COL_5_STYLE} />
          <col style={RENDERS_LIST_COL_6_STYLE} />
          <col style={RENDERS_LIST_COL_7_STYLE} />
        </colgroup>
        <thead>
          <tr>
            <th className="uu-text-left">{safeT(t, "postprod.renders.table.thumbnail", "Miniature")}</th>
            <th className="uu-text-left">
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("file")}>
                {safeT(t, "postprod.renders.table.file", "Fichier")}
                {typeof listSortIndicator === "function" ? listSortIndicator("file") : ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("linkedTask")}>
                {safeT(t, "postprod.renders.table.linkedTask", "Rendu")}
                {typeof listSortIndicator === "function" ? listSortIndicator("linkedTask") : ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("requester")}>
                {safeT(t, "postprod.renders.table.requester", "Demandeur")}
                {typeof listSortIndicator === "function" ? listSortIndicator("requester") : ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("station")}>
                {safeT(t, "postprod.renders.columns.station", "Station")}
                {typeof listSortIndicator === "function" ? listSortIndicator("station") : ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("reviewStatus")}>
                {safeT(t, "postprod.renders.table.reviewStatus", "Validation")}
                {typeof listSortIndicator === "function" ? listSortIndicator("reviewStatus") : ""}
              </button>
            </th>
            <th style={RENDERS_LIST_TH_RIGHT_STYLE}>
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
              onDeleteRender={onDeleteRender}
              onRequestOpenRenderEditor={onRequestOpenRenderEditor}
              onNavigateToRenderForm={onNavigateToRenderForm}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { RendersListTableView };

