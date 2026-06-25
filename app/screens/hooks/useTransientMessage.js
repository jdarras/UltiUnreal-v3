import React from 'react';
import { useTransientInfo } from './useTransientInfo';

function normalizeMessagePayload(next) {
  if (!next) return null;
  if (typeof next === 'string') {
    const text = String(next || '').trim();
    return text ? { text, type: '' } : null;
  }
  if (typeof next === 'object') {
    const text = String(next.text || '').trim();
    if (!text) return null;
    return {
      text,
      type: String(next.type || '').trim(),
    };
  }
  return null;
}

function useTransientMessage() {
  const messageRef = React.useRef(null);
  const {
    infoMsg,
    infoMsgType,
    showInfo,
    clearInfo,
  } = useTransientInfo({ defaultType: '', clearAfterMs: 2000 });

  const message = React.useMemo(() => {
    const text = String(infoMsg || '').trim();
    if (!text) return null;
    return { text, type: String(infoMsgType || '').trim() };
  }, [infoMsg, infoMsgType]);

  const setMessage = React.useCallback((next) => {
    const normalized = normalizeMessagePayload(next);
    messageRef.current = normalized;
    if (!normalized) {
      clearInfo();
      return;
    }
    showInfo(normalized.text, normalized.type, 0);
  }, [clearInfo, showInfo]);

  const scheduleMessageClear = React.useCallback((delayMs = 2000) => {
    const current = messageRef.current;
    if (!current) return;
    showInfo(current.text, current.type || '', delayMs);
  }, [showInfo]);

  return {
    message,
    setMessage,
    scheduleMessageClear,
  };
}

export { useTransientMessage };
