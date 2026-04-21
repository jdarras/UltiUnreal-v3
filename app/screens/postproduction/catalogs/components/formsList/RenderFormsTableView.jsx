import { formatDate, safeT } from "../../../shared/helpers";
import { simplifyUnrealAssetName } from "./simplifyUnrealAssetName";

function RenderFormsTableView({
  t,
  sortedForms = [],
  onSortColumn = null,
  formsSortArrowFor = null,
  isFormFavorite = null,
  onToggleFormFavorite = null,
  formProjectLabel = null,
  formProjectId = null,
  onEditForm = null,
  onDeleteForm = null,
  onNavigateToProject = null,
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%" }}>
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("isActive")}>
                {safeT(t, "common.status", "Etat")} {formsSortArrowFor?.("isActive") || ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("name")}>
                {safeT(t, "common.name", "Nom")} {formsSortArrowFor?.("name") || ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("projectName")}>
                {safeT(t, "postprod.data.project", "Projet")} {formsSortArrowFor?.("projectName") || ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("allowedSequences")}>
                {safeT(t, "postprod.data.forms.levelSequence", "LS")} {formsSortArrowFor?.("allowedSequences") || ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("updatedAt")}>
                {safeT(t, "common.updatedAt", "Maj")} {formsSortArrowFor?.("updatedAt") || ""}
              </button>
            </th>
            <th>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ minWidth: "140px", textAlign: "center" }}>
                  {safeT(t, "common.actions", "Actions")}
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedForms.map((form) => {
            const id = Number(form?.id || 0);
            const isActive = form?.isActive !== false;
            const availabilityClass = isActive ? "ok" : "fail";
            const availabilityTitle = isActive
              ? safeT(t, "common.available", "Disponible")
              : safeT(t, "common.unavailable", "Indisponible");
            const favorite = isFormFavorite?.(form) || false;
            return (
              <tr key={`render-form-list-row-${id || String(form?.name || "")}`}>
                <td style={{ textAlign: "center" }}>
                  <span className={`uu-dot ${availabilityClass}`} title={availabilityTitle} />
                </td>
                <td style={{ overflowWrap: "anywhere" }}>
                  {String(form?.name || "-")}
                  {id > 0 && <span style={{ marginLeft: "6px", opacity: 0.4 }}>#{id}</span>}
                </td>
                <td style={{ overflowWrap: "anywhere" }}>
                  <span
                    onClick={typeof onNavigateToProject === "function" ? () => onNavigateToProject(form?.projectName) : undefined}
                    style={typeof onNavigateToProject === "function" ? { cursor: "pointer" } : undefined}
                  >
                    {formProjectLabel?.(form) || "-"}
                  </span>
                  {(() => { const pid = formProjectId?.(form); return pid > 0 ? <span style={{ marginLeft: "6px", opacity: 0.4 }}>#{String(pid).padStart(4, "0")}</span> : null; })()}
                </td>
                <td style={{ overflowWrap: "anywhere" }}>{Array.isArray(form?.allowedSequences) && form.allowedSequences.length > 0 ? form.allowedSequences.map(simplifyUnrealAssetName).join(", ") : "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(form?.updatedAt || form?.createdAt)}</td>
                <td>
                  <div className="uu-row" style={{ gap: "6px", justifyContent: "flex-end" }}>
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
                    <button
                      type="button"
                      className={`uu-fav-btn ${favorite ? "active" : ""}`}
                      onClick={() => onToggleFormFavorite?.(form)}
                      aria-pressed={favorite ? "true" : "false"}
                      title={favorite
                        ? safeT(t, "postprod.data.forms.favorite.remove", "Retirer des favoris")
                        : safeT(t, "postprod.data.forms.favorite.add", "Ajouter aux favoris")}
                    >
                      ★
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { RenderFormsTableView };
