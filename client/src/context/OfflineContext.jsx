import React, { createContext, useContext, useState, useEffect } from 'react';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToCache = (key, data) => {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const getFromCache = (key) => {
    try {
      const data = localStorage.getItem(`cache_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
      return null;
    }
  };

  return (
    <OfflineContext.Provider value={{ isOffline, saveToCache, getFromCache }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
