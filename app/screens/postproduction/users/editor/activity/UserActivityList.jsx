import {
  formatDate,
  safeT,
} from "../../../shared/helpers";
import {
  activityActionTypeFromAction,
  activityActionTypeLabel,
  activityTypeChipLevel,
} from "../../userSharedHelpers";

function UserActivityList({
  t,
  filteredEditingActivities = [],
  onOpenActivityTarget = null,
}) {
  if (filteredEditingActivities.length === 0) {
    return (
      <div className="uu-muted">
        {safeT(t, "postprod.users.activity.empty", "Aucune action recente.")}
      </div>
    );
  }

  const extractDetailLabel = (detailRaw, label) => {
    const detail = String(detailRaw || "").trim();
    const normalizedLabel = String(label || "").trim();
    if (!detail || !normalizedLabel) return "";
    const match = detail.match(new RegExp(`${normalizedLabel}\\s*:\\s*([^|]+)`, "i"));
    return match ? String(match[1] || "").trim() : "";
  };

  const buildActivityDetailTarget = (activity, actionType) => {
    const scopeId = String(activity?.scopeId || "").trim();
    const taskIdRaw = Number(activity?.taskId || 0);
    const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
    const renderIdRaw = Number(activity?.renderId || 0);
    const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
    const projectRefs = Array.isArray(activity?.projectRefs) ? activity.projectRefs.filter(Boolean) : [];
    const detail = String(activity?.detail || "").trim();
    const toStatus = String(activity?.toStatus || "").trim();

    if (actionType === "project") {
      const projectRef = String(projectRefs[0] || scopeId || "").trim();
      const projectName = extractDetailLabel(detail, "Projet");
      const label = projectName
        ? `${projectName}${projectRef && projectRef !== projectName ? ` [${projectRef}]` : ""}`
        : (projectRef ? `Projet [${projectRef}]` : safeT(t, "postprod.users.activity.item.project", "Projet"));
      return {
        label,
        target: { type: "project", projectRef: projectRef || "" },
      };
    }

    if (actionType === "form") {
      const formName = extractDetailLabel(detail, "Formulaire")
        || extractDetailLabel(detail, "Form")
        || safeT(t, "postprod.users.activity.item.form", "Formulaire");
      const formId = scopeId ? `#${scopeId}` : "";
      return {
        label: `${formName}${formId ? ` ${formId}` : ""}`,
        target: { type: "form", formId: scopeId || "" },
      };
    }

    if (actionType === "task") {
      const taskName = extractDetailLabel(detail, "Tache")
        || extractDetailLabel(detail, "Task")
        || safeT(t, "postprod.users.activity.item.task", "Tache");
      const taskIdLabel = taskId > 0 ? `#${taskId}` : (scopeId ? `#${scopeId}` : "");
      return {
        label: `${taskName}${taskIdLabel ? ` ${taskIdLabel}` : ""}`,
        target: { type: "task", taskId: taskId > 0 ? taskId : (scopeId || "") },
      };
    }

    if (actionType === "validation") {
      const taskName = extractDetailLabel(detail, "Tache") || extractDetailLabel(detail, "Task");
      const taskIdLabel = taskId > 0 ? `#${taskId}` : "";
      const base = taskName
        ? `${taskName}${taskIdLabel ? ` ${taskIdLabel}` : ""}`
        : (renderId > 0 ? `Rendu #${renderId}` : safeT(t, "postprod.users.activity.item.validation", "Validation"));
      const statusPart = toStatus ? ` -> ${toStatus}` : "";
      return {
        label: `${base}${statusPart}`,
        target: {
          type: "validation",
          renderId: renderId > 0 ? renderId : "",
          taskId: taskId > 0 ? taskId : "",
        },
      };
    }

    return {
      label: detail || "-",
      target: null,
    };
  };

  return (
    <div className="log-list" style={{ marginTop: "8px" }}>
      {filteredEditingActivities.map((activity) => {
        const rowId = Number(activity?.id || 0);
        const actionType = activityActionTypeFromAction(activity?.action, activity);
        const actionTypeLabel = activityActionTypeLabel(t, actionType);
        const level = activityTypeChipLevel(actionType).replace("lvl-", "");
        const detailLink = buildActivityDetailTarget(activity, actionType);
        const canOpenDetail = detailLink?.target && typeof onOpenActivityTarget === "function";
        const rawAction = String(activity?.action || "").trim();
        return (
          <div
            key={`activity-${rowId > 0 ? rowId : `${String(activity?.createdAt || "")}-${rawAction}`}`}
            className={`log-row lvl-${level}`}
          >
            <div className="log-meta">
              <span className="log-ts">{formatDate(activity?.createdAt)}</span>
              <span className="log-action">{actionTypeLabel}</span>
              {rawAction ? <span className="log-action">{rawAction}</span> : null}
            </div>
            <div className="log-msg">
              {canOpenDetail ? (
                <button
                  type="button"
                  className="uu-link"
                  onClick={() => onOpenActivityTarget?.(detailLink.target)}
                >
                  {detailLink.label || "-"}
                </button>
              ) : (
                detailLink.label || "-"
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { UserActivityList };
