// src/components/ManagementModal.js
import React, { useState } from 'react';
import './ManagementModal.css';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import MakeRequestModal from './MakeRequestModal'; // Import the new modal

const ManagementModal = ({ product, category, onClose, onUpdate }) => {
  // State to control the visibility of the new MakeRequestModal
  const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);

  if (!product) return null;

  // The update function now accepts optional requestData
  const handleStatusUpdate = async (newStatus, requestData = null) => {
    const productDocRef = doc(db, "products", product.id);
    const updatePayload = {
      status: newStatus,
      statusSetAt: serverTimestamp()
    };

    if (requestData) {
      updatePayload.request = requestData;
    }

    try {
      await updateDoc(productDocRef, updatePayload);
      onUpdate({ ...product, ...updatePayload }); // Send updated data back to App
      onClose(); // Close the main modal
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status. Please try again.");
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Manage: {category.name} {product.flavor}</h2>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-body">
            <h4>Change Status</h4>
            <div className="status-buttons">
              <button
                className={`status-btn ${product.status === 'Make' ? 'red' : 'grey'}`}
                // When clicked, open the Make Request modal
                onClick={() => setIsMakeModalOpen(true)}
              >
                Need to Make
              </button>
              <button
                className={`status-btn ${product.status === 'Package' ? 'yellow' : 'grey'}`}
                onClick={() => handleStatusUpdate('Package')}
                disabled={product.status !== 'Make'}
              >
                Need to Package
              </button>
              <button
                className={`status-btn ${product.status === 'Ready' ? 'green' : 'grey'}`}
                onClick={() => handleStatusUpdate('Ready')}
                disabled={product.status !== 'Package'}
              >
                Ready
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conditionally render the new modal on top */}
      {isMakeModalOpen && (
        <MakeRequestModal
          category={category}
          onClose={() => setIsMakeModalOpen(false)}
          onSubmit={(requestData) => {
            handleStatusUpdate('Make', requestData);
            setIsMakeModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ManagementModal;