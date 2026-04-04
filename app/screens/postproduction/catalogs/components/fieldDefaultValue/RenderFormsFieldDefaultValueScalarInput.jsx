import { safeT } from "../../../shared/helpers";
import {
  normalizeColor,
  normalizeInteger,
  normalizeNumeric,
  normalizeText,
  persistOnBlur,
  updateDefaultValue,
} from "./defaultValueHelpers";

function RenderFormsFieldDefaultValueScalarInput({
  t,
  fieldKey = "",
  inputKind = "text",
  defaultValueRaw = "",
  canEdit = false,
  options = [],
  onUpdateEditableField = null,
  onPersistEditableFields = null,
}) {
  if (inputKind === "checkbox") {
    return (
      <label className="uu-check">
        <input
          type="checkbox"
          checked={defaultValueRaw === true}
          disabled={!canEdit}
          onChange={(e) => updateDefaultValue(onUpdateEditableField, fieldKey, e.target.checked, { saveNow: true })}
        />
      </label>
    );
  }

  if (inputKind === "number") {
    return (
      <input
        className="uu-input"
        type="number"
        value={normalizeNumeric(defaultValueRaw)}
        disabled={!canEdit}
        onChange={(e) => {
          const next = String(e.target.value || "").trim();
          if (!next) {
            updateDefaultValue(onUpdateEditableField, fieldKey, "");
            return;
          }
          updateDefaultValue(onUpdateEditableField, fieldKey, normalizeNumeric(next));
        }}
        onBlur={() => persistOnBlur(onPersistEditableFields)}
      />
    );
  }

  if (inputKind === "integer") {
    return (
      <input
        className="uu-input"
        type="number"
        step="1"
        value={normalizeInteger(defaultValueRaw)}
        disabled={!canEdit}
        onChange={(e) => {
          const next = String(e.target.value || "").trim();
          if (!next) {
            updateDefaultValue(onUpdateEditableField, fieldKey, "");
            return;
          }
          updateDefaultValue(onUpdateEditableField, fieldKey, normalizeInteger(next));
        }}
        onBlur={() => persistOnBlur(onPersistEditableFields)}
      />
    );
  }

  if (inputKind === "color") {
    return (
      <input
        className="uu-input"
        type="color"
        value={normalizeColor(defaultValueRaw)}
        disabled={!canEdit}
        onChange={(e) => updateDefaultValue(onUpdateEditableField, fieldKey, e.target.value, { saveNow: true })}
      />
    );
  }

  if (inputKind === "select") {
    return (
      <select
        className="uu-input"
        value={String(defaultValueRaw ?? "")}
        disabled={!canEdit}
        onChange={(e) => updateDefaultValue(onUpdateEditableField, fieldKey, e.target.value, { saveNow: true })}
      >
        <option value="">{safeT(t, "common.select", "Selectionner")}</option>
        {options.map((entry) => (
          <option key={`render-form-field-option-${fieldKey}-${entry.value}`} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    );
  }

  if (inputKind === "json") {
    return (
      <textarea
        className="uu-input"
        rows={3}
        value={typeof defaultValueRaw === "string" ? defaultValueRaw : JSON.stringify(defaultValueRaw ?? {}, null, 2)}
        disabled={!canEdit}
        onChange={(e) => {
          const raw = String(e.target.value || "");
          try {
            updateDefaultValue(onUpdateEditableField, fieldKey, JSON.parse(raw));
          } catch {
            updateDefaultValue(onUpdateEditableField, fieldKey, raw);
          }
        }}
        onBlur={() => persistOnBlur(onPersistEditableFields)}
      />
    );
  }

  return (
    <input
      className="uu-input"
      type="text"
      value={normalizeText(defaultValueRaw)}
      disabled={!canEdit}
      onChange={(e) => updateDefaultValue(onUpdateEditableField, fieldKey, e.target.value)}
      onBlur={() => persistOnBlur(onPersistEditableFields)}
    />
  );
}

export { RenderFormsFieldDefaultValueScalarInput };

