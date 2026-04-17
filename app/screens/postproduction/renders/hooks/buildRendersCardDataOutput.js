import {
  buildDetailOutput,
  buildListOutput,
  buildPreferencesOutput,
  buildQueueOutput,
  buildReviewOutput,
  buildToolbarOutput,
} from "./buildRendersCardDataOutputSections";

export function buildRendersCardDataOutput({
  preferences = {},
  review = {},
  list = {},
  detail = {},
  queue = {},
  toolbar = {},
} = {}) {
  return {
    ...buildPreferencesOutput({ preferences, toolbar, list }),
    ...buildReviewOutput({ review }),
    ...buildListOutput({ list }),
    ...buildDetailOutput({ detail }),
    ...buildQueueOutput({ queue, preferences }),
    ...buildToolbarOutput({ toolbar }),
  };
}

export default buildRendersCardDataOutput;
