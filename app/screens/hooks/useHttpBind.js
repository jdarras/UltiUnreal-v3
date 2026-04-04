import { useState, useMemo, useCallback } from 'react';
import { normalizeHttpBindInput, isValidHttpBindInput } from '../../utils/projectsScreenUtils';
import { setProjectHttpBind } from '../../utils/agent';

export function useHttpBind({ detailInsights, detailId, detailIsNew, t, setDetailInsights }) {
  const [httpBindDetailMsg, setHttpBindDetailMsg] = useState('');
  const [httpBindDetailMsgType, setHttpBindDetailMsgType] = useState('');
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
    setHttpBindDetailMsg('');
    setHttpBindDetailMsgType('');
  }, [canEditHttpBind, httpBindAddress]);

  const cancelHttpBindEdit = useCallback(() => {
    setHttpBindEditing(false);
    setHttpBindDraft('');
    setHttpBindDetailMsg('');
    setHttpBindDetailMsgType('');
  }, []);

  const saveHttpBindAddress = useCallback(async () => {
    if (!canEditHttpBind) return;
    const pid = String(detailId || '').trim();
    if (!pid) return;
    const nextValue = normalizeHttpBindInput(httpBindDraft);
    if (!isValidHttpBindInput(nextValue)) {
      setHttpBindDetailMsgType('error');
      setHttpBindDetailMsg(t('projects.detail.httpBind.invalid'));
      setTimeout(() => {
        setHttpBindDetailMsg('');
        setHttpBindDetailMsgType('');
      }, 2000);
      return;
    }
    setHttpBindBusy(true);
    setHttpBindDetailMsg('');
    setHttpBindDetailMsgType('');
    try {
      const res = await setProjectHttpBind(pid, nextValue);
      if (!res || res.ok === false) {
        throw new Error(res?.error || 'update_failed');
      }
      setHttpBindDetailMsgType('ok');
      setHttpBindDetailMsg(t('projects.detail.httpBind.updateOk'));
      setTimeout(() => {
        setHttpBindDetailMsg('');
        setHttpBindDetailMsgType('');
      }, 2000);
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
      setHttpBindDetailMsgType('error');
      setHttpBindDetailMsg(
        missing
          ? t('projects.detail.httpBind.iniMissing')
          : t('projects.detail.httpBind.updateError')
      );
      setTimeout(() => {
        setHttpBindDetailMsg('');
        setHttpBindDetailMsgType('');
      }, 2000);
    } finally {
      setHttpBindBusy(false);
    }
  }, [canEditHttpBind, detailId, httpBindDraft, setDetailInsights, t]);

  const resetHttpBind = useCallback(() => {
    setHttpBindBusy(false);
    setHttpBindDetailMsg('');
    setHttpBindDetailMsgType('');
    setHttpBindEditing(false);
    setHttpBindDraft('');
  }, []);

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
