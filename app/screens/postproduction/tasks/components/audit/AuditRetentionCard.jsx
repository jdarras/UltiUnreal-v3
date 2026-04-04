import { formatDate, safeT } from "../../../shared/helpers";
import { formatRetentionDurationMs } from "./auditUiHelpers";

function AuditRetentionCard({
  t,
  normalizedRenderHealthMaintenance = null,
  renderHealthAuditMaintenanceLoading = false,
  renderHealthAuditMaintenanceError = "",
  renderHealthAuditPurgeBusy = false,
  renderHealthAuditPurgeError = "",
  renderHealthAuditLastPurge = null,
  onPurgeNow = null,
}) {
  return (
    <div className="uu-card mt-12">
      <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h4 className="uu-h3" style={{ marginBottom: "8px" }}>
          {safeT(t, "postprod.audit.retention.title", "Retention evenements Hub")}
        </h4>
        <div className="uu-row">
          <button
            className="uu-btn"
            type="button"
            disabled={
              renderHealthAuditMaintenanceLoading ||
              renderHealthAuditPurgeBusy ||
              normalizedRenderHealthMaintenance?.enabled === false
            }
            onClick={() => onPurgeNow?.()}
          >
            {renderHealthAuditPurgeBusy
              ? safeT(t, "postprod.audit.retention.purgeBusy", "Purge en cours...")
              : safeT(t, "postprod.audit.retention.purgeNow", "Purger maintenant")}
          </button>
        </div>
      </div>
      {renderHealthAuditMaintenanceError ? <div className="uu-msg error mt-8">{renderHealthAuditMaintenanceError}</div> : null}
      {renderHealthAuditPurgeError ? <div className="uu-msg error mt-8">{renderHealthAuditPurgeError}</div> : null}
      {normalizedRenderHealthMaintenance ? (
        <div className="uu-grid-3 mt-8">
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.enabled", "Active: {value}", {
              value: normalizedRenderHealthMaintenance.enabled === false ? "non" : "oui",
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.days", "Retention: {value} jours", {
              value: Math.max(0, Math.trunc(Number(normalizedRenderHealthMaintenance.retentionDays || 0))),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.interval", "Intervalle purge: {value}", {
              value: formatRetentionDurationMs(normalizedRenderHealthMaintenance.cleanupIntervalMs),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.count", "Evenements stockes: {value}", {
              value: Math.max(0, Math.trunc(Number(normalizedRenderHealthMaintenance.currentCount || 0))),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.next", "Prochaine purge auto: {value}", {
              value: formatDate(normalizedRenderHealthMaintenance.nextCleanupAt),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.lastRun", "Derniere purge: {value}", {
              value: formatDate(normalizedRenderHealthMaintenance.lastRunAt),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.lastDeleted", "Dernier volume purge: {value}", {
              value: Math.max(0, Math.trunc(Number(normalizedRenderHealthMaintenance.lastDeleted || 0))),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.action", "Action: {value}", {
              value: String(normalizedRenderHealthMaintenance.action || "-"),
            })}
          </div>
          <div className="uu-muted">
            {safeT(t, "postprod.audit.retention.serverNow", "Horloge serveur: {value}", {
              value: formatDate(normalizedRenderHealthMaintenance.now),
            })}
          </div>
        </div>
      ) : (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.audit.retention.empty", "Aucune politique de retention disponible.")}
        </div>
      )}
      {renderHealthAuditLastPurge && typeof renderHealthAuditLastPurge === "object" ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.audit.retention.lastPurgeResult", "Purge manuelle: {count} supprimes a {at}", {
            count: Math.max(0, Math.trunc(Number(renderHealthAuditLastPurge.deleted || 0))),
            at: formatDate(renderHealthAuditLastPurge.at),
          })}
        </div>
      ) : null}
    </div>
  );
}

export { AuditRetentionCard };
