import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimelineStatusMessage(timeoutMs = 2000) {
  const [statusMsg, setStatusMsg] = useState('');
  const statusTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const showStatus = useCallback(
    (msg) => {
      setStatusMsg(msg);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => {
        setStatusMsg('');
      }, timeoutMs);
    },
    [timeoutMs]
  );

  return {
    statusMsg,
    showStatus,
  };
}
