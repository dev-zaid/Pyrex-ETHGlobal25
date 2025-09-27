import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { palette, isDark } = useTheme();
  const backgroundColor = lightColor && !isDark ? lightColor : darkColor && isDark ? darkColor : palette.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
