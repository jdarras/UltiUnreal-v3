import { safeT } from "../../shared/helpers";
import { RenderFormsFieldsAdvancedEditor } from "./RenderFormsFieldsAdvancedEditor";
import { RenderFormsFieldsEditorModeToggle } from "./RenderFormsFieldsEditorModeToggle";
import { RenderFormsFieldsTable } from "./RenderFormsFieldsTable";

const FIELDS_EDITOR_CARD_STYLE = { gridColumn: "1 / -1" };
const FIELDS_EDITOR_HEADER_STYLE = { justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" };

function RenderFormsFieldsEditorCard({
  t,
  fieldsAdvancedMode = false,
  onSetFieldsAdvancedMode = null,
  fieldsLoading = false,
  fieldsError: _fieldsError = "",
  selectedForm = null,
  editableFields = [],
  fieldsImportError = "",
  fieldsImportInfo = "",
  fieldsSaveError: _fieldsSaveError = "",
  fieldsSaveInfo: _fieldsSaveInfo = "",
  fieldsDraftText = "[]",
  onSetFieldsDraftText = null,
  editorIntent: _editorIntent = "edit",
  canManageRenderTemplates = false,
  metaBusy: _metaBusy = false,
  fieldsImportBusy = false,
  fieldsSaveBusy = false,
  fieldInputKindOptions = [],
  normalizeLiveOptionList = null,
  normalizeVectorDefaultForInput = null,
  inferFieldValueTypeFromInputKind = null,
  onUpdateEditableField = null,
  onPersistEditableFields = null,
  onMoveEditableField = null,
  onRemoveEditableField = null,
  metaError: _metaError = "",
  metaInfo: _metaInfo = "",
}) {
  return (
    <div className="uu-card" style={FIELDS_EDITOR_CARD_STYLE}>
      <div className="uu-row" style={FIELDS_EDITOR_HEADER_STYLE}>
        <div className="uu-h3 uu-block-title">
          {safeT(t, "postprod.data.forms.fieldsEditorVisual", "Champs du formulaire")}
        </div>
        <RenderFormsFieldsEditorModeToggle
          t={t}
          fieldsAdvancedMode={fieldsAdvancedMode}
          onSetFieldsAdvancedMode={onSetFieldsAdvancedMode}
        />
      </div>
      {fieldsLoading ? <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div> : null}

      {!fieldsAdvancedMode ? (
        <RenderFormsFieldsTable
          t={t}
          selectedForm={selectedForm}
          editableFields={editableFields}
          fieldsImportError={fieldsImportError}
          fieldsImportInfo={fieldsImportInfo}
          fieldInputKindOptions={fieldInputKindOptions}
          normalizeLiveOptionList={normalizeLiveOptionList}
          normalizeVectorDefaultForInput={normalizeVectorDefaultForInput}
          inferFieldValueTypeFromInputKind={inferFieldValueTypeFromInputKind}
          canManageRenderTemplates={canManageRenderTemplates}
          fieldsImportBusy={fieldsImportBusy}
          fieldsSaveBusy={fieldsSaveBusy}
          onUpdateEditableField={onUpdateEditableField}
          onPersistEditableFields={onPersistEditableFields}
          onMoveEditableField={onMoveEditableField}
          onRemoveEditableField={onRemoveEditableField}
        />
      ) : (
        <RenderFormsFieldsAdvancedEditor
          t={t}
          fieldsDraftText={fieldsDraftText}
          onSetFieldsDraftText={onSetFieldsDraftText}
          selectedForm={selectedForm}
        />
      )}

    </div>
  );
}

export { RenderFormsFieldsEditorCard };
