import { useRef, useEffect } from 'react';

export function usePhotoDB() {
  const dbRef = useRef(null);

  useEffect(() => {
    const req = indexedDB.open('kkinilog-photos', 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('photos');
    req.onsuccess = (e) => { dbRef.current = e.target.result; };
  }, []);

  function put(id, dataUrl) {
    return new Promise((resolve) => {
      if (!dbRef.current) { resolve(); return; }
      const tx = dbRef.current.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(dataUrl, id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  function get(id) {
    return new Promise((resolve) => {
      if (!dbRef.current) { resolve(null); return; }
      const tx = dbRef.current.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  function del(id) {
    return new Promise((resolve) => {
      if (!dbRef.current) { resolve(); return; }
      const tx = dbRef.current.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  return { put, get, del };
}
