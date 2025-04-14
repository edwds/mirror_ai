import { useState, useEffect } from 'react';

function useSessionOption(key: string, defaultValue: string): [string, (val: string) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('analysisOptions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed[key] || defaultValue;
        } catch {
          return defaultValue;
        }
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('analysisOptions');
    const current = stored ? JSON.parse(stored) : {};
    current[key] = value;
    sessionStorage.setItem('analysisOptions', JSON.stringify(current));
  }, [key, value]);

  return [value, setValue];
}

export default useSessionOption;
