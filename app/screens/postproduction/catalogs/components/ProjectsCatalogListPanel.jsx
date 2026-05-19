import { ProjectsCatalogTableView } from "./projectsList/ProjectsCatalogTableView";
import { ProjectsCatalogCardsView } from "./projectsList/ProjectsCatalogCardsView";

function ProjectsCatalogListPanel({
  t,
  viewMode = "cards",
  filteredProjects = [],
  projectOps = {},
  loading = false,
  onSyncProject = null,
  onLoadProjectTemplates = null,
  onLoadProjectTables = null,
  onOpenProjectLinkedTasks = null,
}) {
  if (viewMode === "list") {
    return (
      <ProjectsCatalogTableView
        t={t}
        filteredProjects={filteredProjects}
        projectOps={projectOps}
        loading={loading}
        onSyncProject={onSyncProject}
        onLoadProjectTemplates={onLoadProjectTemplates}
        onLoadProjectTables={onLoadProjectTables}
        onOpenProjectLinkedTasks={onOpenProjectLinkedTasks}
      />
    );
  }

  return (
    <ProjectsCatalogCardsView
      t={t}
      viewMode={viewMode}
      filteredProjects={filteredProjects}
      projectOps={projectOps}
      loading={loading}
      onSyncProject={onSyncProject}
      onLoadProjectTemplates={onLoadProjectTemplates}
      onLoadProjectTables={onLoadProjectTables}
      onOpenProjectLinkedTasks={onOpenProjectLinkedTasks}
    />
  );
}

export { ProjectsCatalogListPanel };
