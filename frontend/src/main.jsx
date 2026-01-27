import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { itIT, enUS } from '@mui/material/locale';
import { useTranslation } from 'react-i18next';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import muiTheme from './theme/muiTheme';
import './styles/index.css';
import './i18n/config';

// Wrapper component to apply MUI locale based on current i18n language
const ThemedApp = () => {
  const { i18n } = useTranslation();

  const muiLocale = i18n.language === 'it' ? itIT : enUS;
  const theme = React.useMemo(
    () => createTheme(muiTheme, muiLocale),
    [muiLocale]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" richColors theme="light" />
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </MuiThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemedApp />
    </BrowserRouter>
  </React.StrictMode>
);
