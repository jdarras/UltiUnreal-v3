import { safeT } from "../../../shared/helpers";
import { ProjectOpsSummary } from "./ProjectOpsSummary";

function ProjectActionsRow({
  t,
  project = null,
  opState = {},
  loading = false,
  onSyncProject = null,
  onLoadProjectTemplates = null,
  onLoadProjectTables = null,
  onOpenProjectLinkedTasks = null,
}) {
  return (
    <>
      <div className="uu-row uu-gap-4">
        <button
          type="button"
          className="uu-btn-ghost"
          disabled={loading || typeof onSyncProject !== "function" || opState.syncing}
          onClick={() => {
            void onSyncProject?.(project);
          }}
        >
          {safeT(t, "postprod.projects.action.sync", "Synchroniser")}
        </button>
        <button
          type="button"
          className="uu-btn-ghost"
          disabled={loading || typeof onLoadProjectTemplates !== "function" || opState.loadingTemplates}
          onClick={() => {
            void onLoadProjectTemplates?.(project);
          }}
        >
          {safeT(t, "postprod.projects.action.templates", "Templates")}
        </button>
        <button
          type="button"
          className="uu-btn-ghost"
          disabled={loading || typeof onLoadProjectTables !== "function" || opState.loadingTables}
          onClick={() => {
            void onLoadProjectTables?.(project);
          }}
        >
          {safeT(t, "postprod.projects.action.tables", "Tables datas")}
        </button>
        <button
          type="button"
          className="uu-btn-ghost"
          disabled={typeof onOpenProjectLinkedTasks !== "function"}
          onClick={() => onOpenProjectLinkedTasks?.(project)}
        >
          {safeT(t, "postprod.projects.action.openTasks", "Voir taches liees")}
        </button>
      </div>

      <ProjectOpsSummary t={t} opState={opState} />
    </>
  );
}

export { ProjectActionsRow };
