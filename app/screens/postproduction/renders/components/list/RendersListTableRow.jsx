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
          {safeT(t, "postprod.renders.detail.open", "Ouvrir")}
        </button>
      </td>
    </tr>
  );
}

export { RendersListTableRow };
export default RendersListTableRow;
