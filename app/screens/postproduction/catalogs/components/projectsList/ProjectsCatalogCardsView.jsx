import { safeT } from "../../../shared/helpers";
import { projectUsageModeLabel } from "../../helpers/projectUsageMode";
import { ProjectActionsRow } from "./ProjectActionsRow";

function ProjectsCatalogCardsView({
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
  return (
    <div
      className="mt-12"
      style={{
        display: "grid",
        gap: "12px",
        gridTemplateColumns: viewMode === "thumbs"
          ? "repeat(auto-fill, minmax(220px, 1fr))"
          : "repeat(auto-fill, minmax(320px, 1fr))",
      }}
    >
      {filteredProjects.map((project) => {
        const usageMode = String(project?.usageMode || "").trim();
        const ref = String(project?.id || project?.name || "").trim();
        const opState = ref ? (projectOps?.[ref] || {}) : {};
        return (
          <div key={`postprod-project-${project.id || project.name}`} className="uu-card">
            <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600 }}>
                {String(project?.name || project?.id || "-")}
              </div>
              <span className="uu-msg info">
                {projectUsageModeLabel(t, usageMode, safeT(t, "common.none", "(aucun)"))}
              </span>
            </div>
            {viewMode === "cards" ? (
              <div className="uu-row mt-12">
                <span className="uu-muted">
                  {safeT(t, "postprod.projects.meta.id", "ID: {value}", {
                    value: String(project?.id || "-"),
                  })}
                </span>
                <span className="uu-muted">
                  {safeT(t, "postprod.projects.meta.code", "Code: {value}", {
                    value: String(project?.code || "-"),
                  })}
                </span>
                <span className="uu-muted">
                  {safeT(t, "postprod.projects.meta.usage", "Usage: {value}", {
                    value: projectUsageModeLabel(t, usageMode, safeT(t, "common.none", "(aucun)")),
                  })}
                </span>
                <span className="uu-muted">
                  {safeT(t, "postprod.projects.meta.linkedTasks", "Taches liees: {count}", {
                    count: Number.isFinite(Number(project?.linkedTasksCount)) ? Number(project.linkedTasksCount) : 0,
                  })}
                </span>
              </div>
            ) : (
              <>
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.projects.meta.code", "Code: {value}", {
                    value: String(project?.code || "-"),
                  })}
                </div>
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.projects.meta.linkedTasks", "Taches liees: {count}", {
                    count: Number.isFinite(Number(project?.linkedTasksCount)) ? Number(project.linkedTasksCount) : 0,
                  })}
                </div>
              </>
            )}
            <div className="mt-12">
              <ProjectActionsRow
                t={t}
                project={project}
                opState={opState}
                loading={loading}
                onSyncProject={onSyncProject}
                onLoadProjectTemplates={onLoadProjectTemplates}
                onLoadProjectTables={onLoadProjectTables}
                onOpenProjectLinkedTasks={onOpenProjectLinkedTasks}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { ProjectsCatalogCardsView };
export default ProjectsCatalogCardsView;
