import { formatDate, safeT } from "../../../shared/helpers";
import { simplifyUnrealAssetName } from "./simplifyUnrealAssetName";

function RenderFormsThumbsView({
  t,
  sortedForms = [],
  isFormFavorite = null,
  onToggleFormFavorite = null,
  formProjectLabel = null,
  formProjectId = null,
  onEditForm = null,
  onDeleteForm = null,
  onNavigateToProject = null,
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
                <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                  {String(form?.name || "-")}
                  {id > 0 && <span style={{ marginLeft: "6px", opacity: 0.4 }}>#{id}</span>}
                </div>
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
            <div className="mt-8">
              <span className="uu-muted">{safeT(t, "postprod.data.project", "Projet")}: </span>
              <span
                onClick={typeof onNavigateToProject === "function" ? () => onNavigateToProject(form?.projectName) : undefined}
                style={typeof onNavigateToProject === "function" ? { cursor: "pointer" } : undefined}
              >
                {formProjectLabel?.(form) || "-"}
              </span>
              {(() => { const pid = formProjectId?.(form); return pid > 0 ? <span style={{ marginLeft: "6px", opacity: 0.4 }}>#{String(pid).padStart(4, "0")}</span> : null; })()}
            </div>
            <div className="mt-4"><span className="uu-muted">{safeT(t, "postprod.data.forms.level", "Level")}: </span>{simplifyUnrealAssetName(form?.mapName)}</div>
            <div className="mt-4"><span className="uu-muted">{safeT(t, "postprod.data.forms.levelSequence", "LS")}: </span>{Array.isArray(form?.allowedSequences) && form.allowedSequences.length > 0 ? form.allowedSequences.map(simplifyUnrealAssetName).join(", ") : "-"}</div>
            <div className="mt-4"><span className="uu-muted">{safeT(t, "postprod.data.forms.wrcFiles", "WRC")}: </span>{Array.isArray(form?.wrcFiles) && form.wrcFiles.length > 0 ? form.wrcFiles.map(simplifyUnrealAssetName).join(", ") : "-"}</div>
            <div className="mt-4"><span className="uu-muted">{safeT(t, "common.updatedAt", "Maj")}: </span>{formatDate(form?.updatedAt || form?.createdAt)}</div>
            <div className="mt-8 uu-row" style={{ gap: "8px" }}>
              <button
                type="button"
                className="uu-btn-ghost"
                onClick={() => onEditForm?.(form)}
              >
                {safeT(t, "common.edit", "Modifier")}
              </button>
              {onDeleteForm ? (
                <button
                  type="button"
                  className="uu-btn-ghost"
                  onClick={() => onDeleteForm?.(form)}
                >
                  {safeT(t, "common.delete", "Supprimer")}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { RenderFormsThumbsView };
