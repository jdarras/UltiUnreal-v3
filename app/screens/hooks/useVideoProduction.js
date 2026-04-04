import { useState, useCallback, useEffect, useRef } from 'react';
import { getProjectMeta, setProjectVideoProduction } from '../../utils/agent';
import { boolFromIni, parseSmoothedRange, formatFixed2 } from '../../utils/projects-helpers';

export function useVideoProduction({ t, detailId, detailIsNew, detailInsights, setDetailInsights }) {
  const [vpDraft, setVpDraft] = useState(null);
  const [vpMsg, setVpMsg] = useState('');
  const [vpMsgType, setVpMsgType] = useState(''); // ok | error
  const [vpBusy, setVpBusy] = useState(false);
  const timerRef = useRef(null);

  // Charger le brouillon depuis les insights
  useEffect(() => {
    if (!detailId || detailIsNew) {
      setVpDraft(null);
      return;
    }
    const setup = detailInsights?.setupVideoProduction;
    if (!setup || typeof setup !== 'object') {
      setVpDraft(null);
      return;
    }
    const cadence = setup.cadence && typeof setup.cadence === 'object' ? setup.cadence : {};
    const range = parseSmoothedRange(cadence.SmoothedFrameRateRange);
    setVpDraft({
      minDesiredFrameRate: formatFixed2(cadence.MinDesiredFrameRate),
      smoothEnabled: boolFromIni(cadence.bSmoothFrameRate),
      smoothMin: formatFixed2(range.min),
      smoothMax: formatFixed2(range.max),
      useFixedFrameRate: boolFromIni(cadence.bUseFixedFrameRate),
      fixedFrameRate: formatFixed2(cadence.FixedFrameRate),
    });
  }, [detailId, detailIsNew, detailInsights?.setupVideoProduction]);

  const saveVideoProduction = useCallback(
    async (draft) => {
      const pid = String(detailId || '').trim();
      if (!pid || !draft || detailIsNew) return;
      setVpBusy(true);
      setVpMsg('');
      setVpMsgType('');
      try {
        const res = await setProjectVideoProduction(pid, {
          minDesiredFrameRate: draft.minDesiredFrameRate,
          smoothEnabled: draft.smoothEnabled,
          smoothMin: draft.smoothMin,
          smoothMax: draft.smoothMax,
          useFixedFrameRate: draft.useFixedFrameRate,
          fixedFrameRate: draft.fixedFrameRate,
        });
        if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');

        try {
          const next = await getProjectMeta(pid);
          if (next && next.ok) setDetailInsights?.(next.insights || {});
        } catch {}

        setVpMsgType('ok');
        setVpMsg(t('projects.detail.vp.updateOk'));
        setTimeout(() => setVpMsg(''), 2000);
      } catch {
        setVpMsgType('error');
        setVpMsg(t('projects.detail.vp.updateError'));
      } finally {
        setVpBusy(false);
      }
    },
    [detailId, detailIsNew, setDetailInsights, t]
  );

  const scheduleVpSave = useCallback(
    (nextDraft) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVpDraft(nextDraft);
      timerRef.current = setTimeout(() => saveVideoProduction(nextDraft), 600);
    },
    [saveVideoProduction]
  );

  const formatFixedValue = useCallback((val) => formatFixed2(val), []);

  const clearVpMsg = useCallback(() => {
    setVpMsg('');
    setVpMsgType('');
  }, []);

  return {
    vpDraft,
    setVpDraft,
    vpMsg,
    setVpMsg,
    vpMsgType,
    setVpMsgType,
    vpBusy,
    setVpBusy,
    scheduleVpSave,
    formatFixedValue,
    clearVpMsg,
  };
}
