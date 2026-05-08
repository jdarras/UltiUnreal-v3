import { activityActionLabel, formatDate, safeT } from "../../../shared/helpers";
import {
  activityActionTypeFromAction,
  activityActionTypeLabel,
  activityTypeChipLevel,
} from "../../../users/shared/activityHelpers";

function entryLevel(entry) {
  const chipLevel = activityTypeChipLevel(activityActionTypeFromAction(entry?.action, entry));
  if (chipLevel === "lvl-success") return "success";
  if (chipLevel === "lvl-warn") return "warn";
  if (chipLevel === "lvl-error") return "error";
  if (chipLevel === "lvl-debug") return "debug";
  return "info";
}

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

  const compactDetail = (detailRaw) =>
    String(detailRaw || "")
      .replace(/\b(?:Scope|Contexte)\s*:\s*[^|]+/gi, "")
      .split("|")
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" | ");

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
      return { label, target: { type: "project", projectRef: projectRef || "" } };
    }
    if (actionType === "form") {
      const formName = extractDetailLabel(detail, "Formulaire")
        || extractDetailLabel(detail, "Form")
        || safeT(t, "postprod.audit.item.form", "Formulaire");
      const formId = scopeId ? `#${scopeId}` : "";
      return { label: `${formName}${formId ? ` ${formId}` : ""}`, target: { type: "form", formId: scopeId || "" } };
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
        target: { type: "validation", renderId: renderId > 0 ? renderId : "", taskId: taskId > 0 ? taskId : "" },
      };
    }
    if (actionType === "render") {
      const workerKey = extractDetailLabel(detail, "Worker rendu")
        || extractDetailLabel(detail, "Worker")
        || extractDetailLabel(detail, "workerKey");
      const workerAptitude = extractDetailLabel(detail, "Disponibilite worker")
        || extractDetailLabel(detail, "Aptitude worker")
        || extractDetailLabel(detail, "Resultat");
      const renderName = extractDetailLabel(detail, "Rendu") || "";
      if (workerKey || workerAptitude) {
        const workerLabel = workerKey || safeT(t, "postprod.audit.item.worker", "Machine");
        const aptitudeNormalized = (() => {
          const v = String(workerAptitude || "").trim().toLowerCase();
          if (v === "activee") return "Activée";
          if (v === "desactivee") return "Désactivée";
          return workerAptitude;
        })();
        const statusLabel = aptitudeNormalized ? ` — ${aptitudeNormalized}` : "";
        return { label: `${workerLabel}${statusLabel}`.trim(), target: null };
      }
      if (renderName) {
        return {
          label: `${safeT(t, "postprod.audit.item.render", "Rendu")}: ${renderName}`,
          target: null,
        };
      }
    }
    if (actionType === "user") {
      const username = extractDetailLabel(detail, "Utilisateur")
        || extractDetailLabel(detail, "User")
        || extractDetailLabel(detail, "Username")
        || extractDetailLabel(detail, "DisplayName")
        || safeT(t, "postprod.audit.item.user", "Utilisateur");
      const userRef = scopeId ? `#${scopeId}` : "";
      return { label: `${username}${userRef ? ` ${userRef}` : ""}`, target: null };
    }
    if (actionType === "profile") {
      const roleName = extractDetailLabel(detail, "Role")
        || extractDetailLabel(detail, "Profil")
        || extractDetailLabel(detail, "Profile")
        || safeT(t, "postprod.audit.item.profile", "Profil");
      const roleRef = scopeId ? `[${scopeId}]` : "";
      return { label: `${roleName}${roleRef ? ` ${roleRef}` : ""}`, target: null };
    }
    return { label: compactDetail(detail) || activityActionLabel(entry) || "-", target: null };
  };

  const rows = (Array.isArray(entries) ? entries : [])
    .map((entry) => (entry && typeof entry === "object" ? entry : null))
    .filter(Boolean);

  if (loading) {
    return <div className="uu-muted mt-12">{safeT(t, "postprod.audit.loading", "Chargement de l'historique...")}</div>;
  }
  if (error) {
    return <div className="uu-msg error mt-12">{error}</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="uu-muted mt-12">
        {safeT(t, "postprod.audit.empty", "Aucun log.")}
      </div>
    );
  }

  return (
    <div className="log-list" style={{ marginTop: "8px" }}>
      {rows.map((entry) => {
        const rowId = Number(entry?.id || 0);
        const actionType = activityActionTypeFromAction(entry?.action, entry);
        const actionTypeText = activityActionTypeLabel(t, actionType);
        const actionLabel = activityActionLabel(entry);
        const level = entryLevel(entry);
        const detailLink = buildActivityDetailTarget(entry, actionType);
        const canOpenDetail = detailLink?.target && typeof onOpenActivityTarget === "function";
        const key = rowId > 0
          ? `audit-${rowId}`
          : `audit-${String(entry?.createdAt || "")}-${String(entry?.action || "")}`;
        return (
          <div key={key} className={`log-row lvl-${level}`}>
            <div className="log-meta">
              <span className="log-ts">{formatDate(entry?.createdAt)}</span>
              <span className={`log-src ${activityTypeChipLevel(actionType)}`}>{actionTypeText}</span>
              {actionLabel ? <span className="log-action">{actionLabel}</span> : null}
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

export { AuditEntriesList };
