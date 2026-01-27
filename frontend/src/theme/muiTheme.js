import { createTheme } from '@mui/material/styles';

// Create app theme based on mode (light/dark) and optional branding colors
export const createAppTheme = (mode = 'light', brandColors = {}, locale) => {
  const isDark = mode === 'dark';

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: brandColors.primary_color || (isDark ? '#818CF8' : '#6366F1'),
        light: isDark ? '#A5B4FC' : '#818CF8',
        dark: isDark ? '#6366F1' : '#4F46E5',
      },
      secondary: {
        main: isDark ? '#34D399' : '#10B981',
        light: isDark ? '#6EE7B7' : '#34D399',
        dark: isDark ? '#10B981' : '#059669',
      },
      background: {
        default: isDark ? '#0F172A' : '#F8FAFC',
        paper: isDark ? '#1E293B' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#1E293B',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      success: {
        main: isDark ? '#34D399' : '#10B981',
      },
      warning: {
        main: isDark ? '#FBBF24' : '#F59E0B',
      },
      error: {
        main: isDark ? '#F87171' : '#EF4444',
      },
      info: {
        main: isDark ? '#60A5FA' : '#3B82F6',
      },
      divider: isDark ? '#334155' : '#E2E8F0',
    },
    typography: {
      fontFamily: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        '"Open Sans"',
        '"Helvetica Neue"',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 700,
      },
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark
              ? '0px 4px 6px -1px rgba(0, 0, 0, 0.3), 0px 2px 4px -1px rgba(0, 0, 0, 0.2)'
              : '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Remove default gradient
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
    },
  }, locale);

  return theme;
};

// Export default light theme for backward compatibility
export default createAppTheme('light');