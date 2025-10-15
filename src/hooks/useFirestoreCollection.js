import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';

/**
 * Custom hook for real-time Firestore collection listener
 * @param {object} db - Firestore database instance
 * @param {string} collectionName - Name of the collection to listen to
 * @param {boolean} enabled - Whether to enable the listener (default: true)
 * @returns {object} - { data: {}, loading: boolean }
 */
export function useFirestoreCollection(db, collectionName, enabled = true) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const dataMap = {};
        snapshot.forEach((doc) => {
          dataMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        setData(dataMap);
        setLoading(false);
      },
      (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        toast.error(`Failed to load ${collectionName}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, collectionName, enabled]);

  return { data, loading };
}
