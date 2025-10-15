import { useMemo, useState } from 'react';
import { FaBarcode, FaCalendarAlt, FaSearch, FaWarehouse, FaExclamationTriangle, FaTruck, FaUtensils } from 'react-icons/fa';
import './LotTrackingPanel.css';

const LOT_STATUS_META = {
  Ready: { label: 'Ready to Ship', tone: 'ready' },
  Hold: { label: 'Quality Hold', tone: 'hold' },
  Consumed: { label: 'Consumed', tone: 'consumed' },
  Recalled: { label: 'Recalled', tone: 'recalled' },
  Pending: { label: 'In Process', tone: 'pending' }
};

const DEFAULT_TIMEFRAME_OPTIONS = [
  { value: '30', label: 'Next 30 days' },
  { value: '60', label: 'Next 60 days' },
  { value: '90', label: 'Next 90 days' },
  { value: 'all', label: 'All future lots' }
];

const LotTrackingPanel = ({
  lots = [],
  loading = false,
  onInspectLot = () => {}
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME_OPTIONS[0].value);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLotId, setSelectedLotId] = useState(null);

  const filteredLots = useMemo(() => {
    if (!lots || lots.length === 0) return [];
    const now = new Date();
    const horizon = timeframe === 'all' ? null : new Date(now.getTime() + parseInt(timeframe, 10) * 24 * 60 * 60 * 1000);

    return lots.filter((lot) => {
      if (statusFilter && lot.status !== statusFilter) return false;
      if (horizon && lot.saleBy && lot.saleBy > horizon) return false;
      if (!searchTerm) return true;
      const needle = searchTerm.toLowerCase();
      return (
        (lot.lotNumber || '').toLowerCase().includes(needle) ||
        (lot.productName || '').toLowerCase().includes(needle) ||
        (lot.categoryName || '').toLowerCase().includes(needle)
      );
    });
  }, [lots, statusFilter, timeframe, searchTerm]);

  const summary = useMemo(() => {
    if (!lots || lots.length === 0) {
      return { total: 0, expiringSoon: 0, onHold: 0, recalled: 0 };
    }
    const now = new Date();
    const soonBoundary = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return lots.reduce(
      (acc, lot) => {
        acc.total += 1;
        if (lot.saleBy && lot.saleBy <= soonBoundary) {
          acc.expiringSoon += 1;
        }
        if (lot.status === 'Hold') acc.onHold += 1;
        if (lot.status === 'Recalled') acc.recalled += 1;
        return acc;
      },
      { total: 0, expiringSoon: 0, onHold: 0, recalled: 0 }
    );
  }, [lots]);

  const selectedLot = useMemo(() => {
    if (!filteredLots || filteredLots.length === 0) return null;
    const target = filteredLots.find((lot) => lot.id === selectedLotId);
    return target || filteredLots[0];
  }, [filteredLots, selectedLotId]);

  return (
    <div className="lot-tracking-panel">
      <div className="lot-tracking-header">
        <div>
          <h2>Lot Tracking</h2>
          <p className="lot-tracking-subtitle">
            Monitor batches by sale-by date, status, and movement so recall work is fast and precise.
          </p>
        </div>
        <div className="lot-tracking-controls">
          <div className="control search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search lots, products, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(LOT_STATUS_META).map((status) => (
              <option key={status} value={status}>
                {LOT_STATUS_META[status].label}
              </option>
            ))}
          </select>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {DEFAULT_TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lot-tracking-summary">
        <div className="summary-card">
          <span className="summary-label">Active lots</span>
          <strong className="summary-value">{summary.total}</strong>
        </div>
        <div className="summary-card warning">
          <span className="summary-label">Expiring in 7 days</span>
          <strong className="summary-value">{summary.expiringSoon}</strong>
        </div>
        <div className="summary-card hold">
          <span className="summary-label">On hold</span>
          <strong className="summary-value">{summary.onHold}</strong>
        </div>
        <div className="summary-card recall">
          <span className="summary-label">Recalled</span>
          <strong className="summary-value">{summary.recalled}</strong>
        </div>
      </div>

      <div className="lot-tracking-body">
        <div className="lot-table">
          <div className="lot-table-head">
            <span>Lot</span>
            <span>Product</span>
            <span>Sale by</span>
            <span>Status</span>
            <span>Quantity</span>
            <span>Primary location</span>
          </div>

          <div className="lot-table-body">
            {loading && (
              <div className="lot-table-row placeholder">
                <span>Loading lots...</span>
              </div>
            )}

            {!loading && filteredLots.length === 0 && (
              <div className="lot-table-row placeholder">
                <span>No lots match the current filters</span>
              </div>
            )}

            {!loading &&
              filteredLots.map((lot) => {
                const meta = LOT_STATUS_META[lot.status] || { label: lot.status || 'Unknown', tone: 'pending' };
                return (
                  <button
                    key={lot.id}
                    className={`lot-table-row ${selectedLot && selectedLot.id === lot.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedLotId(lot.id);
                      onInspectLot(lot);
                    }}
                  >
                    <span>
                      <FaBarcode className="row-icon" />
                      <strong>{lot.lotNumber}</strong>
                    </span>
                    <span>
                      <div className="product-stack">
                        <strong>{lot.productName}</strong>
                        <small>{lot.categoryName}</small>
                      </div>
                    </span>
                    <span>{lot.saleBy ? lot.saleBy.toLocaleDateString() : '—'}</span>
                    <span>
                      <span className={`status-pill ${meta.tone}`}>{meta.label}</span>
                    </span>
                    <span>{lot.quantityLabel || lot.quantityUnits || '—'}</span>
                    <span>{lot.primaryLocation || '—'}</span>
                  </button>
                );
              })}
          </div>
        </div>

        <aside className="lot-detail">
          {selectedLot ? (
            <>
              <header>
                <h3>{selectedLot.productName}</h3>
                <p className="lot-number">
                  <FaBarcode />
                  {selectedLot.lotNumber}
                </p>
              </header>

              <section className="lot-meta">
                <div className="meta-item">
                  <FaCalendarAlt />
                  <div>
                    <span>Sale by</span>
                    <strong>{selectedLot.saleBy ? selectedLot.saleBy.toLocaleDateString() : 'Not set'}</strong>
                  </div>
                </div>
                <div className="meta-item">
                  <FaWarehouse />
                  <div>
                    <span>Locations</span>
                    <strong>{selectedLot.locations?.map((loc) => loc.name).join(', ') || 'No locations logged'}</strong>
                  </div>
                </div>
                <div className="meta-item">
                  <FaTruck />
                  <div>
                    <span>Last movement</span>
                    <strong>{selectedLot.lastMovement || 'Waiting for shipment'}</strong>
                  </div>
                </div>
              </section>

              <section className="lot-ingredients">
                <h4>
                  <FaUtensils />
                  Ingredient snapshot
                </h4>
                <div className="ingredient-grid">
                  {(selectedLot.ingredients && selectedLot.ingredients.length > 0
                    ? selectedLot.ingredients
                    : ['Skittles', 'Lemon Heads', 'Gushers', 'Premium chocolate'])
                    .map((ingredient) => (
                      <span key={ingredient} className="ingredient-pill">
                        {ingredient}
                      </span>
                    ))}
                </div>
              </section>

              <section className="lot-notes">
                <h4>Notes &amp; QC status</h4>
                <p>{selectedLot.notes || 'No quality notes logged for this lot yet.'}</p>
                {selectedLot.alert && (
                  <div className="lot-alert">
                    <FaExclamationTriangle />
                    <p>{selectedLot.alert}</p>
                  </div>
                )}
              </section>

              <section className="lot-movements">
                <h4>Movement timeline</h4>
                <ul>
                  {(selectedLot.timeline || []).map((event, idx) => (
                    <li key={`${event.label}-${idx}`}>
                      <span className="event-date">{event.date}</span>
                      <div>
                        <strong>{event.label}</strong>
                        <small>{event.actor}</small>
                      </div>
                    </li>
                  ))}
                  {(!selectedLot.timeline || selectedLot.timeline.length === 0) && (
                    <li className="placeholder">Movement events will appear here once this lot moves.</li>
                  )}
                </ul>
              </section>
            </>
          ) : (
            <div className="empty-detail">
              <p>Select a lot to see quality checkpoints, locations, and movement history.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default LotTrackingPanel;
