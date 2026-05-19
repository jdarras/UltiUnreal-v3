import { safeT } from "../../../shared/helpers";
import { resolveLiveFieldInputKind, resolveSafeColorValue } from "./renderFormsLiveFieldHelpers";

const LIVE_VECTOR_ROW_STYLE = { flexWrap: "nowrap", alignItems: "center" };
const LIVE_VECTOR_AXIS_LABEL_STYLE = { minWidth: "12px", textAlign: "right" };
const LIVE_VECTOR_NUMBER_INPUT_STYLE = { width: "84px", minWidth: "84px", maxWidth: "84px" };

function VectorInput2({ vector, onChange = null }) {
  return (
    <div className="uu-row uu-gap-4" style={LIVE_VECTOR_ROW_STYLE}>
      <span className="uu-muted" style={LIVE_VECTOR_AXIS_LABEL_STYLE}>X</span>
      <input
        className="uu-input"
        type="number"
        value={vector.x}
        style={LIVE_VECTOR_NUMBER_INPUT_STYLE}
        onChange={(e) => {
          if (typeof onChange === "function") onChange({ x: e.target.value, y: vector.y });
        }}
      />
      <span className="uu-muted" style={LIVE_VECTOR_AXIS_LABEL_STYLE}>Y</span>
      <input
        className="uu-input"
        type="number"
        value={vector.y}
        style={LIVE_VECTOR_NUMBER_INPUT_STYLE}
        onChange={(e) => {
          if (typeof onChange === "function") onChange({ x: vector.x, y: e.target.value });
        }}
      />
    </div>
  );
}

function VectorInput3({ vector, onChange = null }) {
  return (
    <div className="uu-row uu-gap-4" style={LIVE_VECTOR_ROW_STYLE}>
      <span className="uu-muted" style={LIVE_VECTOR_AXIS_LABEL_STYLE}>X</span>
      <input
        className="uu-input"
        type="number"
        value={vector.x}
        style={LIVE_VECTOR_NUMBER_INPUT_STYLE}
        onChange={(e) => {
          if (typeof onChange === "function") onChange({ x: e.target.value, y: vector.y, z: vector.z });
        }}
      />
      <span className="uu-muted" style={LIVE_VECTOR_AXIS_LABEL_STYLE}>Y</span>
      <input
        className="uu-input"
        type="number"
        value={vector.y}
        style={LIVE_VECTOR_NUMBER_INPUT_STYLE}
        onChange={(e) => {
          if (typeof onChange === "function") onChange({ x: vector.x, y: e.target.value, z: vector.z });
        }}
      />
      <span className="uu-muted" style={LIVE_VECTOR_AXIS_LABEL_STYLE}>Z</span>
      <input
        className="uu-input"
        type="number"
        value={vector.z}
        style={LIVE_VECTOR_NUMBER_INPUT_STYLE}
        onChange={(e) => {
          if (typeof onChange === "function") onChange({ x: vector.x, y: vector.y, z: e.target.value });
        }}
      />
    </div>
  );
}

function RenderFormsLiveFieldInput({
  t,
  field = null,
  label = "",
  currentValue = "",
  onChange = null,
  normalizeVectorDefaultForInput = null,
  normalizeLiveOptionList = null,
}) {
  const inputKind = resolveLiveFieldInputKind(field);

  if (inputKind === "multiline") {
    return (
      <textarea className="uu-input" rows={4} value={String(currentValue ?? "")} onChange={(e) => onChange?.(e.target.value)} />
    );
  }

  if (inputKind === "number") {
    return (
      <input
        className="uu-input"
        type="number"
        value={Number.isFinite(Number(currentValue)) ? Number(currentValue) : ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  if (inputKind === "integer") {
    return (
      <input
        className="uu-input"
        type="number"
        step="1"
        value={Number.isFinite(Number(currentValue)) ? Math.trunc(Number(currentValue)) : ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  if (inputKind === "vector2") {
    const vector = typeof normalizeVectorDefaultForInput === "function"
      ? normalizeVectorDefaultForInput(currentValue, 2)
      : { x: "0", y: "0" };
    return <VectorInput2 vector={vector} onChange={onChange} />;
  }

  if (inputKind === "vector3") {
    const vector = typeof normalizeVectorDefaultForInput === "function"
      ? normalizeVectorDefaultForInput(currentValue, 3)
      : { x: "0", y: "0", z: "0" };
    return <VectorInput3 vector={vector} onChange={onChange} />;
  }

  if (inputKind === "checkbox") {
    return (
      <label className="uu-check">
        <input type="checkbox" checked={currentValue === true} onChange={(e) => onChange?.(e.target.checked)} />
        {label}
      </label>
    );
  }

  if (inputKind === "color") {
    const safeColor = resolveSafeColorValue(currentValue);
    return <input className="uu-input" type="color" value={safeColor} onChange={(e) => onChange?.(e.target.value)} />;
  }

  if (inputKind === "select") {
    const options = typeof normalizeLiveOptionList === "function" ? normalizeLiveOptionList(field) : [];
    return (
      <select className="uu-input" value={String(currentValue || "")} onChange={(e) => onChange?.(e.target.value)}>
        <option value="">{safeT(t, "common.select", "Selectionner")}</option>
        {options.map((option) => (
          <option key={`render-form-live-${String(field?.fieldKey || label)}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="uu-input"
      type="text"
      value={String(currentValue ?? "")}
      placeholder={String(field?.placeholder || "")}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export { RenderFormsLiveFieldInput };
