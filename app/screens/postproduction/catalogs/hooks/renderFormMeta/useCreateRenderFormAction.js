import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";
import { buildCreateFormPayload } from "./metaPayloadHelpers";

export function useCreateRenderFormAction({
  t,
  canManageRenderTemplates = false,
  onCreateRenderForm = null,
  setSelectedFormId = null,
  setEditorIntent = null,
  newFormName = "",
  selectedProjectRef = "",
  newTemplateName = "",
  newMapName = "",
  newSequenceName = "",
  newOutputProfile = "",
  newPresetName = "",
  setNewFormName = null,
  setNewTemplateName = null,
  setNewMapName = null,
  setNewSequenceName = null,
  setNewOutputProfile = null,
  setNewPresetName = null,
  setCreating = null,
  setCreateError = null,
  setCreateInfo = null,
} = {}) {
  const createRenderForm = useCallback(async () => {
    if (!canManageRenderTemplates || typeof onCreateRenderForm !== "function") return null;
    setCreateError?.("");
    setCreateInfo?.("");
    const payload = buildCreateFormPayload({
      name: newFormName,
      projectRef: selectedProjectRef,
      templateName: newTemplateName,
      mapName: newMapName,
      sequenceName: newSequenceName,
      outputProfile: newOutputProfile,
      presetName: newPresetName,
    });
    if (!payload.name) {
      setCreateError?.(safeT(t, "postprod.data.forms.error.missingName", "Nom du formulaire requis."));
      return null;
    }
    if (!payload.projectName) {
      setCreateError?.(safeT(t, "postprod.data.forms.error.missingProject", "Selectionne un projet."));
      return null;
    }
    setCreating?.(true);
    try {
      const created = await Promise.resolve(onCreateRenderForm(payload));
      const createdId = Number(created?.id || 0);
      if (Number.isFinite(createdId) && createdId > 0) {
        setSelectedFormId?.(Math.trunc(createdId));
        setEditorIntent?.("edit");
      }
      setNewFormName?.("");
      setNewTemplateName?.("");
      setNewMapName?.("");
      setNewSequenceName?.("");
      setNewOutputProfile?.("");
      setNewPresetName?.("");
      setCreateInfo?.(safeT(t, "postprod.data.forms.msg.created", "Formulaire cree."));
      return {
        createdId: Number.isFinite(createdId) && createdId > 0 ? Math.trunc(createdId) : 0,
        projectRef: payload.projectName,
        presetName: payload.presetName,
      };
    } catch (e) {
      setCreateError?.(String(e?.message || safeT(t, "postprod.data.forms.error.create", "Creation impossible.")));
      return null;
    } finally {
      setCreating?.(false);
    }
  }, [
    canManageRenderTemplates,
    onCreateRenderForm,
    newFormName,
    selectedProjectRef,
    newTemplateName,
    newMapName,
    newSequenceName,
    newOutputProfile,
    newPresetName,
    t,
    setCreateError,
    setCreateInfo,
    setCreating,
    setSelectedFormId,
    setEditorIntent,
    setNewFormName,
    setNewTemplateName,
    setNewMapName,
    setNewSequenceName,
    setNewOutputProfile,
    setNewPresetName,
  ]);

  return { createRenderForm };
}

export default useCreateRenderFormAction;

