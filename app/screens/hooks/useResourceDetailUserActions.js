import { useCallback } from 'react';
import { postLibraryItem } from '../../utils/agent';
import {
  USAGE_VALUES,
  STYLE_VALUES,
  AMBIANCE_VALUES,
  LICENSE_VALUES,
  normalizeUid,
  normalizeValue,
  normalizeList,
  normalizeSelectValue,
  normalizeBool,
  normalizeRating,
  normalizeUserUsageFromServer,
  normalizeResource,
  applyFavoriteToResource,
  keywordsToString,
  splitKeywords,
} from '../../utils/resources-helpers';

export function useResourceDetailUserActions({
  detailUid,
  detailItem,
  setItems,
  setDetailData,
  setDetailDraft,
  setResourceFavorites,
  resourceFavoritesRef,
} = {}) {
  const setResourceFavoriteLocal = useCallback((resourceUid, isFavorite) => {
    const uid = normalizeUid(resourceUid);
    if (!uid) return;
    setResourceFavorites((prev) => {
      const next = { ...(prev && typeof prev === 'object' ? prev : {}) };
      if (isFavorite === true) next[uid] = true;
      else delete next[uid];
      return next;
    });
    setItems((prev) =>
      prev.map((it) => {
        if (normalizeUid(it?.uid) !== uid) return it;
        return {
          ...it,
          user: { ...(it?.user && typeof it.user === 'object' ? it.user : {}), favorite: isFavorite === true },
        };
      })
    );
    const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
    if (isActiveDetail) {
      setDetailData((prev) => {
        if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
        return {
          ...prev,
          user: { ...(prev.user || {}), favorite: isFavorite === true },
        };
      });
      setDetailDraft((prev) => ({ ...(prev || {}), favorite: isFavorite === true }));
    }
  }, [detailUid, detailItem, setResourceFavorites, setItems, setDetailData, setDetailDraft]);

  const toggleUserFlag = useCallback(async (item, field) => {
    const uid = normalizeUid(item?.uid);
    if (!uid) return;
    const prevValue = normalizeBool(item?.user?.[field]);
    const nextValue = !prevValue;
    if (field === 'favorite') {
      setResourceFavoriteLocal(uid, nextValue);
      return;
    }
    const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
    const applyFlag = (val) => (it) =>
      normalizeUid(it?.uid) === uid
        ? { ...it, user: { ...(it.user || {}), [field]: val } }
        : it;

    setItems((prev) => prev.map(applyFlag(nextValue)));
    if (isActiveDetail) {
      setDetailData((prev) => {
        if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
        return { ...prev, user: { ...(prev.user || {}), [field]: nextValue } };
      });
      setDetailDraft((prev) => ({ ...prev, [field]: nextValue }));
    }

    if (isActiveDetail) return;

    const baseUser = item?.user && typeof item.user === 'object' ? item.user : {};
    const payload = { ...baseUser, [field]: nextValue };

    try {
      const res = await postLibraryItem({ uid, user: payload }).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok && res?.item) {
        const normalizedItem = applyFavoriteToResource(normalizeResource(res.item), resourceFavoritesRef.current);
        setItems((prev) => prev.map((it) => (normalizeUid(it?.uid) === uid ? normalizedItem : it)));
      } else {
        setItems((prev) => prev.map(applyFlag(prevValue)));
      }
    } catch {
      setItems((prev) => prev.map(applyFlag(prevValue)));
    }
  }, [detailUid, detailItem, setResourceFavoriteLocal, setItems, setDetailData, setDetailDraft, resourceFavoritesRef]);

  const toggleFavorite = useCallback((item) => toggleUserFlag(item, 'favorite'), [toggleUserFlag]);
  const togglePurchased = useCallback((item) => toggleUserFlag(item, 'purchased'), [toggleUserFlag]);
  const toggleTested = useCallback((item) => toggleUserFlag(item, 'tested'), [toggleUserFlag]);

  const updateUserFields = useCallback(
    async (item, patch) => {
      const uid = normalizeUid(item?.uid);
      if (!uid || !patch || typeof patch !== 'object') return;
      const effectivePatch = { ...patch };
      if (Object.prototype.hasOwnProperty.call(effectivePatch, 'favorite')) {
        delete effectivePatch.favorite;
      }
      if (!Object.keys(effectivePatch).length) return;
      const prevUser = item?.user && typeof item.user === 'object' ? item.user : {};
      const nextUser = { ...prevUser, ...effectivePatch };
      const applyUser = (userObj) => (it) =>
        normalizeUid(it?.uid) === uid ? { ...it, user: { ...(it.user || {}), ...userObj } } : it;

      setItems((prev) => prev.map(applyUser(nextUser)));

      const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
      if (isActiveDetail) {
        setDetailData((prev) => {
          if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
          return { ...prev, user: { ...(prev.user || {}), ...nextUser } };
        });
        setDetailDraft((prev) => {
          if (!prev) return prev;
          const draft = { ...prev };
          if ('usage' in effectivePatch) draft.usage = normalizeSelectValue(effectivePatch.usage, USAGE_VALUES);
          if ('style' in effectivePatch) draft.style = normalizeSelectValue(effectivePatch.style, STYLE_VALUES);
          if ('ambiance' in effectivePatch) draft.ambiance = normalizeSelectValue(effectivePatch.ambiance, AMBIANCE_VALUES);
          if ('license' in effectivePatch) draft.license = normalizeSelectValue(effectivePatch.license, LICENSE_VALUES);
          if ('purchased' in effectivePatch) draft.purchased = !!effectivePatch.purchased;
          if ('tested' in effectivePatch) draft.tested = !!effectivePatch.tested;
          if ('ratingQuality' in effectivePatch) draft.ratingQuality = normalizeRating(effectivePatch.ratingQuality);
          if ('ratingPerformance' in effectivePatch) draft.ratingPerformance = normalizeRating(effectivePatch.ratingPerformance);
          return draft;
        });
      }

      try {
        const res = await postLibraryItem({ uid, user: nextUser }).catch(() => ({}));
        const ok = res && res.ok !== false;
        if (ok && res?.item) {
          const normalizedBaseItem =
            res.item && res.item.user
              ? { ...res.item, user: normalizeUserUsageFromServer(res.item.user) }
              : res.item;
          const normalizedItem = applyFavoriteToResource(normalizeResource(normalizedBaseItem), resourceFavoritesRef.current);
          setItems((prev) =>
            prev.map((it) => (normalizeUid(it?.uid) === uid ? normalizedItem || it : it))
          );
          if (isActiveDetail && res.item?.user) {
            setDetailData((prev) => {
              if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
              const normalizedUser = normalizeUserUsageFromServer(res.item.user);
              return applyFavoriteToResource({ ...prev, user: normalizedUser }, resourceFavoritesRef.current);
            });
          }
        } else {
          setItems((prev) => prev.map(applyUser(prevUser)));
        }
      } catch {
        setItems((prev) => prev.map(applyUser(prevUser)));
      }
    },
    [detailUid, detailItem, setItems, setDetailData, setDetailDraft, resourceFavoritesRef]
  );

  const setUserSelect = useCallback((item, field, value, allowed) => {
    const normalized = normalizeSelectValue(value, allowed);
    updateUserFields(item, { [field]: normalized });
  }, [updateUserFields]);

  const setUserRating = useCallback((item, field, value) => {
    const normalized = normalizeRating(value);
    updateUserFields(item, { [field]: normalized });
  }, [updateUserFields]);

  const addKeywordQuick = useCallback(async (item, rawKeyword) => {
    const uid = normalizeUid(item?.uid);
    const keyword = normalizeValue(rawKeyword);
    if (!uid || !keyword) return;
    const baseUser = item?.user && typeof item.user === 'object' ? item.user : {};
    const existingKeywords = normalizeList(baseUser.keywords);
    if (existingKeywords.includes(keyword)) return;
    const nextKeywords = [...existingKeywords, keyword];
    const applyKeywords = (kwList) => (it) =>
      normalizeUid(it?.uid) === uid
        ? { ...it, user: { ...(it.user || {}), keywords: kwList } }
        : it;

    setItems((prev) => prev.map(applyKeywords(nextKeywords)));

    const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
    if (isActiveDetail) {
      setDetailData((prev) => {
        if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
        return { ...prev, user: { ...(prev.user || {}), keywords: nextKeywords } };
      });
      setDetailDraft((prev) => {
        const current = normalizeList(splitKeywords(prev.tags));
        if (current.includes(keyword)) return prev;
        const merged = [...current, keyword];
        return { ...prev, tags: keywordsToString(merged) };
      });
    }

    try {
      const res = await postLibraryItem({ uid, user: { ...baseUser, keywords: nextKeywords } }).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok && res?.item) {
        const normalizedItem = applyFavoriteToResource(normalizeResource(res.item), resourceFavoritesRef.current);
        setItems((prev) => prev.map((it) => (normalizeUid(it?.uid) === uid ? normalizedItem : it)));
        if (isActiveDetail) {
          setDetailData((prev) => {
            if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
            return res.item?.user
              ? applyFavoriteToResource({ ...prev, user: res.item.user }, resourceFavoritesRef.current)
              : prev;
          });
        }
      } else {
        setItems((prev) => prev.map(applyKeywords(existingKeywords)));
      }
    } catch {
      setItems((prev) => prev.map(applyKeywords(existingKeywords)));
    }
  }, [detailUid, detailItem, setItems, setDetailData, setDetailDraft, resourceFavoritesRef]);

  return {
    setResourceFavoriteLocal,
    toggleFavorite,
    togglePurchased,
    toggleTested,
    updateUserFields,
    setUserSelect,
    setUserRating,
    addKeywordQuick,
  };
}

export default useResourceDetailUserActions;
