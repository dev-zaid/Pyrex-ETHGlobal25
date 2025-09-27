/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#5CE1E6';
const tintColorDark = '#F4F6F9';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const ThemePalettes = {
  dark: {
    background: '#030B18',
    surface: 'rgba(9, 24, 52, 0.84)',
    surfaceElevated: 'rgba(14, 34, 66, 0.92)',
    outline: '#1B3657',
    outlineStrong: '#255280',
    accent: '#5CE1E6',
    accentSoft: '#2C9CF5',
    secondary: '#8B5CF6',
    warning: '#F97316',
    success: '#34D399',
    textPrimary: '#F2F6FC',
    textSecondary: '#8FA7C6',
    textMuted: '#6C82A6',
    error: '#FF6B6B',
  },
  light: {
    background: '#FFFFFF',
    surface: 'rgba(248, 250, 252, 0.95)',
    surfaceElevated: 'rgba(241, 245, 249, 1)',
    outline: '#E2E8F0',
    outlineStrong: '#CBD5E1',
    accent: '#0EA5E9',
    accentSoft: '#38BDF8',
    secondary: '#8B5CF6',
    warning: '#F97316',
    success: '#10B981',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    error: '#EF4444',
  }
};

// Default export for backward compatibility
export const Palette = ThemePalettes.dark;

export const ThemeShadows = {
  dark: {
    card: {
      shadowColor: '#050F24',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    soft: {
      shadowColor: '#020712',
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  },
  light: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    soft: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  },
};

// Default export for backward compatibility
export const Shadows = ThemeShadows.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
