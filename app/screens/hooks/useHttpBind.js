import { useState, useMemo, useCallback } from 'react';
import { normalizeHttpBindInput, isValidHttpBindInput } from '../../utils/projectsScreenUtils';
import { setProjectHttpBind } from '../../utils/agent';
import { useTransientInfo } from './useTransientInfo';

export function useHttpBind({ detailInsights, detailId, detailIsNew, t, setDetailInsights }) {
  const {
    infoMsg: httpBindDetailMsg,
    setInfoMsg: setHttpBindDetailMsg,
    infoMsgType: httpBindDetailMsgType,
    setInfoMsgType: setHttpBindDetailMsgType,
    showInfo: showHttpBindDetailMsg,
    clearInfo: clearHttpBindDetailMsg,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 2000 });
  const [httpBindEditing, setHttpBindEditing] = useState(false);
  const [httpBindDraft, setHttpBindDraft] = useState('');
  const [httpBindBusy, setHttpBindBusy] = useState(false);

  const {
    httpIniKnown,
    httpIniExists,
    httpBindAddress,
    canEditHttpBind,
  } = useMemo(() => {
    const info = detailInsights && typeof detailInsights === 'object' ? detailInsights.httpServer || {} : {};
    const iniKnown = Object.prototype.hasOwnProperty.call(info, 'iniExists');
    const iniExists = iniKnown ? !!info.iniExists : null;
    const bind = String(info.bindAddress || '').trim();
    const canEdit = iniExists === true && !detailIsNew && !!detailId;
    return { httpIniKnown: iniKnown, httpIniExists: iniExists, httpBindAddress: bind, canEditHttpBind: canEdit };
  }, [detailInsights, detailId, detailIsNew]);

  const httpBindValue = httpBindEditing ? httpBindDraft : httpBindAddress;
  const httpBindValueTrim = normalizeHttpBindInput(httpBindValue);
  const httpBindValueValid = isValidHttpBindInput(httpBindValueTrim);
  const httpBindDraftTrim = normalizeHttpBindInput(httpBindDraft);
  const httpBindDraftValid = isValidHttpBindInput(httpBindDraftTrim);
  const httpBindDisplay = httpIniKnown
    ? (httpBindAddress || t('projects.detail.httpBind.notSet'))
    : t('projects.detail.httpBind.iniMissing');
  const httpBindDisplayClass = httpIniExists === false ? 'uu-msg error' : 'uu-muted';
  const showHttpBindWarning =
    !httpBindEditing &&
    httpBindValueValid &&
    httpBindValueTrim !== '0.0.0.0';
  const httpBindInlineMsg = httpBindDetailMsg
    ? httpBindDetailMsg
    : (showHttpBindWarning ? t('projects.detail.httpBind.recommendation') : '');
  const httpBindInlineClass =
    httpBindDetailMsg && httpBindDetailMsgType
      ? `uu-msg ${httpBindDetailMsgType}`
      : showHttpBindWarning
      ? 'uu-msg warning'
      : 'uu-muted';

  const startHttpBindEdit = useCallback(() => {
    if (!canEditHttpBind) return;
    const nextValue = httpBindAddress || '0.0.0.0';
    setHttpBindDraft(nextValue);
    setHttpBindEditing(true);
    clearHttpBindDetailMsg();
  }, [canEditHttpBind, clearHttpBindDetailMsg, httpBindAddress]);

  const cancelHttpBindEdit = useCallback(() => {
    setHttpBindEditing(false);
    setHttpBindDraft('');
    clearHttpBindDetailMsg();
  }, [clearHttpBindDetailMsg]);

  const saveHttpBindAddress = useCallback(async () => {
    if (!canEditHttpBind) return;
    const pid = String(detailId || '').trim();
    if (!pid) return;
    const nextValue = normalizeHttpBindInput(httpBindDraft);
    if (!isValidHttpBindInput(nextValue)) {
      showHttpBindDetailMsg(t('projects.detail.httpBind.invalid'), 'error', 2000);
      return;
    }
    setHttpBindBusy(true);
    clearHttpBindDetailMsg();
    try {
      const res = await setProjectHttpBind(pid, nextValue);
      if (!res || res.ok === false) {
        throw new Error(res?.error || 'update_failed');
      }
      showHttpBindDetailMsg(t('projects.detail.httpBind.updateOk'), 'ok', 2000);
      setDetailInsights?.((prev) => ({
        ...(prev || {}),
        httpServer: {
          ...(prev?.httpServer || {}),
          iniExists: true,
          bindAddress: nextValue,
        },
      }));
      setHttpBindEditing(false);
      setHttpBindDraft('');
    } catch (e) {
      const raw = String(e?.message || '');
      const missing = /404/.test(raw) || /ini_not_found/i.test(raw);
      showHttpBindDetailMsg(
        missing
          ? t('projects.detail.httpBind.iniMissing')
          : t('projects.detail.httpBind.updateError'),
        'error',
        2000
      );
    } finally {
      setHttpBindBusy(false);
    }
  }, [
    canEditHttpBind,
    clearHttpBindDetailMsg,
    detailId,
    httpBindDraft,
    setDetailInsights,
    showHttpBindDetailMsg,
    t,
  ]);

  const resetHttpBind = useCallback(() => {
    setHttpBindBusy(false);
    clearHttpBindDetailMsg();
    setHttpBindEditing(false);
    setHttpBindDraft('');
  }, [clearHttpBindDetailMsg]);

  return {
    httpBindBusy,
    setHttpBindBusy,
    httpBindDetailMsg,
    setHttpBindDetailMsg,
    httpBindDetailMsgType,
    setHttpBindDetailMsgType,
    httpBindEditing,
    setHttpBindEditing,
    httpBindDraft,
    setHttpBindDraft,
    httpBindAddress,
    httpBindDisplay,
    httpBindDisplayClass,
    httpBindValue,
    httpBindValueTrim,
    httpBindValueValid,
    httpBindDraftValid,
    httpBindInlineMsg,
    httpBindInlineClass,
    showHttpBindWarning,
    httpIniExists,
    canEditHttpBind,
    startHttpBindEdit,
    cancelHttpBindEdit,
    saveHttpBindAddress,
    resetHttpBind,
  };
}
