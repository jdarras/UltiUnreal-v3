import { safeT } from "../../shared/helpers";
import { ResourceThumbImage } from "./ResourceThumbImage";

const RESOURCES_LIST_CONTAINER_STYLE = { maxHeight: "520px", overflow: "auto" };
const RESOURCES_LIST_THUMB_HEADER_STYLE = { width: "80px", textAlign: "left" };
const RESOURCES_LIST_HEADER_STYLE = { textAlign: "left" };
const RESOURCES_GRID_BASE_STYLE = {
  display: "grid",
  gap: "12px",
  maxHeight: "520px",
  overflow: "auto",
  paddingRight: "4px",
};
const RESOURCES_GRID_THUMBS_TEMPLATE = "repeat(auto-fill, minmax(180px, 1fr))";
const RESOURCES_GRID_CARDS_TEMPLATE = "repeat(auto-fill, minmax(280px, 1fr))";
const RESOURCES_CARD_BASE_STYLE = { textAlign: "left" };
const RESOURCES_CARD_SELECTED_STYLE = {
  borderColor: "var(--uu-color-accent)",
  boxShadow: "0 0 0 1px color-mix(in srgb, var(--uu-color-accent) 65%, transparent)",
};
const RESOURCES_CARD_TITLE_STYLE = { fontWeight: 600 };

function buildResourcesListRowStyle(isSelected) {
  return {
    cursor: "pointer",
    background: isSelected ? "rgba(38, 118, 242, 0.15)" : "transparent",
  };
}

function buildResourcesGridStyle(viewMode) {
  return {
    ...RESOURCES_GRID_BASE_STYLE,
    gridTemplateColumns: viewMode === "thumbs"
      ? RESOURCES_GRID_THUMBS_TEMPLATE
      : RESOURCES_GRID_CARDS_TEMPLATE,
  };
}

function buildResourcesCardStyle(isSelected) {
  return isSelected ? { ...RESOURCES_CARD_BASE_STYLE, ...RESOURCES_CARD_SELECTED_STYLE } : RESOURCES_CARD_BASE_STYLE;
}

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
      <div style={RESOURCES_LIST_CONTAINER_STYLE}>
        <table className="uu-table">
          <thead>
            <tr>
              <th style={RESOURCES_LIST_THUMB_HEADER_STYLE}>
                {safeT(t, "projects.table.thumbnail", "Miniature")}
              </th>
              <th style={RESOURCES_LIST_HEADER_STYLE}>
                {safeT(t, "projects.table.name", "Nom")}
              </th>
              <th style={RESOURCES_LIST_HEADER_STYLE}>
                {safeT(t, "resources.type", "Type")}
              </th>
              <th style={RESOURCES_LIST_HEADER_STYLE}>
                {safeT(t, "postprod.resources.table.linkedTasks", "Taches liees")}
              </th>
              <th style={RESOURCES_LIST_HEADER_STYLE}>
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
                  style={buildResourcesListRowStyle(isSelected)}
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
      style={buildResourcesGridStyle(viewMode)}
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
            style={buildResourcesCardStyle(isSelected)}
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
            <div className="mt-8" style={RESOURCES_CARD_TITLE_STYLE}>{title}</div>
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
