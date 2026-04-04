import { formatDate, safeT } from "../../../shared/helpers";

function RendersThumbsView({
  t,
  sortedDisplayedRenders = [],
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
    <div className="uu-render-grid thumbs">
      {sortedDisplayedRenders.map((render) => (
        <RendersThumbCard
          key={`postprod-render-card-${Number(render?.id || 0)}`}
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
    </div>
  );
}

function RendersThumbCard({
  t,
  render,
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
    <div
      className="uu-card uu-render-item-clickable"
      style={{ cursor: "pointer" }}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
          className="uu-render-thumb"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="uu-render-thumb placeholder">{safeT(t, "postprod.renders.preview.none", "Aucun apercu")}</div>
      )}
      <div className="uu-row mt-8" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
        <button
          type="button"
          className={`uu-fav-filter ${favorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleRenderFavorite?.(render);
          }}
          aria-pressed={favorite ? "true" : "false"}
          title={favorite
            ? safeT(t, "postprod.renders.favorite.remove", "Retirer des favoris")
            : safeT(t, "postprod.renders.favorite.add", "Ajouter aux favoris")}
        >
          ★
        </button>
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.renders.meta.project", "Projet: {value}", {
          value: String(render?.projectName || "-"),
        })}
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.renders.meta.linkedTask", "Tache: {value}", {
          value: typeof renderLinkedTaskValue === "function" ? renderLinkedTaskValue(render) || "-" : "-",
        })}
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.renders.meta.updated", "Mise a jour: {value}", {
          value: formatDate(render?.updatedAt),
        })}
      </div>
      {outputPath ? (
        <div className="uu-muted mt-8" style={{ wordBreak: "break-all" }}>
          {outputPath}
        </div>
      ) : null}
      <div className="uu-row mt-12" onClick={(e) => e.stopPropagation()}>
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
            <option key={`render-review-card-${renderId}-${entry}`} value={entry}>
              {typeof renderReviewStatusLabel === "function" ? renderReviewStatusLabel(t, entry) : entry}
            </option>
          ))}
        </select>
        <button className="uu-btn-ghost" type="button" onClick={() => onOpenRenderDetail?.(render)}>
          {safeT(t, "postprod.renders.detail.open", "Ouvrir")}
        </button>
      </div>
    </div>
  );
}

export { RendersThumbsView };
