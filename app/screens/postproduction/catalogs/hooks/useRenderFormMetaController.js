import { useEffect, useState } from "react";
import { useRenderFormMetaActions } from "./renderFormMeta/useRenderFormMetaActions";

export function useRenderFormMetaController({
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
} = {}) {
  const [newFormName, setNewFormName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newMapName, setNewMapName] = useState("");
  const [newSequenceName, setNewSequenceName] = useState("");
  const [newOutputProfile, setNewOutputProfile] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createInfo, setCreateInfo] = useState("");

  const [metaName, setMetaName] = useState("");
  const [metaTemplateName, setMetaTemplateName] = useState("");
  const [metaMapName, setMetaMapName] = useState("");
  const [metaSequenceName, setMetaSequenceName] = useState("");
  const [metaOutputProfile, setMetaOutputProfile] = useState("");
  const [metaPresetName, setMetaPresetName] = useState("");
  const [metaActive, setMetaActive] = useState(true);
  const [metaBusy, setMetaBusy] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaInfo, setMetaInfo] = useState("");

  useEffect(() => {
    setMetaName(String(selectedForm?.name || ""));
    setMetaTemplateName(String(selectedForm?.templateName || ""));
    setMetaMapName(String(selectedForm?.mapName || ""));
    setMetaSequenceName(String(selectedForm?.sequenceName || ""));
    setMetaOutputProfile(String(selectedForm?.outputProfile || ""));
    setMetaPresetName(String(selectedForm?.presetName || ""));
    setMetaActive(selectedForm?.isActive !== false);
    setMetaError("");
    setMetaInfo("");
  }, [selectedForm]);

  const {
    createRenderForm,
    saveRenderFormMeta,
    deleteRenderForm,
  } = useRenderFormMetaActions({
    t,
    selectedForm,
    selectedProjectRef,
    canManageRenderTemplates,
    onCreateRenderForm,
    onUpdateRenderForm,
    onDeleteRenderForm,
    setSelectedFormId,
    setEditorIntent,
    setShowEditor,
    newFormName,
    setNewFormName,
    newTemplateName,
    setNewTemplateName,
    newMapName,
    setNewMapName,
    newSequenceName,
    setNewSequenceName,
    newOutputProfile,
    setNewOutputProfile,
    newPresetName,
    setNewPresetName,
    setCreating,
    setCreateError,
    setCreateInfo,
    metaName,
    metaTemplateName,
    metaMapName,
    metaSequenceName,
    metaOutputProfile,
    metaPresetName,
    metaActive,
    metaBusy,
    setMetaBusy,
    setMetaError,
    setMetaInfo,
  });

  return {
    newFormName,
    setNewFormName,
    newTemplateName,
    setNewTemplateName,
    newMapName,
    setNewMapName,
    newSequenceName,
    setNewSequenceName,
    newOutputProfile,
    setNewOutputProfile,
    newPresetName,
    setNewPresetName,
    creating,
    createError,
    createInfo,
    metaName,
    setMetaName,
    metaTemplateName,
    setMetaTemplateName,
    metaMapName,
    setMetaMapName,
    metaSequenceName,
    setMetaSequenceName,
    metaOutputProfile,
    setMetaOutputProfile,
    metaPresetName,
    setMetaPresetName,
    metaActive,
    setMetaActive,
    metaBusy,
    metaError,
    metaInfo,
    createRenderForm,
    saveRenderFormMeta,
    deleteRenderForm,
  };
}

export default useRenderFormMetaController;
