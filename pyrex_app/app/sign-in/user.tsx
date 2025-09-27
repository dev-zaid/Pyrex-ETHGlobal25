import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';

export default function UserSignInScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const isDisabled = username.trim().length < 3;
  const { palette, shadows } = useTheme();

  const handleContinue = () => {
    if (isDisabled) {
      return;
    }

    router.push({ pathname: '/user/dashboard', params: { username: username.trim() } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.decorOne, { backgroundColor: palette.secondary }]} />
      <View style={[styles.decorTwo, { backgroundColor: palette.accent }]} />
      <View style={styles.content}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: palette.accent }]}>
            <Feather name="user" size={20} color={palette.background} />
          </View>
          <Text style={[styles.heading, { color: palette.textPrimary }]}>Create your handle</Text>
        </View>
        <Text style={[styles.copy, { color: palette.textSecondary }]}>
          Stand out on Pyrex with a memorable handle to receive payments and share with friends.
        </Text>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>User handle</Text>
          <View style={[styles.inputWrapper, { backgroundColor: palette.surface, borderColor: palette.outline }, shadows.soft]}>
            <Feather name="at-sign" size={18} color={palette.textSecondary} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. sneha-sharma"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, { color: palette.textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
            />
          </View>
          <Text style={[styles.helper, { color: palette.textMuted }]}>3-32 characters · Letters, numbers, hyphen only</Text>
        </View>
      </View>
      <Pressable
        style={[styles.ctaButton, { backgroundColor: palette.accent }, shadows.card, isDisabled && styles.ctaButtonDisabled]}
        onPress={handleContinue}
        disabled={isDisabled}>
        <Text style={[styles.ctaText, { color: palette.background }]}>Continue</Text>
        <Feather name="arrow-right" size={20} color={palette.background} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  decorOne: {
    position: 'absolute',
    top: -80,
    right: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.18,
  },
  decorTwo: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
  },
  copy: {
    fontSize: 16,
    lineHeight: 24,
  },
  formGroup: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  helper: {
    fontSize: 13,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 18,
  },
  ctaButtonDisabled: {
    backgroundColor: '#2C536F',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
