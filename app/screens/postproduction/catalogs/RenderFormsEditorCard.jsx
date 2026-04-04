import { RenderFormsBrowseView } from "./components/editor/RenderFormsBrowseView";
import { RenderFormsEditorView } from "./components/editor/RenderFormsEditorView";
import { useRenderFormsEditorPageController } from "./hooks/useRenderFormsEditorPageController";

function RenderFormsEditorCard({
  t,
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

  return (
    <div className="mt-12">
      {!showEditor ? (
        <RenderFormsBrowseView
          t={t}
          renderFormsLoading={renderFormsLoading}
          renderFormsError={renderFormsError}
          canManageRenderTemplates={canManageRenderTemplates}
          handleStartCreate={handleStartCreate}
          clearListFilters={clearListFilters}
          preferences={preferences}
          listController={listController}
          selectedProjectRef={selectedProjectRef}
          onSelectProjectRef={onSelectProjectRef}
          startEdit={startEdit}
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
        />
      )}
    </div>
  );
}

export { RenderFormsEditorCard };
