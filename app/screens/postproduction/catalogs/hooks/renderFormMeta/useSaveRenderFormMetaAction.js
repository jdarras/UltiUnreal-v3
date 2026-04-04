import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";
import {
  buildSaveMetaPayload,
  normalizeTextValue,
} from "./metaPayloadHelpers";

export function useSaveRenderFormMetaAction({
  t,
  selectedForm = null,
  selectedProjectRef = "",
  canManageRenderTemplates = false,
  onUpdateRenderForm = null,
  metaName = "",
  metaTemplateName = "",
  metaMapName = "",
  metaSequenceName = "",
  metaOutputProfile = "",
  metaPresetName = "",
  metaActive = true,
  metaBusy = false,
  setMetaBusy = null,
  setMetaError = null,
  setMetaInfo = null,
} = {}) {
  const saveRenderFormMeta = useCallback(async (overrides = null, options = null) => {
    if (!canManageRenderTemplates || typeof onUpdateRenderForm !== "function") return { saved: false };
    const formId = Number(selectedForm?.id || 0);
    if (!Number.isFinite(formId) || formId <= 0) return { saved: false };
    if (metaBusy) return { saved: false };
    const opts = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const importIfEmpty = opts.importIfEmpty === true;
    const next = buildSaveMetaPayload({
      selectedForm,
      patch: overrides,
      metaName,
      metaTemplateName,
      metaMapName,
      metaSequenceName,
      metaOutputProfile,
      metaPresetName,
      metaActive,
    });
    if (next.noChanges) return { saved: false };

    setMetaError?.("");
    setMetaInfo?.("");
    setMetaBusy?.(true);
    try {
      await Promise.resolve(onUpdateRenderForm(formId, next.payload));
      setMetaInfo?.("");
      return {
        saved: true,
        importIfEmpty,
        formId,
        projectRef: normalizeTextValue(selectedProjectRef || selectedForm?.projectName),
        presetName: next.nextPresetName,
      };
    } catch (e) {
      setMetaError?.(String(e?.message || safeT(t, "postprod.data.forms.error.update", "Mise a jour impossible.")));
      return { saved: false };
    } finally {
      setMetaBusy?.(false);
    }
  }, [
    canManageRenderTemplates,
    onUpdateRenderForm,
    selectedForm,
    metaBusy,
    metaName,
    metaTemplateName,
    metaMapName,
    metaSequenceName,
    metaOutputProfile,
    metaPresetName,
    metaActive,
    selectedProjectRef,
    t,
    setMetaError,
    setMetaInfo,
    setMetaBusy,
  ]);

  return { saveRenderFormMeta };
}

export default useSaveRenderFormMetaAction;

