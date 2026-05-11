import { useEffect } from 'react';
import { getLibraryItem } from '../../utils/agent';
import { normalizeResource, applyFavoriteToResource } from '../../utils/resources-helpers';

export function useResourceDetailLoader({
  detailUid,
  detailInitRef,
  aliveRef,
  resourceFavoritesRef,
  setDetailData,
  setDetailLoading,
} = {}) {
  useEffect(() => {
    let cancelled = false;
    if (!detailUid) {
      detailInitRef.current = '';
      setDetailData(null);
      setDetailLoading(false);
      return () => {};
    }

    setDetailLoading(true);
    getLibraryItem(detailUid)
      .then((res) => {
        if (cancelled || !aliveRef.current) return;
        if (res?.item) {
          const normalizedItem = normalizeResource(res.item);
          setDetailData(applyFavoriteToResource(normalizedItem, resourceFavoritesRef.current));
        } else {
          setDetailData(null);
        }
      })
      .catch(() => {
        if (cancelled || !aliveRef.current) return;
        setDetailData(null);
      })
      .finally(() => {
        if (!cancelled && aliveRef.current) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailUid, detailInitRef, aliveRef, resourceFavoritesRef, setDetailData, setDetailLoading]);
}

export default useResourceDetailLoader;
