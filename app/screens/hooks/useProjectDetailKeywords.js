import { useCallback, useMemo } from 'react';
import { normalizeKeywordsList } from '../../utils/projectsScreenUtils';

function normalizeKeyword(value) {
  let sv = String(value || '').trim();
  if (!sv) return '';
  if (sv.length > 48) sv = sv.slice(0, 48);
  return sv.toLowerCase();
}

export function useProjectDetailKeywords({
  detailKeywordsRaw,
  keywordsInput,
  setKeywordsInput,
  updateDetailField,
  keywordsDirtyRef,
} = {}) {
  const detailKeywordsList = useMemo(
    () => normalizeKeywordsList(detailKeywordsRaw),
    [detailKeywordsRaw]
  );

  const detailKeywordsSet = useMemo(
    () => new Set(detailKeywordsList.map((k) => k.toLowerCase())),
    [detailKeywordsList]
  );

  const addKeywordToDraft = useCallback((raw) => {
    const parts = String(raw || '')
      .split(/[,;\n]+/)
      .map((s) => normalizeKeyword(s))
      .filter(Boolean);

    if (!parts.length) {
      setKeywordsInput('');
      return;
    }

    const seen = new Set(detailKeywordsSet);
    const toAdd = [];
    parts.forEach((kw) => {
      if (seen.has(kw)) return;
      seen.add(kw);
      toAdd.push(kw);
    });

    if (!toAdd.length) {
      setKeywordsInput('');
      return;
    }

    updateDetailField('keywords', [...detailKeywordsList, ...toAdd]);
    setKeywordsInput('');
    keywordsDirtyRef.current = true;
  }, [detailKeywordsList, detailKeywordsSet, keywordsDirtyRef, setKeywordsInput, updateDetailField]);

  const removeKeywordFromDraft = useCallback((kw) => {
    const key = normalizeKeyword(kw);
    if (!key) return;
    const next = detailKeywordsList.filter((item) => normalizeKeyword(item) !== key);
    updateDetailField('keywords', next);
  }, [detailKeywordsList, updateDetailField]);

  const handleKeywordKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeywordToDraft(keywordsInput);
    }
  }, [addKeywordToDraft, keywordsInput]);

  return {
    detailKeywordsList,
    addKeywordToDraft,
    removeKeywordFromDraft,
    handleKeywordKeyDown,
  };
}

export default useProjectDetailKeywords;
