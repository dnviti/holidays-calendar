import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { itIT, enUS } from '@mui/material/locale';
import { useTranslation } from 'react-i18next';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { createAppTheme } from './theme/muiTheme';
import './styles/index.css';
import './i18n/config';

// Wrapper component to apply MUI theme based on current i18n language and theme mode
const ThemedApp = () => {
  const { i18n } = useTranslation();
  const { themeMode, branding } = useTheme();

  const muiLocale = i18n.language === 'it' ? itIT : enUS;
  const theme = React.useMemo(
    () => createAppTheme(themeMode, branding || {}, muiLocale),
    [themeMode, branding, muiLocale]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" richColors theme={themeMode} />
      <AuthProvider>
        <App />
      </AuthProvider>
    </MuiThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
