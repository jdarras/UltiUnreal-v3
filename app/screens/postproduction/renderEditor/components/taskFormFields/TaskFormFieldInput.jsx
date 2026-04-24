import { safeT } from "../../../shared/helpers";
import {
  normalizeAutoRenderFormOptions,
  normalizeAutoRenderVectorUiValue,
  sanitizeInlineTextValue,
} from "./helpers";

function TaskFormFieldInput({
  t,
  inputKind = "text",
  field = {},
  fieldKey = "",
  rawValue = "",
  tasksLoading = false,
  onUpdateFieldValue = null,
}) {
  const update = (nextValue) => {
    if (typeof onUpdateFieldValue !== "function") return;
    onUpdateFieldValue(fieldKey, nextValue);
  };

  if (inputKind === "multiline") {
    return (
      <textarea
        className="uu-input"
        rows={4}
        value={String(rawValue ?? "")}
        placeholder={String(field?.placeholder || "")}
        disabled={tasksLoading}
        onChange={(e) => update(e.target.value)}
      />
    );
  }

  if (inputKind === "number") {
    return (
      <input
        className="uu-input"
        type="number"
        value={Number.isFinite(Number(rawValue)) ? Number(rawValue) : ""}
        placeholder={String(field?.placeholder || "")}
        disabled={tasksLoading}
        onChange={(e) => update(e.target.value)}
      />
    );
  }

  if (inputKind === "integer") {
    return (
      <input
        className="uu-input"
        type="number"
        step="1"
        value={Number.isFinite(Number(rawValue)) ? Math.trunc(Number(rawValue)) : ""}
        placeholder={String(field?.placeholder || "")}
        disabled={tasksLoading}
        onChange={(e) => update(e.target.value)}
      />
    );
  }

  if (inputKind === "vector2") {
    const vector = normalizeAutoRenderVectorUiValue(rawValue, 2);
    return (
      <div className="uu-row uu-gap-4" style={{ flexWrap: "nowrap", alignItems: "center" }}>
        <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>
          X
        </span>
        <input
          className="uu-input"
          type="number"
          value={vector.x}
          style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
          disabled={tasksLoading}
          onChange={(e) => update({ x: e.target.value, y: vector.y })}
        />
        <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>
          Y
        </span>
        <input
          className="uu-input"
          type="number"
          value={vector.y}
          style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
          disabled={tasksLoading}
          onChange={(e) => update({ x: vector.x, y: e.target.value })}
        />
      </div>
    );
  }

  if (inputKind === "vector3") {
    const vector = normalizeAutoRenderVectorUiValue(rawValue, 3);
    return (
      <div className="uu-row uu-gap-4" style={{ flexWrap: "nowrap", alignItems: "center" }}>
        <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>
          X
        </span>
        <input
          className="uu-input"
          type="number"
          value={vector.x}
          style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
          disabled={tasksLoading}
          onChange={(e) => update({ x: e.target.value, y: vector.y, z: vector.z })}
        />
        <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>
          Y
        </span>
        <input
          className="uu-input"
          type="number"
          value={vector.y}
          style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
          disabled={tasksLoading}
          onChange={(e) => update({ x: vector.x, y: e.target.value, z: vector.z })}
        />
        <span className="uu-muted" style={{ minWidth: "12px", textAlign: "right" }}>
          Z
        </span>
        <input
          className="uu-input"
          type="number"
          value={vector.z}
          style={{ width: "84px", minWidth: "84px", maxWidth: "84px" }}
          disabled={tasksLoading}
          onChange={(e) => update({ x: vector.x, y: vector.y, z: e.target.value })}
        />
      </div>
    );
  }

  if (inputKind === "checkbox") {
    return (
      <label className="uu-check">
        <input
          type="checkbox"
          checked={rawValue === true}
          disabled={tasksLoading}
          onChange={(e) => update(e.target.checked)}
        />
      </label>
    );
  }

  if (inputKind === "color") {
    const colorRaw = String(rawValue || "").trim();
    const safeColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorRaw) ? colorRaw : "#ffffff";
    return (
      <input
        className="uu-input"
        type="color"
        value={safeColor}
        disabled={tasksLoading}
        onChange={(e) => update(e.target.value)}
      />
    );
  }

  if (inputKind === "select") {
    const options = normalizeAutoRenderFormOptions(field);
    return (
      <select
        className="uu-input"
        value={String(rawValue ?? "")}
        disabled={tasksLoading}
        onChange={(e) => update(e.target.value)}
      >
        <option value="">{safeT(t, "common.select", "Selectionner")}</option>
        {options.map((option) => (
          <option key={`task-auto-render-form-field-${fieldKey}-${option.value}`} value={option.value}>
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
      value={sanitizeInlineTextValue(rawValue)}
      placeholder={String(field?.placeholder || "")}
      disabled={tasksLoading}
      onChange={(e) => update(e.target.value)}
    />
  );
}

export { TaskFormFieldInput };
