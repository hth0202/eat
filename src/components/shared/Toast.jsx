import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';

export default function Toast() {
  const toast = useAppStore((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className={`toast ${visible ? 'visible' : ''}`}>
      {toast}
    </div>
  );
}
