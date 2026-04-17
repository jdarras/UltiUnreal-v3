import { useCreateRenderFormAction } from "./useCreateRenderFormAction";
import { useDeleteRenderFormAction } from "./useDeleteRenderFormAction";
import { useSaveRenderFormMetaAction } from "./useSaveRenderFormMetaAction";

function useRenderFormMetaActions({
  t,
  selectedForm = null,
  selectedProjectRef = "",
  canManageRenderTemplates = false,
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  setSelectedFormId = null,
  setEditorIntent = null,
  setShowEditor = null,
  newFormName = "",
  setNewFormName = null,
  newTemplateName = "",
  setNewTemplateName = null,
  newMapName = "",
  setNewMapName = null,
  newOutputProfile = "",
  setNewOutputProfile = null,
  setCreating = null,
  setCreateError = null,
  setCreateInfo = null,
  metaName = "",
  metaTemplateName = "",
  metaMapName = "",
  metaOutputProfile = "",
  metaWrcFiles = [],
  metaActive = true,
  metaAllowedSequences = [],
  metaAllowedPresets = [],
  metaNote = "",
  metaBusy = false,
  setMetaBusy = null,
  setMetaError = null,
  setMetaInfo = null,
}) {
  const { createRenderForm } = useCreateRenderFormAction({
    t,
    canManageRenderTemplates,
    onCreateRenderForm,
    setSelectedFormId,
    setEditorIntent,
    newFormName,
    selectedProjectRef,
    newTemplateName,
    newMapName,
    newOutputProfile,
    setNewFormName,
    setNewTemplateName,
    setNewMapName,
    setNewOutputProfile,
    setCreating,
    setCreateError,
    setCreateInfo,
  });

  const { saveRenderFormMeta } = useSaveRenderFormMetaAction({
    t,
    selectedForm,
    selectedProjectRef,
    canManageRenderTemplates,
    onUpdateRenderForm,
    metaName,
    metaTemplateName,
    metaMapName,
    metaOutputProfile,
    metaWrcFiles,
    metaActive,
    metaAllowedSequences,
    metaAllowedPresets,
    metaNote,
    metaBusy,
    setMetaBusy,
    setMetaError,
    setMetaInfo,
  });

  const { deleteRenderForm } = useDeleteRenderFormAction({
    t,
    selectedForm,
    canManageRenderTemplates,
    onDeleteRenderForm,
    setSelectedFormId,
    setEditorIntent,
    setShowEditor,
    setMetaBusy,
    setMetaError,
    setMetaInfo,
  });

  return {
    createRenderForm,
    saveRenderFormMeta,
    deleteRenderForm,
  };
}

export { useRenderFormMetaActions };
