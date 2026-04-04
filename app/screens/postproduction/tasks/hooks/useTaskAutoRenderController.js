import { useCallback, useMemo, useState } from "react";
import {
  buildTaskExpectedRenderNamesPreview,
  normalizeTaskExpectedRenderCountInput,
} from "../helpers";
import {
  buildHydratedAutoRenderState,
  DEFAULT_AUTO_RENDER_STATE,
} from "./autoRender/taskAutoRenderStateHelpers";
import { useAutoRenderLookupMaps } from "./autoRender/useAutoRenderLookupMaps";
import { useAutoRenderFormFields } from "./autoRender/useAutoRenderFormFields";
import { useAutoRenderProjectCatalog } from "./autoRender/useAutoRenderProjectCatalog";
import { useAutoRenderTemplates } from "./autoRender/useAutoRenderTemplates";

export function useTaskAutoRenderController({
  t,
  title = "",
  normalizedProjectOptions = [],
  normalizedRenderTemplateOptions = [],
  renderForms = [],
  availableRenderWorkers = [],
  onLoadRenderFormFields = null,
  onLoadProjectUnrealCatalog = null,
}) {
  const [expectedRenderCountInput, setExpectedRenderCountInput] = useState("1");
  const [autoRenderWorkerKey, setAutoRenderWorkerKey] = useState("");
  const [autoRenderFormId, setAutoRenderFormId] = useState("");
  const [autoRenderTemplateId, setAutoRenderTemplateId] = useState("");
  const [autoRenderFormValues, setAutoRenderFormValues] = useState({});
  const [autoRenderLaunchMode, setAutoRenderLaunchMode] = useState("scheduled");

  const {
    projectOptionByRef,
    projectLookupByAny,
    filteredAutoRenderForms,
    selectedAutoRenderForm,
    selectedAutoRenderProjectRef,
  } = useAutoRenderLookupMaps({
    normalizedProjectOptions,
    renderForms,
    availableRenderWorkers,
    setAutoRenderWorkerKey,
    autoRenderFormId,
    setAutoRenderFormId,
  });

  const {
    autoRenderFormFields,
    autoRenderFormFieldsLoading,
    autoRenderFormFieldsError,
  } = useAutoRenderFormFields({
    t,
    autoRenderFormId,
    renderForms,
    onLoadRenderFormFields,
    setAutoRenderFormValues,
  });

  const {
    autoRenderProjectCatalog,
    autoRenderProjectCatalogLoading,
    autoRenderProjectCatalogError,
  } = useAutoRenderProjectCatalog({
    t,
    selectedAutoRenderProjectRef,
    normalizedProjectOptions,
    onLoadProjectUnrealCatalog,
  });

  const {
    renderTemplatesForSelectedAutoForm,
    selectedAutoRenderTemplate,
  } = useAutoRenderTemplates({
    selectedAutoRenderProjectRef,
    projectOptionByRef,
    autoRenderProjectCatalog,
    normalizedRenderTemplateOptions,
    autoRenderTemplateId,
    setAutoRenderTemplateId,
    selectedAutoRenderForm,
  });

  const visibleAutoRenderFormFields = useMemo(() => (
    (Array.isArray(autoRenderFormFields) ? autoRenderFormFields : [])
      .filter((field) => field?.isVisible !== false)
      .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
  ), [autoRenderFormFields]);

  const expectedRenderCountForForm = useMemo(
    () => normalizeTaskExpectedRenderCountInput(expectedRenderCountInput),
    [expectedRenderCountInput]
  );

  const expectedRenderNamesPreview = useMemo(
    () => buildTaskExpectedRenderNamesPreview(title, expectedRenderCountForForm),
    [title, expectedRenderCountForForm]
  );

  const autoExpectedRenderName = useMemo(
    () => String(expectedRenderNamesPreview[0] || "").trim(),
    [expectedRenderNamesPreview]
  );

  const resetAutoRenderState = useCallback(() => {
    setExpectedRenderCountInput(DEFAULT_AUTO_RENDER_STATE.expectedRenderCountInput);
    setAutoRenderWorkerKey(DEFAULT_AUTO_RENDER_STATE.autoRenderWorkerKey);
    setAutoRenderFormId(DEFAULT_AUTO_RENDER_STATE.autoRenderFormId);
    setAutoRenderTemplateId(DEFAULT_AUTO_RENDER_STATE.autoRenderTemplateId);
    setAutoRenderFormValues(DEFAULT_AUTO_RENDER_STATE.autoRenderFormValues);
    setAutoRenderLaunchMode(DEFAULT_AUTO_RENDER_STATE.autoRenderLaunchMode);
  }, []);

  const hydrateAutoRenderFromTask = useCallback((task) => {
    const nextState = buildHydratedAutoRenderState(task, normalizedRenderTemplateOptions);
    setExpectedRenderCountInput(nextState.expectedRenderCountInput);
    setAutoRenderWorkerKey(nextState.autoRenderWorkerKey);
    setAutoRenderFormId(nextState.autoRenderFormId);
    setAutoRenderTemplateId(nextState.autoRenderTemplateId);
    setAutoRenderFormValues(nextState.autoRenderFormValues);
    setAutoRenderLaunchMode(nextState.autoRenderLaunchMode);
  }, [normalizedRenderTemplateOptions]);

  return {
    expectedRenderCountInput,
    setExpectedRenderCountInput,
    autoRenderWorkerKey,
    setAutoRenderWorkerKey,
    autoRenderFormId,
    setAutoRenderFormId,
    autoRenderTemplateId,
    setAutoRenderTemplateId,
    autoRenderFormFields,
    autoRenderFormFieldsLoading,
    autoRenderFormFieldsError,
    autoRenderFormValues,
    setAutoRenderFormValues,
    autoRenderProjectCatalogLoading,
    autoRenderProjectCatalogError,
    autoRenderLaunchMode,
    setAutoRenderLaunchMode,
    filteredAutoRenderForms,
    selectedAutoRenderForm,
    visibleAutoRenderFormFields,
    selectedAutoRenderProjectRef,
    renderTemplatesForSelectedAutoForm,
    selectedAutoRenderTemplate,
    expectedRenderCountForForm,
    expectedRenderNamesPreview,
    autoExpectedRenderName,
    projectOptionByRef,
    projectLookupByAny,
    resetAutoRenderState,
    hydrateAutoRenderFromTask,
  };
}

export default useTaskAutoRenderController;
