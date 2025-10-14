import React, { createContext, useCallback, useContext, useMemo } from 'react';

const InventoryContext = createContext(null);

export const InventoryProvider = ({ products, setProducts, children }) => {

  const saveInventoryDelta = useCallback((productId, templateId, delta, before) => {
    const after = Math.max(0, (before || 0) + (Number(delta) || 0));
    setProducts(prev => {
      const p = prev[productId];
      if (!p) return prev;
      const next = { ...prev };
      const inv = Array.isArray(p.containerInventory) ? [...p.containerInventory] : [];
      const idx = inv.findIndex(i => i.templateId === templateId);
      if (idx >= 0) {
        inv[idx] = { ...inv[idx], quantity: after };
      } else {
        inv.push({ templateId, quantity: after });
      }
      next[productId] = { ...p, containerInventory: inv };
      return next;
    });
    return { after };
  }, [setProducts]);

  const value = useMemo(() => ({ saveInventoryDelta }), [saveInventoryDelta]);

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
};

export const useInventory = () => useContext(InventoryContext);
