import { formatDate, safeT } from "../../../shared/helpers";
import { hubEventKindLabel, hubEventStateLabel } from "./auditUiHelpers";

function AuditHealthEventsCard({
  t,
  healthEventFilter = "all",
  onSetHealthEventFilter = null,
  filteredHealthEvents = [],
}) {
  return (
    <div className="uu-card mt-12">
      <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "8px" }}>
        {safeT(t, "postprod.renders.health.events.title", "Evenements Hub")}
      </h4>
      <div className="uu-row">
        <button
          className={healthEventFilter === "all" ? "uu-btn" : "uu-btn-ghost"}
          type="button"
          onClick={() => onSetHealthEventFilter?.("all")}
        >
          {safeT(t, "postprod.renders.health.events.filter.all", "Tous")}
        </button>
        <button
          className={healthEventFilter === "security" ? "uu-btn" : "uu-btn-ghost"}
          type="button"
          onClick={() => onSetHealthEventFilter?.("security")}
        >
          {safeT(t, "postprod.renders.health.events.filter.security", "Securite")}
        </button>
        <button
          className={healthEventFilter === "broker" ? "uu-btn" : "uu-btn-ghost"}
          type="button"
          onClick={() => onSetHealthEventFilter?.("broker")}
        >
          {safeT(t, "postprod.renders.health.events.filter.broker", "Broker")}
        </button>
        <button
          className={healthEventFilter === "worker" ? "uu-btn" : "uu-btn-ghost"}
          type="button"
          onClick={() => onSetHealthEventFilter?.("worker")}
        >
          {safeT(t, "postprod.renders.health.events.filter.worker", "Station de rendu")}
        </button>
      </div>
      <div className="uu-col mt-12">
        {filteredHealthEvents.length > 0 ? (
          filteredHealthEvents.map((entry) => (
            <div key={`audit-health-event-${entry.id}`} className="uu-muted">
              {safeT(t, "postprod.renders.health.events.item", "{time} - {state} - {detail}", {
                time: formatDate(entry.at),
                state: hubEventStateLabel(t, entry.state),
                detail: (() => {
                  const baseDetail = entry.detail || entry.label || "-";
                  const kindLabel = hubEventKindLabel(t, entry.kind);
                  return kindLabel ? `${kindLabel} - ${baseDetail}` : baseDetail;
                })(),
              })}
            </div>
          ))
        ) : (
          <div className="uu-muted">
            {safeT(t, "postprod.renders.health.events.empty", "Aucun evenement Hub pour le moment.")}
          </div>
        )}
      </div>
    </div>
  );
}

export { AuditHealthEventsCard };

