import { useTheme } from '@/contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { encode as btoa } from 'base-64';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = 'AdFASTYZVuQHbeVsjNv0C_2ed9KnOF_HZLJNeFTAboyxC_vpjmJRMZaUhs3jNEl9_D4jbKUuf1G4ssqU';
const PAYPAL_CLIENT_SECRET = 'EJGHtGXj0f6whqRglv-ISM4NuqpCUpz-2NKGhirfj10aVxNV0X2BORbyiQ-h-FPVcvdcwO8mH9KY2yEn';

// Exchange rate: 1 USD = 90 INR (Update this rate as needed)
const INR_TO_USD_RATE = 1 / 90;

const convertINRToUSD = (inrAmount: string): string => {
  const inrValue = parseFloat(inrAmount);
  const usdValue = inrValue * INR_TO_USD_RATE;
  return usdValue.toFixed(2);
};

async function getPayPalAccessToken() {
  const creds = `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`;
  const auth = btoa(creds);
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function createPayPalOrder(
  { value = '20.00', currency = 'USD' }: { value: string; currency: string },
  accessToken: string,
) {
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value } }],
      application_context: {
        return_url: 'https://pyrex-eth-global25.vercel.app/processing',
        cancel_url: 'https://pyrex-eth-global25.vercel.app/processing',
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create order error ${res.status}: ${text}`);
  }
  return res.json();
}

const buildUpiIntent = (params: { amount: string; upiId: string; vendorHandle: string | null }) => {
  const payeeName = params.vendorHandle ? `@${params.vendorHandle}` : 'Pyrex Vendor';
  const note = `Pyrex payment to ${payeeName}`;
  const query = [
    `pa=${encodeURIComponent(params.upiId)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${encodeURIComponent(params.amount)}`,
    'cu=INR',
    `tn=${encodeURIComponent(note)}`,
  ];
  return `upi://pay?${query.join('&')}`;
};

export default function VendorDashboardScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const displayName = username ? `@${username}` : 'your account';
  const { palette, shadows, toggleTheme, isDark } = useTheme();
  const [isAmountModalVisible, setIsAmountModalVisible] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState<string | null>(null);
  const [upiStatus, setUpiStatus] = useState<string | null>(null);
  const [isEditingUpi, setIsEditingUpi] = useState(true);
  const [upiSaved, setUpiSaved] = useState(false);

  // PayPal state
  const [paypalApproveLink, setPaypalApproveLink] = useState<string | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [isCreatingPaypalOrder, setIsCreatingPaypalOrder] = useState(false);

  // UTR verification state
  const [utrClickCount, setUtrClickCount] = useState(0);

  const formattedAmount = useMemo(() => {
    const parsed = Number(amountInput);
    if (!isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed.toFixed(2);
  }, [amountInput]);

  const formattedUSDAmount = useMemo(() => {
    if (!formattedAmount) return null;
    return convertINRToUSD(formattedAmount);
  }, [formattedAmount]);

  const normalizedUpiId = useMemo(() => upiId.trim().toLowerCase(), [upiId]);

  const qrPayload = useMemo(() => {
    if (!formattedAmount || !normalizedUpiId) return null;
    return JSON.stringify({
      type: 'pyrex.intent',
      vendor: username || null,
      amount: formattedAmount,
      currency: 'INR',
      upiId: normalizedUpiId,
      upiIntent: buildUpiIntent({
        amount: formattedAmount,
        upiId: normalizedUpiId,
        vendorHandle: username || null,
      }),
      // NEW: PayPal info embedded
      paypal: paypalApproveLink
        ? { approveUrl: paypalApproveLink, orderId: paypalOrderId }
        : null,
      createdAt: new Date().toISOString(),
    });
  }, [formattedAmount, normalizedUpiId, username, paypalApproveLink, paypalOrderId]);

  const validateUpiId = (value: string) => {
    const input = value.trim().toLowerCase();
    if (!input) return 'Enter the UPI ID linked to your merchant bank account.';
    if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(input)) return 'UPI ID should look like username@bankhandle.';
    return null;
  };

  const openAmountModal = () => {
    if (!upiSaved) {
      setUpiError('Save your UPI ID before generating a QR.');
      setUpiStatus(null);
      return;
    }
    setAmountInput('');
    setError(null);
    setIsAmountModalVisible(true);
  };

  const handleGenerateIntent = async () => {
    const sanitized = amountInput.trim();
    const value = Number(sanitized);
    if (!sanitized || Number.isNaN(value) || value <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    setError(null);
    setUpiError(null);
    setAmountInput(value.toFixed(2));

    // Create PayPal order (USD) based on INR amount – for sandbox demo we’ll pass the INR numeric as USD value directly.
    // Converted INR amount to USD using exchange rate (1 USD = 90 INR)
    try {
      setIsCreatingPaypalOrder(true);
      setPaypalApproveLink(null);
      setPaypalOrderId(null);

      const accessToken = await getPayPalAccessToken();
      const usdAmount = convertINRToUSD(value.toFixed(2));
      const order = await createPayPalOrder({ value: usdAmount, currency: 'USD' }, accessToken);

      const approveLink: string | undefined =
        order?.links?.find((l: { rel: string }) => l.rel === 'approve')?.href;

      if (!approveLink || !order?.id) {
        throw new Error('Approve link not returned by PayPal.');
      }

      setPaypalApproveLink(approveLink);
      setPaypalOrderId(order.id);
      setIsAmountModalVisible(false);
      setIsQrModalVisible(true);
    } catch (e: any) {
      console.error('Failed to create PayPal order', e);
      Alert.alert('PayPal error', e?.message ?? 'Unable to create PayPal order');
    } finally {
      setIsCreatingPaypalOrder(false);
    }
  };

  const closeQrModal = () => {
    setIsQrModalVisible(false);
    setUtrClickCount(0); // Reset UTR verification state
  };

  const handleSaveUpi = () => {
    const validation = validateUpiId(upiId);
    if (validation) {
      setUpiError(validation);
      setUpiStatus(null);
      return;
    }
    setUpiError(null);
    setUpiStatus('UPI ID saved. You can edit it anytime.');
    setIsEditingUpi(false);
    setUpiSaved(true);
  };

  const handleEditUpi = () => {
    setIsEditingUpi(true);
    setUpiStatus(null);
    setUpiSaved(false);
  };

  const handleUtrVerification = () => {
    if (utrClickCount === 0) {
      setUtrClickCount(1);
      // After 3 seconds, automatically move to processed state
      setTimeout(() => {
        setUtrClickCount(2);
      }, 3000);
    }
  };

  const getUtrButtonText = () => {
    if (utrClickCount === 0) return 'Verify UTR Number';
    if (utrClickCount === 1) return 'Verifying...';
    return 'UTR Number Processed';
  };

  const getUtrButtonIcon = () => {
    if (utrClickCount === 0) return 'search';
    if (utrClickCount === 1) return 'clock';
    return 'check-circle';
  };

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
              <Feather name="settings" size={20} color={palette.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.surfaceCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
          <View style={styles.surfaceHeader}>
            <View style={[styles.surfaceIcon, styles.upiIcon, { backgroundColor: palette.accent }]}>
              <Feather name="link" size={18} color={isDark ? palette.background : '#FFFFFF'} />
            </View>
            <View style={styles.surfaceCopy}>
              <Text style={[styles.surfaceTitle, { color: palette.textPrimary }]}>UPI settlement</Text>
              <Text style={[styles.surfaceSubtitle, { color: palette.textSecondary }]}>
                Enter the merchant VPA where your settlements should arrive.
              </Text>
            </View>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: palette.surfaceElevated, borderColor: palette.outline }]}>
            <Feather name="at-sign" size={18} color={palette.textSecondary} />
            <TextInput
              value={upiId}
              onChangeText={(value) => {
                setUpiId(value.replace(/[^\w.@-]/g, ''));
                setUpiError(null);
                setUpiStatus(null);
                setUpiSaved(false);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="merchant@bank"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.textInput, 
                { color: palette.textPrimary },
                !isEditingUpi && styles.textInputDisabled
              ]}
              editable={isEditingUpi}
            />
          </View>
          {upiError ? <Text style={[styles.errorText, { color: palette.error }]}>{upiError}</Text> : null}
          {upiStatus ? <Text style={[styles.successText, { color: palette.success }]}>{upiStatus}</Text> : null}
          <Text style={[styles.inputHelper, { color: palette.textMuted }]}>Provide your VPA (e.g. store@upi) before generating a QR.</Text>
          <View style={styles.surfaceActions}>
            {isEditingUpi ? (
              <Pressable style={[styles.surfacePrimaryButton, { backgroundColor: palette.accent, ...shadows.soft }]} onPress={handleSaveUpi}>
                <Feather name="save" size={16} color={isDark ? palette.background : '#FFFFFF'} />
                <Text style={[styles.surfacePrimaryText, { color: isDark ? palette.background : '#FFFFFF' }]}>Save</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.surfaceSecondaryButton, { borderColor: palette.outline }]} onPress={handleEditUpi}>
                <Feather name="edit-2" size={16} color={palette.textSecondary} />
                <Text style={[styles.surfaceSecondaryText, { color: palette.textSecondary }]}>Edit VPA</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.outlineStrong, ...shadows.card }]}>
          <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Generate branded QR codes instantly</Text>
          <Text style={[styles.heroSubtitle, { color: palette.textSecondary }]}>
            Set the payable amount, embed your UPI ID, and share a secure Pyrex QR in one tap.
          </Text>
          <View style={styles.heroChipRow}>
            <View style={[styles.heroChip, { 
              backgroundColor: isDark ? 'rgba(40, 86, 132, 0.4)' : 'rgba(14, 165, 233, 0.1)',
              borderColor: isDark ? 'rgba(92, 225, 230, 0.2)' : 'rgba(14, 165, 233, 0.2)'
            }]}>
              <Feather name="credit-card" size={12} color={palette.accent} />
              <Text style={[styles.heroChipText, { color: palette.textSecondary }]}>UPI + PayPal</Text>
            </View>
            <View style={[styles.heroChip, { 
              backgroundColor: isDark ? 'rgba(40, 86, 132, 0.4)' : 'rgba(14, 165, 233, 0.1)',
              borderColor: isDark ? 'rgba(92, 225, 230, 0.2)' : 'rgba(14, 165, 233, 0.2)'
            }]}>
              <Feather name="clock" size={12} color={palette.accent} />
              <Text style={[styles.heroChipText, { color: palette.textSecondary }]}>Instant receipts</Text>
            </View>
          </View>
          <Pressable
            style={[
              styles.heroButton, 
              { backgroundColor: palette.secondary, ...shadows.card },
              isCreatingPaypalOrder && { opacity: 0.7 }
            ]}
            onPress={openAmountModal}
            disabled={isCreatingPaypalOrder}
          >
            {isCreatingPaypalOrder ? (
              <ActivityIndicator color={isDark ? palette.background : '#FFFFFF'} />
            ) : (
              <>
                <Feather name="plus-circle" size={20} color={isDark ? palette.background : '#FFFFFF'} />
                <Text style={[styles.heroButtonText, { color: isDark ? palette.background : '#FFFFFF' }]}>Generate QR</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* metrics + empty list unchanged */}
        <View style={styles.metricRow}>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
            <View style={styles.metricHeader}>
              <Feather name="users" size={18} color={palette.accent} />
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Active customers</Text>
            </View>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>0</Text>
            <Text style={[styles.metricHint, { color: palette.textMuted }]}>Unique payers this week</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
            <View style={styles.metricHeader}>
              <Feather name="check-circle" size={18} color={palette.secondary} />
              <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Successful scans</Text>
            </View>
            <Text style={[styles.metricValue, { color: palette.textPrimary }]}>0</Text>
            <Text style={[styles.metricHint, { color: palette.textMuted }]}>QRs completed today</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.soft }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Transactions received</Text>
          </View>
          <View style={styles.emptyState}>
            <View style={[styles.emptyBadge, { 
              backgroundColor: isDark ? 'rgba(32, 66, 110, 0.35)' : 'rgba(14, 165, 233, 0.1)' 
            }]}>
              <Feather name="clipboard" size={20} color={palette.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>No payments yet</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
              Generated QRs will appear here once customers start scanning and paying.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Amount modal */}
      <Modal
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        visible={isAmountModalVisible}
        onRequestClose={() => setIsAmountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalCard, styles.amountCard, { backgroundColor: palette.surfaceElevated, borderColor: palette.outlineStrong, ...shadows.card }]}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, styles.amountIconBg, { backgroundColor: palette.accent }]}>
                <Feather name="edit-3" size={18} color={isDark ? palette.background : '#FFFFFF'} />
              </View>
              <View style={styles.modalCopy}>
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Enter payment amount</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                  This value is embedded into your QR for the customer to approve.
                </Text>
              </View>
            </View>
            <TextInput
              value={amountInput}
              onChangeText={(value) => {
                setAmountInput(value.replace(/[^0-9.]/g, ''));
                setError(null);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={palette.textMuted}
              style={[styles.amountInput, { 
                backgroundColor: palette.surface, 
                borderColor: palette.outline,
                color: palette.textPrimary 
              }]}
            />
            {error ? <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={[styles.ghostButton, { borderColor: palette.outline }]} onPress={() => setIsAmountModalVisible(false)}>
                <Text style={[styles.ghostButtonText, { color: palette.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: palette.secondary, ...shadows.card }]}
                onPress={handleGenerateIntent}
                disabled={isCreatingPaypalOrder}
              >
                {isCreatingPaypalOrder ? (
                  <ActivityIndicator color={isDark ? palette.background : '#FFFFFF'} />
                ) : (
                  <>
                    <Text style={[styles.primaryButtonText, { color: isDark ? palette.background : '#FFFFFF' }]}>Generate</Text>
                    <Feather name="arrow-right" size={18} color={isDark ? palette.background : '#FFFFFF'} />
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* QR modal */}
      <Modal animationType="fade" transparent={false} visible={isQrModalVisible} onRequestClose={closeQrModal}>
        <SafeAreaView style={[styles.fullscreenModal, { backgroundColor: palette.background }]}>
          <View style={styles.fullscreenHeader}>
            <View style={styles.modalCopy}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Payment QR ready</Text>
              <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                Ask the customer to scan this code to pay via PayPal or their preferred UPI app.
              </Text>
            </View>
            <Pressable onPress={closeQrModal} style={styles.closeButton}>
              <Feather name="x" size={22} color={palette.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.qrPreviewFullscreen}>
            <View style={[styles.qrPlaceholder, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
              <View style={styles.qrFrame}>
                {qrPayload ? (
                  <QRCode 
                    value={qrPayload} 
                    size={250} 
                    backgroundColor={isDark ? "#FFFFFF" : "#FFFFFF"} 
                    color={isDark ? "#030B18" : "#030B18"} 
                  />
                ) : (
                  <View style={styles.qrEmpty}>
                    <Feather name="alert-circle" size={20} color={palette.warning} />
                    <Text style={[styles.qrPlaceholderText, { color: palette.textSecondary }]}>Enter an amount to generate your QR.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.qrMetaCard, styles.qrMetaCardFullscreen, { backgroundColor: palette.surface, borderColor: palette.outline, ...shadows.card }]}>
            <Text style={[styles.qrMetaHeading, { color: palette.textPrimary }]}>Payment details</Text>
            <View style={[styles.qrMetaDivider, { backgroundColor: palette.outline }]} />
            <View style={styles.qrMetaRow}>
              <View style={[styles.qrMetaIcon, styles.qrMetaIconPrimary, { backgroundColor: palette.secondary }]}>
                <Feather name="user" size={14} color={isDark ? palette.background : '#FFFFFF'} />
              </View>
              <View style={styles.qrMetaContent}>
                <Text style={[styles.qrMetaLabel, { color: palette.textMuted }]}>Vendor</Text>
                <Text style={[styles.qrMetaText, { color: palette.textPrimary }]}>{displayName}</Text>
              </View>
            </View>
            <View style={styles.qrMetaRow}>
              <View style={[styles.qrMetaIcon, { backgroundColor: palette.surfaceElevated, borderColor: palette.outline }]}>
                <Feather name="link" size={14} color={palette.accent} />
              </View>
              <View style={styles.qrMetaContent}>
                <Text style={[styles.qrMetaLabel, { color: palette.textMuted }]}>UPI ID</Text>
                <Text style={[styles.qrMetaText, { color: palette.textPrimary }]}>{normalizedUpiId || 'Not set'}</Text>
              </View>
            </View>
            <View style={[styles.qrMetaRow, styles.qrMetaAmountRow]}>
              <View style={[styles.qrMetaIcon, styles.qrMetaIconAccent, { backgroundColor: palette.accent }]}>
                <Feather name="dollar-sign" size={16} color={isDark ? palette.background : '#FFFFFF'} />
              </View>
              <View style={styles.qrMetaContent}>
                <Text style={[styles.qrMetaLabel, { color: palette.textMuted }]}>Amount</Text>
                <Text style={[styles.qrMetaAmountText, { color: palette.accent }]}>₹ {formattedAmount ?? '0.00'}</Text>
                {formattedUSDAmount && (
                  <Text style={[styles.qrMetaUsdText, { color: palette.textSecondary }]}>≈ ${formattedUSDAmount} USD</Text>
                )}
              </View>
            </View>
            
            {/* UTR Verification Button */}
            <Pressable 
              style={[
                styles.utrButton, 
                { 
                  backgroundColor: utrClickCount === 2 ? palette.success : palette.accent,
                  borderColor: utrClickCount === 2 ? palette.success : palette.accent,
                  ...shadows.soft 
                }
              ]}
              onPress={handleUtrVerification}
              disabled={utrClickCount >= 1}
            >
              <Feather 
                name={getUtrButtonIcon() as any} 
                size={16} 
                color={isDark ? palette.background : '#FFFFFF'} 
              />
              <Text style={[styles.utrButtonText, { color: isDark ? palette.background : '#FFFFFF' }]}>
                {getUtrButtonText()}
              </Text>
              {utrClickCount === 1 && (
                <ActivityIndicator 
                  size="small" 
                  color={isDark ? palette.background : '#FFFFFF'} 
                />
              )}
            </Pressable>
            
            {/* {paypalApproveLink ? (
              <View style={styles.qrMetaFooter}>
                <Feather name="external-link" size={12} color={palette.textSecondary} />
                <Text style={[styles.qrMetaHint, { color: palette.textMuted }]}>PayPal approval link embedded (USD conversion applied).</Text>
              </View>
            ) : (
              <View style={styles.qrMetaFooter}>
                <Feather name="shield" size={12} color={palette.textSecondary} />
                <Text style={[styles.qrMetaHint, { color: palette.textMuted }]}>UPI intent embedded for fast settlements.</Text>
              </View>
            )} */}
          </View>
        </SafeAreaView>
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
    top: -120,
    right: -150,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.14,
  },
  decorBottom: {
    position: 'absolute',
    bottom: -140,
    left: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
    gap: 16,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
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
    backgroundColor: 'rgba(40, 86, 132, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(92, 225, 230, 0.2)',
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 15,
  },
  heroButtonText: {
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 22,
    fontWeight: '700',
  },
  metricHint: {
    fontSize: 13,
  },
  surfaceCard: {
    borderRadius: 24,
    padding: 24,
    gap: 18,
    borderWidth: 1,
  },
  surfaceHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  surfaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiIcon: {
  },
  amountIcon: {
  },
  surfaceCopy: {
    flex: 1,
    gap: 4,
  },
  surfaceTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  surfaceSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputHelper: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    paddingVertical: 20,
  },
  emptyBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 8, 18, 0.78)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 28,
    gap: 20,
    borderWidth: 1,
  },
  amountCard: {
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
  amountIconBg: {
  },
  qrIconBg: {
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
  amountInput: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    letterSpacing: 1.2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  ghostButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
  },
  fullscreenModal: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingTop: 100,
    gap: 16,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalCard: {
    gap: 20,
  },
  qrPreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPreviewFullscreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  qrPlaceholder: {
    width: 256,
    height: 256,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  qrFrame: {
    minWidth: 300,
    minHeight: 300,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 3,
    borderColor: '#E0E0E0',
  },
  qrEmpty: {
    alignItems: 'center',
    gap: 8,
  },
  qrPlaceholderText: {
    fontSize: 13,
    textAlign: 'center',
  },
  qrMetaCard: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    gap: 16,
  },
  qrMetaCardFullscreen: {
    marginTop: 16,
  },
  qrMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  qrMetaIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  qrMetaIconPrimary: {
  },
  qrMetaIconAccent: {
  },
  qrMetaContent: {
    flex: 1,
    gap: 4,
  },
  qrMetaHeading: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  qrMetaDivider: {
    height: 1,
  },
  qrMetaLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  qrMetaText: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  qrMetaAmountRow: {
    marginTop: 4,
  },
  qrMetaAmountText: {
    fontSize: 22,
    fontWeight: '700',
  },
  qrMetaUsdText: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  qrMetaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(27, 54, 87, 0.6)',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  qrMetaHint: {
    fontSize: 12,
  },
  textInputDisabled: {
    opacity: 0.6,
  },
  successText: {
    fontSize: 12,
  },
  surfaceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  surfacePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  surfacePrimaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  surfaceSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  surfaceSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  utrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
  },
  utrButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
