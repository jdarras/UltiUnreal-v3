import { useCallback, useEffect } from "react";
import { RenderFormsBrowseView } from "./components/editor/RenderFormsBrowseView";
import { RenderFormsEditorView } from "./components/editor/RenderFormsEditorView";
import { useRenderFormsEditorPageController } from "./hooks/useRenderFormsEditorPageController";

function RenderFormsEditorCard({
  t,
  tabKey = 0,
  selectedProjectRef = "",
  projectOptions = [],
  onSelectProjectRef = null,
  renderForms = [],
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  onLoadProjectWrcFields = null,
  onLoadProjectUnrealCatalog = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
  onNavigateToProject = null,
  renderFormFocusRequest = null,
  onRenderFormFocusHandled = null,
}) {
  const {
    editorState,
    preferences,
    listController,
    projectCatalog,
    editorController,
    deleteDialog,
    reimportDialog,
    handleStartCreate,
    clearListFilters,
  } = useRenderFormsEditorPageController({
    t,
    selectedProjectRef,
    projectOptions,
    renderForms,
    canManageRenderTemplates,
    onCreateRenderForm,
    onUpdateRenderForm,
    onDeleteRenderForm,
    onLoadProjectWrcFields,
    onLoadProjectUnrealCatalog,
    onLoadRenderFormFields,
    onReplaceRenderFormFields,
  });
  const showEditor = editorState?.showEditor === true;
  const startEdit = editorState?.startEdit;

  const wrappedHandleStartCreate = useCallback(() => {
    handleStartCreate();
    if (typeof onSelectProjectRef === "function") onSelectProjectRef("");
  }, [handleStartCreate, onSelectProjectRef]);

  useEffect(() => {
    if (showEditor) editorState.backToList();
  }, [tabKey]);

  useEffect(() => {
    if (!renderFormFocusRequest) return;
    const formId = Number(renderFormFocusRequest?.ref || 0);
    if (formId > 0 && typeof startEdit === "function") startEdit({ id: formId });
    onRenderFormFocusHandled?.();
  }, [renderFormFocusRequest]);

  return (
    <div className="mt-12">
      {!showEditor ? (
        <RenderFormsBrowseView
          t={t}
          renderFormsLoading={renderFormsLoading}
          renderFormsError={renderFormsError}
          canManageRenderTemplates={canManageRenderTemplates}
          handleStartCreate={wrappedHandleStartCreate}
          clearListFilters={clearListFilters}
          preferences={preferences}
          listController={listController}
          selectedProjectRef={selectedProjectRef}
          onSelectProjectRef={onSelectProjectRef}
          startEdit={startEdit}
          onDeleteRenderForm={onDeleteRenderForm}
          onNavigateToProject={onNavigateToProject}
        />
      ) : (
        <RenderFormsEditorView
          t={t}
          selectedProjectRef={selectedProjectRef}
          onSelectProjectRef={onSelectProjectRef}
          canManageRenderTemplates={canManageRenderTemplates}
          editorState={editorState}
          listController={listController}
          projectCatalog={projectCatalog}
          editorController={editorController}
          deleteDialog={deleteDialog}
          reimportDialog={reimportDialog}
          onNavigateToProject={onNavigateToProject}
        />
      )}
    </div>
  );
}

export { RenderFormsEditorCard };
