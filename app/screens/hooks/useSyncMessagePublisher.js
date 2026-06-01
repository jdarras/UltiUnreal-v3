import React from 'react';

function useSyncMessagePublisher({ setMessage, scheduleMessageClear } = {}) {
  return React.useCallback((type, text, clearAfterMs = null) => {
    setMessage({
      type: String(type || '').trim(),
      text: String(text || ''),
    });
    if (typeof clearAfterMs === 'number') {
      scheduleMessageClear(clearAfterMs);
    }
  }, [scheduleMessageClear, setMessage]);
}

export { useSyncMessagePublisher };
