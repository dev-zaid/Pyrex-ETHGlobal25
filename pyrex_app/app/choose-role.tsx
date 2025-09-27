import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';

export default function ChooseRoleScreen() {
  const router = useRouter();
  const { palette } = useTheme();

  const handleSelect = (role: 'user' | 'vendor') => {
    router.push(`/sign-in/${role}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.decorLeft, { backgroundColor: palette.secondary }]} />
      <View style={[styles.decorRight, { backgroundColor: palette.accent }]} />
      <View style={styles.content}>
        <Text style={[styles.heading, { color: palette.textPrimary }]}>Choose your journey</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Tailored experiences whether you are paying in seconds or powering the checkout counter.
        </Text>
        <View style={styles.buttonGroup}>
          <Pressable style={[styles.roleButton, styles.userButton, { backgroundColor: palette.surface }]} onPress={() => handleSelect('user')}>
            <View style={styles.roleHeader}>
              <View style={[styles.roleIcon, styles.userIcon, { backgroundColor: palette.accent }]}>
                <Feather name="user" size={22} color={palette.background} />
              </View>
              <Text style={[styles.roleLabel, { color: palette.textPrimary }]}>Sign in as User</Text>
            </View>
            <Text style={[styles.roleHint, { color: palette.textSecondary }]}>Scan UPI-ready codes, monitor balances, and manage receipts effortlessly.</Text>
            <View style={styles.pillGroup}>
              <View style={[styles.pill, { backgroundColor: palette.secondary + '20' }]}>
                <Feather name="lock" size={12} color={palette.textSecondary} />
                <Text style={[styles.pillText, { color: palette.textSecondary }]}>Secure</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: palette.secondary + '20' }]}>
                <Feather name="clock" size={12} color={palette.textSecondary} />
                <Text style={[styles.pillText, { color: palette.textSecondary }]}>Instant</Text>
              </View>
            </View>
          </Pressable>
          <Pressable style={[styles.roleButton, styles.vendorButton, { backgroundColor: palette.surface }]} onPress={() => handleSelect('vendor')}>
            <View style={styles.roleHeader}>
              <View style={[styles.roleIcon, styles.vendorIcon, { backgroundColor: palette.secondary }]}>
                <Feather name="shopping-bag" size={22} color={palette.background} />
              </View>
              <Text style={[styles.roleLabel, { color: palette.textPrimary }]}>Sign in as Vendor</Text>
            </View>
            <Text style={[styles.roleHint, { color: palette.textSecondary }]}>Generate branded QR codes, confirm payments, and track settlements in one place.</Text>
            <View style={styles.pillGroup}>
              <View style={[styles.pill, { backgroundColor: palette.accent + '20' }]}>
                <Feather name="credit-card" size={12} color={palette.textSecondary} />
                <Text style={[styles.pillText, { color: palette.textSecondary }]}>UPI Ready</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: palette.accent + '20' }]}>
                <Feather name="bar-chart-2" size={12} color={palette.textSecondary} />
                <Text style={[styles.pillText, { color: palette.textSecondary }]}>Analytics</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
  },
  decorLeft: {
    position: 'absolute',
    left: -120,
    top: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.16,
  },
  decorRight: {
    position: 'absolute',
    right: -140,
    bottom: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 32,
  },
  heading: {
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
  },
  buttonGroup: {
    gap: 18,
  },
  roleButton: {
    borderRadius: 22,
    borderColor: 'rgba(154, 158, 158, 0.35)',
    padding: 24,
    gap: 14,
    borderWidth: 1,
  },
  userButton: {
  },
  vendorButton: {
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIcon: {
  },
  vendorIcon: {
  },
  roleLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  roleHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(23, 62, 109, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(92, 225, 230, 0.35)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
