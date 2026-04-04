import { safeT } from "../../shared/helpers";

function RenderFormsFieldsAdvancedEditor({
  t,
  fieldsDraftText = "[]",
  onSetFieldsDraftText = null,
  selectedForm = null,
}) {
  return (
    <>
      <textarea
        className="uu-input mt-8"
        rows={14}
        value={fieldsDraftText}
        onChange={(e) => {
          if (typeof onSetFieldsDraftText === "function") onSetFieldsDraftText(e.target.value);
        }}
        disabled={!selectedForm}
      />
      <div className="uu-muted mt-8">
        {safeT(
          t,
          "postprod.data.forms.fieldsHint",
          "Chaque champ: fieldKey, fieldLabel, sourcePath, sourceType, inputKind, valueType, options, defaultValue, validation, isRequired, isVisible, sortOrder."
        )}
      </div>
    </>
  );
}

export { RenderFormsFieldsAdvancedEditor };
