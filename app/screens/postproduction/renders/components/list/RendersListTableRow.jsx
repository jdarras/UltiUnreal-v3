import { safeT } from "../../../shared/helpers";

function RendersListTableRow({
  t,
  render = null,
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
  const renderId = Number(render?.id || 0);
  const reviewStatus = typeof renderReviewStatusKey === "function" ? renderReviewStatusKey(render) : "to_validate";
  const thumbCandidates = typeof buildRenderThumbCandidates === "function" ? buildRenderThumbCandidates(render) : [];
  const thumbSrc = thumbCandidates[0] || "";
  const isBusy = busyRenderId === renderId;
  const outputPath = String(render?.outputPath || "").trim();
  const favorite = typeof isRenderFavorite === "function" ? isRenderFavorite(render) : false;
  const stationName = String(render?.stationName || "").trim();
  const stationIp = String(render?.stationIp || "").trim();
  const stationStatus = String(render?.stationStatus || "").trim().toLowerCase();
  const stationIsLocal = render?.stationIsLocal === true
    || String(stationIp || "").trim().toLowerCase() === "127.0.0.1"
    || String(stationIp || "").trim().toLowerCase() === "localhost";
  const stationBadgeLabel = stationIsLocal
    ? safeT(t, "postprod.renders.filter.localOnly", "Station locale")
    : safeT(t, "postprod.renders.columns.station", "Station");
  const stationStatusLabel = stationStatus === "waiting_station"
    ? safeT(
      t,
      "postprod.renders.stationStatus.waitingStation",
      "En attente (machine occupée)"
    )
    : (stationStatus === "station_unreachable"
      ? safeT(
        t,
        "postprod.renders.stationStatus.stationUnreachable",
        "Machine inaccessible"
      )
      : "");

  return (
    <tr
      className="uu-render-item-clickable"
      style={{ cursor: "pointer" }}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      <td>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
            className="uu-render-list-thumb"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="uu-render-list-thumb placeholder">-</div>
        )}
      </td>
      <td>
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
        {outputPath ? (
          <div className="uu-muted mt-8" style={{ overflowWrap: "anywhere" }}>{outputPath}</div>
        ) : null}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>{String(render?.projectName || "-")}</td>
      <td style={{ overflowWrap: "anywhere" }}>{typeof renderLinkedTaskValue === "function" ? renderLinkedTaskValue(render) || "-" : "-"}</td>
      <td style={{ overflowWrap: "anywhere" }}>{String(render?.requestedByUsername || "-")}</td>
      <td style={{ overflowWrap: "anywhere" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span className={`uu-chip ${stationIsLocal ? "lvl-info" : "lvl-debug"} chip-on`}>
              {stationBadgeLabel}
            </span>
            <span style={{ fontWeight: 600 }}>{stationName || stationIp || "-"}</span>
          </div>
          {stationIp ? <div className="uu-muted">{stationIp}</div> : null}
          {stationStatusLabel ? (
            <span className={`uu-chip ${stationStatus === "station_unreachable" ? "lvl-error" : "lvl-warn"} chip-on`}>
              {stationStatusLabel}
            </span>
          ) : null}
        </div>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <select
          className="uu-input"
          value={reviewStatus}
          disabled={rendersLoading || isBusy || !onTransitionRender || !canReviewRenders}
          onChange={async (e) => {
            const next = String(e.target.value || "").trim();
            if (!next) return;
            await Promise.resolve(onApplyReviewStatus?.(render, next));
          }}
        >
          {(Array.isArray(reviewFlow) ? reviewFlow : []).map((entry) => (
            <option key={`render-review-status-${renderId}-${entry}`} value={entry}>
              {typeof renderReviewStatusLabel === "function" ? renderReviewStatusLabel(t, entry) : entry}
            </option>
          ))}
        </select>
      </td>
      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <button
          type="button"
          className={`uu-fav-filter ${favorite ? "active" : ""}`}
          onClick={() => onToggleRenderFavorite?.(render)}
          aria-pressed={favorite ? "true" : "false"}
          title={favorite
            ? safeT(t, "postprod.renders.favorite.remove", "Retirer des favoris")
            : safeT(t, "postprod.renders.favorite.add", "Ajouter aux favoris")}
        >
          ★
        </button>
      </td>
      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <button className="uu-btn-ghost" type="button" onClick={() => onOpenRenderDetail?.(render)}>
          {safeT(t, "postprod.renders.detail.view", "Voir")}
        </button>
      </td>
    </tr>
  );
}

export { RendersListTableRow };
export default RendersListTableRow;
