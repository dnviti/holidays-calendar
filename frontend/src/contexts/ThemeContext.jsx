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
        // Apply default light theme if branding fails to load
        applyDefaultLightTheme();
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

    // Apply branding colors
    setVar('primary-color', themeData.primary_color || '#6366F1');
    setVar('secondary-color', themeData.secondary_color || '#4F46E5');

    // Add other colors if present in the branding object,
    // assuming they match the database schema/names
    setVar('accent-color', themeData.accent_color || '#818CF8');
    setVar('info-color', themeData.info_color || '#3B82F6');
    setVar('success-color', themeData.success_color || '#10B981');
    setVar('warning-color', themeData.warning_color || '#F59E0B');
    setVar('danger-color', themeData.danger_color || '#EF4444');

    // Apply light theme defaults if branding colors are not provided
    setVar('background-color', themeData.background_color || '#F8FAFC');
    setVar('surface-color', themeData.surface_color || '#FFFFFF');
    setVar('card-color', themeData.card_color || '#FFFFFF');
    setVar('text-primary-color', themeData.text_primary_color || '#1E293B');
    setVar('text-secondary-color', themeData.text_secondary_color || '#64748B');
    setVar('border-color', themeData.border_color || '#E2E8F0');
  };

  const applyDefaultLightTheme = () => {
    const root = document.documentElement;

    // Helper to set CSS var
    const setVar = (name, value) => {
      if (value) root.style.setProperty(`--${name}`, value);
    };

    // Apply default light theme
    setVar('primary-color', '#6366F1');
    setVar('secondary-color', '#4F46E5');
    setVar('accent-color', '#818CF8');
    setVar('info-color', '#3B82F6');
    setVar('success-color', '#10B981');
    setVar('warning-color', '#F59E0B');
    setVar('danger-color', '#EF4444');
    setVar('background-color', '#F8FAFC');
    setVar('surface-color', '#FFFFFF');
    setVar('card-color', '#FFFFFF');
    setVar('text-primary-color', '#1E293B');
    setVar('text-secondary-color', '#64748B');
    setVar('border-color', '#E2E8F0');
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
