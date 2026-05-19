import { safeT } from "../../shared/helpers";
import { ResourceThumbImage } from "./ResourceThumbImage";

const RESOURCES_DETAIL_JSON_STYLE = { maxHeight: "240px", overflow: "auto" };

function ResourcesCatalogDetailPanel({
  t,
  detailLoading = false,
  detailError = "",
  detailThumbCandidates = [],
  detailTitle = "",
  detailUid = "",
  selectedRef = "",
  detailType = "",
  detailSeller = "",
  detailLinkedTasksCount = 0,
  detailSourcePath = "",
  detailListingUrl = "",
  detailObj = null,
  selectedFallbackRef = "",
  onOpenLinkedTasks = null,
}) {
  return (
    <>
      {detailLoading ? (
        <div className="uu-muted">{safeT(t, "postprod.resources.detail.loading", "Chargement detail...")}</div>
      ) : null}
      {!detailLoading && detailError ? <div className="uu-msg warn">{detailError}</div> : null}
      {!detailLoading && !detailError ? (
        <div className="uu-col">
          {detailThumbCandidates.length > 0 ? (
            <ResourceThumbImage
              className="uu-resource-detail-thumb"
              candidates={detailThumbCandidates}
              alt={detailTitle || detailUid || selectedRef}
            />
          ) : (
            <div className="uu-resource-detail-thumb placeholder">No thumbnail</div>
          )}
          <div className="uu-muted">
            {safeT(t, "postprod.resources.meta.uid", "UID: {value}", {
              value: detailUid || "-",
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.resources.meta.title", "Titre: {value}", {
              value: detailTitle || "-",
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.resources.meta.type", "Type: {value}", {
              value: detailType || "-",
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "resources.seller", "Vendeur")}: {detailSeller || "-"}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.resources.meta.linkedTasks", "Taches liees: {count}", {
              count: detailLinkedTasksCount,
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.resources.meta.sourcePath", "Chemin source: {value}", {
              value: detailSourcePath || "-",
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.resources.meta.listingUrl", "Listing: {value}", {
              value: detailListingUrl || "-",
            })}
          </div>
          <div className="uu-row mt-12">
            <button
              type="button"
              className="uu-btn-ghost"
              disabled={typeof onOpenLinkedTasks !== "function"}
              onClick={() => onOpenLinkedTasks?.(selectedFallbackRef || detailUid || detailTitle)}
              >
                {safeT(t, "postprod.resources.action.openTasks", "Voir taches liees")}
              </button>
            </div>
          <pre className="uu-code mt-12" style={RESOURCES_DETAIL_JSON_STYLE}>
            {JSON.stringify(detailObj || {}, null, 2)}
          </pre>
        </div>
      ) : null}
    </>
  );
}

export { ResourcesCatalogDetailPanel };
