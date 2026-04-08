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
    <table className="uu-table" style={{ width: "100%", tableLayout: "fixed", marginTop: "8px" }}>
      <thead>
        <tr>
          <th style={{ width: "200px", textAlign: "left" }}>
            {safeT(t, "postprod.users.activity.table.dateTime", "Date et heure")}
          </th>
          <th style={{ width: "220px", textAlign: "left" }}>
            {safeT(t, "postprod.users.activity.table.actionType", "Type d'action")}
          </th>
          <th style={{ textAlign: "left" }}>
            {safeT(t, "postprod.users.activity.table.detailProject", "Detail")}
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredEditingActivities.map((activity) => {
          const rowId = Number(activity?.id || 0);
          const actionType = activityActionTypeFromAction(activity?.action, activity);
          const actionTypeLabel = activityActionTypeLabel(t, actionType);
          const detailLink = buildActivityDetailTarget(activity, actionType);
          const canOpenDetail = detailLink?.target && typeof onOpenActivityTarget === "function";
          return (
            <tr key={`activity-${rowId > 0 ? rowId : `${String(activity?.createdAt || "")}-${String(activity?.action || "")}`}`}>
              <td style={{ paddingTop: "6px", paddingBottom: "6px", verticalAlign: "top" }}>
                {formatDate(activity?.createdAt)}
              </td>
              <td style={{ paddingTop: "6px", paddingBottom: "6px", verticalAlign: "top" }}>
                <span className={`uu-chip ${activityTypeChipLevel(actionType)} chip-on`}
                  style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                  {actionTypeLabel}
                </span>
              </td>
              <td style={{ overflowWrap: "anywhere", lineHeight: 1.35, paddingTop: "6px", paddingBottom: "6px", verticalAlign: "top" }}>
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
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export { UserActivityList };
