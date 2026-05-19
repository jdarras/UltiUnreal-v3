import { safeT } from "../shared/helpers";
import { useProjectsCatalogController } from "./hooks/useProjectsCatalogController";
import { ProjectsCatalogListPanel } from "./components/ProjectsCatalogListPanel";

const PROJECTS_CATALOG_HEADER_STYLE = { justifyContent: "space-between", alignItems: "center" };

function ProjectsCatalogCard({
  t,
  projects = [],
  tasks = [],
  loading = false,
  error = "",
  onLoadProjectRenderTemplates = null,
  onSyncProject = null,
  onLoadProjectDataTables = null,
  onOpenLinkedTasks = null,
}) {
  const {
    usageModeFilter,
    setUsageModeFilter,
    linkedTasksFilter,
    setLinkedTasksFilter,
    viewMode,
    setViewMode,
    projectOps,
    normalizedProjects,
    filteredProjects,
    handleProjectSync,
    handleLoadProjectTemplates,
    handleLoadProjectTables,
    openProjectLinkedTasks,
  } = useProjectsCatalogController({
    t,
    projects,
    tasks,
    onLoadProjectRenderTemplates,
    onSyncProject,
    onLoadProjectDataTables,
    onOpenLinkedTasks,
  });

  return (
    <section className="uu-section">
      <div className="uu-row" style={PROJECTS_CATALOG_HEADER_STYLE}>
        <h3 className="uu-h3 uu-block-title">{safeT(t, "postprod.projects.title", "Projets Post-production")}</h3>
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
        </div>
      </div>

      <div className="uu-grid-3 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.projects.filter.usageMode", "Filtre mode d'usage")}</label>
          <select
            className="uu-input"
            value={usageModeFilter}
            disabled={loading}
            onChange={(e) => setUsageModeFilter(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.projects.filter.all", "Tous")}</option>
            <option value="live">{safeT(t, "projects.detail.usageMode.live", "Live")}</option>
            <option value="auto_render">{safeT(t, "projects.detail.usageMode.auto_render", "Rendu automatique")}</option>
            <option value="live_auto_render">{safeT(t, "projects.detail.usageMode.live_auto_render", "Live + Rendu automatique")}</option>
            <option value="other">{safeT(t, "projects.detail.usageMode.other", "Autre")}</option>
          </select>
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.projects.filter.linkedTasks", "Filtre taches liees")}</label>
          <select
            className="uu-input"
            value={linkedTasksFilter}
            disabled={loading}
            onChange={(e) => setLinkedTasksFilter(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.projects.filter.linkedTasks.all", "Tous")}</option>
            <option value="with_tasks">{safeT(t, "postprod.projects.filter.linkedTasks.withTasks", "Avec taches")}</option>
            <option value="without_tasks">{safeT(t, "postprod.projects.filter.linkedTasks.withoutTasks", "Sans tache")}</option>
          </select>
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.projects.count", "Nombre de projets")}</label>
          <div className="uu-muted mt-8">
            {safeT(t, "postprod.projects.count.value", "{visible}/{total} affiches", {
              visible: filteredProjects.length,
              total: normalizedProjects.length,
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.projects.loading", "Chargement des projets...")}</div>
      ) : null}
      {!loading && error ? <div className="uu-msg warn mt-12">{error}</div> : null}
      {!loading && !error && filteredProjects.length === 0 ? (
        <div className="uu-muted mt-12">
          {safeT(t, "postprod.projects.empty", "Aucun projet pour ce filtre.")}
        </div>
      ) : null}

      {!loading && !error && filteredProjects.length > 0 ? (
        <ProjectsCatalogListPanel
          t={t}
          viewMode={viewMode}
          filteredProjects={filteredProjects}
          projectOps={projectOps}
          loading={loading}
          onSyncProject={handleProjectSync}
          onLoadProjectTemplates={handleLoadProjectTemplates}
          onLoadProjectTables={handleLoadProjectTables}
          onOpenProjectLinkedTasks={openProjectLinkedTasks}
        />
      ) : null}
    </section>
  );
}

export { ProjectsCatalogCard };


