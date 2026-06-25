import React from 'react';
import { getSyncSummary } from '../utils/agent';

export function useRenderSyncNavAlert({ enabled = false, t } = {}) {
  const [summary, setSummary] = React.useState(null);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async (force = false) => {
    if (!enabled) {
      setSummary(null);
      setError('');
      return;
    }
    try {
      const result = await getSyncSummary({ refresh: force });
      setSummary(result && result.ok !== false ? result : null);
      setError('');
    } catch (requestError) {
      setSummary(null);
      setError(String(requestError?.message || requestError));
    }
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled) {
      setSummary(null);
      setError('');
      return undefined;
    }
    void refresh(false);
    const timer = window.setInterval(() => void refresh(false), 60000);
    const handleStateChanged = () => void refresh(true);
    window.addEventListener('ultiunreal:sync-state-changed', handleStateChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('ultiunreal:sync-state-changed', handleStateChanged);
    };
  }, [enabled, refresh]);

  return React.useMemo(() => {
    if (error) {
      return { level: 'warn', tooltip: t('sync.nav.checkError') };
    }
    if (!summary?.needed) return null;
    const conflictCount = Number(summary.conflictCount || 0);
    const desyncCount = Number(summary.desyncCount || 0);
    const errorCount = Number(summary.errorCount || 0);
    const tooltip = conflictCount > 0
      ? t('sync.nav.conflicts', { count: conflictCount })
      : t('sync.nav.required', { count: desyncCount + errorCount });
    return { level: 'error', tooltip };
  }, [error, summary, t]);
}
