import { RenderFormsCreateCard } from "../RenderFormsCreateCard";
import { RenderFormsEditorChips } from "../RenderFormsEditorChips";
import { RenderFormsEditorDialogs } from "../RenderFormsEditorDialogs";
import { RenderFormsEditorModeBar } from "../RenderFormsEditorModeBar";
import { RenderFormsFieldsEditorCard } from "../RenderFormsFieldsEditorCard";
import { RenderFormsLivePreviewCard } from "../RenderFormsLivePreviewCard";
import { RenderFormsMetaCard } from "../RenderFormsMetaCard";

function RenderFormsEditorView({
  t,
  selectedProjectRef = "",
  onSelectProjectRef = null,
  canManageRenderTemplates = false,
  editorState = {},
  listController = {},
  projectCatalog = {},
  editorController = {},
  deleteDialog = null,
  reimportDialog = null,
}) {
  const {
    mode = "edit",
    setMode = null,
    backToList = null,
    editorIntent = "edit",
    visibleForms = [],
    selectedFormId = 0,
    selectFormFromChips = null,
  } = editorState || {};
  const { normalizedProjectOptions = [] } = listController || {};
  const {
    projectCatalogLevelOptions = [],
    projectCatalogSequenceOptions = [],
    projectCatalogWrcPresetOptions = [],
    projectCatalogLoading = false,
    projectCatalogError = "",
  } = projectCatalog || {};
  const {
    selectedForm = null,
    selectedFormProjectDisplayLabel = "",
    newFormName = "",
    setNewFormName = null,
    newMapName = "",
    setNewMapName = null,
    newSequenceName = "",
    setNewSequenceName = null,
    newPresetName = "",
    setNewPresetName = null,
    creating = false,
    createError = "",
    createInfo = "",
    metaName = "",
    setMetaName = null,
    metaMapName = "",
    setMetaMapName = null,
    metaSequenceName = "",
    setMetaSequenceName = null,
    metaPresetName = "",
    setMetaPresetName = null,
    metaActive = false,
    setMetaActive = null,
    metaBusy = false,
    metaError = "",
    metaInfo = "",
    fields = [],
    fieldsLoading = false,
    fieldsError = "",
    fieldsDraftText = "[]",
    setFieldsDraftText = null,
    fieldsAdvancedMode = false,
    setFieldsAdvancedMode = null,
    fieldsImportBusy = false,
    fieldsImportError = "",
    fieldsImportInfo = "",
    fieldsSaveBusy = false,
    fieldsSaveError = "",
    fieldsSaveInfo = "",
    liveValues = {},
    setLiveValues = null,
    editableFields = [],
    fieldInputKindOptions = [],
    normalizeLiveOptionList = null,
    inferFieldValueTypeFromInputKind = null,
    normalizeVectorDefaultForInput = null,
    persistEditableFields = null,
    updateEditableField = null,
    moveEditableField = null,
    removeEditableField = null,
    handleCreateForm = null,
    handleSaveFormMeta = null,
    handleDeleteForm = null,
    handleImportFieldsFromWrcPreset = null,
  } = editorController || {};

  return (
    <>
      <RenderFormsEditorModeBar t={t} mode={mode} onChangeMode={setMode} onBack={backToList} />

      {editorIntent !== "create" ? (
        <RenderFormsEditorChips
          forms={visibleForms}
          selectedFormId={selectedFormId}
          onSelectFormId={selectFormFromChips}
        />
      ) : null}

      {mode === "edit" ? (
        <div className="uu-grid-2 mt-12">
          {editorIntent === "create" ? (
            <RenderFormsCreateCard
              t={t}
              normalizedProjectOptions={normalizedProjectOptions}
              selectedProjectRef={selectedProjectRef}
              onSelectProjectRef={onSelectProjectRef}
              newFormName={newFormName}
              onSetNewFormName={setNewFormName}
              newMapName={newMapName}
              onSetNewMapName={setNewMapName}
              newSequenceName={newSequenceName}
              onSetNewSequenceName={setNewSequenceName}
              newPresetName={newPresetName}
              onSetNewPresetName={setNewPresetName}
              projectCatalogLevelOptions={projectCatalogLevelOptions}
              projectCatalogSequenceOptions={projectCatalogSequenceOptions}
              projectCatalogWrcPresetOptions={projectCatalogWrcPresetOptions}
              projectCatalogLoading={projectCatalogLoading}
              projectCatalogError={projectCatalogError}
              creating={creating}
              canManageRenderTemplates={canManageRenderTemplates}
              onCreate={handleCreateForm}
              createError={createError}
              createInfo={createInfo}
            />
          ) : null}

          {editorIntent !== "create" ? (
            <RenderFormsMetaCard
              t={t}
              selectedForm={selectedForm}
              selectedFormProjectDisplayLabel={selectedFormProjectDisplayLabel}
              metaName={metaName}
              onSetMetaName={setMetaName}
              onSaveMeta={handleSaveFormMeta}
              metaMapName={metaMapName}
              onSetMetaMapName={setMetaMapName}
              metaSequenceName={metaSequenceName}
              onSetMetaSequenceName={setMetaSequenceName}
              metaPresetName={metaPresetName}
              onSetMetaPresetName={setMetaPresetName}
              metaActive={metaActive}
              onSetMetaActive={setMetaActive}
              projectCatalogLevelOptions={projectCatalogLevelOptions}
              projectCatalogSequenceOptions={projectCatalogSequenceOptions}
              projectCatalogWrcPresetOptions={projectCatalogWrcPresetOptions}
              projectCatalogLoading={projectCatalogLoading}
              projectCatalogError={projectCatalogError}
            />
          ) : null}

          <RenderFormsFieldsEditorCard
            t={t}
            fieldsAdvancedMode={fieldsAdvancedMode}
            onSetFieldsAdvancedMode={setFieldsAdvancedMode}
            fieldsLoading={fieldsLoading}
            fieldsError={fieldsError}
            selectedForm={selectedForm}
            editableFields={editableFields}
            fieldsImportError={fieldsImportError}
            fieldsImportInfo={fieldsImportInfo}
            fieldsSaveError={fieldsSaveError}
            fieldsSaveInfo={fieldsSaveInfo}
            fieldsDraftText={fieldsDraftText}
            onSetFieldsDraftText={setFieldsDraftText}
            editorIntent={editorIntent}
            canManageRenderTemplates={canManageRenderTemplates}
            metaBusy={metaBusy}
            fieldsImportBusy={fieldsImportBusy}
            fieldsSaveBusy={fieldsSaveBusy}
            fieldInputKindOptions={fieldInputKindOptions}
            normalizeLiveOptionList={normalizeLiveOptionList}
            normalizeVectorDefaultForInput={normalizeVectorDefaultForInput}
            inferFieldValueTypeFromInputKind={inferFieldValueTypeFromInputKind}
            onUpdateEditableField={updateEditableField}
            onPersistEditableFields={persistEditableFields}
            onMoveEditableField={moveEditableField}
            onRemoveEditableField={removeEditableField}
            onOpenReimportDialog={reimportDialog?.openDialog}
            onOpenDeleteDialog={deleteDialog?.openDialog}
            metaError={metaError}
            metaInfo={metaInfo}
          />
        </div>
      ) : null}

      {mode === "live" ? (
        <RenderFormsLivePreviewCard
          t={t}
          selectedForm={selectedForm}
          fields={fields}
          liveValues={liveValues}
          onSetLiveValues={setLiveValues}
          normalizeVectorDefaultForInput={normalizeVectorDefaultForInput}
          normalizeLiveOptionList={normalizeLiveOptionList}
        />
      ) : null}

      <RenderFormsEditorDialogs
        t={t}
        deleteDialog={deleteDialog}
        reimportDialog={reimportDialog}
        metaBusy={metaBusy}
        fieldsImportBusy={fieldsImportBusy}
        onDeleteForm={handleDeleteForm}
        onImportFieldsFromWrcPreset={handleImportFieldsFromWrcPreset}
      />
    </>
  );
}

export { RenderFormsEditorView };
