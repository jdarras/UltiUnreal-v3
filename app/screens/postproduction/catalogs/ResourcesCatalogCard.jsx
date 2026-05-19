import { formatDate, safeT } from "../shared/helpers";
import { useResourcesCatalogController } from "./hooks/useResourcesCatalogController";
import { ResourcesCatalogListPanel } from "./components/ResourcesCatalogListPanel";
import { ResourcesCatalogDetailPanel } from "./components/ResourcesCatalogDetailPanel";

const RESOURCES_CATALOG_HEADER_STYLE = { justifyContent: "space-between", alignItems: "center" };

function ResourcesCatalogCard({
  t,
  resources = [],
  tasks = [],
  source = "",
  sync = null,
  loading = false,
  error = "",
  onRefreshResources = null,
  onReindexResources = null,
  onLoadResourceDetail = null,
  onOpenLinkedTasks = null,
}) {
  const {
    search,
    setSearch,
    linkedTasksFilter,
    setLinkedTasksFilter,
    selectedRef,
    setSelectedRef,
    detailLoading,
    detailError,
    viewMode,
    setViewMode,
    resourcesSourceLabel,
    resourcesSyncStateLabel,
    resourcesSyncAt,
    resourcesSyncCountersLabel,
    normalizedResources,
    filteredResources,
    selectedFallback,
    detailObj,
    detailUid,
    detailTitle,
    detailType,
    detailSourcePath,
    detailListingUrl,
    detailSeller,
    detailThumbCandidates,
    detailLinkedTasksCount,
    openResourceLinkedTasks,
  } = useResourcesCatalogController({
    t,
    resources,
    tasks,
    source,
    sync,
    onLoadResourceDetail,
    onOpenLinkedTasks,
  });

  return (
    <section className="uu-section">
      <div className="uu-row" style={RESOURCES_CATALOG_HEADER_STYLE}>
        <h3 className="uu-h3 uu-block-title">{safeT(t, "postprod.resources.title", "Ressources Post-production")}</h3>
        <div className="uu-row uu-gap-4">
          <button
            type="button"
            className={`uu-btn ${viewMode === "thumbs" ? "prod-toggle-active" : ""}`}
            onClick={() => setViewMode("thumbs")}
          >
            {safeT(t, "projects.view.thumbs", "Miniatures")}
          </button>
          <button
            type="button"
            className={`uu-btn ${viewMode === "cards" ? "prod-toggle-active" : ""}`}
            onClick={() => setViewMode("cards")}
          >
            {safeT(t, "projects.view.cards", "Cartes")}
          </button>
          <button
            type="button"
            className={`uu-btn ${viewMode === "list" ? "prod-toggle-active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            {safeT(t, "projects.view.list", "Liste")}
          </button>
          <button
            className="uu-btn-ghost"
            type="button"
            onClick={() => onRefreshResources?.({ forceSync: true })}
            disabled={loading}
          >
            {safeT(t, "postprod.resources.scan", "Scanner")}
          </button>
          <button
            className="uu-btn-ghost"
            type="button"
            onClick={() => onReindexResources?.()}
            disabled={loading}
          >
            {safeT(t, "postprod.resources.reindex", "Reindexer")}
          </button>
        </div>
      </div>

      <div className="uu-grid-3 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.resources.search", "Recherche")}</label>
          <input
            className="uu-input"
            type="text"
            value={search}
            disabled={loading}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={safeT(t, "postprod.resources.search.placeholder", "UID, titre, type...")}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.resources.filter.linkedTasks", "Filtre taches liees")}</label>
          <select
            className="uu-input"
            value={linkedTasksFilter}
            disabled={loading}
            onChange={(e) => setLinkedTasksFilter(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.resources.filter.linkedTasks.all", "Tous")}</option>
            <option value="with_tasks">{safeT(t, "postprod.resources.filter.linkedTasks.withTasks", "Avec taches")}</option>
            <option value="without_tasks">{safeT(t, "postprod.resources.filter.linkedTasks.withoutTasks", "Sans tache")}</option>
          </select>
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.resources.count", "Nombre de ressources")}</label>
          <div className="uu-muted mt-8">
            {safeT(t, "postprod.resources.count.value", "{visible}/{total} affichees", {
              visible: filteredResources.length,
              total: normalizedResources.length,
            })}
          </div>
          <div className="uu-muted mt-8">
            {safeT(t, "postprod.resources.source.label", "Source de verite: {value}", {
              value: resourcesSourceLabel,
            })}
          </div>
          <div className="uu-muted mt-8">
            {safeT(t, "postprod.resources.sync.label", "Etat synchro: {value}", {
              value: resourcesSyncStateLabel,
            })}
          </div>
          {resourcesSyncAt ? (
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.resources.sync.at", "Derniere synchro: {value}", {
                value: formatDate(resourcesSyncAt),
              })}
            </div>
          ) : null}
          {resourcesSyncCountersLabel ? (
            <div className="uu-muted mt-8">{resourcesSyncCountersLabel}</div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.resources.loading", "Chargement des ressources...")}</div>
      ) : null}
      {!loading && error ? <div className="uu-msg warn mt-12">{error}</div> : null}
      {!loading && !error && filteredResources.length === 0 ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.resources.empty", "Aucune ressource.")}</div>
      ) : null}

      {!loading && !error && filteredResources.length > 0 ? (
        <div className="uu-grid-2 mt-12">
          <div className="uu-grid-field">
            <label className="uu-label">{safeT(t, "postprod.resources.list", "Ressources")}</label>
            <ResourcesCatalogListPanel
              t={t}
              viewMode={viewMode}
              filteredResources={filteredResources}
              selectedRef={selectedRef}
              onSelectRef={setSelectedRef}
              onOpenLinkedTasks={openResourceLinkedTasks}
            />
          </div>
          <div className="uu-grid-field">
            <label className="uu-label">{safeT(t, "postprod.resources.detail", "Detail")}</label>
            <ResourcesCatalogDetailPanel
              t={t}
              detailLoading={detailLoading}
              detailError={detailError}
              detailThumbCandidates={detailThumbCandidates}
              detailTitle={detailTitle}
              detailUid={detailUid}
              selectedRef={selectedRef}
              detailType={detailType}
              detailSeller={detailSeller}
              detailLinkedTasksCount={detailLinkedTasksCount}
              detailSourcePath={detailSourcePath}
              detailListingUrl={detailListingUrl}
              detailObj={detailObj}
              selectedFallbackRef={selectedFallback?.ref || ""}
              onOpenLinkedTasks={openResourceLinkedTasks}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { ResourcesCatalogCard };

