import { formatDate, safeT } from "../../../shared/helpers";
import { simplifyUnrealAssetName } from "./simplifyUnrealAssetName";

function RenderFormsThumbsView({
  t,
  sortedForms = [],
  isFormFavorite = null,
  onToggleFormFavorite = null,
  formProjectLabel = null,
  onEditForm = null,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "12px",
      }}
    >
      {sortedForms.map((form) => {
        const id = Number(form?.id || 0);
        const isActive = form?.isActive !== false;
        const availabilityClass = isActive ? "ok" : "fail";
        const availabilityTitle = isActive
          ? safeT(t, "common.available", "Disponible")
          : safeT(t, "common.unavailable", "Indisponible");
        const favorite = isFormFavorite?.(form) || false;
        return (
          <div key={`render-form-thumb-${id || String(form?.name || "")}`} className="uu-card">
            <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: 0 }}>
                <span className={`uu-dot ${availabilityClass}`} title={availabilityTitle} />
                <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{String(form?.name || "-")}</div>
              </div>
              <button
                type="button"
                className={`uu-fav-filter ${favorite ? "active" : ""}`}
                onClick={() => onToggleFormFavorite?.(form)}
                aria-pressed={favorite ? "true" : "false"}
                title={favorite
                  ? safeT(t, "postprod.data.forms.favorite.remove", "Retirer des favoris")
                  : safeT(t, "postprod.data.forms.favorite.add", "Ajouter aux favoris")}
              >
                ★
              </button>
            </div>
            <div className="uu-muted mt-8">{safeT(t, "postprod.data.project", "Projet")}: {formProjectLabel?.(form) || "-"}</div>
            <div className="uu-muted mt-4">{safeT(t, "postprod.data.forms.level", "Level")}: {simplifyUnrealAssetName(form?.mapName)}</div>
            <div className="uu-muted mt-4">{safeT(t, "postprod.data.forms.sequence", "Level Sequence")}: {simplifyUnrealAssetName(form?.sequenceName)}</div>
            <div className="uu-muted mt-4">{safeT(t, "postprod.data.forms.preset", "Preset WRC")}: {String(form?.presetName || "-")}</div>
            <div className="uu-muted mt-4">{safeT(t, "common.updatedAt", "Maj")}: {formatDate(form?.updatedAt || form?.createdAt)}</div>
            <div className="mt-8">
              <button
                type="button"
                className="uu-btn-ghost"
                onClick={() => onEditForm?.(form)}
              >
                {safeT(t, "common.edit", "Modifier")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { RenderFormsThumbsView };
