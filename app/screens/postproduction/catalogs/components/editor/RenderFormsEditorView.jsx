import { useState } from "react";
import { safeT } from "../../../shared/helpers";
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
  onNavigateToProject = null,
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
    projectCatalogPresetOptions = [],
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
    creating = false,
    createError = "",
    createInfo = "",
    metaName = "",
    setMetaName = null,
    metaMapName = "",
    setMetaMapName = null,
    metaWrcFiles = [],
    setMetaWrcFiles = null,
    metaActive = false,
    setMetaActive = null,
    metaAllowedSequences = [],
    setMetaAllowedSequences = null,
    metaAllowedPresets = [],
    setMetaAllowedPresets = null,
    metaNote = "",
    setMetaNote = null,
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
    importFieldsFromWrcPreset = null,
    handleCreateForm = null,
    handleSaveFormMeta = null,
    handleDeleteForm = null,
    handleImportFieldsFromWrcPreset = null,
  } = editorController || {};

  const [isMetaFormBlocked, setIsMetaFormBlocked] = useState(false);
  const topMessages = [
    { kind: "warn", text: String(fieldsError || "").trim() },
    { kind: "warn", text: String(fieldsImportError || "").trim() },
    { kind: "ok", text: String(fieldsImportInfo || "").trim() },
    { kind: "warn", text: String(fieldsSaveError || "").trim() },
    { kind: "ok", text: String(fieldsSaveInfo || "").trim() },
    { kind: "warn", text: String(createError || "").trim() },
    { kind: "ok", text: String(createInfo || "").trim() },
    { kind: "warn", text: String(metaError || "").trim() },
    { kind: "ok", text: String(metaInfo || "").trim() },
  ].filter((entry) => entry.text);

  return (
    <>
      <RenderFormsEditorModeBar
        t={t}
        mode={mode}
        onChangeMode={setMode}
        onBack={backToList}
        selectedForm={selectedForm}
        metaActive={metaActive}
        onSetMetaActive={setMetaActive}
        onSaveMeta={handleSaveFormMeta}
        isAvailabilityBlocked={isMetaFormBlocked}
      />

      {editorIntent !== "create" ? (
        <RenderFormsEditorChips
          forms={visibleForms}
          selectedFormId={selectedFormId}
          onSelectFormId={selectFormFromChips}
        />
      ) : null}

      {mode === "edit" && topMessages.length > 0 ? (
        <div className="mt-12">
          {topMessages.map((entry, index) => (
            <div
              key={`render-forms-editor-msg-${entry.kind}-${index}`}
              className={`uu-msg ${entry.kind}${index > 0 ? " mt-8" : ""}`}
            >
              {entry.text}
            </div>
          ))}
        </div>
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
              projectCatalogLevelOptions={projectCatalogLevelOptions}
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
            <div>
              <RenderFormsMetaCard
                t={t}
                selectedForm={selectedForm}
                selectedFormProjectDisplayLabel={selectedFormProjectDisplayLabel}
                metaName={metaName}
                onSetMetaName={setMetaName}
                onSaveMeta={handleSaveFormMeta}
                metaMapName={metaMapName}
                onSetMetaMapName={setMetaMapName}
                metaWrcFiles={metaWrcFiles}
                onSetMetaWrcFiles={setMetaWrcFiles}
                metaActive={metaActive}
                onSetMetaActive={setMetaActive}
                metaAllowedSequences={metaAllowedSequences}
                onSetMetaAllowedSequences={setMetaAllowedSequences}
                metaAllowedPresets={metaAllowedPresets}
                onSetMetaAllowedPresets={setMetaAllowedPresets}
                projectCatalogSequenceOptions={projectCatalogSequenceOptions}
                projectCatalogPresetOptions={projectCatalogPresetOptions}
                projectCatalogLevelOptions={projectCatalogLevelOptions}
                projectCatalogWrcPresetOptions={projectCatalogWrcPresetOptions}
                projectCatalogLoading={projectCatalogLoading}
                projectCatalogError={projectCatalogError}
                onNavigateToProject={onNavigateToProject}
                onAvailabilityBlockedChange={setIsMetaFormBlocked}
                canManageRenderTemplates={canManageRenderTemplates}
                fieldsImportBusy={fieldsImportBusy}
                onImportWrcFile={(wrcFile) => importFieldsFromWrcPreset?.({
                  wrcFile,
                  loadOptions: { refreshSnapshot: true },
                })}
              />
            </div>
          ) : null}

          {editorIntent !== "create" && selectedForm ? (
            <div className="uu-card">
              <div className="uu-h3 uu-block-title mb-4">
                {safeT(t, "postprod.data.forms.note", "Note")}
              </div>
              <textarea
                className="uu-input"
                rows={10}
                style={{ resize: "vertical", width: "100%" }}
                value={metaNote}
                onChange={(e) => setMetaNote?.(e.target.value)}
                onBlur={(e) => {
                  void handleSaveFormMeta?.({ note: e.target.value }, { importIfEmpty: false });
                }}
                placeholder={safeT(t, "postprod.data.forms.note.placeholder", "Note visible par l'opérateur lors de la création d'une tâche.")}
              />
            </div>
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
