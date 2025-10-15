import { useEffect } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { BATCH_AUTO_COMPLETE_DELAY } from '../constants/timings';

/**
 * Custom hook to automatically complete batches after 24 hours in Ready status
 * @param {object} db - Firestore database instance
 * @param {object} batches - Batches object from Firestore
 * @param {boolean} loading - Loading state
 */
export function useBatchAutoComplete(db, batches, loading) {
  useEffect(() => {
    if (loading || Object.keys(batches).length === 0) return;

    const now = new Date();
    const autoCompleteThreshold = now.getTime() - BATCH_AUTO_COMPLETE_DELAY;

    const batchesToComplete = Object.values(batches || {}).filter((b) => {
      if (b.status !== 'Ready') return false;
      const readyTime = b.dateReady?.toDate().getTime();
      return readyTime && readyTime < autoCompleteThreshold;
    });

    if (batchesToComplete.length > 0) {
      const batchWrite = writeBatch(db);
      batchesToComplete.forEach((b) => {
        batchWrite.update(doc(db, 'batches', b.id), { status: 'Completed' });
      });
      batchWrite.commit(); // Real-time listener will update automatically
    }
  }, [db, batches, loading]);
}
