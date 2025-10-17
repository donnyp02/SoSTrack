import { useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import LotCard from './LotCard';
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

      <div className="lot-card-grid">
        {loading && (
          <div className="empty-state">
            <p>Loading lots...</p>
          </div>
        )}

        {!loading && filteredLots.length === 0 && (
          <div className="empty-state">
            <p>No lots match the current filters</p>
          </div>
        )}

        {!loading &&
          filteredLots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              onClick={() => onInspectLot(lot)}
            />
          ))}
      </div>
    </div>
  );
};

export default LotTrackingPanel;
