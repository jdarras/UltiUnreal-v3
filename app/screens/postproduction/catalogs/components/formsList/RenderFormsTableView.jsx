import { formatDate, safeT } from "../../../shared/helpers";
import { simplifyUnrealAssetName } from "./simplifyUnrealAssetName";

const RENDER_FORMS_SCROLL_STYLE = { overflowX: "auto" };
const RENDER_FORMS_TABLE_STYLE = { width: "100%" };
const RENDER_FORMS_COL_1_STYLE = { width: "5%" };
const RENDER_FORMS_COL_2_STYLE = { width: "20%" };
const RENDER_FORMS_COL_3_STYLE = { width: "20%" };
const RENDER_FORMS_COL_4_STYLE = { width: "20%" };
const RENDER_FORMS_COL_5_STYLE = { width: "10%" };
const RENDER_FORMS_COL_6_STYLE = { width: "25%" };
const RENDER_FORMS_TH_CENTER_STYLE = { textAlign: "center" };
const RENDER_FORMS_ACTIONS_HEADER_WRAP_STYLE = { display: "flex", justifyContent: "flex-end" };
const RENDER_FORMS_ACTIONS_HEADER_BOX_STYLE = { minWidth: "140px", textAlign: "center" };
const RENDER_FORMS_CELL_CENTER_STYLE = { textAlign: "center" };
const RENDER_FORMS_CELL_WRAP_STYLE = { overflowWrap: "anywhere" };
const RENDER_FORMS_META_TAG_STYLE = { marginLeft: "6px", opacity: 0.4 };
const RENDER_FORMS_CELL_NOWRAP_STYLE = { whiteSpace: "nowrap" };
const RENDER_FORMS_ACTIONS_ROW_STYLE = { gap: "6px", justifyContent: "flex-end" };
const RENDER_FORMS_LINK_STYLE = { cursor: "pointer" };

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
    <div style={RENDER_FORMS_SCROLL_STYLE}>
      <table className="uu-table" style={RENDER_FORMS_TABLE_STYLE}>
        <colgroup>
          <col style={RENDER_FORMS_COL_1_STYLE} />
          <col style={RENDER_FORMS_COL_2_STYLE} />
          <col style={RENDER_FORMS_COL_3_STYLE} />
          <col style={RENDER_FORMS_COL_4_STYLE} />
          <col style={RENDER_FORMS_COL_5_STYLE} />
          <col style={RENDER_FORMS_COL_6_STYLE} />
        </colgroup>
        <thead>
          <tr>
            <th style={RENDER_FORMS_TH_CENTER_STYLE}>
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("isActive")}>
                {safeT(t, "common.status", "Etat")} {formsSortArrowFor?.("isActive") || ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("name")}>
                {safeT(t, "common.name", "Nom")} {formsSortArrowFor?.("name") || ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("projectName")}>
                {safeT(t, "postprod.data.project", "Projet")} {formsSortArrowFor?.("projectName") || ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("allowedSequences")}>
                {safeT(t, "postprod.data.forms.levelSequence", "LS")} {formsSortArrowFor?.("allowedSequences") || ""}
              </button>
            </th>
            <th className="uu-text-left">
              <button className="uu-link" type="button" onClick={() => onSortColumn?.("updatedAt")}>
                {safeT(t, "common.updatedAt", "Maj")} {formsSortArrowFor?.("updatedAt") || ""}
              </button>
            </th>
            <th>
              <div style={RENDER_FORMS_ACTIONS_HEADER_WRAP_STYLE}>
                <div style={RENDER_FORMS_ACTIONS_HEADER_BOX_STYLE}>
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
                <td style={RENDER_FORMS_CELL_CENTER_STYLE}>
                  <span className={`uu-dot ${availabilityClass}`} title={availabilityTitle} />
                </td>
                <td style={RENDER_FORMS_CELL_WRAP_STYLE}>
                  {String(form?.name || "-")}
                  {id > 0 && <span style={RENDER_FORMS_META_TAG_STYLE}>#{id}</span>}
                </td>
                <td style={RENDER_FORMS_CELL_WRAP_STYLE}>
                  <span
                    onClick={typeof onNavigateToProject === "function" ? () => onNavigateToProject(form?.projectName) : undefined}
                    style={typeof onNavigateToProject === "function" ? RENDER_FORMS_LINK_STYLE : undefined}
                  >
                    {formProjectLabel?.(form) || "-"}
                  </span>
                  {(() => { const pid = formProjectId?.(form); return pid > 0 ? <span style={RENDER_FORMS_META_TAG_STYLE}>#{String(pid).padStart(4, "0")}</span> : null; })()}
                </td>
                <td style={RENDER_FORMS_CELL_WRAP_STYLE}>{Array.isArray(form?.allowedSequences) && form.allowedSequences.length > 0 ? form.allowedSequences.map(simplifyUnrealAssetName).join(", ") : "-"}</td>
                <td style={RENDER_FORMS_CELL_NOWRAP_STYLE}>{formatDate(form?.updatedAt || form?.createdAt)}</td>
                <td>
                  <div className="uu-row" style={RENDER_FORMS_ACTIONS_ROW_STYLE}>
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

