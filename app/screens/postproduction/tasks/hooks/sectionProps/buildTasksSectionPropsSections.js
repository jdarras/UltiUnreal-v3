import { buildTasksBrowseInput } from "./buildTasksBrowseInput";
import { buildTasksDeleteDialogInput } from "./buildTasksDeleteDialogInput";
import { buildTasksEditorInput } from "./buildTasksEditorInput";
import { buildTasksStatusInput } from "./buildTasksStatusInput";

export function buildTasksSectionPropsSections(input = {}) {
  return {
    browseInput: buildTasksBrowseInput(input),
    editorInput: buildTasksEditorInput(input),
    statusInput: buildTasksStatusInput(input),
    deleteDialogInput: buildTasksDeleteDialogInput(input),
  };
}

export default buildTasksSectionPropsSections;
