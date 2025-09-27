import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';

const CAMERA_PERMISSION_ERROR =
  'Camera access is required to scan QR codes. Please update the permission in settings.';

const parseIntentPayload = (data: string) => {
  const payload = JSON.parse(data);
  if (payload?.type !== 'pyrex.intent') {
    throw new Error('Unsupported payload type');
  }

  const amountValue = Number(payload.amount);
  if (!payload.amount || Number.isNaN(amountValue) || amountValue <= 0) {
    throw new Error('Invalid amount');
  }

  const upiId = typeof payload.upiId === 'string' ? payload.upiId : null;
  const upiIntent = typeof payload.upiIntent === 'string' ? payload.upiIntent : null;

  // NEW: PayPal approve URL (optional)
  const paypalApprove =
    payload?.paypal && typeof payload.paypal?.approveUrl === 'string'
      ? payload.paypal.approveUrl
      : null;

  if (!upiIntent && !paypalApprove) {
    // allow either PayPal or UPI — but your vendor flow includes both
    throw new Error('Missing payment intent (UPI or PayPal)');
  }

  return {
    vendor: typeof payload.vendor === 'string' ? payload.vendor : null,
    amount: amountValue.toFixed(2),
    currency: typeof payload.currency === 'string' ? payload.currency : 'INR',
    upiId,
    upiIntent,
    paypalApprove, // NEW
  } as const;
};

export default function UserDashboardScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const displayName = username ? `@${username}` : 'you';
  const { palette, shadows, toggleTheme, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [lastScanValue, setLastScanValue] = useState<string | null>(null);
  const [scannedIntent, setScannedIntent] = useState<
    | {
        vendor: string | null;
        amount: string;
        currency: string;
        upiId: string | null;
        upiIntent: string | null;
        paypalApprove: string | null;
      }
    | null
  >(null);

  useEffect(() => {
    if (!permission) return;

    if (!permission.granted && permission.status !== 'undetermined') {
      setScanError(CAMERA_PERMISSION_ERROR);
    } else if (permission.granted) {
      setScanError(null);
    }
  }, [permission]);

  const permissionDeniedPermanently = useMemo(
    () => Boolean(permission && !permission.granted && !permission.canAskAgain),
    [permission],
  );

  const handleOpenScanner = async () => {
    setScanError(null);
    setHasScanned(false);
    setLastScanValue(null);
    setScannedIntent(null);

    if (permission?.granted) {
      setIsScannerVisible(true);
      return;
    }

    if (permissionDeniedPermanently) {
      setScanError(CAMERA_PERMISSION_ERROR);
      return;
    }

    setIsRequestingPermission(true);
    try {
      const response = await requestPermission();
      if (!response?.granted) {
        setScanError(CAMERA_PERMISSION_ERROR);
        return;
      }
      setIsScannerVisible(true);
    } catch (error) {
      console.error('Failed to request camera permission', error);
      setScanError('Something went wrong while requesting the camera permission.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!data || hasScanned) return;

    try {
      const parsed = parseIntentPayload(data);
      setHasScanned(true);
      setScannedIntent(parsed);
      setLastScanValue(data);
      setIsScannerVisible(false);
      setIsConfirmVisible(true);
    } catch (error) {
      console.error('Failed to interpret QR payload', error);
      setScanError('Could not read this QR. Please try again with a Pyrex code.');
      setScannedIntent(null);
      setLastScanValue(data);
    }
  };

  const handleConfirmPay = async () => {
    if (!scannedIntent) return;

    try {
      // Prefer PayPal if present
      if (scannedIntent.paypalApprove) {
        const canOpen = await Linking.canOpenURL(scannedIntent.paypalApprove);
        if (canOpen) {
          await Linking.openURL(scannedIntent.paypalApprove);
        } else {
          Alert.alert('Unable to open PayPal', 'No handler available for PayPal approval link.');
        }
      } else if (scannedIntent.upiIntent) {
        const canOpen = await Linking.canOpenURL(scannedIntent.upiIntent);
        if (canOpen) {
          await Linking.openURL(scannedIntent.upiIntent);
        } else {
          Alert.alert('UPI app not available', 'Install a supported UPI app to complete this payment.');
        }
      } else {
        Alert.alert('No payment method', 'No PayPal or UPI intent found.');
      }
    } catch (e) {
      console.error('Confirm & pay failed', e);
      Alert.alert('Unable to proceed', 'Please try again after verifying your payment apps.');
    } finally {
      setIsConfirmVisible(false);
      setScannedIntent(null);
      setHasScanned(false);
      setLastScanValue(null);
    }
  };

  const handleCancelIntent = () => {
    setIsConfirmVisible(false);
    setScannedIntent(null);
    setHasScanned(false);
    setLastScanValue(null);
  };

  const handleCloseScanner = () => {
    setIsScannerVisible(false);
    setHasScanned(false);
    setLastScanValue(null);
  };

  const handleLaunchUpiIntent = async () => {
    if (!scannedIntent?.upiIntent) return;
    try {
      const canOpen = await Linking.canOpenURL(scannedIntent.upiIntent);
      if (canOpen) {
        await Linking.openURL(scannedIntent.upiIntent);
        return;
      }
      Alert.alert('UPI app not available', 'Install a supported UPI app to complete this payment.');
    } catch (error) {
      console.error('Failed to launch UPI intent', error);
      Alert.alert('Unable to open UPI intent', 'Please try again after verifying your UPI apps.');
    }
  };

  const amountLabel = scannedIntent
    ? scannedIntent.currency === 'INR'
      ? `₹ ${scannedIntent.amount}`
      : `${scannedIntent.currency} ${scannedIntent.amount}`
    : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.decorTop, { backgroundColor: palette.secondary }]} />
      <View style={[styles.decorBottom, { backgroundColor: palette.accent }]} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.welcomeLabel, { color: palette.textMuted }]}>Welcome back</Text>
            <Text style={[styles.heading, { color: palette.textPrimary }]}>{displayName}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable 
              style={[styles.profileBadge, { backgroundColor: palette.surface, borderColor: palette.outlineStrong, ...shadows.soft }]}
              onPress={toggleTheme}>
              <Feather name={isDark ? "sun" : "moon"} size={20} color={palette.textPrimary} />
            </Pressable>
            <Pressable style={[styles.profileBadge, { backgroundColor: palette.surface, borderColor: palette.outlineStrong, ...shadows.soft }]}>
              <Feather name="user" size={20} color={palette.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.card }]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Scan & approve payments in seconds</Text>
            <Text style={[styles.heroSubtitle, { color: palette.textSecondary }]}>
              Use your camera to capture vendor QR codes, verify the amount, and confirm instantly.
            </Text>
            <View style={styles.heroChipRow}>
              <View style={[styles.heroChip, { 
                backgroundColor: isDark ? 'rgba(40, 86, 132, 0.4)' : 'rgba(14, 165, 233, 0.1)',
                borderColor: isDark ? 'rgba(92, 225, 230, 0.2)' : 'rgba(14, 165, 233, 0.2)'
              }]}>
                <Feather name="shield" size={12} color={palette.accent} />
                <Text style={[styles.heroChipText, { color: palette.textSecondary }]}>Secure</Text>
              </View>
              <View style={[styles.heroChip, { 
                backgroundColor: isDark ? 'rgba(40, 86, 132, 0.4)' : 'rgba(14, 165, 233, 0.1)',
                borderColor: isDark ? 'rgba(92, 225, 230, 0.2)' : 'rgba(14, 165, 233, 0.2)'
              }]}>
                <Feather name="zap" size={12} color={palette.accent} />
                <Text style={[styles.heroChipText, { color: palette.textSecondary }]}>Real-time</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={[
              styles.heroButton,
              { backgroundColor: palette.accent, ...shadows.card },
              (isRequestingPermission || permissionDeniedPermanently) && styles.heroButtonDisabled,
            ]}
            onPress={handleOpenScanner}
            disabled={isRequestingPermission || permissionDeniedPermanently}
          >
            {isRequestingPermission ? (
              <ActivityIndicator color={isDark ? palette.background : '#FFFFFF'} />
            ) : (
              <>
                <Feather name="camera" size={20} color={isDark ? palette.background : '#FFFFFF'} />
                <Text style={[styles.heroButtonText, { color: isDark ? palette.background : '#FFFFFF' }]}>Start scanning</Text>
              </>
            )}
          </Pressable>
        </View>
        {scanError ? <Text style={[styles.errorText, { color: palette.error }]}>{scanError}</Text> : null}

        <View style={styles.metricRow}>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
            <View style={styles.metricHeader}>
              <Feather name="activity" size={18} color={palette.accent} />
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>This week</Text>
            </View>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>₹ 0.00</Text>
            <Text style={[styles.metricHint, { color: palette.textMuted }]}>Payments approved</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
            <View style={styles.metricHeader}>
              <Feather name="clock" size={18} color={palette.secondary} />
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Last scan</Text>
            </View>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>{lastScanValue ? 'Moments ago' : 'Not yet'}</Text>
            <Text style={[styles.metricHint, { color: palette.textMuted }]}>
              {lastScanValue ? 'Ready to confirm' : 'Tap start scanning to begin'}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Recent transactions</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Keep tabs on your latest Pyrex activity and approvals.
              </Text>
            </View>
          </View>
          <View style={styles.emptyState}>
            <View style={[styles.emptyBadge, { 
              backgroundColor: isDark ? 'rgba(32, 66, 110, 0.35)' : 'rgba(14, 165, 233, 0.1)' 
            }]}>
              <Feather name="inbox" size={20} color={palette.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>No transactions yet</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
              Your payments will appear here as soon as you complete your first scan.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Scanner */}
      <Modal animationType="slide" transparent visible={isScannerVisible} onRequestClose={handleCloseScanner}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.scannerCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.outlineStrong, ...shadows.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: palette.accent }]}>
                <Feather name="camera" size={20} color={isDark ? palette.background : '#FFFFFF'} />
              </View>
              <View style={styles.modalCopy}>
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Scan a Pyrex QR</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                  Align the code inside the frame; we will capture it automatically and highlight the details.
                </Text>
              </View>
            </View>
            <View style={[styles.scannerView, { borderColor: palette.outline }]}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleBarCodeScanned}
                  enableTorch
                />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, styles.scannerPlaceholder, { 
                  backgroundColor: isDark ? 'rgba(6, 20, 40, 0.8)' : 'rgba(100, 116, 139, 0.1)' 
                }]}>
                  <Feather name="alert-triangle" size={20} color={palette.warning} />
                  <Text style={[styles.scannerPlaceholderText, { color: palette.textSecondary }]}>Camera permission is required.</Text>
                </View>
              )}
            </View>
            <View style={styles.modalHintRow}>
              <Feather name="sun" size={14} color={palette.textSecondary} />
              <Text style={[styles.scannerHint, { color: palette.textMuted }]}>
                If the QR does not scan, adjust distance or toggle the torch in your device controls.
              </Text>
            </View>
            {lastScanValue ? (
              <View style={[styles.scanDebug, { 
                backgroundColor: isDark ? 'rgba(92, 225, 230, 0.08)' : 'rgba(14, 165, 233, 0.05)',
                borderColor: isDark ? 'rgba(92, 225, 230, 0.2)' : 'rgba(14, 165, 233, 0.2)'
              }]}>
                <Text style={[styles.scanDebugLabel, { color: palette.textMuted }]}>Last capture preview</Text>
                <Text style={[styles.scanDebugValue, { color: palette.textPrimary }]} numberOfLines={2}>
                  {lastScanValue}
                </Text>
              </View>
            ) : null}
            {scanError ? <Text style={[styles.errorText, { color: palette.error }]}>{scanError}</Text> : null}
            <Pressable style={[styles.ghostButton, { borderColor: palette.outline }]} onPress={handleCloseScanner}>
              <Text style={[styles.ghostButtonText, { color: palette.textSecondary }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Confirm */}
      <Modal animationType="fade" transparent visible={isConfirmVisible} onRequestClose={handleCancelIntent}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.confirmCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.outlineStrong, ...shadows.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, styles.confirmIcon, { backgroundColor: palette.secondary }]}>
                <Feather name="check-circle" size={20} color={isDark ? palette.background : '#FFFFFF'} />
              </View>
              <View style={styles.modalCopy}>
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Confirm payment</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                  Review the details below before approving this transaction.
                </Text>
              </View>
            </View>
            {scannedIntent ? (
              <View style={[styles.intentList, { 
                backgroundColor: isDark ? 'rgba(7, 18, 36, 0.85)' : 'rgba(248, 250, 252, 0.9)',
                borderColor: palette.outline 
              }]}>
                <View style={styles.intentRow}>
                  <Text style={[styles.intentLabel, { color: palette.textMuted }]}>Vendor</Text>
                  <Text style={[styles.intentValue, { color: palette.textPrimary }]}>
                    {scannedIntent.vendor ? `@${scannedIntent.vendor}` : 'Unknown vendor'}
                  </Text>
                </View>
                {scannedIntent.upiId ? (
                  <View style={styles.intentRow}>
                    <Text style={[styles.intentLabel, { color: palette.textMuted }]}>UPI ID</Text>
                    <Text style={[styles.intentValue, { color: palette.textPrimary }]}>{scannedIntent.upiId}</Text>
                  </View>
                ) : null}
                <View style={styles.intentRow}>
                  <Text style={[styles.intentLabel, { color: palette.textMuted }]}>Amount</Text>
                  <Text style={[styles.intentAmount, { color: palette.accent }]}>{amountLabel}</Text>
                </View>
                <View style={styles.intentRow}>
                  <Text style={[styles.intentLabel, { color: palette.textMuted }]}>Currency</Text>
                  <Text style={[styles.intentValue, { color: palette.textPrimary }]}>{scannedIntent.currency}</Text>
                </View>
                {scannedIntent.upiIntent ? (
                  <View style={styles.intentRow}>
                    <Text style={[styles.intentLabel, { color: palette.textMuted }]}>UPI Intent</Text>
                    <Pressable style={styles.intentLink} onPress={handleLaunchUpiIntent}>
                      <Text style={[styles.intentLinkText, { color: palette.accent }]}>Tap to open</Text>
                      <Feather name="external-link" size={14} color={palette.accent} />
                    </Pressable>
                  </View>
                ) : null}
                {scannedIntent.paypalApprove ? (
                  <View style={styles.intentRow}>
                    <Text style={[styles.intentLabel, { color: palette.textMuted }]}>PayPal</Text>
                    <Text style={[styles.intentValue, { color: palette.textPrimary }]}>Approval link available</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={[styles.ghostButton, { borderColor: palette.outline }]} onPress={handleCancelIntent}>
                <Text style={[styles.ghostButtonText, { color: palette.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: palette.secondary, ...shadows.card }]}
                onPress={handleConfirmPay}
              >
                <Text style={[styles.primaryButtonText, { color: isDark ? palette.background : '#FFFFFF' }]}>Confirm & pay</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorTop: {
    position: 'absolute',
    right: -140,
    top: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.16,
  },
  decorBottom: {
    position: 'absolute',
    left: -160,
    bottom: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.12,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 56,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeLabel: {
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    flexDirection: 'column',
    gap: 20,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
  },
  heroCopy: {
    flex: 1,
    gap: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  heroButtonDisabled: {
    opacity: 0.6,
  },
  heroButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 22,
    padding: 20,
    gap: 12,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricHint: {
    fontSize: 13,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  emptyBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    marginTop: -12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 8, 18, 0.78)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 28,
    padding: 24,
    gap: 20,
    borderWidth: 1,
  },
  scannerCard: {
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmIcon: {
  },
  modalCopy: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  scannerView: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  scannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scannerPlaceholderText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  modalHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerHint: {
    fontSize: 12,
    flex: 1,
  },
  scanDebug: {
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
  },
  scanDebugLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scanDebugValue: {
    fontSize: 13,
  },
  ghostButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmCard: {
    gap: 22,
  },
  intentList: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
  },
  intentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  intentLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  intentValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  intentAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  intentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intentLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    flex: 1,
  },
});
