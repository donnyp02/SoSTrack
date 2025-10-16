import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { FaExclamationTriangle } from 'react-icons/fa';
import './Inventory.css';
import AssignProductModal from './AssignProductModal';
import AddProductModal from './AddProductModal';
import ManualStockEditor from './ManualStockEditor';
import InventoryHistory from './InventoryHistory';
import ProductCard from './ProductCard';
import CsvViewerModal from './CsvViewerModal';
import { useConfirm } from '../hooks/useConfirm';

const SECTIONS = {
  IMPORT: 'import',
  MANAGE: 'manage',
};

const Inventory = ({ onImport, products, categories, onAddProduct, onInventorySave, openProduct }) => {
  const [csvData, setCsvData] = useState([]);
  const [file, setFile] = useState(null);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS.IMPORT);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [csvViewer, setCsvViewer] = useState({ open: false, id: null });
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileInputRef = useRef(null);
  const { showConfirm, ConfirmDialog } = useConfirm();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleParse = () => {
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          setParsedCsvText(String(e.target?.result || ''));
          setParsedCsvName(file.name || 'upload.csv');
        };
        reader.readAsText(file);
      } catch (e) { /* ignore */ }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Group by unique product (normalized name + description), summing quantities
          const grouped = new Map();
          const normalizeName = (s) => s.replace(/\s*#\d+\s*$/i, '').replace(/\s{2,}/g, ' ').trim();

          for (const raw of results.data) {
            const nameRaw = (raw['product name'] ?? raw['Product Name'] ?? '').toString();
            const name = normalizeName(nameRaw);
            const desc = (raw['product description'] ?? raw['Product Description'] ?? '').toString().trim();
            const qtyRaw = raw['product quantity'] ?? raw['Product Quantity'] ?? raw['quantity'];
            const qtyNum = parseInt(qtyRaw, 10);
            const qty = Number.isFinite(qtyNum) ? qtyNum : 0;
            const skuRaw = raw['sku'] ?? raw['SKU'] ?? '';
            const sku = skuRaw != null ? String(skuRaw).trim() : '';
            const key = `${name}||${desc}`.toLowerCase();

            if (!grouped.has(key)) {
              grouped.set(key, {
                ...raw,
                _groupKey: key,
                sku,
                'product name': name,
                'product description': desc,
                'product quantity': qty,
                assignedProduct: null,
              });
            } else {
              const acc = grouped.get(key);
              acc['product quantity'] = (parseInt(acc['product quantity'], 10) || 0) + qty;
              if ((!acc.sku || acc.sku.length === 0) && sku) acc.sku = sku;
            }
          }
          setCsvData(Array.from(grouped.values()));
        },
      });
    }
  };

  const handleOpenAssignModal = (index) => {
    setSelectedRowIndex(index);
    setAssignModalOpen(true);
  };

  const handleAssignProduct = ({ productId, categoryId, templateId }) => {
    const currentRow = sortedCsvData[selectedRowIndex];
    const key = currentRow?._groupKey || `${currentRow?.['product name'] || ''}||${currentRow?.['product description'] || ''}`.toLowerCase();
    const updatedCsvData = csvData.map(r => {
      const rkey = r._groupKey || `${r['product name'] || ''}||${r['product description'] || ''}`.toLowerCase();
      if (rkey !== key) return r;
      return { ...r, assignedProduct: productId, assignedCategoryId: categoryId || '', assignedContainerId: templateId || '' };
    });
    setCsvData(updatedCsvData);
    setAssignModalOpen(false);
  };

  const handleAddNewProduct = (productData) => {
    onAddProduct(productData);
    setAddProductModalOpen(false);
  };

  const handleInventoryUpdate = async (updateFunction, data) => {
    await updateFunction(data);
    setRefreshHistory(prev => !prev);
  };

  const openHistoryModal = () => setHistoryModalOpen(true);
  const closeHistoryModal = () => setHistoryModalOpen(false);

  const handleRemoveRow = async (index) => {
    const item = csvData[index] || {};
    const name = (item['product name'] ?? item['Product Name'] ?? '').toString();
    const desc = (item['product description'] ?? item['Product Description'] ?? '').toString();
    const qty = (item['product quantity'] ?? item['Product Quantity'] ?? '').toString();
    const label = [name, desc].filter(Boolean).join(' — ');

    const confirmed = await showConfirm({
      title: 'Remove Line?',
      message: label
        ? `Remove this line from import?\n\n${label}${qty ? `\nQty: ${qty}` : ''}`
        : 'Remove this line from import?',
      confirmText: 'Remove',
      confirmColor: 'red',
      icon: <FaExclamationTriangle />
    });

    if (!confirmed) return;
    setCsvData(prev => prev.filter((_, i) => i !== index));
  };

  // Prioritize display: rows without SKU first, then by Qty (desc), then Name (asc)
  const sortedCsvData = useMemo(() => {
    const getSku = (r) => (r['sku'] ?? r['SKU'] ?? r.sku ?? '').toString().trim();
    const getQty = (r) => {
      const q = r['product quantity'] ?? r['Product Quantity'] ?? r.quantity;
      const n = parseInt(q, 10);
      return Number.isFinite(n) ? n : 0;
    };
    const getName = (r) => (r['product name'] ?? r['Product Name'] ?? '').toString().toLowerCase();

    const list = [...csvData];
    list.sort((a, b) => {
      const aSku = getSku(a);
      const bSku = getSku(b);
      const aHas = aSku.length > 0;
      const bHas = bSku.length > 0;
      if (aHas !== bHas) return aHas ? 1 : -1; // no-SKU first
      const aq = getQty(a);
      const bq = getQty(b);
      if (aq !== bq) return bq - aq; // higher Qty first
      return getName(a).localeCompare(getName(b));
    });
    return list;
  }, [csvData]);

  // Keep original CSV text/name for storage on import
  const [parsedCsvText, setParsedCsvText] = useState('');
  const [parsedCsvName, setParsedCsvName] = useState('');

  const handleUseSample = async () => {
    try {
      // In dev/build, CRA serves files in /public at root
      const res = await fetch('/whatnot_orders_with_skus.csv', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const text = await res.text();
      setParsedCsvName('whatnot_orders_with_skus.csv');
      setParsedCsvText(text);
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const grouped = new Map();
          const normalizeName = (s) => s.replace(/\s*#\d+\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
          for (const raw of results.data) {
            const nameRaw = (raw['product name'] ?? raw['Product Name'] ?? '').toString();
            const name = normalizeName(nameRaw);
            const desc = (raw['product description'] ?? raw['Product Description'] ?? '').toString().trim();
            const qtyNum = parseInt(raw['product quantity'] ?? raw['Product Quantity'] ?? raw['quantity'], 10);
            const qty = Number.isFinite(qtyNum) ? qtyNum : 0;
            const sku = (raw['sku'] ?? raw['SKU'] ?? '').toString().trim();
            const key = `${name}||${desc}`.toLowerCase();
            if (!grouped.has(key)) {
              grouped.set(key, { ...raw, _groupKey: key, sku, 'product name': name, 'product description': desc, 'product quantity': qty, assignedProduct: null });
            } else {
              const acc = grouped.get(key);
              acc['product quantity'] = (parseInt(acc['product quantity'], 10) || 0) + qty;
              if ((!acc.sku || acc.sku.length === 0) && sku) acc.sku = sku;
            }
          }
          setCsvData(Array.from(grouped.values()));
        },
      });
    } catch (e) {
      console.error('Failed to load sample CSV', e);
      alert('Could not load sample CSV from /whatnot_orders_with_skus.csv');
    }
  };

  return (
    <>
      <ConfirmDialog />
      <div className="inventory-container">
        <div className="sub-tab-navigation">
          <button
            type="button"
            className={`sub-tab-button ${activeSection === SECTIONS.IMPORT ? 'active' : ''}`}
            onClick={() => setActiveSection(SECTIONS.IMPORT)}
          >
            Import WhatNot
          </button>
          <button
            type="button"
            className={`sub-tab-button ${activeSection === SECTIONS.MANAGE ? 'active' : ''}`}
            onClick={() => setActiveSection(SECTIONS.MANAGE)}
          >
            Manage Stock
          </button>
        </div>
        {activeSection === SECTIONS.IMPORT && null}

        <div className="inventory-section">
          {activeSection === SECTIONS.IMPORT ? (
            <>
              <div className="inventory-section-header">
                <h2>Import CSV</h2>
                <button type="button" className="history-link" onClick={openHistoryModal}>
                  View History
                </button>
              </div>
              <div className="file-actions">
                <div className="btn-file-menu">
                  <button type="button" className="btn-file" onClick={() => setShowFileMenu(v => !v)}>Choose CSV ▾</button>
                  {showFileMenu && (
                    <div className="file-menu">
                      <button type="button" className="file-menu-item" onClick={() => { setShowFileMenu(false); fileInputRef.current?.click(); }}>Upload file…</button>
                      <button type="button" className="file-menu-item" onClick={() => { setShowFileMenu(false); handleUseSample(); }}>Use sample</button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} hidden />
                </div>
                <button className="btn-primary" onClick={handleParse} disabled={!file}>Parse CSV</button>
                <button
                  className="btn-primary"
                  onClick={() => handleInventoryUpdate(onImport, { rows: sortedCsvData, file: { name: parsedCsvName, text: parsedCsvText } })}
                  disabled={(sortedCsvData || []).length === 0}
                >
                  Import
                </button>
                {(file || parsedCsvName) && (
                  <span className="file-name" title={file?.name || parsedCsvName}>{file?.name || parsedCsvName}</span>
                )}
              </div>
              
              <div className="table-container">
                <table className="whatnot-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>sku</th>
                      <th>Qty</th>
                      <th>product name</th>
                      <th>product description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const hasSku = (r) => (r['sku'] ?? r['SKU'] ?? '').toString().trim().length > 0;
                      const firstWithSkuIndex = sortedCsvData.findIndex(hasSku);
                      const headerRow = (key, label) => (<tr key={key} className="section-row"><td colSpan={5}>{label}</td></tr>);
                      const rows = [];
                      if (firstWithSkuIndex === 0) {
                        rows.push(headerRow('withsku-top', 'With SKU'));
                      } else if (firstWithSkuIndex > 0 || firstWithSkuIndex === -1) {
                        rows.push(headerRow('nosku-top', 'Unassigned (no SKU)'));
                      }
                      sortedCsvData.forEach((row, index) => {
                        if (index === firstWithSkuIndex && firstWithSkuIndex > 0) {
                          rows.push(headerRow('withsku', 'With SKU'));
                        }
                        const productName = row['product name'] ?? row['Product Name'] ?? '';
                        const productDescription = row['product description'] ?? row['Product Description'] ?? '';
                        const productQuantity = row['product quantity'] ?? row['Product Quantity'] ?? '';
                        const sku = row['sku'] ?? row['SKU'] ?? '';
                        rows.push(
                          <tr key={(row._groupKey || productName + productDescription) + ':' + index}>
                            <td>
                              <div className="action-cell">
                                {row.assignedProduct ? (
                                  <span className="assigned-indicator" title={products[row.assignedProduct]?.flavor || 'Assigned'}>✅</span>
                                ) : (
                                  <button
                                    className="icon-button assign"
                                    title="Assign / Edit"
                                    aria-label="Assign / Edit"
                                    onClick={() => handleOpenAssignModal(index)}
                                  >
                                    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                                      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M16.5 3.5l4 4L7 21l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                )}
                                <button
                                  className="icon-button assign"
                                  title="Remove row"
                                  aria-label="Remove row"
                                  onClick={() => handleRemoveRow(index)}
                                >
                                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td>{sku}</td>
                            <td>{productQuantity}</td>
                            <td>{productName}</td>
                            <td>{productDescription}</td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
              
            </>
          ) : (
            <>
              <div className="inventory-list">
                {Object.values(products || {}).length === 0 ? (
                  <p>No products yet.</p>
                ) : (
                  Object.values(products || {}).map((p) => {
                    const category = categories[p.categoryId];
                    const packageOptions = (category?.containerTemplates || []).map(template => {
                      const inv = (p.containerInventory || []).find(i => i.templateId === template.id);
                      return { ...template, quantity: inv?.quantity || 0 };
                    });
                    const { totalOunces, totalUnits } = packageOptions.reduce(
                      (totals, opt) => {
                        const qty = opt.quantity || 0;
                        const weight = opt.weightOz || 0;
                        totals.totalOunces += weight * qty;
                        totals.totalUnits += qty;
                        return totals;
                      },
                      { totalOunces: 0, totalUnits: 0 }
                    );
                    const productForCard = {
                      ...p,
                      onHandOz: totalOunces,
                      onHandUnits: totalUnits,
                      batches: [],
                      status: 'Idle',
                      packageOptions
                    };
                    return (
                      <ProductCard
                        key={p.id}
                        product={productForCard}
                        category={category}
                        onClick={() => openProduct && openProduct(p.id)}
                      />
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isAssignModalOpen && (
        <AssignProductModal
          onClose={() => setAssignModalOpen(false)}
          products={products}
          categories={categories}
          row={sortedCsvData[selectedRowIndex]}
          onAssign={handleAssignProduct}
          onAddNewProduct={() => { setAssignModalOpen(false); setAddProductModalOpen(true); }}
        />
      )}
      {isAddProductModalOpen && (
        <AddProductModal
          categories={categories}
          products={products}
          canDeleteCategory={true}
          onClose={() => setAddProductModalOpen(false)}
          onSubmit={handleAddNewProduct}
          onDataRefresh={() => {}}
        />
      )}
      {isHistoryModalOpen && (
        <div className="modal-backdrop" onClick={closeHistoryModal}>
          <div className="modal-content inventory-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Inventory History</h2>
              <button type="button" className="close-button" onClick={closeHistoryModal}>×</button>
            </div>
            <div className="modal-body">
              <InventoryHistory refresh={refreshHistory} showTitle={false} onOpenCsv={(id) => setCsvViewer({ open: true, id })} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inventory;










