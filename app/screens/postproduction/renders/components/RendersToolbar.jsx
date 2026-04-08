import { safeT } from "../../shared/helpers";

function RendersToolbar({
  t,
  rendersLoading = false,
  onScanDetectedRenders = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  onSetListSortFromSelect = null,
  searchQuery = "",
  onSetSearchQuery = null,
  hasActiveFilters = false,
  onClearFilters = null,
  onOpenAdvancedSearch = null,
  favoriteOnly = false,
  onToggleFavoriteOnly = null,
  viewMode = "thumbs",
  onSetViewMode = null,
  searchExpanded = false,
  onSetSearchExpanded = null,
  sortedDisplayedRendersCount = 0,
  projectFilter = "all",
  onSetProjectFilter = null,
  reviewFilter = "all",
  onSetReviewFilter = null,
  projectFilterOptions = [],
}) {
  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: "nowrap", alignItems: "center", width: "100%" }}>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={rendersLoading || !onScanDetectedRenders}
          onClick={() => onScanDetectedRenders?.()}
        >
          {safeT(t, "postprod.renders.detectedScan.button", "Scanner maintenant")}
        </button>

        <div className="uu-row uu-gap-8 uu-align-center" style={{ flex: "0 0 auto" }}>
          <select
            className="uu-select"
            style={{ height: "36px" }}
            value={`${listSortKey}:${listSortDir}`}
            disabled={rendersLoading}
            onChange={(e) => onSetListSortFromSelect?.(e.target.value)}
          >
            <option value="updatedAt:desc">{safeT(t, "postprod.renders.sort.updatedAt", "Date MAJ")}</option>
            <option value="file:asc">{safeT(t, "postprod.renders.sort.file", "Fichier")}</option>
            <option value="project:asc">{safeT(t, "postprod.renders.sort.project", "Projet")}</option>
            <option value="linkedTask:asc">{safeT(t, "postprod.renders.sort.linkedTask", "Tache liee")}</option>
            <option value="requester:asc">{safeT(t, "postprod.renders.sort.requester", "Demandeur")}</option>
            <option value="reviewStatus:asc">{safeT(t, "postprod.renders.sort.reviewStatus", "Validation")}</option>
          </select>

          <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: "0 0 auto" }}>
            <input
              className="uu-input"
              style={{ width: "320px", maxWidth: "360px", height: "36px", lineHeight: "36px" }}
              type="text"
              value={searchQuery}
              disabled={rendersLoading}
              onChange={(e) => onSetSearchQuery?.(e.target.value)}
              placeholder={safeT(t, "postprod.renders.search.placeholder", "Template, projet, demandeur, station de rendu disponible...")}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              disabled={rendersLoading || !hasActiveFilters}
              onClick={() => onClearFilters?.()}
              title={safeT(t, "postprod.renders.search.clear", "Effacer filtres")}
              style={{
                width: "36px",
                minWidth: "36px",
                height: "36px",
                padding: "0 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
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
            className={`uu-btn ${viewMode === "thumbs" ? "prod-toggle-active" : ""}`}
            type="button"
            onClick={() => onSetViewMode?.("thumbs")}
          >
            {safeT(t, "projects.view.thumbs", "Miniatures")}
          </button>
          <button
            className={`uu-btn ${viewMode === "list" ? "prod-toggle-active" : ""}`}
            type="button"
            onClick={() => onSetViewMode?.("list")}
          >
            {safeT(t, "projects.view.list", "Liste")}
          </button>
        </div>
      </div>
      {searchExpanded ? (
        <div className="uu-card uu-col uu-gap-12 mt-12">
          <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
            <strong className="uu-block-title">{safeT(t, "projects.search.advancedTitle", "Recherche avancee")}</strong>
            <div className="uu-muted">
              {sortedDisplayedRendersCount > 0 ? `(${sortedDisplayedRendersCount})` : ""}
            </div>
          </div>
          <div className="uu-row uu-gap-16 uu-wrap">
            <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "280px" }}>
              <label className="uu-label" style={{ width: "140px" }}>{safeT(t, "postprod.renders.filter.project", "Projet")}</label>
              <select
                className="uu-select"
                style={{ width: "260px", height: "36px" }}
                value={projectFilter}
                disabled={rendersLoading}
                onChange={(e) => onSetProjectFilter?.(String(e.target.value || "all"))}
              >
                <option value="all">{safeT(t, "postprod.renders.filter.project.all", "Tous les projets")}</option>
                {(Array.isArray(projectFilterOptions) ? projectFilterOptions : []).map((entry) => (
                  <option key={`postprod-renders-filter-project-${entry.key}`} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "280px" }}>
              <label className="uu-label" style={{ width: "140px" }}>{safeT(t, "postprod.renders.filter.review", "Filtre validation")}</label>
              <select
                className="uu-select"
                style={{ width: "260px", height: "36px" }}
                value={reviewFilter}
                disabled={rendersLoading}
                onChange={(e) => onSetReviewFilter?.(String(e.target.value || "all"))}
              >
                <option value="all">{safeT(t, "postprod.renders.filter.review.all", "Tous")}</option>
                <option value="to_validate">{safeT(t, "postprod.renders.review.toValidate", "A valider")}</option>
                <option value="validated">{safeT(t, "postprod.renders.review.validated", "Valide")}</option>
                <option value="to_modify">{safeT(t, "postprod.renders.review.toModify", "A modifier")}</option>
                <option value="canceled">{safeT(t, "postprod.renders.review.canceled", "Annule")}</option>
              </select>
            </div>
          </div>
          <div className="uu-row uu-justify-end">
            <button
              type="button"
              className="uu-btn-ghost"
              onClick={() => onSetSearchExpanded?.(false)}
            >
              {safeT(t, "projects.search.close", "Fermer")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { RendersToolbar };
