const FORMS_EDITOR_CHIPS_ROW_STYLE = { gap: "8px", flexWrap: "wrap" };
const FORMS_EDITOR_CHIP_BUTTON_STYLE = { borderRadius: "999px", padding: "4px 12px", fontSize: "12px", lineHeight: 1.2 };
const FORMS_EDITOR_CHIP_ID_STYLE = { marginLeft: "6px", color: "var(--uu-text-dim)" };

function RenderFormsEditorChips({
  forms = [],
  selectedFormId = 0,
  onSelectFormId = null,
}) {
  return (
    <div className="uu-row mt-8" style={FORMS_EDITOR_CHIPS_ROW_STYLE}>
      {(Array.isArray(forms) ? forms : []).map((form) => {
        const id = Number(form?.id || 0);
        const active = id > 0 && id === Number(selectedFormId || 0);
        return (
          <button
            key={`render-form-chip-${id}`}
            type="button"
            className={`uu-btn ${active ? "prod-toggle-active" : ""}`}
            style={FORMS_EDITOR_CHIP_BUTTON_STYLE}
            onClick={() => {
              if (typeof onSelectFormId === "function") {
                onSelectFormId(id);
              }
            }}
          >
            <span>{String(form?.name || form?.id || "-")}</span>
            {id > 0 ? (
              <span style={FORMS_EDITOR_CHIP_ID_STYLE}>
                #{id}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export { RenderFormsEditorChips };
