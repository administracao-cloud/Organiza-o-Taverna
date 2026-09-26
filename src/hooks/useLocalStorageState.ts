import { useState, useEffect, useRef } from 'react';
import { safeGet, safeSet } from '../utils/storage';

/**
 * A custom hook to persist state in localStorage with safe JSON parsing and fallback.
 * 
 * @param key The localStorage key
 * @param defaultValue The initial/fallback value or initializer function
 * @returns A stateful value and a function to update it
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void] {
  // Read initial value from localStorage or fallback
  const [state, setState] = useState<T>(() => {
    const fallback = typeof defaultValue === 'function'
      ? (defaultValue as () => T)()
      : defaultValue;
    return safeGet<T>(key, fallback);
  });

  // Track the key in a ref to avoid recreating the effect needlessly
  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    safeSet(keyRef.current, state);
  }, [state]);

  // Sync state across different tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === keyRef.current && e.newValue !== null) {
        const parsed = safeGet<T>(keyRef.current, null);
        if (parsed !== null) {
          setState(parsed);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  return [state, setState];
}
