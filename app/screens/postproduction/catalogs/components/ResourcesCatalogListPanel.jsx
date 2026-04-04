import { safeT } from "../../shared/helpers";
import { ResourceThumbImage } from "./ResourceThumbImage";

function ResourcesCatalogListPanel({
  t,
  viewMode = "thumbs",
  filteredResources = [],
  selectedRef = "",
  onSelectRef = null,
  onOpenLinkedTasks = null,
}) {
  if (viewMode === "list") {
    return (
      <div style={{ maxHeight: "520px", overflow: "auto" }}>
        <table className="uu-table">
          <thead>
            <tr>
              <th style={{ width: "80px", textAlign: "left" }}>
                {safeT(t, "projects.table.thumbnail", "Miniature")}
              </th>
              <th style={{ textAlign: "left" }}>
                {safeT(t, "projects.table.name", "Nom")}
              </th>
              <th style={{ textAlign: "left" }}>
                {safeT(t, "resources.type", "Type")}
              </th>
              <th style={{ textAlign: "left" }}>
                {safeT(t, "postprod.resources.table.linkedTasks", "Taches liees")}
              </th>
              <th style={{ textAlign: "left" }}>
                {safeT(t, "postprod.resources.table.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((entry) => {
              const isSelected = entry.ref === selectedRef;
              return (
                <tr
                  key={`postprod-resource-list-${entry.ref}`}
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "rgba(38, 118, 242, 0.15)" : "transparent",
                  }}
                  onClick={() => onSelectRef?.(entry.ref)}
                >
                  <td>
                    {entry.thumbCandidates.length > 0 ? (
                      <ResourceThumbImage
                        className="uu-resource-list-thumb"
                        candidates={entry.thumbCandidates}
                        alt={entry.title || entry.uid || entry.ref}
                      />
                    ) : (
                      <div className="uu-resource-list-thumb placeholder">No thumb</div>
                    )}
                  </td>
                  <td>{entry.title && entry.uid ? `${entry.title} [${entry.uid}]` : (entry.title || entry.uid || entry.ref)}</td>
                  <td>{entry.type || "-"}</td>
                  <td>{Number.isFinite(Number(entry?.linkedTasksCount)) ? Number(entry.linkedTasksCount) : 0}</td>
                  <td>
                    <button
                      type="button"
                      className="uu-btn-ghost"
                      disabled={typeof onOpenLinkedTasks !== "function"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLinkedTasks?.(entry.ref);
                      }}
                    >
                      {safeT(t, "postprod.resources.action.openTasks", "Voir taches liees")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        maxHeight: "520px",
        overflow: "auto",
        paddingRight: "4px",
        gridTemplateColumns: viewMode === "thumbs"
          ? "repeat(auto-fill, minmax(180px, 1fr))"
          : "repeat(auto-fill, minmax(280px, 1fr))",
      }}
    >
      {filteredResources.map((entry) => {
        const isSelected = entry.ref === selectedRef;
        const title = entry.title || entry.uid || entry.ref;
        return (
          <button
            key={`postprod-resource-grid-${entry.ref}`}
            type="button"
            className="uu-card"
            onClick={() => onSelectRef?.(entry.ref)}
            style={{
              textAlign: "left",
              borderColor: isSelected ? "var(--uu-color-accent)" : undefined,
              boxShadow: isSelected ? "0 0 0 1px color-mix(in srgb, var(--uu-color-accent) 65%, transparent)" : undefined,
            }}
          >
            {entry.thumbCandidates.length > 0 ? (
              <ResourceThumbImage
                className={viewMode === "thumbs" ? "uu-resource-thumb-lg" : "uu-resource-detail-thumb"}
                candidates={entry.thumbCandidates}
                alt={title}
              />
            ) : (
              <div className={`${viewMode === "thumbs" ? "uu-resource-thumb-lg" : "uu-resource-detail-thumb"} placeholder`}>
                No thumbnail
              </div>
            )}
            <div className="mt-8" style={{ fontWeight: 600 }}>{title}</div>
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.resources.meta.type", "Type: {value}", {
                value: entry.type || "-",
              })}
            </div>
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.resources.meta.linkedTasks", "Taches liees: {count}", {
                count: Number.isFinite(Number(entry?.linkedTasksCount)) ? Number(entry.linkedTasksCount) : 0,
              })}
            </div>
            {viewMode === "cards" ? (
              <>
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.resources.meta.uid", "UID: {value}", {
                    value: entry.uid || "-",
                  })}
                </div>
                <div className="uu-muted mt-8">
                  {safeT(t, "postprod.resources.meta.sourcePath", "Chemin source: {value}", {
                    value: entry.sourcePath || "-",
                  })}
                </div>
              </>
            ) : null}
            <div className="uu-row mt-12">
              <button
                type="button"
                className="uu-btn-ghost"
                disabled={typeof onOpenLinkedTasks !== "function"}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLinkedTasks?.(entry.ref);
                }}
              >
                {safeT(t, "postprod.resources.action.openTasks", "Voir taches liees")}
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { ResourcesCatalogListPanel };
export default ResourcesCatalogListPanel;

