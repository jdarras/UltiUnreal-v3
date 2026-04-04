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
  onOpenReimportDialog = null,
  onOpenDeleteDialog = null,
  metaError = "",
  metaInfo = "",
}) {
  return (
    <div className="uu-card" style={{ gridColumn: "1 / -1" }}>
      <div
        className="uu-row"
        style={{ justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
      >
        <div style={{ fontWeight: 600 }}>
          {safeT(t, "postprod.data.forms.fieldsEditorVisual", "Champs du formulaire")}
        </div>
        <RenderFormsFieldsEditorModeToggle
          t={t}
          fieldsAdvancedMode={fieldsAdvancedMode}
          onSetFieldsAdvancedMode={onSetFieldsAdvancedMode}
        />
      </div>
      {fieldsLoading ? <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div> : null}
      {fieldsError ? <div className="uu-msg warn mt-8">{fieldsError}</div> : null}

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

      {fieldsImportError ? <div className="uu-msg warn mt-8">{fieldsImportError}</div> : null}
      {fieldsImportInfo ? <div className="uu-msg ok mt-8">{fieldsImportInfo}</div> : null}
      {fieldsSaveError ? <div className="uu-msg warn mt-8">{fieldsSaveError}</div> : null}
      {fieldsSaveInfo ? <div className="uu-msg ok mt-8">{fieldsSaveInfo}</div> : null}

      {editorIntent !== "create" && selectedForm ? (
        <div className="uu-row mt-12" style={{ justifyContent: "flex-end", gap: "8px" }}>
          <button
            className="uu-btn"
            type="button"
            disabled={metaBusy || fieldsImportBusy || !canManageRenderTemplates}
            onClick={() => {
              if (typeof onOpenReimportDialog === "function") onOpenReimportDialog();
            }}
          >
            {fieldsImportBusy
              ? safeT(t, "common.loading", "Chargement…")
              : safeT(t, "postprod.data.forms.action.reimportWrc", "Reimporter preset WRC")}
          </button>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={metaBusy || !canManageRenderTemplates}
            onClick={() => {
              if (typeof onOpenDeleteDialog === "function") onOpenDeleteDialog();
            }}
          >
            {safeT(t, "common.delete", "Supprimer")}
          </button>
        </div>
      ) : null}

      {metaError ? <div className="uu-msg warn mt-8">{metaError}</div> : null}
      {metaInfo ? <div className="uu-msg ok mt-8">{metaInfo}</div> : null}
    </div>
  );
}

export { RenderFormsFieldsEditorCard };
