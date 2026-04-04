import { safeT } from "../../shared/helpers";

function RenderFormsEditorModeBar({
  t,
  mode = "edit",
  onChangeMode = null,
  onBack = null,
}) {
  return (
    <div className="uu-card">
      <div
        className="uu-row"
        style={{
          justifyContent: "flex-end",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
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
            {safeT(t, "postprod.data.forms.backToList", "Retour liste")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { RenderFormsEditorModeBar };
