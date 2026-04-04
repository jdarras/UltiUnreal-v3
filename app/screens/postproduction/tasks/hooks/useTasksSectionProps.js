import {
  buildTasksBrowseSectionProps,
} from "./sectionProps/buildTasksBrowseSectionProps";
import {
  buildTasksEditorSectionProps,
} from "./sectionProps/buildTasksEditorSectionProps";
import {
  buildTasksStatusMessagesProps,
} from "./sectionProps/buildTasksStatusMessagesProps";
import {
  buildTasksDeleteDialogProps,
} from "./sectionProps/buildTasksDeleteDialogProps";
import { buildTasksSectionPropsSections } from "./sectionProps/buildTasksSectionPropsSections";

function useTasksSectionProps(input = {}) {
  const {
    browseInput,
    editorInput,
    statusInput,
    deleteDialogInput,
  } = buildTasksSectionPropsSections(input);

  const browseSectionProps = buildTasksBrowseSectionProps(browseInput);
  const editorSectionProps = buildTasksEditorSectionProps(editorInput);
  const statusMessagesProps = buildTasksStatusMessagesProps(statusInput);
  const deleteDialogProps = buildTasksDeleteDialogProps(deleteDialogInput);

  return {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
  };
}

export { useTasksSectionProps };
