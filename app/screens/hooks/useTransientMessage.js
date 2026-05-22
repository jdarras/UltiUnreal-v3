import React from 'react';

function useTransientMessage() {
  const [message, setMessage] = React.useState(null);
  const messageTimerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
        messageTimerRef.current = null;
      }
    };
  }, []);

  const scheduleMessageClear = React.useCallback((delayMs = 2000) => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }

    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;

    messageTimerRef.current = setTimeout(() => {
      setMessage(null);
      messageTimerRef.current = null;
    }, timeoutMs);
  }, []);

  return {
    message,
    setMessage,
    scheduleMessageClear,
  };
}

export { useTransientMessage };
