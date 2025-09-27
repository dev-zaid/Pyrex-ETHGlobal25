import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

function AppContent() {
  const { isDark, palette } = useTheme();

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="choose-role" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in/user"
          options={{
            title: 'User Sign In',
            headerTintColor: palette.textPrimary,
            headerStyle: { backgroundColor: palette.surface },
          }}
        />
        <Stack.Screen
          name="sign-in/vendor"
          options={{
            title: 'Vendor Sign In',
            headerTintColor: palette.textPrimary,
            headerStyle: { backgroundColor: palette.surface },
          }}
        />
        <Stack.Screen
          name="vendor/dashboard"
          options={{
            title: 'Vendor Dashboard',
            headerTintColor: palette.textPrimary,
            headerStyle: { backgroundColor: palette.background },
          }}
        />
        <Stack.Screen
          name="user/dashboard"
          options={{
            title: 'User Dashboard',
            headerTintColor: palette.textPrimary,
            headerStyle: { backgroundColor: palette.background },
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
