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
  newOutputProfile = "",
  setNewFormName = null,
  setNewTemplateName = null,
  setNewMapName = null,
  setNewOutputProfile = null,
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
      outputProfile: newOutputProfile,
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
      setNewOutputProfile?.("");
      setCreateInfo?.(safeT(t, "postprod.data.forms.msg.created", "Formulaire cree."));
      const createdWrcFiles = Array.isArray(created?.wrcFiles)
        ? created.wrcFiles.filter(Boolean)
        : (Array.isArray(created?.form?.wrcFiles) ? created.form.wrcFiles.filter(Boolean) : []);
      return {
        createdId: Number.isFinite(createdId) && createdId > 0 ? Math.trunc(createdId) : 0,
        projectRef: payload.projectName,
        wrcFiles: createdWrcFiles,
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
    newOutputProfile,
    t,
    setCreateError,
    setCreateInfo,
    setCreating,
    setSelectedFormId,
    setEditorIntent,
    setNewFormName,
    setNewTemplateName,
    setNewMapName,
    setNewOutputProfile,
  ]);

  return { createRenderForm };
}
