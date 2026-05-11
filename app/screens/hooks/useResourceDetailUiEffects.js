import { useEffect } from 'react';

export function useResourceDetailUiEffects({
  detailUid,
  detailDraftNote,
  detailNoteRef,
  setTagInput,
} = {}) {
  useEffect(() => {
    const el = detailNoteRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [detailDraftNote, detailUid, detailNoteRef]);

  useEffect(() => {
    setTagInput('');
  }, [detailUid, setTagInput]);
}

export default useResourceDetailUiEffects;
