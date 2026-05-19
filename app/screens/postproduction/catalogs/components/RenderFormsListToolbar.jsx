import { safeT } from "../../shared/helpers";

const FORMS_TOOLBAR_ROW_STYLE = { flexWrap: "nowrap", alignItems: "center" };
const FORMS_TOOLBAR_CONTROLS_STYLE = { flex: "0 0 auto" };
const FORMS_TOOLBAR_SELECT_STYLE = { height: "36px" };
const FORMS_TOOLBAR_SEARCH_INPUT_STYLE = { width: "280px", maxWidth: "320px", height: "36px", lineHeight: "36px" };
const FORMS_TOOLBAR_ICON_BUTTON_STYLE = {
  width: "36px",
  minWidth: "36px",
  height: "36px",
  padding: "0 6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const FORMS_TOOLBAR_ADVANCED_BUTTON_STYLE = { height: "36px", minHeight: "36px", display: "flex", alignItems: "center" };
const FORMS_TOOLBAR_FAVORITE_GROUP_STYLE = { marginLeft: "12px" };
const FORMS_TOOLBAR_VIEW_GROUP_STYLE = { marginLeft: "auto" };

function RenderFormsListToolbar({
  t,
  canManageRenderTemplates = false,
  onStartCreate = null,
  formsSortMode = "name",
  formsSortDir = "asc",
  onSortSelect = null,
  formsSearchQuery = "",
  onSearchChange = null,
  onClearFilters = null,
  canClearFormsFilters = false,
  onOpenAdvancedSearch = null,
  formsFavoriteOnly = false,
  onToggleFavoriteOnly = null,
  formsViewMode = "thumbs",
  onViewModeChange = null,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={FORMS_TOOLBAR_ROW_STYLE}>
        <button
          type="button"
          className="uu-btn"
          disabled={!canManageRenderTemplates}
          onClick={() => {
            if (typeof onStartCreate === "function") {
              onStartCreate();
            }
          }}
        >
          {safeT(t, "postprod.data.forms.add.compact", "+Formulaire")}
        </button>

        <div className="uu-row uu-gap-8 uu-align-center" style={FORMS_TOOLBAR_CONTROLS_STYLE}>
          <select
            className="uu-select"
            style={FORMS_TOOLBAR_SELECT_STYLE}
            value={`${formsSortMode}:${formsSortDir}`}
            onChange={(e) => {
              if (typeof onSortSelect === "function") {
                onSortSelect(e.target.value);
              }
            }}
          >
            <option value="name:asc">{safeT(t, "postprod.data.forms.sort.name", "Trier par nom (A-Z)")}</option>
            <option value="updatedAt:desc">{safeT(t, "postprod.data.forms.sort.updated", "Trier par date de modification")}</option>
            <option value="projectName:asc">{safeT(t, "postprod.data.forms.sort.project", "Trier par projet")}</option>
            <option value="mapName:asc">{safeT(t, "postprod.data.forms.sort.level", "Trier par level")}</option>
          </select>

          <div className="uu-row uu-gap-4 uu-align-center" style={FORMS_TOOLBAR_CONTROLS_STYLE}>
            <input
              className="uu-input"
              style={FORMS_TOOLBAR_SEARCH_INPUT_STYLE}
              placeholder={safeT(t, "postprod.data.forms.search.placeholder", "Recherche (nom, projet, level, sequence, preset...)")}
              value={formsSearchQuery}
              onChange={(e) => {
                if (typeof onSearchChange === "function") {
                  onSearchChange(e.target.value);
                }
              }}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              onClick={() => {
                if (typeof onClearFilters === "function") {
                  onClearFilters();
                }
              }}
              disabled={!canClearFormsFilters}
              title={safeT(t, "postprod.data.forms.search.clear", "Effacer filtres")}
              style={FORMS_TOOLBAR_ICON_BUTTON_STYLE}
            >
              ✕
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={() => {
                if (typeof onOpenAdvancedSearch === "function") {
                  onOpenAdvancedSearch();
                }
              }}
              style={FORMS_TOOLBAR_ADVANCED_BUTTON_STYLE}
            >
              {safeT(t, "postprod.data.forms.search.advancedButton", "Recherche avancee")}
            </button>
          </div>

          <div className="uu-row uu-gap-6 uu-align-center" style={FORMS_TOOLBAR_FAVORITE_GROUP_STYLE}>
            <button
              type="button"
              className={`uu-fav-filter ${formsFavoriteOnly ? "active" : ""}`}
              onClick={() => {
                if (typeof onToggleFavoriteOnly === "function") {
                  onToggleFavoriteOnly();
                }
              }}
              aria-pressed={formsFavoriteOnly ? "true" : "false"}
              title={safeT(t, "resources.detail.labels.favorite", "Favoris")}
            >
              ★
            </button>
            <span>{safeT(t, "resources.detail.labels.favorite", "Favoris")}</span>
          </div>
        </div>

        <div className="uu-row uu-gap-4" style={FORMS_TOOLBAR_VIEW_GROUP_STYLE}>
          <button
            type="button"
            className={`uu-btn ${formsViewMode === "thumbs" ? "prod-toggle-active" : ""}`}
            onClick={() => {
              if (typeof onViewModeChange === "function") {
                onViewModeChange("thumbs");
              }
            }}
          >
            {safeT(t, "projects.view.thumbs", "Miniatures")}
          </button>
          <button
            type="button"
            className={`uu-btn ${formsViewMode === "list" ? "prod-toggle-active" : ""}`}
            onClick={() => {
              if (typeof onViewModeChange === "function") {
                onViewModeChange("list");
              }
            }}
          >
            {safeT(t, "projects.view.list", "Liste")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { RenderFormsListToolbar };
