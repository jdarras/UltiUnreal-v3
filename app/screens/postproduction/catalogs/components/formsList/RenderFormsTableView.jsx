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
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%" }}>
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "7%" }} />
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
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("updatedAt")}>
                {safeT(t, "common.updatedAt", "Maj")} {formsSortArrowFor?.("updatedAt") || ""}
              </button>
            </th>
            <th style={{ textAlign: "center" }}>{safeT(t, "resources.detail.labels.favorite", "Favoris")}</th>
            <th style={{ textAlign: "center" }}>{safeT(t, "common.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {sortedForms.map((form) => {
            const id = Number(form?.id || 0);
            const isActive = form?.isActive !== false;
            const hasPreset = String(form?.presetName || "").trim().length > 0;
            const availabilityClass = !isActive ? "fail" : (hasPreset ? "ok" : "warn");
            const availabilityTitle = !isActive
              ? safeT(t, "common.unavailable", "Indisponible")
              : (hasPreset
                ? safeT(t, "common.available", "Disponible")
                : safeT(t, "common.warning", "Probleme"));
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
                <td>{formatDate(form?.updatedAt || form?.createdAt)}</td>
                <td style={{ textAlign: "center" }}>
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
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="uu-btn-ghost"
                    onClick={() => onEditForm?.(form)}
                  >
                    {safeT(t, "common.edit", "Modifier")}
                  </button>
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
