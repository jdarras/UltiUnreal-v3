import { RenderFormsFieldDefaultValueVectorInput } from "./fieldDefaultValue/RenderFormsFieldDefaultValueVectorInput";
import { RenderFormsFieldDefaultValueScalarInput } from "./fieldDefaultValue/RenderFormsFieldDefaultValueScalarInput";

function RenderFormsFieldDefaultValueInput({
  t,
  fieldKey = "",
  inputKind = "text",
  defaultValueRaw = "",
  canEdit = false,
  options = [],
  vector2Default = { x: "0", y: "0" },
  vector3Default = { x: "0", y: "0", z: "0" },
  onUpdateEditableField = null,
  onPersistEditableFields = null,
}) {
  if (inputKind === "vector2" || inputKind === "vector3") {
    return (
      <RenderFormsFieldDefaultValueVectorInput
        fieldKey={fieldKey}
        inputKind={inputKind}
        canEdit={canEdit}
        vector2Default={vector2Default}
        vector3Default={vector3Default}
        onUpdateEditableField={onUpdateEditableField}
        onPersistEditableFields={onPersistEditableFields}
      />
    );
  }

  return (
    <RenderFormsFieldDefaultValueScalarInput
      t={t}
      fieldKey={fieldKey}
      inputKind={inputKind}
      defaultValueRaw={defaultValueRaw}
      canEdit={canEdit}
      options={options}
      onUpdateEditableField={onUpdateEditableField}
      onPersistEditableFields={onPersistEditableFields}
    />
  );
}

export { RenderFormsFieldDefaultValueInput };

