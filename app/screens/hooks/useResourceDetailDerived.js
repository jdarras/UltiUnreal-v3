import { useMemo } from 'react';
import {
  normalizeList,
  extractDescription,
  extractTechnicalDetails,
  splitKeywords,
} from '../../utils/resources-helpers';

export function useResourceDetailDerived({
  detailItem,
  detailDraftTags,
} = {}) {
  const detailDescription = useMemo(
    () => (detailItem ? extractDescription(detailItem) : ''),
    [detailItem]
  );

  const detailTechnical = useMemo(
    () => (detailItem ? extractTechnicalDetails(detailItem) : []),
    [detailItem]
  );

  const vendorDescription = useMemo(
    () => [detailDescription, ...detailTechnical].filter(Boolean).join('\n\n'),
    [detailDescription, detailTechnical]
  );

  const detailTagsList = useMemo(
    () => normalizeList(splitKeywords(detailDraftTags)),
    [detailDraftTags]
  );

  const detailTagsSet = useMemo(
    () => new Set(detailTagsList.map((tag) => tag.toLowerCase())),
    [detailTagsList]
  );

  return {
    detailDescription,
    detailTechnical,
    vendorDescription,
    detailTagsList,
    detailTagsSet,
  };
}
