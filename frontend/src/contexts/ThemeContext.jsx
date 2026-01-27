import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

// Dark theme color palette
const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  primary: '#818CF8',
  secondary: '#6366F1',
  accent: '#A5B4FC',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
};

// Light theme color palette (defaults)
const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  primary: '#6366F1',
  secondary: '#4F46E5',
  accent: '#818CF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

export const ThemeProvider = ({ children }) => {
  const [branding, setBranding] = useState(null);
  const [themeMode, setThemeMode] = useState(() => {
    // Load theme preference from localStorage, default to 'light'
    return localStorage.getItem('theme-mode') || 'light';
  });

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await api.get('/branding');
        setBranding(response.data);
        applyTheme(response.data, themeMode);
      } catch (error) {
        console.error("Failed to load branding:", error);
        // Apply default theme if branding fails to load
        applyTheme({}, themeMode);
      }
    };

    fetchBranding();
  }, []);

  // Re-apply theme when mode changes
  useEffect(() => {
    if (branding !== null) {
      applyTheme(branding, themeMode);
    } else {
      applyTheme({}, themeMode);
    }
  }, [themeMode, branding]);

  const applyTheme = (themeData, mode) => {
    const root = document.documentElement;
    const isDark = mode === 'dark';
    const palette = isDark ? darkTheme : lightTheme;

    // Set data-theme attribute for CSS selectors
    root.setAttribute('data-theme', mode);

    // Helper to set CSS var
    const setVar = (name, value) => {
      if (value) root.style.setProperty(`--${name}`, value);
    };

    // Apply branding colors with fallbacks to palette
    setVar('primary-color', themeData.primary_color || palette.primary);
    setVar('secondary-color', themeData.secondary_color || palette.secondary);
    setVar('accent-color', themeData.accent_color || palette.accent);
    setVar('info-color', themeData.info_color || palette.info);
    setVar('success-color', themeData.success_color || palette.success);
    setVar('warning-color', themeData.warning_color || palette.warning);
    setVar('danger-color', themeData.danger_color || palette.danger);

    // Apply mode-specific colors
    setVar('background-color', themeData.background_color || palette.background);
    setVar('surface-color', themeData.surface_color || palette.surface);
    setVar('card-color', themeData.card_color || palette.card);
    setVar('text-primary-color', themeData.text_primary_color || palette.textPrimary);
    setVar('text-secondary-color', themeData.text_secondary_color || palette.textSecondary);
    setVar('border-color', themeData.border_color || palette.border);
  };

  const toggleThemeMode = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const updateBranding = (newBranding) => {
    setBranding(newBranding);
    applyTheme(newBranding, themeMode);
  };

  return (
    <ThemeContext.Provider value={{ branding, updateBranding, themeMode, toggleThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
