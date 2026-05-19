import { useEffect } from 'react';

export function useProjectsNoticeEffect({ noticeApi, candidates = [] } = {}) {
  useEffect(() => {
    if (!noticeApi) return;
    const first = (Array.isArray(candidates) ? candidates : []).find(
      (entry) => entry && String(entry.text || '').trim()
    );
    if (!first) return;
    noticeApi.showNotice?.(first.text, first.type || '');
  }, [noticeApi, candidates]);
}
