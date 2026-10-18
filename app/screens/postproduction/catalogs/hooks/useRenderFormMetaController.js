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
  const [newOutputProfile, setNewOutputProfile] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createInfo, setCreateInfo] = useState("");

  const [metaName, setMetaName] = useState("");
  const [metaTemplateName, setMetaTemplateName] = useState("");
  const [metaMapName, setMetaMapName] = useState("");
  const [metaOutputProfile, setMetaOutputProfile] = useState("");
  const [metaWrcFiles, setMetaWrcFiles] = useState([]);
  const [metaActive, setMetaActive] = useState(true);
  const [metaAllowedSequences, setMetaAllowedSequences] = useState([]);
  const [metaAllowedPresets, setMetaAllowedPresets] = useState([]);
  const [metaNote, setMetaNote] = useState("");
  const [metaBusy, setMetaBusy] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaInfo, setMetaInfo] = useState("");

  useEffect(() => {
    setMetaName(String(selectedForm?.name || ""));
    setMetaTemplateName(String(selectedForm?.templateName || ""));
    setMetaMapName(String(selectedForm?.mapName || ""));
    setMetaOutputProfile(String(selectedForm?.outputProfile || ""));
    setMetaWrcFiles(Array.isArray(selectedForm?.wrcFiles) ? selectedForm.wrcFiles : []);
    setMetaActive(selectedForm?.isActive !== false);
    setMetaAllowedSequences(Array.isArray(selectedForm?.allowedSequences) ? selectedForm.allowedSequences : []);
    setMetaAllowedPresets(Array.isArray(selectedForm?.allowedPresets) ? selectedForm.allowedPresets : []);
    setMetaNote(String(selectedForm?.note || ""));
    setMetaError("");
    setMetaInfo("");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- brouillon réinitialisé seulement quand un autre formulaire est sélectionné (préserve la saisie)
  }, [selectedForm?.id]);

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
    newOutputProfile,
    setNewOutputProfile,
    setCreating,
    setCreateError,
    setCreateInfo,
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

  return {
    newFormName,
    setNewFormName,
    newTemplateName,
    setNewTemplateName,
    newMapName,
    setNewMapName,
    newOutputProfile,
    setNewOutputProfile,
    creating,
    createError,
    createInfo,
    metaName,
    setMetaName,
    metaTemplateName,
    setMetaTemplateName,
    metaMapName,
    setMetaMapName,
    metaOutputProfile,
    setMetaOutputProfile,
    metaWrcFiles,
    setMetaWrcFiles,
    metaActive,
    setMetaActive,
    metaAllowedSequences,
    setMetaAllowedSequences,
    metaAllowedPresets,
    setMetaAllowedPresets,
    metaNote,
    setMetaNote,
    metaBusy,
    metaError,
    metaInfo,
    createRenderForm,
    saveRenderFormMeta,
    deleteRenderForm,
  };
}
