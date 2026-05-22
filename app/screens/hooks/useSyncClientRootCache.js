import React from 'react';

const LS_SYNC_ROOT = 'uu_client_syncRoot';

export function useSyncClientRootCache() {
  const readCachedRoot = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_SYNC_ROOT);
      return typeof raw === 'string' ? raw : '';
    } catch {
      return '';
    }
  }, []);

  const writeCachedRoot = React.useCallback((val) => {
    try {
      localStorage.setItem(LS_SYNC_ROOT, String(val || ''));
    } catch {}
  }, []);

  return {
    readCachedRoot,
    writeCachedRoot,
  };
}
