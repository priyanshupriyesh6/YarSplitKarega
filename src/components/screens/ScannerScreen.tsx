// ─────────────────────────────────────────────
//  Receipt Scanner Screen — Camera + OCR
// ─────────────────────────────────────────────

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { ParsedReceipt } from '../../types';
import { Card, Button, Badge } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES, detectCategory as detectCategoryFromText } from '../../constants/categories';

// ── Receipt Parser (mock OCR result interpreter) ───

function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Merchant: usually first meaningful line
  const merchant = lines[0] ?? 'Unknown Merchant';

  // Find totals using regex
  const totalPatterns = [
    /total[:\s]*[\$₹€£]?\s*(\d+[\.,]\d{2})/i,
    /grand\s*total[:\s]*[\$₹€£]?\s*(\d+[\.,]\d{2})/i,
    /amount\s*due[:\s]*[\$₹€£]?\s*(\d+[\.,]\d{2})/i,
    /[\$₹€£]\s*(\d+[\.,]\d{2})\s*$/im,
  ];

  let total: number | undefined;
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      total = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }

  // Tax
  const taxMatch = text.match(/(?:tax|gst|vat)[:\s]*[\$₹€£]?\s*(\d+[\.,]\d{2})/i);
  const tax = taxMatch ? parseFloat(taxMatch[1].replace(',', '.')) : undefined;

  // Date
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
  ];
  let date: string | undefined;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) { date = match[1]; break; }
  }

  // Line items: rows with price pattern
  const lineItemPattern = /^(.+?)\s+(\d+[\.,]\d{2})\s*$/;
  const lineItems = lines
    .filter((l) => lineItemPattern.test(l) && !/(total|tax|gst|vat|subtotal)/i.test(l))
    .slice(0, 8)
    .map((l) => {
      const match = l.match(lineItemPattern)!;
      return { name: match[1], price: parseFloat(match[2].replace(',', '.')) };
    });

  return { merchant, total, tax, date, lineItems, rawText: text };
}

// ── Demo receipt text for gallery mode ──────
const DEMO_RECEIPT = `
PIZZA PALACE
123 MG Road, Bangalore
Date: 21/05/2025

Margherita Pizza           350.00
Garlic Bread               120.00
Cold Drinks x2             100.00
Dessert Brownie            150.00

Subtotal                   720.00
GST (5%)                    36.00
Total                      756.00

Thank you for dining with us!
`.trim();

export const ScannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const scanAnim = useRef(new Animated.Value(0)).current;

  const [mode, setMode] = useState<'idle' | 'processing' | 'result'>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);

  const animateScan = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to scan receipts.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to scan receipts.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  const handleDemoScan = () => {
    setMode('processing');
    animateScan();
    setTimeout(() => {
      const parsed = parseReceiptText(DEMO_RECEIPT);
      setParsedReceipt(parsed);
      setMode('result');
    }, 2000);
  };

  const processReceipt = (uri: string) => {
    setMode('processing');
    // In production: pass to ML Kit OCR
    // For demo: use demo receipt text
    setTimeout(() => {
      const parsed = parseReceiptText(DEMO_RECEIPT);
      setParsedReceipt(parsed);
      setMode('result');
    }, 2000);
  };

  const handleUseExpense = () => {
    if (!parsedReceipt) return;
    const suggestedCategory = detectCategoryFromText(parsedReceipt.merchant ?? '');
    navigation.navigate('Groups', {
      screen: 'AddExpense',
      params: {
        groupId: 'g1', // default to first group
        prefill: {
          title: parsedReceipt.merchant,
          amount: parsedReceipt.total,
          category: suggestedCategory,
          receiptRawText: parsedReceipt.rawText,
          receiptParsed: parsedReceipt,
        },
      },
    });
  };

  const handleReset = () => {
    setMode('idle');
    setImageUri(null);
    setParsedReceipt(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F0E17', '#1A1542']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Text style={styles.headerTitle}>Receipt Scanner</Text>
        <Text style={styles.headerSub}>
          Capture and digitize receipts instantly
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── IDLE STATE ── */}
        {mode === 'idle' && (
          <>
            {/* Scanner preview frame */}
            <View style={styles.scannerFrame}>
              <LinearGradient
                colors={['rgba(108,99,255,0.15)', 'rgba(0,217,181,0.1)']}
                style={styles.scannerGradient}
              >
                {/* Corner decorations */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                <View style={styles.scannerCenter}>
                  <Ionicons name="receipt-outline" size={64} color={Colors.primary} style={{ opacity: 0.6 }} />
                  <Text style={styles.scannerHint}>Position receipt within frame</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryAction} onPress={handleTakePhoto}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.primaryActionGradient}>
                  <Ionicons name="camera" size={28} color={Colors.text} />
                  <Text style={styles.primaryActionText}>Take Photo</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={handlePickImage}>
                <Ionicons name="images-outline" size={22} color={Colors.primary} />
                <Text style={styles.secondaryActionText}>Photo Library</Text>
              </TouchableOpacity>
            </View>

            {/* Demo button */}
            <TouchableOpacity style={styles.demoButton} onPress={handleDemoScan}>
              <Ionicons name="flash-outline" size={16} color={Colors.accent} />
              <Text style={styles.demoButtonText}>Try Demo Scan</Text>
            </TouchableOpacity>

            {/* Tips */}
            <Card style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>📸 Tips for Best Results</Text>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
                <Text style={styles.tipText}>Lay receipt flat on a dark surface</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
                <Text style={styles.tipText}>Ensure all text is clearly visible</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
                <Text style={styles.tipText}>Avoid shadows and reflections</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
                <Text style={styles.tipText}>Total amount must be visible</Text>
              </View>
            </Card>
          </>
        )}

        {/* ── PROCESSING STATE ── */}
        {mode === 'processing' && (
          <View style={styles.processingContainer}>
            <View style={styles.processingFrame}>
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              )}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 220],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>

            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
            <Text style={styles.processingText}>Analyzing receipt...</Text>
            <Text style={styles.processingSubtext}>
              Extracting merchant, items, and totals
            </Text>
          </View>
        )}

        {/* ── RESULT STATE ── */}
        {mode === 'result' && parsedReceipt && (
          <>
            <View style={styles.resultHeader}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.positive} />
                <Text style={styles.successText}>Receipt Scanned!</Text>
              </View>
              <TouchableOpacity onPress={handleReset}>
                <Text style={styles.rescanText}>Scan Again</Text>
              </TouchableOpacity>
            </View>

            {/* Parsed Data Card */}
            <Card style={styles.parsedCard} elevated>
              <View style={styles.parsedHeader}>
                <View style={styles.merchantIcon}>
                  <Ionicons name="storefront" size={24} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.merchantName}>{parsedReceipt.merchant}</Text>
                  {parsedReceipt.date && (
                    <Text style={styles.parsedDate}>Date: {parsedReceipt.date}</Text>
                  )}
                </View>
              </View>

              {/* Line Items */}
              {parsedReceipt.lineItems.length > 0 && (
                <>
                  <Text style={styles.parsedSectionTitle}>Items</Text>
                  {parsedReceipt.lineItems.map((item, i) => (
                    <View key={i} style={styles.lineItem}>
                      <Text style={styles.lineItemName}>{item.name}</Text>
                      <Text style={styles.lineItemPrice}>
                        {formatCurrency(item.price, 'INR')}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <View style={styles.parsedDivider} />

              {/* Totals */}
              {parsedReceipt.tax !== undefined && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax / GST</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(parsedReceipt.tax, 'INR')}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>
                  {parsedReceipt.total !== undefined
                    ? formatCurrency(parsedReceipt.total, 'INR')
                    : '—'}
                </Text>
              </View>
            </Card>

            {/* Auto category suggestion */}
            <Card style={styles.categoryCard}>
              <View style={styles.categoryRow}>
                <Ionicons name="sparkles" size={16} color={Colors.accent} />
                <Text style={styles.categoryLabel}>Suggested Category</Text>
              </View>
              {(() => {
                const catId = detectCategoryFromText(parsedReceipt.merchant ?? '');
                const cat = CATEGORIES.find((c) => c.id === catId)!;
                return (
                  <View style={styles.suggestedCategory}>
                    <LinearGradient
                      colors={cat.gradientColors}
                      style={styles.catIcon}
                    >
                      <Ionicons name={cat.icon as any} size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.catName}>{cat.label}</Text>
                    <Badge label="Auto-detected" color={Colors.accent} size="sm" />
                  </View>
                );
              })()}
            </Card>

            <Button
              label="Use as Expense →"
              icon="arrow-forward"
              iconPosition="right"
              onPress={handleUseExpense}
              fullWidth
              style={{ marginTop: Spacing.sm }}
            />
            <Button
              label="Scan Another Receipt"
              variant="ghost"
              onPress={handleReset}
              fullWidth
              style={{ marginTop: Spacing.sm }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  headerSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 4,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  scannerFrame: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    height: 260,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadow.md,
  },
  scannerGradient: {
    flex: 1,
    padding: 2,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 2.5, borderRightWidth: 2.5 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  scannerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  scannerHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryAction: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  primaryActionText: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryAlpha,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  demoButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.accent,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tipsCard: {
    gap: Spacing.sm,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: 4,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  // Processing
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  processingFrame: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  processingText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginTop: Spacing.base,
  },
  processingSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 4,
  },
  // Result
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successAlpha,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
  },
  successText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.positive,
    fontFamily: Typography.fontFamily.semiBold,
  },
  rescanText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  parsedCard: {
    gap: Spacing.md,
  },
  parsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryAlpha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantName: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  parsedDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  parsedSectionTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineItemName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
  },
  lineItemPrice: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  parsedDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  totalValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  grandTotal: {
    marginTop: Spacing.sm,
  },
  grandTotalLabel: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  grandTotalValue: {
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.extraBold,
  },
  categoryCard: {
    gap: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  suggestedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    flex: 1,
  },
});
