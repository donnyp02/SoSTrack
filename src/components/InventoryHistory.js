import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './InventoryHistory.css';

const InventoryHistory = ({ refresh, showTitle = true }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const historyCollection = collection(db, 'inventory_history');
        const q = query(historyCollection, orderBy('timestamp', 'desc'));
        const historySnapshot = await getDocs(q);
        const historyData = historySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching inventory history:", error);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [refresh]);

  const renderDetails = (details) => {
    if (typeof details === 'string') {
      return details;
    }
    if (typeof details === 'object' && details !== null) {
        if(Array.isArray(details)){
            return details.map((item, index) => (
                <div key={index}>{item.templateId}: {item.quantity}</div>
            ));
        }
        return Object.entries(details).map(([key, value]) => (
            <div key={key}>{key}: {value.toString()}</div>
        ));
    }
    return '';
  };

  return (
    <div className="inventory-history">
      {showTitle && <h2>Inventory History</h2>}
      {loading ? (
        <p>Loading history...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Change Type</th>
              <th>Details</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <tr key={entry.id}>
                <td>{entry.productName}</td>
                <td>{entry.change}</td>
                <td>{renderDetails(entry.details)}</td>
                <td>{entry.timestamp?.toDate().toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InventoryHistory;
