// src/components/ManagementModal.js
import React, { useState, useMemo, useEffect } from 'react';
import './ManagementModal.css';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, writeBatch, FieldValue, deleteDoc } from 'firebase/firestore';
import { FaCog, FaHistory, FaTrash } from 'react-icons/fa';
import { FiEdit } from 'react-icons/fi';

// (Other modal imports would be here)

// --- NEW HELPER FUNCTION ---
const formatWeight = (ounces) => {
  if (isNaN(ounces) || ounces === 0) return "0 lbs 0 oz";
  const lbs = Math.floor(ounces / 16);
  const oz = Math.round(ounces % 16);
  return `${lbs} lbs ${oz} oz`;
};

const ManagementModal = ({ product, category, onUpdate, onDeleteBatches, onClose, onOpenModal }) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState(new Set());
  
  const activeBatches = useMemo(() => 
    (product?.batches || []).filter(b => b.status !== 'Completed'), 
    [product?.batches]
  );

  const completedBatches = useMemo(() => 
    (product?.batches || []).filter(b => b.status === 'Completed'),
    [product?.batches]
  );

  const inProductionLbs = useMemo(() => 
    activeBatches.reduce((total, batch) => total + (batch.request?.calculatedWeightLbs || 0), 0),
    [activeBatches]
  );

  const canPackage = useMemo(() => Array.from(selectedBatches).every(id => activeBatches.find(b => b.id === id)?.status === 'Make'), [selectedBatches, activeBatches]);
  
  const canFinalize = useMemo(() => {
    if (selectedBatches.size !== 1) return false;
    const selectedId = selectedBatches.values().next().value;
    return activeBatches.find(b => b.id === selectedId)?.status === 'Package';
  }, [selectedBatches, activeBatches]);

  useEffect(() => {
    if (activeBatches.length === 1) {
      setSelectedBatches(new Set([activeBatches[0].id]));
    } else {
      setSelectedBatches(new Set());
    }
  }, [activeBatches]);

  if (!product) return null;

  const onHandLbs = Math.floor((product.onHandOz || 0) / 16);
  const onHandOzRemainder = (product.onHandOz || 0) % 16;

  const handlePackage = () => {
    selectedBatches.forEach(batchId => {
      onUpdate('Package', null, batchId);
    });
  };

  const handleFinalize = () => {
    const selectedId = selectedBatches.values().next().value;
    const batch = activeBatches.find(b => b.id === selectedId);
    onOpenModal('finalCount', batch);
  };

  const handleDeleteSelected = () => {
    onDeleteBatches(Array.from(selectedBatches));
  };

  const SelectableBatchRow = ({ batch, category }) => {
    const isSelected = selectedBatches.has(batch.id);
    const handleSelection = (batchId) => {
        const newSelection = new Set(selectedBatches);
        if (newSelection.has(batchId)) {
            newSelection.delete(batchId);
        } else {
            newSelection.add(batchId);
        }
        setSelectedBatches(newSelection);
    };

    const displayWeight = useMemo(() => {
        if (batch.status === 'Ready' || batch.status === 'Completed') {
          if (!batch.finalCount?.countedPackages || !category?.packageOptions) return "N/A";
          let totalOunces = 0;
          batch.finalCount.countedPackages.forEach(p => {
            const template = category.containerTemplates.find(t => t.id === p.packageId);
            if (template) { totalOunces += template.weightOz * p.quantity; }
          });
          return formatWeight(totalOunces);
        }
        if (batch.request?.calculatedWeightLbs) {
          const totalOunces = batch.request.calculatedWeightLbs * 16;
          return formatWeight(totalOunces);
        }
        return "N/A";
      }, [batch, category]);

    return (
      <div className={`batch-row ${isSelected ? 'selected' : ''}`} onClick={() => handleSelection(batch.id)}>
        <div className="batch-details">
          <span className={`batch-status-tag status-${batch.status?.toLowerCase()}`}>{batch.status}</span>
          <span>{displayWeight}</span>
        </div>
        <small>
          {batch.dateStarted ? 
            `${new Date(batch.dateStarted.toDate()).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: false
            })} ${new Date(batch.dateStarted.toDate()).toLocaleDateString('en-US', {
                year: '2-digit', month: 'numeric', day: 'numeric'
            })}`
            : 'N/A'}
        </small>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div class="modal-header-content">
            <h2>
              Manage: {category?.name} {product.flavor}
            </h2>
            <div class="header-sku-display">
              <span class="sku-label">SKU:</span>
              <span class="sku-display">{category?.sku}-{product.flavorSku}</span>
              <button className="icon-btn" onClick={() => onOpenModal('editProduct')}><FiEdit /></button> 
            </div>
          </div>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="top-status-bar">
            <button className="status-btn red" onClick={() => onOpenModal('makeRequest')}>New Production Run</button>
            <button className="status-btn yellow" onClick={handlePackage} disabled={selectedBatches.size === 0 || !canPackage}>Mark as Packaged</button>
            <button className="status-btn green" onClick={handleFinalize} disabled={!canFinalize}>Finalize Production</button>
          </div>
          <div className="dashboard-content">
            <div className="info-section left">
              <h4>Inventory</h4>
              <div className="inventory-stats">
                <div className="stat-item"><span>{`${onHandLbs} lbs ${onHandOzRemainder} oz`}</span><small>On Hand</small></div>
                <div className="stat-item"><span>{`${inProductionLbs.toFixed(2)} lbs`}</span><small>In Production</small></div>
              </div>
              <h4>Containers <button className="icon-btn" onClick={() => onOpenModal('containers')}><FaCog /></button></h4>
              <ul className="package-list">
                {product?.packageOptions?.length > 0 ? (
                  product.packageOptions.map(opt => 
                    <li key={opt.id}>
                      <div>{opt.name} ({opt.weightOz} oz) - {opt.quantity || 0}</div>
                      <div className="sku-display">{category?.sku}-{product.flavorSku}-{opt.sku}</div>
                    </li>
                  )
                ) : (<li>No container templates.</li>)}
              </ul>
            </div>
            <div className="info-section right">
              <div className="batch-list-header">
                <h4>Active Production Runs ({activeBatches.length})
                  <button className="icon-btn" onClick={() => setShowCompleted(!showCompleted)} title="Toggle Completed Batches"><FaHistory /></button>
                  {selectedBatches.size > 0 && (<button className="icon-btn" onClick={handleDeleteSelected} title="Delete Selected Batches"><FaTrash color="red" /></button>)}
                </h4>
              </div>
              <div className="batch-list">
                {activeBatches.length > 0 ? (
                  activeBatches.map(b => <SelectableBatchRow key={b.id} batch={b} category={category} />)
                ) : (<p>No active production runs.</p>)}
                {showCompleted && (
                  <>
                    <h4 className="completed-header" style={{marginTop: '15px'}}>Completed Runs</h4>
                    {completedBatches.map(b => <SelectableBatchRow key={b.id} batch={b} category={category} />)}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementModal;