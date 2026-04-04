import { safeT } from "../../../shared/helpers";
import { projectUsageModeLabel } from "../../helpers/projectUsageMode";
import { ProjectActionsRow } from "./ProjectActionsRow";

function ProjectsCatalogTableView({
  t,
  filteredProjects = [],
  projectOps = {},
  loading = false,
  onSyncProject = null,
  onLoadProjectTemplates = null,
  onLoadProjectTables = null,
  onOpenProjectLinkedTasks = null,
}) {
  return (
    <div className="mt-12">
      <table className="uu-table">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>{safeT(t, "projects.table.id", "ID")}</th>
            <th style={{ textAlign: "left" }}>{safeT(t, "projects.table.name", "Nom")}</th>
            <th style={{ textAlign: "left" }}>{safeT(t, "projects.table.usageMode", "Mode d'usage")}</th>
            <th style={{ textAlign: "left" }}>{safeT(t, "postprod.projects.table.code", "Code")}</th>
            <th style={{ textAlign: "left" }}>{safeT(t, "postprod.projects.table.linkedTasks", "Taches liees")}</th>
            <th style={{ textAlign: "left" }}>{safeT(t, "postprod.projects.table.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredProjects.map((project) => {
            const usageMode = String(project?.usageMode || "").trim();
            const ref = String(project?.id || project?.name || "").trim();
            const opState = ref ? (projectOps?.[ref] || {}) : {};
            return (
              <tr key={`postprod-project-row-${project.id || project.name}`}>
                <td>{String(project?.id || "-")}</td>
                <td>{String(project?.name || project?.id || "-")}</td>
                <td>{projectUsageModeLabel(t, usageMode, safeT(t, "common.none", "(aucun)"))}</td>
                <td>{String(project?.code || "-")}</td>
                <td>{Number.isFinite(Number(project?.linkedTasksCount)) ? Number(project.linkedTasksCount) : 0}</td>
                <td>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { ProjectsCatalogTableView };
export default ProjectsCatalogTableView;
