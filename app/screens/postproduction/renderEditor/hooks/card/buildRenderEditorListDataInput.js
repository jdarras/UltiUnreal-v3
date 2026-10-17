import { buildRenderEditorListControllerInput } from "./buildRenderEditorListControllerInput";

function buildRenderEditorCatalogOptionsInput({
  renderWorkers = [],
  projectOptions = [],
  renderTemplates = [],
  resourceOptions = [],
  formState = {},
  preferences = {},
} = {}) {
  return {
    renderWorkers,
    projectOptions,
    renderTemplates,
    resourceOptions,
    selectedResourceRefs: formState.selectedResourceRefs,
    setSelectedResourceRefs: formState.setSelectedResourceRefs,
    listResourceFilter: preferences.listResourceFilter,
    setListResourceFilter: preferences.setListResourceFilter,
  };
}

function buildRenderEditorListControllerCardInput({
  t,
  tasks = [],
  renders = [],
  renderForms = [],
  catalog = {},
  preferences = {},
} = {}) {
  return buildRenderEditorListControllerInput({
    t,
    tasks,
    renders,
    renderForms,
    normalizedProjectOptions: catalog.normalizedProjectOptions,
    normalizedResourceOptions: catalog.normalizedResourceOptions,
    normalizedRenderWorkers: catalog.normalizedRenderWorkers,
    favoriteOnly: preferences.favoriteOnly,
    taskFavorites: preferences.taskFavorites,
    setTaskFavorites: preferences.setTaskFavorites,
    searchQuery: preferences.searchQuery,
    listStatusFilter: preferences.listStatusFilter,
    listRenderWorkerFilter: preferences.listRenderWorkerFilter,
    setListRenderWorkerFilter: preferences.setListRenderWorkerFilter,
    listProjectFilter: preferences.listProjectFilter,
    setListProjectFilter: preferences.setListProjectFilter,
    listFormFilter: preferences.listFormFilter,
    setListFormFilter: preferences.setListFormFilter,
    listRenderModeFilter: preferences.listRenderModeFilter,
    setListRenderModeFilter: preferences.setListRenderModeFilter,
    listSortKey: preferences.listSortKey,
    setListSortKey: preferences.setListSortKey,
    listSortDir: preferences.listSortDir,
    setListSortDir: preferences.setListSortDir,
  });
}

export {
  buildRenderEditorCatalogOptionsInput,
  buildRenderEditorListControllerCardInput,
};
