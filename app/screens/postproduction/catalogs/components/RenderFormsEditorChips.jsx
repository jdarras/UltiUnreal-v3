function RenderFormsEditorChips({
  forms = [],
  selectedFormId = 0,
  onSelectFormId = null,
}) {
  return (
    <div className="uu-row mt-8" style={{ gap: "8px", flexWrap: "wrap" }}>
      {(Array.isArray(forms) ? forms : []).map((form) => {
        const id = Number(form?.id || 0);
        const active = id > 0 && id === Number(selectedFormId || 0);
        return (
          <button
            key={`render-form-chip-${id}`}
            type="button"
            className={`uu-btn ${active ? "prod-toggle-active" : ""}`}
            style={{ borderRadius: "999px", padding: "4px 12px", fontSize: "12px", lineHeight: 1.2 }}
            onClick={() => {
              if (typeof onSelectFormId === "function") {
                onSelectFormId(id);
              }
            }}
          >
            <span>{String(form?.name || form?.id || "-")}</span>
            {id > 0 ? (
              <span style={{ marginLeft: "6px", color: "var(--uu-text-dim)" }}>
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
