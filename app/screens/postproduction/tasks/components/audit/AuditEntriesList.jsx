import { formatDate, safeT } from "../../../shared/helpers";
import {
  activityActionTypeFromAction,
  activityActionTypeLabel,
  activityTypeChipLevel,
} from "../../../users/shared/activityHelpers";

function AuditEntriesList({
  t,
  loading = false,
  error = "",
  entries = [],
  onOpenActivityTarget = null,
}) {
  const extractDetailLabel = (detailRaw, label) => {
    const detail = String(detailRaw || "").trim();
    const normalizedLabel = String(label || "").trim();
    if (!detail || !normalizedLabel) return "";
    const match = detail.match(new RegExp(`${normalizedLabel}\\s*:\\s*([^|]+)`, "i"));
    return match ? String(match[1] || "").trim() : "";
  };

  const buildActivityDetailTarget = (entry, actionType) => {
    const scopeId = String(entry?.scopeId || "").trim();
    const taskIdRaw = Number(entry?.taskId || 0);
    const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
    const renderIdRaw = Number(entry?.renderId || 0);
    const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
    const projectRefs = Array.isArray(entry?.projectRefs) ? entry.projectRefs.filter(Boolean) : [];
    const detail = String(entry?.detail || "").trim();
    const toStatus = String(entry?.toStatus || "").trim();

    if (actionType === "project") {
      const projectRef = String(projectRefs[0] || scopeId || "").trim();
      const projectName = extractDetailLabel(detail, "Projet");
      const label = projectName
        ? `${projectName}${projectRef && projectRef !== projectName ? ` [${projectRef}]` : ""}`
        : (projectRef ? `Projet [${projectRef}]` : safeT(t, "postprod.audit.item.project", "Projet"));
      return {
        label,
        target: { type: "project", projectRef: projectRef || "" },
      };
    }

    if (actionType === "form") {
      const formName = extractDetailLabel(detail, "Formulaire")
        || extractDetailLabel(detail, "Form")
        || safeT(t, "postprod.audit.item.form", "Formulaire");
      const formId = scopeId ? `#${scopeId}` : "";
      return {
        label: `${formName}${formId ? ` ${formId}` : ""}`,
        target: { type: "form", formId: scopeId || "" },
      };
    }

    if (actionType === "task") {
      const taskName = extractDetailLabel(detail, "Tache")
        || extractDetailLabel(detail, "Task")
        || safeT(t, "postprod.audit.item.task", "Tache");
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
        : (renderId > 0 ? `Rendu #${renderId}` : safeT(t, "postprod.audit.item.validation", "Validation"));
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

    if (actionType === "user") {
      const username = extractDetailLabel(detail, "Utilisateur")
        || extractDetailLabel(detail, "User")
        || extractDetailLabel(detail, "Username")
        || extractDetailLabel(detail, "DisplayName")
        || safeT(t, "postprod.audit.item.user", "Utilisateur");
      const userRef = scopeId ? `#${scopeId}` : "";
      return {
        label: `${username}${userRef ? ` ${userRef}` : ""}`,
        target: null,
      };
    }

    if (actionType === "profile") {
      const roleName = extractDetailLabel(detail, "Role")
        || extractDetailLabel(detail, "Profil")
        || extractDetailLabel(detail, "Profile")
        || safeT(t, "postprod.audit.item.profile", "Profil");
      const roleRef = scopeId ? `[${scopeId}]` : "";
      return {
        label: `${roleName}${roleRef ? ` ${roleRef}` : ""}`,
        target: null,
      };
    }

    return {
      label: detail || "-",
      target: null,
    };
  };

  const rows = (Array.isArray(entries) ? entries : [])
    .map((entry) => (entry && typeof entry === "object" ? entry : null))
    .filter(Boolean)
    .filter((entry) => activityActionTypeFromAction(entry?.action, entry) !== "other");

  if (loading) {
    return <div className="uu-muted mt-12">{safeT(t, "postprod.audit.loading", "Chargement de l'historique...")}</div>;
  }
  if (error) {
    return <div className="uu-msg error mt-12">{error}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="uu-muted mt-12">
        {safeT(t, "postprod.audit.emptyBusiness", "Aucune action metier recente.")}
      </div>
    );
  }

  return (
    <table className="uu-table" style={{ width: "100%", tableLayout: "fixed", marginTop: "12px" }}>
      <thead>
        <tr>
          <th style={{ width: "200px", textAlign: "left" }}>
            {safeT(t, "postprod.audit.table.dateTime", "Date et heure")}
          </th>
          <th style={{ width: "220px", textAlign: "left" }}>
            {safeT(t, "postprod.audit.table.actionType", "Type action")}
          </th>
          <th style={{ textAlign: "left" }}>
            {safeT(t, "postprod.audit.table.detail", "Detail")}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => {
          const rowId = Number(entry?.id || 0);
          const actionType = activityActionTypeFromAction(entry?.action, entry);
          const actionTypeText = activityActionTypeLabel(t, actionType);
          const detailLink = buildActivityDetailTarget(entry, actionType);
          const canOpenDetail = detailLink?.target && typeof onOpenActivityTarget === "function";
          return (
            <tr key={`audit-entry-${rowId > 0 ? rowId : `${String(entry?.createdAt || "")}-${String(entry?.action || "")}`}`}>
              <td style={{ paddingTop: "6px", paddingBottom: "6px", verticalAlign: "top" }}>
                {formatDate(entry?.createdAt)}
              </td>
              <td style={{ paddingTop: "6px", paddingBottom: "6px", verticalAlign: "top" }}>
                <span
                  className={`uu-chip ${activityTypeChipLevel(actionType)} chip-on`}
                  style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", lineHeight: 1.2 }}
                >
                  {actionTypeText}
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

export { AuditEntriesList };
