import { useEffect } from 'react';
import {
  USAGE_VALUES,
  STYLE_VALUES,
  AMBIANCE_VALUES,
  LICENSE_VALUES,
  normalizeValue,
  normalizeList,
  normalizeSelectValue,
  normalizeBool,
  normalizeRating,
  extractFabTags,
  keywordsToString,
} from '../../utils/resources-helpers';

export function useResourceDetailDraftInit({
  detailUid,
  detailItem,
  busy,
  detailLoading,
  detailInitRef,
  detailSavedRef,
  detailSavedNoteRef,
  detailNoteDirtyRef,
  setDetailUid,
  setDetailDraft,
} = {}) {
  useEffect(() => {
    if (!detailUid) return;
    if (!detailItem) {
      if (!busy && !detailLoading) setDetailUid('');
      return;
    }
    if (detailInitRef.current === detailUid) return;
    detailInitRef.current = detailUid;
    const user = detailItem?.user && typeof detailItem.user === 'object' ? detailItem.user : {};
    const usage = normalizeSelectValue(user.usage, USAGE_VALUES);
    const style = normalizeSelectValue(user.style, STYLE_VALUES);
    const ambiance = normalizeSelectValue(user.ambiance, AMBIANCE_VALUES);
    const license = normalizeSelectValue(user.license, LICENSE_VALUES);
    const purchased = normalizeBool(user.purchased);
    const tested = normalizeBool(user.tested);
    const favorite = normalizeBool(user.favorite);
    const ratingQuality = normalizeRating(user.ratingQuality);
    const ratingPerformance = normalizeRating(user.ratingPerformance);
    const userTags = normalizeList(user.keywords);
    const fallbackTags = extractFabTags(detailItem);
    const initialTags = userTags.length ? userTags : fallbackTags;
    const preservedStatus = normalizeValue(user.status);
    setDetailDraft({
      usage,
      style,
      ambiance,
      license,
      purchased,
      tested,
      favorite,
      ratingQuality,
      ratingPerformance,
      tags: keywordsToString(initialTags),
      note: String(user.note || ''),
    });
    const normalizedTags = normalizeList(initialTags).sort();
    detailSavedRef.current = JSON.stringify({
      status: preservedStatus,
      usage,
      style,
      ambiance,
      license,
      tested,
      favorite,
      ratingQuality,
      ratingPerformance,
      tags: normalizedTags,
      note: String(user.note || ''),
    });
    detailSavedNoteRef.current = String(user.note || '');
    detailNoteDirtyRef.current = false;
  }, [
    busy,
    detailInitRef,
    detailItem,
    detailLoading,
    detailNoteDirtyRef,
    detailSavedNoteRef,
    detailSavedRef,
    detailUid,
    setDetailDraft,
    setDetailUid,
  ]);
}
