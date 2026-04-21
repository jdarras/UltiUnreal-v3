import { safeT } from "../../shared/helpers";

function RenderFormsEditorModeBar({
  t,
  mode = "edit",
  onChangeMode = null,
  onBack = null,
  selectedForm = null,
  metaActive = true,
  onSetMetaActive = null,
  onSaveMeta = null,
  isAvailabilityBlocked = false,
}) {
  return (
    <div className="uu-card">
      <div
        className="uu-row"
        style={{
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", minHeight: 32 }}>
          {selectedForm ? (
            <label
              className="uu-check"
              style={isAvailabilityBlocked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
            >
              <input
                type="checkbox"
                checked={metaActive && !isAvailabilityBlocked}
                disabled={isAvailabilityBlocked}
                onChange={(e) => {
                  if (isAvailabilityBlocked) return;
                  const next = e.target.checked === true;
                  onSetMetaActive?.(next);
                  void onSaveMeta?.({ isActive: next }, { importIfEmpty: false });
                }}
              />
              {safeT(t, "postprod.data.forms.active", "Disponible")}
            </label>
          ) : null}
        </div>
        <div className="uu-row" style={{ gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="uu-row" role="group" aria-label={safeT(t, "postprod.data.forms.mode", "Mode formulaire")} style={{ gap: "8px" }}>
            <button
              type="button"
              className={`uu-btn ${mode === "edit" ? "prod-toggle-active" : ""}`}
              onClick={() => {
                if (typeof onChangeMode === "function") {
                  onChangeMode("edit");
                }
              }}
            >
              {safeT(t, "postprod.data.forms.modeEdit", "Edition")}
            </button>
            <button
              type="button"
              className={`uu-btn ${mode === "live" ? "prod-toggle-active" : ""}`}
              onClick={() => {
                if (typeof onChangeMode === "function") {
                  onChangeMode("live");
                }
              }}
            >
              {safeT(t, "postprod.data.forms.modeLive", "Live")}
            </button>
          </div>
          <button
            type="button"
            className="uu-btn-ghost"
            onClick={() => {
              if (typeof onBack === "function") {
                onBack();
              }
            }}
          >
            {safeT(t, "postprod.data.forms.backToList", "Retour")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { RenderFormsEditorModeBar };
