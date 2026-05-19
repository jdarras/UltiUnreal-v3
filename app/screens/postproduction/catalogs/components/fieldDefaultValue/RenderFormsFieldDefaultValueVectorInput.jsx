import { persistOnBlur, updateDefaultValue } from "./defaultValueHelpers";

const FIELD_DEFAULT_VECTOR_AXIS_LABEL_STYLE = { minWidth: "12px", textAlign: "right" };
const FIELD_DEFAULT_VECTOR_INPUT_STYLE = { width: "84px", minWidth: "84px", maxWidth: "84px" };
const FIELD_DEFAULT_VECTOR_ROW_STYLE = { flexWrap: "nowrap", alignItems: "center" };

function axisLabel(axis) {
  return (
    <span className="uu-muted" style={FIELD_DEFAULT_VECTOR_AXIS_LABEL_STYLE}>
      {axis}
    </span>
  );
}

function axisInput({ value = "0", disabled = false, onChange = null, onPersist = null }) {
  return (
    <input
      className="uu-input"
      type="number"
      value={value}
      style={FIELD_DEFAULT_VECTOR_INPUT_STYLE}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={() => persistOnBlur(onPersist)}
    />
  );
}

function RenderFormsFieldDefaultValueVectorInput({
  fieldKey = "",
  vector2Default = { x: "0", y: "0" },
  vector3Default = { x: "0", y: "0", z: "0" },
  canEdit = false,
  onUpdateEditableField = null,
  onPersistEditableFields = null,
  inputKind = "vector2",
}) {
  if (inputKind === "vector2") {
    return (
      <div className="uu-row uu-gap-4" style={FIELD_DEFAULT_VECTOR_ROW_STYLE}>
        {axisLabel("X")}
        {axisInput({
          value: vector2Default.x,
          disabled: !canEdit,
          onChange: (value) => updateDefaultValue(onUpdateEditableField, fieldKey, { x: value, y: vector2Default.y }),
          onPersist: onPersistEditableFields,
        })}
        {axisLabel("Y")}
        {axisInput({
          value: vector2Default.y,
          disabled: !canEdit,
          onChange: (value) => updateDefaultValue(onUpdateEditableField, fieldKey, { x: vector2Default.x, y: value }),
          onPersist: onPersistEditableFields,
        })}
      </div>
    );
  }

  return (
    <div className="uu-row uu-gap-4" style={FIELD_DEFAULT_VECTOR_ROW_STYLE}>
      {axisLabel("X")}
      {axisInput({
        value: vector3Default.x,
        disabled: !canEdit,
        onChange: (value) => updateDefaultValue(onUpdateEditableField, fieldKey, {
          x: value,
          y: vector3Default.y,
          z: vector3Default.z,
        }),
        onPersist: onPersistEditableFields,
      })}
      {axisLabel("Y")}
      {axisInput({
        value: vector3Default.y,
        disabled: !canEdit,
        onChange: (value) => updateDefaultValue(onUpdateEditableField, fieldKey, {
          x: vector3Default.x,
          y: value,
          z: vector3Default.z,
        }),
        onPersist: onPersistEditableFields,
      })}
      {axisLabel("Z")}
      {axisInput({
        value: vector3Default.z,
        disabled: !canEdit,
        onChange: (value) => updateDefaultValue(onUpdateEditableField, fieldKey, {
          x: vector3Default.x,
          y: vector3Default.y,
          z: value,
        }),
        onPersist: onPersistEditableFields,
      })}
    </div>
  );
}

export { RenderFormsFieldDefaultValueVectorInput };
