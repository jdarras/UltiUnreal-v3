import { useMemo } from 'react';
import { normalizeUid } from '../../utils/resources-helpers';

export function useResourceDetailSelection({
  detailUid,
  detailData,
  items,
  filteredResources,
} = {}) {
  const detailItem = useMemo(() => {
    const key = normalizeUid(detailUid);
    if (!key) return null;
    if (detailData && normalizeUid(detailData?.uid) === key) return detailData;
    return (Array.isArray(items) ? items : []).find(
      (item) => normalizeUid(item?.uid) === key
    ) || null;
  }, [items, detailUid, detailData]);

  const detailList = useMemo(() => {
    const list = Array.isArray(filteredResources) ? filteredResources : [];
    if (!list.length) return Array.isArray(items) ? items : [];
    const key = normalizeUid(detailUid);
    if (!key) return list;
    const exists = list.some((item) => normalizeUid(item?.uid) === key);
    return exists ? list : (Array.isArray(items) ? items : []);
  }, [filteredResources, items, detailUid]);

  const detailIndex = useMemo(() => {
    const key = normalizeUid(detailUid);
    if (!key) return -1;
    return detailList.findIndex((item) => normalizeUid(item?.uid) === key);
  }, [detailList, detailUid]);

  const detailHasNav = detailList.length > 1 && detailIndex >= 0;
  const detailTitle = detailItem?.title || detailItem?.uid || '';

  return {
    detailItem,
    detailList,
    detailIndex,
    detailHasNav,
    detailTitle,
  };
}
