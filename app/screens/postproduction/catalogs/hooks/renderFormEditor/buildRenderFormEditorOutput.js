export function buildRenderFormEditorOutput({
  selectedForm = null,
  selectedFormProjectDisplayLabel = "",
  meta = {},
  fieldsController = {},
  handlers = {},
} = {}) {
  const {
    createRenderForm: _ignoredCreateRenderForm,
    saveRenderFormMeta: _ignoredSaveRenderFormMeta,
    deleteRenderForm: _ignoredDeleteRenderForm,
    ...metaState
  } = meta || {};
  const fieldsState = fieldsController || {};

  return {
    selectedForm,
    selectedFormProjectDisplayLabel,
    ...metaState,
    ...fieldsState,
    handleCreateForm: handlers.handleCreateForm,
    handleSaveFormMeta: handlers.handleSaveFormMeta,
    handleDeleteForm: handlers.handleDeleteForm,
  };
}

export default buildRenderFormEditorOutput;
