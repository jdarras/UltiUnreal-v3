import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [autoRenderLaunchMode, setAutoRenderLaunchMode] = useState("");
  const [autoRenderScheduledMode, setAutoRenderScheduledMode] = useState("");
  const [autoRenderScheduledAt, setAutoRenderScheduledAt] = useState("");
  const [taskSequenceName, setTaskSequenceName] = useState("");
  const [autoRenderOffscreen, setAutoRenderOffscreen] = useState(false);
  const [autoRenderExportDestinationIds, setAutoRenderExportDestinationIds] = useState([]);
  const autoRenderStateSetters = useMemo(() => (
    buildTaskAutoRenderStateSetters({
      setExpectedRenderCountInput,
      setAutoRenderProjectRef,
      setAutoRenderWorkerKey,
      setAutoRenderFormId,
      setAutoRenderTemplateId,
      setAutoRenderFormValues,
      setAutoRenderLaunchMode,
      setAutoRenderScheduledMode,
      setAutoRenderScheduledAt,
      setTaskSequenceName,
      setAutoRenderOffscreen,
      setAutoRenderExportDestinationIds,
    })
  ), [
    setExpectedRenderCountInput,
    setAutoRenderProjectRef,
    setAutoRenderWorkerKey,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    setAutoRenderLaunchMode,
    setAutoRenderScheduledMode,
    setAutoRenderScheduledAt,
    setTaskSequenceName,
    setAutoRenderOffscreen,
    setAutoRenderExportDestinationIds,
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

  const projectCatalogSequenceOptions = useMemo(() => {
    const seqs = Array.isArray(autoRenderProjectCatalog?.sequences)
      ? autoRenderProjectCatalog.sequences
      : [];
    const allOptions = seqs
      .map((s) => {
        const val = String(s?.assetPath || s?.path || s?.name || s || "").trim();
        const label = String(s?.name || s?.assetPath || s?.path || s || "").trim();
        return val ? { value: val, label: label || val } : null;
      })
      .filter(Boolean);
    const allowedSequences = Array.isArray(selectedAutoRenderForm?.allowedSequences)
      ? selectedAutoRenderForm.allowedSequences
      : [];
    if (allowedSequences.length === 0) return allOptions;
    const allowedSet = new Set(allowedSequences.map((v) => String(v).toLowerCase()));
    return allOptions.filter((opt) => allowedSet.has(String(opt.value).toLowerCase()));
  }, [autoRenderProjectCatalog, selectedAutoRenderForm]);

  useEffect(() => {
    if (!taskSequenceName || projectCatalogSequenceOptions.length === 0) return;
    const inList = projectCatalogSequenceOptions.some((opt) => opt.value === taskSequenceName);
    if (!inList) setTaskSequenceName("");
  }, [projectCatalogSequenceOptions, taskSequenceName, setTaskSequenceName]);

  const {
    expectedRenderCountForForm,
    expectedRenderNamesPreview,
    autoExpectedRenderName,
    autoOutputType,
  } = useMemo(() => (
    buildExpectedRenderMeta({
      title,
      expectedRenderCountInput,
      outputProfile: String(selectedAutoRenderTemplate?.outputProfile || "").trim(),
    })
  ), [title, expectedRenderCountInput, selectedAutoRenderTemplate]);

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
    autoRenderScheduledMode,
    setAutoRenderScheduledMode,
    autoRenderScheduledAt,
    setAutoRenderScheduledAt,
    taskSequenceName,
    setTaskSequenceName,
    autoRenderOffscreen,
    setAutoRenderOffscreen,
    autoRenderExportDestinationIds,
    setAutoRenderExportDestinationIds,
    filteredAutoRenderForms,
    selectedAutoRenderForm,
    visibleAutoRenderFormFields,
    selectedAutoRenderProjectRef,
    renderTemplatesForSelectedAutoForm,
    selectedAutoRenderTemplate,
    expectedRenderCountForForm,
    expectedRenderNamesPreview,
    autoExpectedRenderName,
    autoOutputType,
    projectOptionByRef,
    projectLookupByAny,
    availableRenderWorkers,
    projectCatalogSequenceOptions,
    resetAutoRenderState,
    hydrateAutoRenderFromTask,
  });
}

export default useTaskAutoRenderController;
