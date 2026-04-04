import { activityActionLabel, formatDate, safeT } from "../../../shared/helpers";

function AuditEntriesList({
  t,
  loading = false,
  error = "",
  filteredRows = [],
}) {
  if (loading) {
    return <div className="uu-muted mt-12">{safeT(t, "postprod.audit.loading", "Chargement de l'historique...")}</div>;
  }
  if (error) {
    return <div className="uu-msg error mt-12">{error}</div>;
  }

  return (
    <div className="uu-col mt-12">
      {filteredRows.length === 0 ? (
        <div className="uu-muted">{safeT(t, "postprod.audit.empty", "Aucune entree.")}</div>
      ) : (
        filteredRows.map((entry, index) => {
          const id = Number(entry?.id || 0);
          const actorUserId = Number(entry?.actorUserId || 0);
          const actorUsername = String(entry?.actorUsername || "").trim();
          const action = String(entry?.action || "").trim();
          const scopeType = String(entry?.scopeType || "").trim();
          const scopeId = String(entry?.scopeId || "").trim();
          const projectRefs = Array.isArray(entry?.projectRefs) ? entry.projectRefs : [];
          const payload = entry?.payload && typeof entry.payload === "object" ? entry.payload : {};
          const payloadPretty = JSON.stringify(payload, null, 2);

          return (
            <div
              key={`audit-entry-${id || `${String(entry?.createdAt || "").trim()}-${String(entry?.action || "").trim()}-${index}`}`}
              className="uu-card"
            >
              <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>{activityActionLabel({ action })}</div>
                <span className="uu-muted">{formatDate(entry?.createdAt)}</span>
              </div>

              <div className="uu-row mt-8">
                <span className="uu-muted">
                  {safeT(t, "postprod.audit.meta.actor", "Acteur: {value}", {
                    value: actorUsername || (actorUserId > 0 ? `#${actorUserId}` : "-"),
                  })}
                </span>
                <span className="uu-muted">
                  {safeT(t, "postprod.audit.meta.scope", "Scope: {type} / {id}", {
                    type: scopeType || "-",
                    id: scopeId || "-",
                  })}
                </span>
              </div>

              {String(entry?.fromStatus || "").trim() || String(entry?.toStatus || "").trim() ? (
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.audit.meta.transition", "Transition: {from} -> {to}", {
                    from: String(entry?.fromStatus || "").trim() || "-",
                    to: String(entry?.toStatus || "").trim() || "-",
                  })}
                </div>
              ) : null}

              {projectRefs.length > 0 ? (
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.audit.meta.projects", "Projets: {value}", {
                    value: projectRefs.join(", "),
                  })}
                </div>
              ) : null}

              {String(entry?.comment || "").trim() ? (
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.audit.meta.comment", "Commentaire: {value}", {
                    value: String(entry?.comment || "").trim(),
                  })}
                </div>
              ) : null}

              <details className="mt-8">
                <summary>{safeT(t, "postprod.audit.payload.toggle", "Payload JSON")}</summary>
                <pre
                  style={{
                    margin: "8px 0 0 0",
                    padding: "8px",
                    border: "1px solid var(--uu-border, #ddd)",
                    borderRadius: "8px",
                    overflowX: "auto",
                    maxHeight: "240px",
                  }}
                >
                  {payloadPretty}
                </pre>
              </details>
            </div>
          );
        })
      )}
    </div>
  );
}

export { AuditEntriesList };
