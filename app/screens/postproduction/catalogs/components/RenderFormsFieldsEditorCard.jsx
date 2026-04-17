import { safeT } from "../../shared/helpers";
import { RenderFormsFieldsAdvancedEditor } from "./RenderFormsFieldsAdvancedEditor";
import { RenderFormsFieldsEditorModeToggle } from "./RenderFormsFieldsEditorModeToggle";
import { RenderFormsFieldsTable } from "./RenderFormsFieldsTable";

function RenderFormsFieldsEditorCard({
  t,
  fieldsAdvancedMode = false,
  onSetFieldsAdvancedMode = null,
  fieldsLoading = false,
  fieldsError = "",
  selectedForm = null,
  editableFields = [],
  fieldsImportError = "",
  fieldsImportInfo = "",
  fieldsSaveError = "",
  fieldsSaveInfo = "",
  fieldsDraftText = "[]",
  onSetFieldsDraftText = null,
  editorIntent = "edit",
  canManageRenderTemplates = false,
  metaBusy = false,
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
  metaError = "",
  metaInfo = "",
}) {
  return (
    <div className="uu-card" style={{ gridColumn: "1 / -1" }}>
      <div
        className="uu-row"
        style={{ justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
      >
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
