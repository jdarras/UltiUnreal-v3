import { buildRendersDetailInput } from "./buildRendersDetailInput";
import { buildRendersListInput } from "./buildRendersListInput";
import { buildRendersQueueInput } from "./buildRendersQueueInput";
import { buildRendersToolbarInput } from "./buildRendersToolbarInput";

export function buildRendersSectionPropsSections(input = {}) {
  return {
    toolbarInput: buildRendersToolbarInput(input),
    queueInput: buildRendersQueueInput(input),
    listInput: buildRendersListInput(input),
    detailInput: buildRendersDetailInput(input),
  };
}
