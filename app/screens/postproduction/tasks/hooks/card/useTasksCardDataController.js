import { useTaskFocusRequestController } from "../useTaskFocusRequestController";
import { useTasksCardListData } from "./useTasksCardListData";
import { useTasksCardAutoRenderData } from "./useTasksCardAutoRenderData";

export function useTasksCardDataController({
  t,
  tasks = [],
  renders = [],
  projectOptions = [],
  resourceOptions = [],
  renderTemplates = [],
  renderForms = [],
  renderWorkers = [],
  renderOutputDir = "",
  taskFocusRequest = null,
  onTaskFocusHandled = null,
  onLoadRenderFormFields = null,
  onLoadProjectUnrealCatalog = null,
  onFormModeChange = null,
} = {}) {
  const listData = useTasksCardListData({
    t,
    tasks,
    renders,
    projectOptions,
    resourceOptions,
    renderTemplates,
    renderForms,
    renderWorkers,
    onFormModeChange,
  });

  const autoRenderData = useTasksCardAutoRenderData({
    t,
    title: listData.title,
    description: listData.description,
    renderOutputDir,
    renderForms,
    normalizedProjectOptions: listData.normalizedProjectOptions,
    normalizedRenderTemplateOptions: listData.normalizedRenderTemplateOptions,
    availableRenderWorkers: listData.availableRenderWorkers,
    selectedResourceRefs: listData.selectedResourceRefs,
    onLoadRenderFormFields,
    onLoadProjectUnrealCatalog,
  });

  useTaskFocusRequestController({
    taskFocusRequest,
    onTaskFocusHandled,
    setListProjectFilter: listData.setListProjectFilter,
    setListResourceFilter: listData.setListResourceFilter,
    setListStatusFilter: listData.setListStatusFilter,
    setEditingTaskId: listData.setEditingTaskId,
    setShowCreateForm: listData.setShowCreateForm,
    setAutoRenderProjectRef: autoRenderData.setAutoRenderProjectRef,
    setAutoRenderFormId: autoRenderData.setAutoRenderFormId,
    setAutoRenderTemplateId: autoRenderData.setAutoRenderTemplateId,
    setAutoRenderFormValues: autoRenderData.setAutoRenderFormValues,
    setViewMode: listData.setViewMode,
    setFormError: listData.setFormError,
  });

  return {
    ...listData,
    ...autoRenderData,
  };
}

export default useTasksCardDataController;
