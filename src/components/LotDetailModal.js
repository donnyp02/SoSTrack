import React, { useState, useMemo } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaClipboardList, FaHistory } from 'react-icons/fa';
import './LotDetailModal.css';

const LotDetailModal = ({ batch, products = {}, ingredients = {}, locations = [], onClose, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'ingredients', 'movements', 'events'
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    status: batch?.status || '',
    currentLocation: batch?.currentLocation || '',
    notes: batch?.notes || ''
  });

  const product = useMemo(() => {
    return products[batch?.productId] || null;
  }, [batch?.productId, products]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
  };

  const handleSaveChanges = () => {
    onStatusChange?.(editedData);
    setIsEditing(false);
  };

  const ingredientConsumptions = useMemo(() => {
    const result = [];
    if (batch?.ingredientConsumption && Array.isArray(batch.ingredientConsumption)) {
      batch.ingredientConsumption.forEach(consumption => {
        result.push(consumption);
      });
    }
    if (batch?.machines && Array.isArray(batch.machines)) {
      batch.machines.forEach(machine => {
        if (machine.ingredientLotConsumption && Array.isArray(machine.ingredientLotConsumption)) {
          machine.ingredientLotConsumption.forEach(consumption => {
            result.push({ ...consumption, machineId: machine.machineId, machineName: machine.machineName });
          });
        }
      });
    }
    return result;
  }, [batch?.ingredientConsumption, batch?.machines]);

  if (!batch) return null;

  const STATUS_COLORS = {
    'Ready': 'ready',
    'Make': 'make',
    'Package': 'package',
    'Requested': 'requested',
    'Completed': 'completed'
  };

  const statusClass = STATUS_COLORS[batch.status] || 'pending';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content lot-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-block">
            <h2>Batch Details</h2>
            <p className="lot-detail-lot-number">{batch.lotNumber || batch.productionLotNumber || batch.id.substring(0, 8)}</p>
          </div>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>

        {/* Tabs */}
        <div className="lot-detail-tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FaClipboardList /> Details
          </button>
          <button
            className={`tab ${activeTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingredients')}
          >
            <FaClipboardList /> Ingredients
          </button>
          <button
            className={`tab ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <FaMapMarkerAlt /> Movements
          </button>
          <button
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <FaHistory /> Timeline
          </button>
        </div>

        <div className="modal-body lot-detail-body">
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="tab-content">
              {!isEditing && (
                <button
                  className="btn-edit-details"
                  onClick={() => setIsEditing(true)}
                  style={{marginBottom: '16px'}}
                >
                  Edit Details
                </button>
              )}

              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editedData.status}
                      onChange={(e) => setEditedData({...editedData, status: e.target.value})}
                      className="form-input"
                    >
                      <option value="Requested">Requested</option>
                      <option value="Make">Make</option>
                      <option value="Package">Package</option>
                      <option value="Ready">Ready</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Current Location</label>
                    <input
                      type="text"
                      value={editedData.currentLocation}
                      onChange={(e) => setEditedData({...editedData, currentLocation: e.target.value})}
                      className="form-input"
                      placeholder="Enter location"
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={editedData.notes}
                      onChange={(e) => setEditedData({...editedData, notes: e.target.value})}
                      className="form-input"
                      placeholder="Add notes or observations"
                      rows="4"
                    />
                  </div>

                  <div style={{display: 'flex', gap: '8px'}}>
                    <button
                      className="btn-submit"
                      onClick={handleSaveChanges}
                    >
                      Save Changes
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedData({
                          status: batch.status,
                          currentLocation: batch.currentLocation || '',
                          notes: batch.notes || ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Product</label>
                    <p>{product?.name || product?.displayName || 'Unknown'}</p>
                  </div>

                  <div className="detail-item">
                    <label>Status</label>
                    <p><span className={`status-pill ${statusClass}`}>{batch.status}</span></p>
                  </div>

                  <div className="detail-item">
                    <label>Current Location</label>
                    <p><FaMapMarkerAlt /> {batch.currentLocation || 'Not set'}</p>
                  </div>

                  <div className="detail-item">
                    <label>Date Started</label>
                    <p><FaCalendarAlt /> {formatDate(batch.dateStarted || batch.statusSetAt || batch.requestedAt)}</p>
                  </div>

                  <div className="detail-item">
                    <label>Total Weight</label>
                    <p>{batch.request?.calculatedWeightLbs || batch.calculatedWeightLbs || '—'} lbs</p>
                  </div>

                  {batch.finalCount && (
                    <div className="detail-item">
                      <label>Final Count</label>
                      <p>
                        {batch.finalCount.countedPackages?.map(pkg => `${pkg.quantity} × ${pkg.packageName}`).join(', ') || '—'}
                      </p>
                    </div>
                  )}

                  {batch.notes && (
                    <div className="detail-item full-width">
                      <label>Notes</label>
                      <p style={{whiteSpace: 'pre-wrap'}}>{batch.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INGREDIENTS TAB */}
          {activeTab === 'ingredients' && (
            <div className="tab-content">
              {ingredientConsumptions.length > 0 ? (
                <div className="ingredients-list">
                  {ingredientConsumptions.map((consumption, idx) => (
                    <div key={idx} className="ingredient-item">
                      <div className="ingredient-header">
                        <strong>{consumption.ingredientName}</strong>
                        {consumption.machineName && (
                          <span className="badge">{consumption.machineName}</span>
                        )}
                      </div>
                      <div className="ingredient-details">
                        <span>Lot: {consumption.lotNumber || consumption.lotId}</span>
                        <span>Amount: {consumption.amountUsed} {consumption.unit || 'units'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: '#9ca3af'}}>No ingredients recorded for this batch.</p>
              )}
            </div>
          )}

          {/* MOVEMENTS TAB */}
          {activeTab === 'movements' && (
            <div className="tab-content">
              {batch.movements && batch.movements.length > 0 ? (
                <div className="movements-timeline">
                  {batch.movements.map((movement, idx) => (
                    <div key={idx} className="movement-item">
                      <div className="movement-time">
                        {formatTimeAgo(movement.timestamp)}
                      </div>
                      <div className="movement-content">
                        <p>
                          <strong>From:</strong> {movement.fromLocation || 'Unknown'}<br />
                          <strong>To:</strong> {movement.toLocation || 'Unknown'}
                        </p>
                        {movement.notes && <p style={{fontSize: '0.9rem', color: '#6b7280'}}>{movement.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: '#9ca3af'}}>No movements recorded yet.</p>
              )}
            </div>
          )}

          {/* EVENTS/TIMELINE TAB */}
          {activeTab === 'events' && (
            <div className="tab-content">
              {batch.events && batch.events.length > 0 ? (
                <div className="events-timeline">
                  {[...batch.events].reverse().map((event, idx) => (
                    <div key={idx} className="event-item">
                      <div className="event-time">
                        {formatTimeAgo(event.timestamp)}
                      </div>
                      <div className="event-content">
                        {event.type === 'STATUS_CHANGE' && (
                          <>
                            <p><strong>{event.from} → {event.to}</strong></p>
                            <p style={{fontSize: '0.85rem', color: '#6b7280'}}>
                              by {event.actorEmail || 'System'}
                            </p>
                          </>
                        )}
                        {event.type === 'FINALIZE' && (
                          <>
                            <p><strong>Finalized</strong></p>
                            <p style={{fontSize: '0.85rem', color: '#6b7280'}}>
                              Total units: {event.totalUnits}<br />
                              by {event.actorEmail || 'System'}
                            </p>
                          </>
                        )}
                        {event.type === 'MOVEMENT' && (
                          <>
                            <p><strong>Moved</strong></p>
                            <p style={{fontSize: '0.85rem', color: '#6b7280'}}>
                              {event.fromLocation} → {event.toLocation}<br />
                              by {event.actorEmail || 'System'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: '#9ca3af'}}>No events recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LotDetailModal;
