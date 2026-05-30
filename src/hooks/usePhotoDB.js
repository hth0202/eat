import { useRef, useEffect } from 'react';

export function usePhotoDB() {
  const dbRef = useRef(null);
  const readyRef = useRef(null);

  useEffect(() => {
    readyRef.current = new Promise((resolve) => {
      const req = indexedDB.open('kkinilog-photos', 1);
      req.onupgradeneeded = (e) => e.target.result.createObjectStore('photos');
      req.onsuccess = (e) => { dbRef.current = e.target.result; resolve(); };
      req.onerror = () => resolve();
    });
  }, []);

  async function put(id, dataUrl) {
    await readyRef.current;
    if (!dbRef.current) return;
    return new Promise((resolve) => {
      const tx = dbRef.current.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(dataUrl, id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  async function get(id) {
    await readyRef.current;
    if (!dbRef.current) return null;
    return new Promise((resolve) => {
      const tx = dbRef.current.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function del(id) {
    await readyRef.current;
    if (!dbRef.current) return;
    return new Promise((resolve) => {
      const tx = dbRef.current.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  return { put, get, del };
}
