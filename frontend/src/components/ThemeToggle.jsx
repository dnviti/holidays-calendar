import { Sun, Moon } from 'lucide-react';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { themeMode, toggleThemeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton onClick={toggleThemeMode} color="inherit" size="small">
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
