import { useState, useCallback, useRef } from "react";

function useNotice() {
  const [notice, setNotice] = useState({ text: '', type: '', sticky: false });
  const timerRef = useRef(null);

  const clearNotice = useCallback(() => {
    setNotice({ text: '', type: '', sticky: false });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNotice = useCallback((text, type = '', opts = {}) => {
    if (!text) return;
    const sticky = !!(opts && typeof opts === 'object' && opts.sticky === true);
    setNotice({ text, type, sticky });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!sticky) {
      timerRef.current = setTimeout(
        () => setNotice({ text: '', type: '', sticky: false }),
        3000
      );
    }
  }, []);

  return { notice, showNotice, clearNotice };
}

export { useNotice };
