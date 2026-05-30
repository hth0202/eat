import { useEffect, useRef } from 'react';
import { pushOverlay, removeOverlay } from '../utils/historyOverlay';

export function useHistoryBack(onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closedByPopRef = useRef(false);

  useEffect(() => {
    closedByPopRef.current = false;
    const fn = () => {
      closedByPopRef.current = true;
      onCloseRef.current();
    };
    pushOverlay(fn);
    return () => removeOverlay(fn, closedByPopRef.current);
  }, []);
}
