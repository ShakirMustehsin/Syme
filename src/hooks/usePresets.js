import { useState, useCallback } from 'react';

const STORAGE_KEY = 'syme_presets';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function usePresets(builtins) {
  const [userPresets, setUserPresets] = useState(loadFromStorage);

  const allPresets = [...builtins, ...userPresets];

  const savePreset = useCallback((name, rules) => {
    const preset = {
      id: `user_${Date.now()}`,
      name,
      rules,
      isUser: true,
    };
    setUserPresets(prev => {
      const next = [...prev, preset];
      saveToStorage(next);
      return next;
    });
  }, []);

  const deletePreset = useCallback((id) => {
    setUserPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { allPresets, userPresets, savePreset, deletePreset };
}
