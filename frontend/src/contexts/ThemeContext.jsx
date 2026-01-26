import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await api.get('/branding');
        setBranding(response.data);
        applyTheme(response.data);
      } catch (error) {
        console.error("Failed to load branding:", error);
      }
    };

    fetchBranding();
  }, []);

  const applyTheme = (themeData) => {
    const root = document.documentElement;

    // Helper to set CSS var
    const setVar = (name, value) => {
      if (value) root.style.setProperty(`--${name}`, value);
    };

    setVar('primary-color', themeData.primary_color);
    setVar('secondary-color', themeData.secondary_color);

    // Add other colors if present in the branding object, 
    // assuming they match the database schema/names
    setVar('accent-color', themeData.accent_color);
    setVar('info-color', themeData.info_color);
    setVar('success-color', themeData.success_color);
    setVar('warning-color', themeData.warning_color);
    setVar('danger-color', themeData.danger_color);
    setVar('background-color', themeData.background_color);
    setVar('card-color', themeData.card_color);
    setVar('text-primary-color', themeData.text_primary_color);
    setVar('text-secondary-color', themeData.text_secondary_color);
  };

  const updateBranding = (newBranding) => {
    setBranding(newBranding);
    applyTheme(newBranding);
  };

  return (
    <ThemeContext.Provider value={{ branding, updateBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
