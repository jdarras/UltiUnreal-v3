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
  onEditForm = null,
  onDeleteForm = null,
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%" }}>
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "23%" }} />
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
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("mapName")}>
                {safeT(t, "postprod.data.forms.level", "Level")} {formsSortArrowFor?.("mapName") || ""}
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
                <td style={{ overflowWrap: "anywhere" }}>{String(form?.name || "-")}</td>
                <td style={{ overflowWrap: "anywhere" }}>
                  {formProjectLabel?.(form) || "-"}
                </td>
                <td style={{ overflowWrap: "anywhere" }}>{simplifyUnrealAssetName(form?.mapName)}</td>
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
