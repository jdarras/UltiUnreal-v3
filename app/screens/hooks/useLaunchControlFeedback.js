import React from 'react';
import { NoticeContext } from '../../NoticeContext';
import { useTransientInfo } from './useTransientInfo';

function useLaunchControlFeedback() {
  const {
    infoMsg: error,
    showInfo: showTransientError,
    clearInfo: clearTransientError,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 0 });
  const {
    infoMsg: statusMsg,
    showInfo: showTransientStatus,
    clearInfo: clearTransientStatus,
  } = useTransientInfo({ defaultType: 'ok', clearAfterMs: 5000 });
  const noticeApi = React.useContext(NoticeContext);

  const showErrorMessage = React.useCallback((message = '', clearAfterMs = 0) => {
    const normalized = String(message || '').trim();
    if (!normalized) {
      clearTransientError();
      return;
    }
    showTransientError(normalized, 'error', clearAfterMs);
  }, [clearTransientError, showTransientError]);

  const setStatusMsg = React.useCallback((message = '') => {
    const normalized = String(message || '').trim();
    if (!normalized) {
      clearTransientStatus();
      return;
    }
    showTransientStatus(normalized, 'ok', 5000);
  }, [clearTransientStatus, showTransientStatus]);

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
  }, [noticeApi, setStatusMsg]);

  return {
    error,
    statusMsg,
    setStatusMsg,
    showErrorMessage,
    showWarnMessage,
  };
}

export { useLaunchControlFeedback };
