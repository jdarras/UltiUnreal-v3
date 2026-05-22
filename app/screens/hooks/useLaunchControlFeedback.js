import React from 'react';
import { NoticeContext } from '../../NoticeContext';

function useLaunchControlFeedback() {
  const [error, setError] = React.useState('');
  const [statusMsg, setStatusMsg] = React.useState('');
  const errorTimerRef = React.useRef(null);
  const noticeApi = React.useContext(NoticeContext);

  const clearErrorMessage = React.useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setError('');
  }, []);

  const scheduleErrorClear = React.useCallback((delayMs = 0) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay > 0 ? Math.trunc(rawDelay) : 0;
    if (timeoutMs <= 0) return;
    errorTimerRef.current = setTimeout(() => {
      errorTimerRef.current = null;
      setError('');
    }, timeoutMs);
  }, []);

  const showErrorMessage = React.useCallback((message = '', clearAfterMs = 0) => {
    const normalized = String(message || '').trim();
    if (!normalized) {
      clearErrorMessage();
      return;
    }
    setError(normalized);
    scheduleErrorClear(clearAfterMs);
  }, [clearErrorMessage, scheduleErrorClear]);

  React.useEffect(() => {
    if (!statusMsg) return;
    const timer = setTimeout(() => setStatusMsg(''), 5000);
    return () => clearTimeout(timer);
  }, [statusMsg]);

  React.useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!noticeApi) return;
    if (error) {
      noticeApi.showNotice?.(error, 'error');
      return;
    }
    if (statusMsg) {
      noticeApi.showNotice?.(statusMsg, 'ok');
    }
  }, [error, statusMsg, noticeApi]);

  const showWarnMessage = React.useCallback((message = '') => {
    const normalized = String(message || '').trim();
    if (!normalized) return;
    if (noticeApi?.showNotice) {
      noticeApi.showNotice(normalized, 'warn');
      return;
    }
    setStatusMsg(normalized);
  }, [noticeApi]);

  return {
    error,
    statusMsg,
    setStatusMsg,
    showErrorMessage,
    showWarnMessage,
  };
}

export { useLaunchControlFeedback };
