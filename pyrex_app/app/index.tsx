import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';

const APP_NAME = 'Pyrex';

export default function LandingScreen() {
  const router = useRouter();
  const { palette, shadows } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.decorLayer, { backgroundColor: palette.secondary }]} />
      <View style={styles.content}>
        <View style={[styles.logoBadge, { backgroundColor: palette.accent }]}>
          <Feather name="zap" size={24} color={palette.background} />
        </View>
        <Text style={[styles.appName, { color: palette.textPrimary }]}>{APP_NAME}</Text>
        <Text style={[styles.tagline, { color: palette.textSecondary }]}>Tap. Scan. Pay. Pyrex keeps every transaction effortless and secure.</Text>
        <View style={[styles.highlightCard, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
          <Feather name="shield" size={22} color={palette.accent} />
          <View style={styles.highlightCopy}>
            <Text style={[styles.highlightTitle, { color: palette.textPrimary }]}>Trusted by modern merchants</Text>
            <Text style={[styles.highlightSubtitle, { color: palette.textSecondary }]}>Encrypted transactions, instant confirmations, and detailed receipts.</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        {/* <Pressable style={styles.secondaryButton} onPress={() => router.push('/modal')}>
          <Feather name="play" size={18} color={palette.accent} />
          <Text style={styles.secondaryText}>Watch Demo</Text>
        </Pressable> */}
        <Pressable style={[styles.ctaButton, { backgroundColor: palette.accent }, shadows.card]} onPress={() => router.push('/choose-role')}>
          <Text style={[styles.ctaText, { color: palette.background }]}>Get Started</Text>
          <Feather name="arrow-right" size={20} color={palette.background} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 36,
    justifyContent: 'space-between',
  },
  decorLayer: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.18,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  highlightCopy: {
    flex: 1,
    gap: 6,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  highlightSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  appName: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
