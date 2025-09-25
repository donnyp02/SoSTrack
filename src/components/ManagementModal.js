// src/components/ManagementModal.js
import React, { useState } from 'react';
import './ManagementModal.css';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import MakeRequestModal from './MakeRequestModal';
import FinalCountModal from './FinalCountModal';
import VerificationModal from './VerificationModal'; // Import the new modal

const ManagementModal = ({ product, category, onClose, onUpdate }) => {
  const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
  const [isFinalCountModalOpen, setIsFinalCountModalOpen] = useState(false);
  // State to control the Verification modal
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  // State to temporarily hold the final counts between modals
  const [tempFinalCount, setTempFinalCount] = useState(null);


  if (!product) return null;

  const handleStatusUpdate = async (newStatus, data = null) => {
    const productDocRef = doc(db, "products", product.id);
    const updatePayload = {
      status: newStatus,
      statusSetAt: serverTimestamp()
    };

    if (newStatus === 'Make' && data) {
      updatePayload.request = data;
    } else if (newStatus === 'Ready' && data) {
      updatePayload.finalCount = data;
    }

    try {
      await updateDoc(productDocRef, updatePayload);
      onUpdate({ ...product, ...updatePayload });
      onClose();
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status. Please try again.");
    }
  };

  // --- New function to handle the multi-step finalization ---
  const handleFinalize = (finalCountData) => {
    setTempFinalCount(finalCountData); // Store the counts
    setIsFinalCountModalOpen(false); // Close the count modal
    setIsVerificationModalOpen(true); // Open the verification modal
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
                onClick={() => setIsFinalCountModalOpen(true)}
                disabled={product.status !== 'Package'}
              >
                Ready
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {isFinalCountModalOpen && (
        <FinalCountModal
          category={category}
          onClose={() => setIsFinalCountModalOpen(false)}
          // onSubmit now triggers our new multi-step handler
          onSubmit={handleFinalize}
        />
      )}

      {isVerificationModalOpen && (
        <VerificationModal
          product={product}
          category={category}
          finalCountData={tempFinalCount}
          // The "Change" button closes this and re-opens the previous modal
          onClose={() => {
            setIsVerificationModalOpen(false);
            setIsFinalCountModalOpen(true);
          }}
          // The "Verify" button finally commits the update to the database
          onVerify={() => {
            handleStatusUpdate('Ready', tempFinalCount);
          }}
        />
      )}
    </>
  );
};

export default ManagementModal;