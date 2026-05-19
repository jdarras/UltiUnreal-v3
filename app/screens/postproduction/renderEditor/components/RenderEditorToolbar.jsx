import { safeT } from "../../shared/helpers";
import { normalizeTaskVisualStatusKey, taskVisualStatusClass, taskVisualStatusLabel } from "../helpers";

const RENDER_EDITOR_TOOLBAR_ROOT_STYLE = {
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
};
const RENDER_EDITOR_TOOLBAR_BROWSE_ROW_STYLE = { flexWrap: "nowrap", alignItems: "center", width: "100%" };
const RENDER_EDITOR_TOOLBAR_CONTROLS_STYLE = { flex: "0 0 auto" };
const RENDER_EDITOR_TOOLBAR_SORT_STYLE = { height: "36px" };
const RENDER_EDITOR_TOOLBAR_SEARCH_GROUP_STYLE = { flex: "0 0 auto" };
const RENDER_EDITOR_TOOLBAR_SEARCH_INPUT_STYLE = { width: "280px", maxWidth: "320px", height: "36px", lineHeight: "36px" };
const RENDER_EDITOR_TOOLBAR_CLEAR_BUTTON_STYLE = {
  width: "36px",
  minWidth: "36px",
  height: "36px",
  padding: "0 6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const RENDER_EDITOR_TOOLBAR_ADVANCED_BUTTON_STYLE = { height: "36px", minHeight: "36px", display: "flex", alignItems: "center" };
const RENDER_EDITOR_TOOLBAR_FAVORITES_STYLE = { marginLeft: "12px" };
const RENDER_EDITOR_TOOLBAR_HISTORY_LABEL_STYLE = { marginLeft: "10px", whiteSpace: "nowrap" };
const RENDER_EDITOR_TOOLBAR_VIEW_TOGGLES_STYLE = { marginLeft: "auto" };
const RENDER_EDITOR_TOOLBAR_FORM_ROW_STYLE = { justifyContent: "space-between", alignItems: "center", width: "100%" };
const RENDER_EDITOR_TOOLBAR_FORM_STATUS_STYLE = { minHeight: "36px" };
const RENDER_EDITOR_TOOLBAR_FORM_ACTIONS_STYLE = { marginLeft: "auto" };

function RenderEditorToolbar({
  t,
  showCreateForm = false,
  isEditingTask = false,
  editingTaskVisualStatusKey = "planned",
  tasksLoading = false,
  canCreateTasks = false,
  onOpenCreateForm = null,
  onCloseForm = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  onSetListSortFromSelect = null,
  searchQuery = "",
  onSetSearchQuery = null,
  hasActiveListFilters: _hasActiveListFilters = false,
  onClearFilters = null,
  onOpenAdvancedSearch = null,
  favoriteOnly = false,
  onToggleFavoriteOnly = null,
  showHistory = false,
  onSetShowHistory = null,
  viewMode = "thumbs",
  onSetViewMode = null,
}) {
  const normalizedEditorStatus = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  const editorStatusLabel = isEditingTask
    ? taskVisualStatusLabel(t, normalizedEditorStatus)
    : safeT(t, "postprod.tasks.form.status.new", "Nouveau");
  const editorStatusClass = taskVisualStatusClass(normalizedEditorStatus);

  return (
    <div className="uu-row" style={RENDER_EDITOR_TOOLBAR_ROOT_STYLE}>
      {!showCreateForm ? (
        <div className="uu-row uu-align-center uu-gap-8" style={RENDER_EDITOR_TOOLBAR_BROWSE_ROW_STYLE}>
          <button
            className="uu-btn"
            type="button"
            disabled={!canCreateTasks || (tasksLoading && !showCreateForm)}
            onClick={() => onOpenCreateForm?.()}
          >
            {safeT(t, "postprod.tasks.form.new", "+ Nouvelle tache")}
          </button>

          <div className="uu-row uu-gap-8 uu-align-center" style={RENDER_EDITOR_TOOLBAR_CONTROLS_STYLE}>
            <select
              className="uu-select"
              style={RENDER_EDITOR_TOOLBAR_SORT_STYLE}
              value={`${listSortKey}:${listSortDir}`}
              disabled={tasksLoading}
              onChange={(e) => onSetListSortFromSelect?.(e.target.value)}
            >
              <option value="updatedAt:desc">
                {`${safeT(t, "postprod.tasks.sort.by", "Trie par")} ${safeT(t, "postprod.tasks.sort.updatedAt", "Date MAJ")}`}
              </option>
              <option value="title:asc">
                {`${safeT(t, "postprod.tasks.sort.by", "Trie par")} ${safeT(t, "postprod.tasks.sort.title", "Titre")}`}
              </option>
              <option value="status:asc">
                {`${safeT(t, "postprod.tasks.sort.by", "Trie par")} ${safeT(t, "postprod.tasks.sort.status", "Statut")}`}
              </option>
              <option value="renderName:asc">
                {`${safeT(t, "postprod.tasks.sort.by", "Trie par")} ${safeT(t, "postprod.tasks.sort.renderName", "Nom du rendu")}`}
              </option>
              <option value="renderWorker:asc">
                {`${safeT(t, "postprod.tasks.sort.by", "Trie par")} ${safeT(t, "postprod.tasks.sort.renderWorker", "Station")}`}
              </option>
            </select>

            <div className="uu-row uu-gap-4 uu-align-center" style={RENDER_EDITOR_TOOLBAR_SEARCH_GROUP_STYLE}>
              <input
                className="uu-input"
                style={RENDER_EDITOR_TOOLBAR_SEARCH_INPUT_STYLE}
                type="text"
                value={searchQuery}
                disabled={tasksLoading}
                onChange={(e) => onSetSearchQuery?.(e.target.value)}
                placeholder={safeT(t, "postprod.tasks.search.placeholderSimple", "Titre, rendu, station...")}
              />
              <button
                type="button"
                className="uu-btn uu-btn-icon"
                disabled={tasksLoading}
                onClick={() => onClearFilters?.()}
                title={safeT(t, "postprod.tasks.search.clear", "Effacer filtres")}
                style={RENDER_EDITOR_TOOLBAR_CLEAR_BUTTON_STYLE}
              >
                ✕
              </button>
              <button
                type="button"
                className="uu-btn"
                onClick={() => onOpenAdvancedSearch?.()}
                style={RENDER_EDITOR_TOOLBAR_ADVANCED_BUTTON_STYLE}
              >
                {safeT(t, "projects.search.advancedButton", "Recherche avancee")}
              </button>
            </div>

            <div className="uu-row uu-gap-6 uu-align-center" style={RENDER_EDITOR_TOOLBAR_FAVORITES_STYLE}>
              <button
                type="button"
                className={`uu-fav-filter ${favoriteOnly ? "active" : ""}`}
                onClick={() => onToggleFavoriteOnly?.()}
                aria-pressed={favoriteOnly ? "true" : "false"}
                title={safeT(t, "resources.detail.labels.favorite", "Favoris")}
              >
                ★
              </button>
              <span>{safeT(t, "resources.detail.labels.favorite", "Favoris")}</span>
            </div>

            <label className="uu-check" style={RENDER_EDITOR_TOOLBAR_HISTORY_LABEL_STYLE}>
              <input
                type="checkbox"
                checked={showHistory === true}
                disabled={tasksLoading}
                onChange={(e) => onSetShowHistory?.(e.target.checked === true)}
              />
              {safeT(t, "postprod.tasks.history.toggle", "Historique")}
            </label>
          </div>

          <div className="uu-row uu-gap-4" style={RENDER_EDITOR_TOOLBAR_VIEW_TOGGLES_STYLE}>
            <button
              type="button"
              className={`uu-btn ${viewMode === "thumbs" ? "prod-toggle-active" : ""}`}
              onClick={() => onSetViewMode?.("thumbs")}
            >
              {safeT(t, "projects.view.thumbs", "Miniatures")}
            </button>
            <button
              type="button"
              className={`uu-btn ${viewMode === "list" ? "prod-toggle-active" : ""}`}
              onClick={() => onSetViewMode?.("list")}
            >
              {safeT(t, "projects.view.list", "Liste")}
            </button>
          </div>
        </div>
      ) : (
        <div className="uu-row" style={RENDER_EDITOR_TOOLBAR_FORM_ROW_STYLE}>
          <div className="uu-row uu-gap-8 uu-align-center" style={RENDER_EDITOR_TOOLBAR_FORM_STATUS_STYLE}>
            <span className="uu-muted">{safeT(t, "postprod.tasks.form.status.label", "Statut du rendu")}</span>
            <span className={`uu-chip chip-on ${editorStatusClass}`}>
              {editorStatusLabel}
            </span>
          </div>
          <div className="uu-row uu-gap-4" style={RENDER_EDITOR_TOOLBAR_FORM_ACTIONS_STYLE}>
            <button
              className="uu-btn"
              type="button"
              disabled={tasksLoading}
              onClick={() => onCloseForm?.()}
            >
              {safeT(t, "postprod.tasks.form.close", "Fermer formulaire")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { RenderEditorToolbar };
