import { useState, useCallback } from 'react';

export function useHistory() {
  const [history, setHistory] = useState([]); // Array of operation batches

  const pushHistory = useCallback((ops) => {
    setHistory(prev => [...prev, ops]);
  }, []);

  const popHistory = useCallback(() => {
    let last = null;
    setHistory(prev => {
      if (prev.length === 0) return prev;
      last = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    return last;
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    history,
    pushHistory,
    popHistory,
    clearHistory,
    canUndo: history.length > 0,
    historyCount: history.length,
  };
}
