/**
 * useFixtures.js
 * React hook for managing fixture state and API calls.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

export function useFixtures() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFixtures();
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const addRow = useCallback(async (row) => {
    const newRow = await api.addFixture(row);
    setRows(prev => [...prev, newRow].sort(rowSort));
    return newRow;
  }, []);

  const updateRow = useCallback(async (id, updates) => {
    const updated = await api.updateFixture(id, updates);
    setRows(prev => prev.map(r => r.id === id ? updated : r).sort(rowSort));
    return updated;
  }, []);

  const deleteRow = useCallback(async (id) => {
    await api.deleteFixture(id);
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const importCSV = useCallback(async (file) => {
    const result = await api.importCSV(file);
    await fetchRows();
    return result;
  }, [fetchRows]);

  const clearAll = useCallback(async () => {
    await api.clearFixtures();
    setRows([]);
  }, []);

  return { rows, loading, error, addRow, updateRow, deleteRow, importCSV, clearAll, refetch: fetchRows };
}

function rowSort(a, b) {
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;
  return (a.time || '').localeCompare(b.time || '');
}
