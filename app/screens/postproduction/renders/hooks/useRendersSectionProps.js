import {
  buildToolbarProps,
} from "./sectionProps/buildRendersToolbarProps";
import {
  buildQueuePanelProps,
} from "./sectionProps/buildRendersQueuePanelProps";
import {
  buildListPanelProps,
} from "./sectionProps/buildRendersListPanelProps";
import {
  buildDetailModalProps,
} from "./sectionProps/buildRendersDetailModalProps";
import { buildRendersSectionPropsSections } from "./sectionProps/buildRendersSectionPropsSections";

function useRendersSectionProps(input = {}) {
  const {
    toolbarInput,
    queueInput,
    listInput,
    detailInput,
  } = buildRendersSectionPropsSections(input);

  const toolbarProps = buildToolbarProps(toolbarInput);
  const queuePanelProps = buildQueuePanelProps(queueInput);
  const listPanelProps = buildListPanelProps(listInput);
  const detailModalProps = buildDetailModalProps(detailInput);

  return {
    toolbarProps,
    queuePanelProps,
    listPanelProps,
    detailModalProps,
  };
}

export {
  useRendersSectionProps,
};
