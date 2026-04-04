import { safeT } from "../../shared/helpers";

function RenderFormsLivePreviewCard({
  t,
  selectedForm = null,
  fields = [],
  liveValues = {},
  onSetLiveValues = null,
  normalizeVectorDefaultForInput = null,
  normalizeLiveOptionList = null,
}) {
  const sourceFields = Array.isArray(fields) ? fields : [];

  return (
    <div className="uu-card mt-12">
      <div style={{ fontWeight: 600 }}>{safeT(t, "postprod.data.forms.livePreview", "Apercu live du formulaire")}</div>
      {!selectedForm ? (
        <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.empty", "Aucun formulaire pour ce projet.")}</div>
      ) : sourceFields.length <= 0 ? (
        <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.noFields", "Aucun champ defini pour ce formulaire.")}</div>
      ) : (
        <div className="uu-grid-2 mt-12">
          {sourceFields
            .filter((field) => field?.isVisible !== false)
            .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
            .map((field, index) => {
              const key = String(field?.fieldKey || `field-${index}`);
              const label = String(field?.fieldLabel || key);
              const rawInputKind = String(field?.inputKind || "text").trim().toLowerCase();
              const valueType = String(field?.valueType || "").trim().toLowerCase();
              const inputKind = (
                rawInputKind === "text" && valueType === "integer"
                  ? "integer"
                  : (
                    rawInputKind === "text" && (valueType === "vector2" || valueType === "vector3")
                      ? valueType
                      : rawInputKind
                  )
              );
              const currentValue = liveValues[key] ?? field?.defaultValue ?? "";
              const setValue = (next) => {
                if (typeof onSetLiveValues === "function") {
                  onSetLiveValues((prev) => ({ ...(prev || {}), [key]: next }));
                }
              };

              if (inputKind === "multiline") {
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <textarea className="uu-input" rows={4} value={String(currentValue ?? "")} onChange={(e) => setValue(e.target.value)} />
                  </div>
                );
              }
              if (inputKind === "number") {
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <input className="uu-input" type="number" value={Number.isFinite(Number(currentValue)) ? Number(currentValue) : ""} onChange={(e) => setValue(e.target.value)} />
                  </div>
                );
              }
              if (inputKind === "integer") {
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <input
                      className="uu-input"
                      type="number"
                      step="1"
                      value={Number.isFinite(Number(currentValue)) ? Math.trunc(Number(currentValue)) : ""}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                );
              }
              if (inputKind === "vector2") {
                const vector = typeof normalizeVectorDefaultForInput === "function"
                  ? normalizeVectorDefaultForInput(currentValue, 2)
                  : { x: "0", y: "0" };
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <div className="uu-row uu-gap-4" style={{ flexWrap: "nowrap", alignItems: "center" }}>
                      <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>X</span>
                      <input
                        className="uu-input"
                        type="number"
                        value={vector.x}
                        style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
                        onChange={(e) => setValue({ x: e.target.value, y: vector.y })}
                      />
                      <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>Y</span>
                      <input
                        className="uu-input"
                        type="number"
                        value={vector.y}
                        style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
                        onChange={(e) => setValue({ x: vector.x, y: e.target.value })}
                      />
                    </div>
                  </div>
                );
              }
              if (inputKind === "vector3") {
                const vector = typeof normalizeVectorDefaultForInput === "function"
                  ? normalizeVectorDefaultForInput(currentValue, 3)
                  : { x: "0", y: "0", z: "0" };
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <div className="uu-row uu-gap-4" style={{ flexWrap: "nowrap", alignItems: "center" }}>
                      <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>X</span>
                      <input
                        className="uu-input"
                        type="number"
                        value={vector.x}
                        style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
                        onChange={(e) => setValue({ x: e.target.value, y: vector.y, z: vector.z })}
                      />
                      <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>Y</span>
                      <input
                        className="uu-input"
                        type="number"
                        value={vector.y}
                        style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
                        onChange={(e) => setValue({ x: vector.x, y: e.target.value, z: vector.z })}
                      />
                      <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>Z</span>
                      <input
                        className="uu-input"
                        type="number"
                        value={vector.z}
                        style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
                        onChange={(e) => setValue({ x: vector.x, y: vector.y, z: e.target.value })}
                      />
                    </div>
                  </div>
                );
              }
              if (inputKind === "checkbox") {
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-check">
                      <input type="checkbox" checked={currentValue === true} onChange={(e) => setValue(e.target.checked)} />
                      {label}
                    </label>
                  </div>
                );
              }
              if (inputKind === "color") {
                const colorValue = String(currentValue || "").trim();
                const safeColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorValue) ? colorValue : "#ffffff";
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <input className="uu-input" type="color" value={safeColor} onChange={(e) => setValue(e.target.value)} />
                  </div>
                );
              }
              if (inputKind === "select") {
                const options = typeof normalizeLiveOptionList === "function" ? normalizeLiveOptionList(field) : [];
                return (
                  <div key={`render-form-live-${key}`} className="uu-grid-field">
                    <label className="uu-label">{label}</label>
                    <select className="uu-input" value={String(currentValue || "")} onChange={(e) => setValue(e.target.value)}>
                      <option value="">{safeT(t, "common.select", "Selectionner")}</option>
                      {options.map((option) => (
                        <option key={`render-form-live-${key}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={`render-form-live-${key}`} className="uu-grid-field">
                  <label className="uu-label">{label}</label>
                  <input
                    className="uu-input"
                    type="text"
                    value={String(currentValue ?? "")}
                    placeholder={String(field?.placeholder || "")}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export { RenderFormsLivePreviewCard };
