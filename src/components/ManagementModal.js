// src/components/ManagementModal.js
import React, { useState } from 'react';
import './ManagementModal.css';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import MakeRequestModal from './MakeRequestModal';
import FinalCountModal from './FinalCountModal';
import VerificationModal from './VerificationModal';
import CategoryContainersModal from './CategoryContainersModal';

const ManagementModal = ({ product, category, onClose, onUpdate }) => {
  const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
  const [isFinalCountModalOpen, setIsFinalCountModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isContainersModalOpen, setIsContainersModalOpen] = useState(false);
  const [tempFinalCount, setTempFinalCount] = useState(null);

  if (!product) return null;

  const handleStatusUpdate = async (newStatus, data = null) => {
    try {
      if (newStatus === 'Make') {
        await addDoc(collection(db, "batches"), {
          productId: product.id, categoryId: product.categoryId, status: 'Make',
          dateStarted: serverTimestamp(), request: data, finalCount: null
        });
      } else if (product.activeBatchId) {
        const batchDocRef = doc(db, "batches", product.activeBatchId);
        const updatePayload = { status: newStatus };
        if (newStatus === 'Ready' && data) {
          updatePayload.finalCount = data;
          // TODO: Increment product.onHandOz
        }
        await updateDoc(batchDocRef, updatePayload);
      }
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status. Please try again.");
    }
  };
  
  const handleContainerSave = async (newPackageOptions) => {
    const categoryDocRef = doc(db, "categories", product.categoryId);
    try {
      await updateDoc(categoryDocRef, { packageOptions: newPackageOptions });
      setIsContainersModalOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating containers:", error);
      alert("Failed to update containers.");
    }
  };

  const handleFinalize = (finalCountData) => {
    setTempFinalCount(finalCountData);
    setIsFinalCountModalOpen(false);
    setIsVerificationModalOpen(true);
  };
  
  const onHandLbs = Math.floor((product.onHandOz || 0) / 16);
  const onHandOzRemainder = (product.onHandOz || 0) % 16;
  const inProductionLbs = product.request?.calculatedWeightLbs || 0;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Manage: {category?.name} {product.flavor}</h2>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-body">
            {/* --- NEW: TOP STATUS BUTTON BAR --- */}
            <div className="top-status-bar">
              <button className={`status-btn ${product.status === 'Make' ? 'red' : 'grey'}`} onClick={() => setIsMakeModalOpen(true)} disabled={product.status !== 'Idle'}>
                Make
              </button>
              <button className={`status-btn ${product.status === 'Package' ? 'yellow' : 'grey'}`} onClick={() => handleStatusUpdate('Package')} disabled={product.status !== 'Make'}>
                Package
              </button>
              <button className={`status-btn ${product.status === 'Ready' ? 'green' : 'grey'}`} onClick={() => setIsFinalCountModalOpen(true)} disabled={product.status !== 'Package'}>
                Ready
              </button>
            </div>
            {/* --- NEW: CONTENT DASHBOARD BELOW BUTTONS --- */}
            <div className="dashboard-content">
              <div className="info-section">
                <h4>Inventory</h4>
                <div className="inventory-stats">
                  <div className="stat-item">
                    <span>{`${onHandLbs} lbs ${onHandOzRemainder} oz`}</span>
                    <small>On Hand</small>
                  </div>
                  <div className="stat-item">
                    <span>{`${inProductionLbs.toFixed(2)} lbs`}</span>
                    <small>In Production</small>
                  </div>
                </div>
              </div>
              <div className="info-section">
                <h4>Containers</h4>
                <ul className="package-list">
                  {category?.packageOptions?.length > 0 ? (
                    category.packageOptions.map(opt => <li key={opt.id}>{opt.name} ({opt.weightOz} oz)</li>)
                  ) : (
                    <li>No containers defined.</li>
                  )}
                </ul>
                <button className="status-btn grey" onClick={() => setIsContainersModalOpen(true)}>Manage Containers</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other modals are unchanged */}
      {isMakeModalOpen && ( <MakeRequestModal category={category} onClose={() => setIsMakeModalOpen(false)} onSubmit={(requestData) => { handleStatusUpdate('Make', requestData); }} /> )}
      {isFinalCountModalOpen && ( <FinalCountModal category={category} onClose={() => setIsFinalCountModalOpen(false)} onSubmit={handleFinalize} /> )}
      {isVerificationModalOpen && ( <VerificationModal product={product} category={category} finalCountData={tempFinalCount} onClose={() => { setIsVerificationModalOpen(false); setIsFinalCountModalOpen(true); }} onVerify={() => { handleStatusUpdate('Ready', tempFinalCount); }} /> )}
      {isContainersModalOpen && ( <CategoryContainersModal category={category} onClose={() => setIsContainersModalOpen(false)} onSave={handleContainerSave} />)}
    </>
  );
};

export default ManagementModal;