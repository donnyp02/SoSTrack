// src/components/ReportsModal.js
import React, { useMemo } from 'react';
import './ReportsModal.css';

const buildSku = (product, category) => {
  const parts = [];
  const categorySku = (category?.sku || '').trim();
  const flavorSku = (product?.flavorSku || '').trim();
  if (categorySku) parts.push(categorySku);
  if (flavorSku) parts.push(flavorSku);

  let containerSku = '';
  const selectedId = Array.isArray(product?.selectedContainers)
    ? product.selectedContainers[0]
    : null;
  if (selectedId && Array.isArray(category?.containerTemplates)) {
    const template = category.containerTemplates.find((t) => t.id === selectedId);
    if (template?.sku) {
      containerSku = template.sku.trim();
    }
  }
  if (containerSku) parts.push(containerSku);
  return parts.join('-') || 'N/A';
};

const ReportsModal = ({ products = {}, categories = {}, onClose }) => {
  const rows = useMemo(() => {
    return Object.values(products || {}).map((product) => {
      const category = categories[product.categoryId];
      const productName = `${category?.name || ''} ${product?.flavor || ''}`.replace(/\s+/g, ' ').trim();
      const sku = buildSku(product, category);
      return { name: productName || 'Untitled Product', sku };
    });
  }, [products, categories]);

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = ['Product Name', 'SKU'];
    const lines = rows.map(({ name, sku }) => {
      const escape = (value) => {
        if (value == null) return '';
        const stringValue = value.toString();
        if (/[",\n]/.test(stringValue)) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      return [escape(name), escape(sku)].join(',');
    });
    const csvContent = [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'product-skus.csv');
  };

  const exportDoc = () => {
    const headerRow = '<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Product Name</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">SKU</th></tr>';
    const bodyRows = rows
      .map(
        ({ name, sku }) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td><td style="padding:8px;border-bottom:1px solid #eee;">${sku}</td></tr>`
      )
      .join('');
    const html = `
      <html>
        <head><meta charset="UTF-8"><title>Product SKUs</title></head>
        <body>
          <h2>Product SKU Report</h2>
          <table style="border-collapse:collapse;width:100%;">${headerRow}${bodyRows}</table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/msword' });
    triggerDownload(blob, 'product-skus.doc');
  };

  return (
    <div className="modal-backdrop reports-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reports</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p>Export a current list of products and their SKUs.</p>
          <div className="export-actions">
            <button className="primary" onClick={exportCsv}>
              Export CSV (Excel)
            </button>
            <button className="secondary" onClick={exportDoc}>
              Export DOC (Word)
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
