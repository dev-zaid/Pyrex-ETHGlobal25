import { ThemePalettes, ThemeShadows } from '@/constants/theme';
import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  palette: typeof ThemePalettes.dark;
  shadows: typeof ThemeShadows.dark;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark'); // Default to dark
  
  // Determine if dark mode should be active
  const isDark = mode === 'system' 
    ? systemColorScheme === 'dark'
    : mode === 'dark';

  // Get current palette and shadows based on theme
  const palette = isDark ? ThemePalettes.dark : ThemePalettes.light;
  const shadows = isDark ? ThemeShadows.dark : ThemeShadows.light;

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleTheme = () => {
    setModeState(current => current === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextType = {
    mode,
    isDark,
    palette,
    shadows,
    setMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}