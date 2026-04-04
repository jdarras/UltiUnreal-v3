import { safeT } from "../../shared/helpers";

function TasksToolbar({
  t,
  showCreateForm = false,
  tasksLoading = false,
  onOpenCreateForm = null,
  onCloseForm = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  onSetListSortFromSelect = null,
  searchQuery = "",
  onSetSearchQuery = null,
  hasActiveListFilters = false,
  onClearFilters = null,
  onOpenAdvancedSearch = null,
  favoriteOnly = false,
  onToggleFavoriteOnly = null,
  viewMode = "thumbs",
  onSetViewMode = null,
}) {
  return (
    <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
      {!showCreateForm ? (
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: "nowrap", alignItems: "center", width: "100%" }}>
          <button
            className="uu-btn"
            type="button"
            disabled={tasksLoading && !showCreateForm}
            onClick={() => onOpenCreateForm?.()}
          >
            {safeT(t, "postprod.tasks.form.new", "+ Nouvelle tache")}
          </button>

          <div className="uu-row uu-gap-8 uu-align-center" style={{ flex: "0 0 auto" }}>
            <select
              className="uu-select"
              style={{ height: "36px" }}
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

            <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: "0 0 auto" }}>
              <input
                className="uu-input"
                style={{ width: "280px", maxWidth: "320px", height: "36px", lineHeight: "36px" }}
                type="text"
                value={searchQuery}
                disabled={tasksLoading}
                onChange={(e) => onSetSearchQuery?.(e.target.value)}
                placeholder={safeT(t, "postprod.tasks.search.placeholderSimple", "Titre, rendu, station...")}
              />
              <button
                type="button"
                className="uu-btn uu-btn-icon"
                disabled={tasksLoading || !hasActiveListFilters}
                onClick={() => onClearFilters?.()}
                title={safeT(t, "postprod.tasks.search.clear", "Effacer filtres")}
                style={{ width: "36px", minWidth: "36px", height: "36px", padding: "0 6px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
              <button
                type="button"
                className="uu-btn"
                onClick={() => onOpenAdvancedSearch?.()}
                style={{ height: "36px", minHeight: "36px", display: "flex", alignItems: "center" }}
              >
                {safeT(t, "projects.search.advancedButton", "Recherche avancee")}
              </button>
            </div>

            <div className="uu-row uu-gap-6 uu-align-center" style={{ marginLeft: "12px" }}>
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
          </div>

          <div className="uu-row uu-gap-4" style={{ marginLeft: "auto" }}>
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
        <div className="uu-row uu-gap-4" style={{ marginLeft: "auto" }}>
          <button
            className="uu-btn"
            type="button"
            disabled={tasksLoading}
            onClick={() => onCloseForm?.()}
          >
            {safeT(t, "postprod.tasks.form.close", "Fermer formulaire")}
          </button>
        </div>
      )}
    </div>
  );
}

export { TasksToolbar };

