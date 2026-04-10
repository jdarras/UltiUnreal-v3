import { useCallback, useMemo, useState } from "react";
import {
  buildHydratedAutoRenderState,
  DEFAULT_AUTO_RENDER_STATE,
} from "./autoRender/taskAutoRenderStateHelpers";
import {
  applyAutoRenderStateSetters,
  buildExpectedRenderMeta,
  buildVisibleAutoRenderFormFields,
} from "./autoRender/taskAutoRenderControllerHelpers";
import { buildTaskAutoRenderStateSetters } from "./autoRender/buildTaskAutoRenderStateSetters";
import { buildTaskAutoRenderControllerOutput } from "./autoRender/buildTaskAutoRenderControllerOutput";
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
  const [autoRenderProjectRef, setAutoRenderProjectRef] = useState("");
  const [autoRenderWorkerKey, setAutoRenderWorkerKey] = useState("auto");
  const [autoRenderFormId, setAutoRenderFormId] = useState("");
  const [autoRenderTemplateId, setAutoRenderTemplateId] = useState("");
  const [autoRenderFormValues, setAutoRenderFormValues] = useState({});
  const [autoRenderLaunchMode, setAutoRenderLaunchMode] = useState("scheduled");
  const autoRenderStateSetters = useMemo(() => (
    buildTaskAutoRenderStateSetters({
      setExpectedRenderCountInput,
      setAutoRenderProjectRef,
      setAutoRenderWorkerKey,
      setAutoRenderFormId,
      setAutoRenderTemplateId,
      setAutoRenderFormValues,
      setAutoRenderLaunchMode,
    })
  ), [
    setExpectedRenderCountInput,
    setAutoRenderProjectRef,
    setAutoRenderWorkerKey,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    setAutoRenderLaunchMode,
  ]);

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
    autoRenderProjectRef,
    setAutoRenderProjectRef,
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

  const visibleAutoRenderFormFields = useMemo(
    () => buildVisibleAutoRenderFormFields(autoRenderFormFields),
    [autoRenderFormFields]
  );

  const {
    expectedRenderCountForForm,
    expectedRenderNamesPreview,
    autoExpectedRenderName,
  } = useMemo(() => (
    buildExpectedRenderMeta({ title, expectedRenderCountInput })
  ), [title, expectedRenderCountInput]);

  const resetAutoRenderState = useCallback(() => {
    applyAutoRenderStateSetters(autoRenderStateSetters, DEFAULT_AUTO_RENDER_STATE);
  }, [autoRenderStateSetters]);

  const hydrateAutoRenderFromTask = useCallback((task) => {
    const nextState = buildHydratedAutoRenderState(task, normalizedRenderTemplateOptions);
    applyAutoRenderStateSetters(autoRenderStateSetters, nextState);
  }, [autoRenderStateSetters, normalizedRenderTemplateOptions]);

  return buildTaskAutoRenderControllerOutput({
    expectedRenderCountInput,
    setExpectedRenderCountInput,
    autoRenderProjectRef,
    setAutoRenderProjectRef,
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
    availableRenderWorkers,
    resetAutoRenderState,
    hydrateAutoRenderFromTask,
  });
}

export default useTaskAutoRenderController;
