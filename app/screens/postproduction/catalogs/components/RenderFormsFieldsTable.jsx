import { safeT } from "../../shared/helpers";
import { RenderFormsFieldRow } from "./RenderFormsFieldRow";

const RENDER_FORMS_FIELDS_TABLE_WRAPPER_STYLE = { overflowX: "auto" };
const RENDER_FORMS_FIELDS_TABLE_STYLE = { width: "100%", tableLayout: "fixed" };
const RENDER_FORMS_FIELDS_COL_WIDTHS = ["6%", "14%", "12.5%", "12%", "10%", "31.5%", "14%"];

function buildRenderFormsFieldColStyle(width) {
  return { width };
}

function RenderFormsFieldsTable({
  t,
  selectedForm = null,
  editableFields = [],
  fieldsImportError = "",
  fieldsImportInfo = "",
  fieldInputKindOptions = [],
  normalizeLiveOptionList = null,
  normalizeVectorDefaultForInput = null,
  inferFieldValueTypeFromInputKind = null,
  canManageRenderTemplates = false,
  fieldsImportBusy = false,
  fieldsSaveBusy = false,
  onUpdateEditableField = null,
  onPersistEditableFields = null,
  onMoveEditableField = null,
  onRemoveEditableField = null,
}) {
  if (!selectedForm) {
    return <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.empty", "Aucun formulaire pour ce projet.")}</div>;
  }
  if (editableFields.length <= 0 && !fieldsImportError && !fieldsImportInfo) {
    return (
      <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.noFields", "Aucun champ defini pour ce formulaire.")}</div>
    );
  }
  return (
    <div style={RENDER_FORMS_FIELDS_TABLE_WRAPPER_STYLE} className="mt-12">
      <table className="uu-table" style={RENDER_FORMS_FIELDS_TABLE_STYLE}>
        <colgroup>
          {RENDER_FORMS_FIELDS_COL_WIDTHS.map((width, index) => (
            <col key={`render-forms-field-col-${index}`} style={buildRenderFormsFieldColStyle(width)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>{safeT(t, "postprod.data.forms.field.column.visible", "Visible")}</th>
            <th>{safeT(t, "postprod.data.forms.field.column.label", "Label")}</th>
            <th>{safeT(t, "postprod.data.forms.field.column.input", "Type de saisie")}</th>
            <th>{safeT(t, "postprod.data.forms.field.column.valueType", "Value type")}</th>
            <th>{safeT(t, "postprod.data.forms.field.column.required", "Obligatoire")}</th>
            <th>{safeT(t, "postprod.data.forms.field.column.default", "Valeur par defaut")}</th>
            <th>{safeT(t, "common.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {editableFields.map((field, index) => {
            const fieldKey = String(field?.fieldKey || "").trim();
            return (
              <RenderFormsFieldRow
                key={`render-form-field-row-${fieldKey || index}`}
                t={t}
                field={field}
                index={index}
                rowCount={editableFields.length}
                selectedForm={selectedForm}
                canManageRenderTemplates={canManageRenderTemplates}
                fieldsImportBusy={fieldsImportBusy}
                fieldsSaveBusy={fieldsSaveBusy}
                fieldInputKindOptions={fieldInputKindOptions}
                normalizeLiveOptionList={normalizeLiveOptionList}
                normalizeVectorDefaultForInput={normalizeVectorDefaultForInput}
                inferFieldValueTypeFromInputKind={inferFieldValueTypeFromInputKind}
                onUpdateEditableField={onUpdateEditableField}
                onPersistEditableFields={onPersistEditableFields}
                onMoveEditableField={onMoveEditableField}
                onRemoveEditableField={onRemoveEditableField}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { RenderFormsFieldsTable };
