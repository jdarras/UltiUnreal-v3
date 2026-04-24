import {
  buildRenderEditorBrowseSectionProps,
} from "./sectionProps/buildRenderEditorBrowseSectionProps";
import {
  buildRenderEditorSectionProps,
} from "./sectionProps/buildRenderEditorEditorSectionProps";
import {
  buildRenderEditorStatusMessagesProps,
} from "./sectionProps/buildRenderEditorStatusMessagesProps";
import {
  buildRenderEditorDeleteDialogProps,
} from "./sectionProps/buildRenderEditorDeleteDialogProps";
import { buildRenderEditorSectionPropsSections } from "./sectionProps/buildRenderEditorSectionPropsSections";

function useRenderEditorSectionProps(input = {}) {
  const {
    browseInput,
    editorInput,
    statusInput,
    deleteDialogInput,
  } = buildRenderEditorSectionPropsSections(input);

  const browseSectionProps = buildRenderEditorBrowseSectionProps(browseInput);
  const editorSectionProps = buildRenderEditorSectionProps(editorInput);
  const statusMessagesProps = buildRenderEditorStatusMessagesProps(statusInput);
  const deleteDialogProps = buildRenderEditorDeleteDialogProps(deleteDialogInput);

  return {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
  };
}

export { useRenderEditorSectionProps };
