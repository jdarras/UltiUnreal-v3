import { safeT } from "../../shared/helpers";

const FIELDS_EDITOR_MODE_TOGGLE_STYLE = { gap: "8px" };

function RenderFormsFieldsEditorModeToggle({
  t,
  fieldsAdvancedMode = false,
  onSetFieldsAdvancedMode = null,
}) {
  return (
    <div
      className="uu-row"
      role="group"
      aria-label={safeT(t, "postprod.data.forms.fieldsMode", "Mode edition des champs")}
      style={FIELDS_EDITOR_MODE_TOGGLE_STYLE}
    >
      <button
        type="button"
        className={`uu-btn ${fieldsAdvancedMode ? "" : "prod-toggle-active"}`}
        onClick={() => {
          if (typeof onSetFieldsAdvancedMode === "function") onSetFieldsAdvancedMode(false);
        }}
      >
        {safeT(t, "postprod.data.forms.fieldsModeVisual", "Visuel")}
      </button>
      <button
        type="button"
        className={`uu-btn ${fieldsAdvancedMode ? "prod-toggle-active" : ""}`}
        onClick={() => {
          if (typeof onSetFieldsAdvancedMode === "function") onSetFieldsAdvancedMode(true);
        }}
      >
        {safeT(t, "postprod.data.forms.fieldsModeJson", "JSON")}
      </button>
    </div>
  );
}

export { RenderFormsFieldsEditorModeToggle };
