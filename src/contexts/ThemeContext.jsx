import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      let isDarkMode = false;
      if (theme === 'system') {
        isDarkMode = mediaQuery.matches;
      } else {
        isDarkMode = theme === 'dark';
      }
      
      setIsDark(isDarkMode);
      
      if (isDarkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = (e) => {
      if (theme === 'system') applyTheme();
    };
    
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Renk paleti değiştirme fonksiyonu
  const setColors = (primaryH, primaryS, primaryL, accentH, accentS, accentL) => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary-h', primaryH);
    root.style.setProperty('--primary-s', primaryS);
    root.style.setProperty('--primary-l', primaryL);
    root.style.setProperty('--accent-h', accentH);
    root.style.setProperty('--accent-s', accentS);
    root.style.setProperty('--accent-l', accentL);
  };

  const value = {
    theme,
    setTheme,
    isDark,
    setColors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
