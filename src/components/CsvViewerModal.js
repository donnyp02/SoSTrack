import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const CsvViewerModal = ({ id, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'csv_imports', id));
        if (snap.exists()) setFile({ id: snap.id, ...snap.data() });
      } catch (e) { console.error('Failed to load CSV doc', e); }
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const handleDownload = () => {
    if (!file?.content) return;
    const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'import.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReplace = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      await updateDoc(doc(db, 'csv_imports', id), { name: f.name, content: text, replacedAt: serverTimestamp() });
      setFile(prev => ({ ...prev, name: f.name, content: text }));
    } catch (err) { console.error('Failed to replace CSV', err); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content inventory-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>CSV File</h2>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div><strong>Name:</strong> {file?.name}</div>
              <div style={{ maxHeight: '50vh', overflow: 'auto', border: '1px solid #e3e6ea', borderRadius: 6, padding: 8 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{file?.content?.slice(0, 200000)}</pre>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" type="button" onClick={handleDownload}>Download</button>
                <label className="btn-secondary" style={{ display: 'inline-block' }}>
                  <input type="file" accept=".csv" onChange={handleReplace} hidden />
                  Replace File
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvViewerModal;

