import { useCallback } from 'react';
import { keywordsToString, normalizeValue } from '../../utils/resources-helpers';

export function useResourceDetailTags({
  detailTagsList,
  detailTagsSet,
  setDetailDraft,
  detailTagsDirtyRef,
  tagInput,
  setTagInput,
} = {}) {
  const addTagToDraft = useCallback((raw) => {
    const parts = String(raw || '')
      .split(/[,;\n]+/)
      .map((val) => normalizeValue(val).toLowerCase())
      .map((val) => (val.length > 48 ? val.slice(0, 48) : val))
      .filter(Boolean);

    if (!parts.length) return;

    const seen = new Set(detailTagsSet);
    const toAdd = [];
    parts.forEach((tag) => {
      if (seen.has(tag)) return;
      seen.add(tag);
      toAdd.push(tag);
    });

    if (!toAdd.length) {
      setTagInput('');
      return;
    }

    const next = [...detailTagsList, ...toAdd];
    setDetailDraft((prev) => ({ ...prev, tags: keywordsToString(next) }));
    if (detailTagsDirtyRef) detailTagsDirtyRef.current = true;
    setTagInput('');
  }, [detailTagsSet, setTagInput, detailTagsList, setDetailDraft, detailTagsDirtyRef]);

  const removeTagFromDraft = useCallback((tag) => {
    const key = normalizeValue(tag).toLowerCase();
    if (!key) return;
    const next = detailTagsList.filter((item) => item.toLowerCase() !== key);
    setDetailDraft((prev) => ({ ...prev, tags: keywordsToString(next) }));
    if (detailTagsDirtyRef) detailTagsDirtyRef.current = true;
  }, [detailTagsList, setDetailDraft, detailTagsDirtyRef]);

  const handleTagInputKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTagToDraft(tagInput);
    }
  }, [addTagToDraft, tagInput]);

  return {
    addTagToDraft,
    removeTagFromDraft,
    handleTagInputKeyDown,
  };
}

export default useResourceDetailTags;
