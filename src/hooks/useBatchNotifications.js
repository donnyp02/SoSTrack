import { useEffect, useRef } from 'react';

/**
 * Custom hook to monitor batch status changes and trigger notifications
 * @param {object} batches - Batches object from Firestore
 * @param {object} products - Products object from Firestore
 * @param {object} categories - Categories object from Firestore
 * @param {string} activeTab - Current active tab
 * @param {boolean} loading - Loading state
 * @param {function} setNotification - Function to set notification message
 */
export function useBatchNotifications(
  batches,
  products,
  categories,
  activeTab,
  loading,
  setNotification
) {
  const previousBatchStatuses = useRef({});

  useEffect(() => {
    if (loading || !products || !categories || Object.keys(batches).length === 0) return;

    // Check for status changes
    Object.values(batches || {}).forEach((batch) => {
      const oldStatus = previousBatchStatuses.current[batch.id];
      const newStatus = batch.status;

      // Only show notification if status actually changed (not on initial load)
      if (oldStatus && oldStatus !== newStatus) {
        const product = products[batch.productId];
        const category = categories[product?.categoryId];
        const productName = `${category?.name || ''} ${product?.flavor || 'Product'}`.trim();

        // Show notification if status changed to match current tab
        if (newStatus === 'Package' && activeTab === 'Packaging') {
          setNotification(`${productName} is ready for packaging!`);
        } else if (newStatus === 'Ready' && activeTab === 'Shipping') {
          setNotification(`${productName} is ready for shipping!`);
        } else if (newStatus === 'Make' && activeTab === 'Production') {
          setNotification(`New production run started for ${productName}!`);
        } else if (newStatus === 'Requested' && activeTab === 'Production') {
          setNotification(`New production request for ${productName}!`);
        }
      }

      // Update the ref with current status
      previousBatchStatuses.current[batch.id] = newStatus;
    });
  }, [batches, products, categories, activeTab, loading, setNotification]);
}
