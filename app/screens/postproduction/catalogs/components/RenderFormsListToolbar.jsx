import { safeT } from "../../shared/helpers";

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
      <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: "nowrap", alignItems: "center" }}>
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

        <div className="uu-row uu-gap-8 uu-align-center" style={{ flex: "0 0 auto" }}>
          <select
            className="uu-select"
            style={{ height: "36px" }}
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

          <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: "0 0 auto" }}>
            <input
              className="uu-input"
              style={{ width: "280px", maxWidth: "320px", height: "36px", lineHeight: "36px" }}
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
              style={{ width: "36px", minWidth: "36px", height: "36px", padding: "0 6px", display: "flex", alignItems: "center", justifyContent: "center" }}
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
              style={{ height: "36px", minHeight: "36px", display: "flex", alignItems: "center" }}
            >
              {safeT(t, "postprod.data.forms.search.advancedButton", "Recherche avancee")}
            </button>
          </div>

          <div className="uu-row uu-gap-6 uu-align-center" style={{ marginLeft: "12px" }}>
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

        <div className="uu-row uu-gap-4" style={{ marginLeft: "auto" }}>
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
