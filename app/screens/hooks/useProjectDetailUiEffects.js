import { useEffect } from 'react';

export function useProjectDetailUiEffects({
  detailMetaRef,
  detailMetaValue,
  detailNoteRef,
  detailNoteValue,
  detailId,
  detailKeywords,
  setKeywordsInput,
} = {}) {
  useEffect(() => {
    detailMetaRef.current = detailMetaValue;
  }, [detailMetaRef, detailMetaValue]);

  useEffect(() => {
    const el = detailNoteRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [detailNoteRef, detailNoteValue]);

  useEffect(() => {
    setKeywordsInput('');
  }, [detailId, detailKeywords, setKeywordsInput]);
}
