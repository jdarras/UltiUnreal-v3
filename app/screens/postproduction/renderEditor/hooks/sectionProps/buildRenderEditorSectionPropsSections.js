import { buildRenderEditorBrowseInput } from "./buildRenderEditorBrowseInput";
import { buildRenderEditorDeleteDialogInput } from "./buildRenderEditorDeleteDialogInput";
import { buildRenderEditorEditorInput } from "./buildRenderEditorEditorInput";
import { buildRenderEditorStatusInput } from "./buildRenderEditorStatusInput";

export function buildRenderEditorSectionPropsSections(input = {}) {
  return {
    browseInput: buildRenderEditorBrowseInput(input),
    editorInput: buildRenderEditorEditorInput(input),
    statusInput: buildRenderEditorStatusInput(input),
    deleteDialogInput: buildRenderEditorDeleteDialogInput(input),
  };
}

export default buildRenderEditorSectionPropsSections;
