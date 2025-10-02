import React, { useState } from 'react';
import Papa from 'papaparse';
import './ImportCSVModal.css';
import AssignProductModal from './AssignProductModal';
import AddProductModal from './AddProductModal';

const ImportCSVModal = ({ onClose, onImport, products, categories, onAddProduct }) => {
  const [csvData, setCsvData] = useState([]);
  const [file, setFile] = useState(null);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleParse = () => {
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const dataWithAssignments = results.data.map(row => ({ ...row, assignedProduct: null }));
          setCsvData(dataWithAssignments);
        },
      });
    }
  };

  const handleOpenAssignModal = (index) => {
    setSelectedRowIndex(index);
    setAssignModalOpen(true);
  };

  const handleAssignProduct = (productId) => {
    const updatedCsvData = [...csvData];
    updatedCsvData[selectedRowIndex].assignedProduct = productId;
    setCsvData(updatedCsvData);
    setAssignModalOpen(false);
  };

  const handleAddNewProduct = (productData) => {
    onAddProduct(productData);
    setAddProductModalOpen(false);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Import CSV</h2>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-body">
            <div className="file-input-container">
              <input type="file" accept=".csv" onChange={handleFileChange} />
              <button onClick={handleParse} disabled={!file}>Parse CSV</button>
              <button onClick={() => setAddProductModalOpen(true)}>Create New Product</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {csvData.length > 0 && Object.keys(csvData[0]).map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, index) => (
                    <tr key={index}>
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key}>{value}</td>
                      ))}
                      <td>
                        {row.assignedProduct ? (
                          <span>{products[row.assignedProduct]?.flavor}</span>
                        ) : (
                          <button onClick={() => handleOpenAssignModal(index)}>Assign Product</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={() => onImport(csvData)} className="import-btn" disabled={csvData.length === 0}>Import</button>
          </div>
        </div>
      </div>
      {isAssignModalOpen && (
        <AssignProductModal
          onClose={() => setAssignModalOpen(false)}
          products={products}
          onAssign={handleAssignProduct}
        />
      )}
      {isAddProductModalOpen && (
        <AddProductModal
          categories={categories}
          onClose={() => setAddProductModalOpen(false)}
          onSubmit={handleAddNewProduct}
          onDataRefresh={() => {}}
        />
      )}
    </>
  );
};

export default ImportCSVModal;