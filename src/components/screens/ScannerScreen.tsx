// ─────────────────────────────────────────────
//  Receipt Scanner Screen — Camera + OCR + Gemini AI
// ─────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { ParsedReceipt } from '../../types';
import { Card, Button, Badge } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES, CategoryId, detectCategory as detectCategoryFromText } from '../../constants/categories';

// ── Smart Local Regex + Heuristic Parser (Fallback when Gemini AI is not set or fails) ──

function parseReceiptTextLocally(text: string): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Merchant Extraction
  let merchant = 'Scanned Merchant';
  for (const line of lines) {
    if (line.length > 2 && !/^(receipt|tax invoice|invoice|bill|cash bill|welcome|date|time|tel|phone|gst|outlet|store|pos)/i.test(line)) {
      merchant = line.replace(/[*#=_\-]/g, '').trim();
      break;
    }
  }

  // 2. Total Extraction (via regex patterns)
  const totalPatterns = [
    /(?:grand\s*)?total[:\s]*[\$₹€£]?\s*(\d+(?:[\.,]\d{1,2})?)/i,
    /net\s*amount[:\s]*[\$₹€£]?\s*(\d+(?:[\.,]\d{1,2})?)/i,
    /amount\s*(?:due|payable)[:\s]*[\$₹€£]?\s*(\d+(?:[\.,]\d{1,2})?)/i,
    /(?:subtotal|sub\s*total)[:\s]*[\$₹€£]?\s*(\d+(?:[\.,]\d{1,2})?)/i,
    /[\$₹€£]\s*(\d+(?:[\.,]\d{1,2})?)\s*$/im,
  ];

  let total: number | undefined;
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      total = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }

  // 🌟 Highest-Price Heuristic Fallback
  // Grand totals are almost always the maximum numeric value on a receipt that represents a price.
  const allPrices: number[] = [];
  const priceRegex = /(?:^|\s)₹?\$?€?£?\s*(\d+(?:[\.,]\d{2}))(?:\s|$)/g;
  let matchObj;
  while ((matchObj = priceRegex.exec(text)) !== null) {
    const val = parseFloat(matchObj[1].replace(',', '.'));
    if (!isNaN(val)) allPrices.push(val);
  }
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : undefined;

  // Use max price if no total was found or if maxPrice is larger than the regex total (which could be a subtotal)
  if (maxPrice !== undefined) {
    if (total === undefined || maxPrice > total) {
      console.log('[Scanner] Local Fallback: using max price heuristic for total:', maxPrice, 'instead of:', total);
      total = maxPrice;
    }
  }

  // 3. Tax (CGST, SGST, VAT, GST, Tax)
  const taxMatch = text.match(/(?:tax|gst|vat|cgst|sgst)[:\s]*[\$₹€£]?\s*(\d+(?:[\.,]\d{1,2})?)/i);
  const tax = taxMatch ? parseFloat(taxMatch[1].replace(',', '.')) : undefined;

  // 4. Date Extraction
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
  ];
  let date: string | undefined;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) { date = match[1]; break; }
  }

  // 5. Line items: rows matching name + space + price
  const lineItemPattern = /^(.+?)\s+[\$₹€£]?\s*(\d+(?:[\.,]\d{1,2})?)\s*(?:\/-)?$/;
  const lineItems = lines
    .filter((l) => lineItemPattern.test(l) && !/(total|tax|gst|vat|subtotal|discount|cgst|sgst|service|charge|due|change|cash|card|payment|split)/i.test(l))
    .slice(0, 8)
    .map((l) => {
      const match = l.match(lineItemPattern)!;
      return { name: match[1].trim(), price: parseFloat(match[2].replace(',', '.')) };
    });

  return { merchant, total, tax, date, lineItems, rawText: text };
}

// ── Google Gemini LLM Receipt Text Parser ──

const parseReceiptWithLLM = async (rawText: string, geminiKey: string): Promise<ParsedReceipt> => {
  console.log('[Scanner] Calling Gemini Flash Latest JSON API...');
  
  const prompt = `Analyze the following raw OCR text extracted from a receipt. Parse and extract:
1. Merchant Name
2. Transaction Date (standardize as DD/MM/YYYY, or extract as seen)
3. Grand Total Amount
4. Tax/GST/VAT amount (if any)
5. Suggested Category (MUST choose from exactly one of: food, transport, housing, entertainment, shopping, health, travel, utilities, education, fitness, subscriptions, other)
6. List of line items (for each item, extract the name and price)

Raw OCR Text:
"""
${rawText}
"""

Output a SINGLE JSON object matching this exact schema:
{
  "merchant": string,
  "total": number,
  "tax": number | null,
  "date": string | null,
  "category": string,
  "lineItems": [
    {
      "name": string,
      "price": number
    }
  ]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': geminiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API failed: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();
  const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini API returned an empty response.');
  }

  const parsedJson = JSON.parse(textOutput.trim());
  return {
    merchant: parsedJson.merchant || 'Scanned Merchant',
    total: Number(parsedJson.total) || 0,
    tax: parsedJson.tax ? Number(parsedJson.tax) : undefined,
    date: parsedJson.date || undefined,
    category: parsedJson.category || 'other',
    lineItems: (parsedJson.lineItems || []).map((item: any) => ({
      name: item.name || 'Item',
      price: Number(item.price) || 0,
    })),
    rawText: rawText,
  };
};

export const ScannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const scanAnim = useRef(new Animated.Value(0)).current;

  // States
  const [mode, setMode] = useState<'idle' | 'processing' | 'result' | 'error'>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // AI Keys (natively compiled with user defaults)
  const activeOcrKey = process.env.EXPO_PUBLIC_OCR_API_KEY || 'K88720823588957';
  const activeGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyDzMaC5Eu5pm6H36pbNLI1nmTydxv_9bYs';

  // AI Pipeline Checklist Tracker States
  const [aiStep, setAiStep] = useState<number>(0); 
  const [stepsLog, setStepsLog] = useState<string[]>([]);

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
      mediaTypes: ['images'],
      quality: 0.25, // Compressed perfectly to keep size well under 1MB for the free OCR.space tier
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsPdf(false);
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
      quality: 0.25, // Compressed perfectly to keep size well under 1MB for the free OCR.space tier
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsPdf(false);
      setImageUri(result.assets[0].uri);
      processReceipt(result.assets[0].uri);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const pickedAsset = result.assets[0];
        console.log('[Scanner] Picked PDF document:', pickedAsset.name, 'URI:', pickedAsset.uri);
        setIsPdf(true);
        setImageUri(null);
        processReceipt(pickedAsset.uri);
      }
    } catch (err) {
      console.warn('[Scanner] Error picking document:', err);
      Alert.alert('Error', 'Failed to pick the document.');
    }
  };

  const processReceipt = async (uri: string) => {
    setMode('processing');
    setAiStep(0);
    setStepsLog(['📂 Initializing document payload...']);
    animateScan();

    try {
      // Step 1: Base64 serialization
      setAiStep(1);
      setStepsLog((prev) => [...prev, '⚙️ Compressing and preparing file stream...']);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isFilePdf = uri.toLowerCase().endsWith('.pdf');
      const base64Prefix = isFilePdf ? 'data:application/pdf;base64,' : 'data:image/jpeg;base64,';

      // Step 2: OCR Extraction
      setAiStep(2);
      setStepsLog((prev) => [...prev, '👁️ Uploading to OCR.space for raw text extraction...']);
      const formData = new FormData();
      formData.append('apikey', activeOcrKey);
      formData.append('base64Image', `${base64Prefix}${base64}`);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await response.json();
      if (result.IsErroredOnProcessing || result.OCRExitCode > 2) {
        const errorMsg = result.ErrorMessage?.[0] || result.ErrorDetails || 'OCR Processing failed';
        throw new Error(errorMsg);
      }

      const parsedText = result.ParsedResults?.[0]?.ParsedText;
      if (!parsedText || parsedText.trim().length === 0) {
        throw new Error('No readable text was detected by the OCR scanner.');
      }

      // Step 3: LLM Parsing / Fallback Local matching
      setAiStep(3);
      let parsedData: ParsedReceipt;

      if (activeGeminiKey && activeGeminiKey.trim().length > 0) {
        setStepsLog((prev) => [...prev, '🧠 Extracting merchant, items and grand total with Gemini AI...']);
        try {
          parsedData = await parseReceiptWithLLM(parsedText, activeGeminiKey);
        } catch (llmErr) {
          console.warn('[Scanner] Gemini AI failed. Falling back to local parser:', llmErr);
          setStepsLog((prev) => [...prev, '⚠️ Gemini AI failed. Reverting to local heuristic parser...']);
          parsedData = parseReceiptTextLocally(parsedText);
        }
      } else {
        setStepsLog((prev) => [...prev, '⚙️ No Gemini API key saved. Reverting to local heuristic parser...']);
        parsedData = parseReceiptTextLocally(parsedText);
      }

      // Step 4: Finalizing receipt
      setAiStep(4);
      setStepsLog((prev) => [...prev, '✨ Finalizing structured expense profile!']);
      
      setParsedReceipt(parsedData);
      setMode('result');
    } catch (err: any) {
      console.warn('[Scanner] Receipts pipeline failed:', err);
      setScanError(err.message || 'Scanning pipeline encountered an error.');
      setMode('error');
    }
  };

  const handleUseExpense = () => {
    if (!parsedReceipt) return;
    const suggestedCategory = parsedReceipt.category || detectCategoryFromText(parsedReceipt.merchant ?? '');
    navigation.navigate('Groups', {
      screen: 'AddExpense',
      params: {
        groupId: 'g1', 
        prefill: {
          title: parsedReceipt.merchant || 'Receipt Expense',
          amount: parsedReceipt.total || 0,
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
    setIsPdf(false);
    setAiStep(0);
    setStepsLog([]);
    setScanError(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F0E17', '#1A1542']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>AI Receipt Scanner</Text>
            <Text style={styles.headerSub}>Digitize receipts instantly using OCR + Gemini AI</Text>
          </View>
        </View>
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
                  <Ionicons name="scan-circle-outline" size={88} color={Colors.primary} style={{ opacity: 0.8 }} />
                  <Text style={styles.scannerHint}>Capture or upload a receipt to parse</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Action buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.primaryAction} onPress={handleTakePhoto}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.primaryActionGradient}>
                  <Ionicons name="camera" size={24} color={Colors.text} />
                  <Text style={styles.primaryActionText}>Take Photo</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity style={styles.secondaryAction} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={20} color={Colors.primary} />
                  <Text style={styles.secondaryActionText}>Photo Library</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryAction} onPress={handlePickDocument}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                  <Text style={styles.secondaryActionText}>Upload PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tips Card */}
            <Card style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 How it works</Text>
              <View style={styles.tip}>
                <Ionicons name="flash" size={14} color={Colors.accent} />
                <Text style={styles.tipText}>Enjoy 100% automated receipt items, totals, and category parsing.</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
                <Text style={styles.tipText}>OCR.space extracts raw text from your receipt image.</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.positive} />
                <Text style={styles.tipText}>Google Gemini structures the items, dates and grand totals.</Text>
              </View>
            </Card>
          </>
        )}

        {/* ── PROCESSING STATE ── */}
        {mode === 'processing' && (
          <View style={styles.processingContainer}>
            <View style={styles.processingFrame}>
              {isPdf ? (
                <View style={styles.pdfPreviewContainer}>
                  <Ionicons name="document-text-outline" size={72} color={Colors.primary} style={{ opacity: 0.8 }} />
                  <Text style={styles.pdfPreviewText}>PDF Document</Text>
                </View>
              ) : (
                imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />
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

            {/* AI Steps Checklist Card */}
            <Card style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.checklistTitle}>AI Processing Pipeline</Text>
              </View>
              
              <View style={styles.stepsContainer}>
                {stepsLog.map((log, index) => (
                  <View key={index} style={styles.stepRow}>
                    <Ionicons 
                      name={index < aiStep ? "checkmark-circle" : "sync"} 
                      size={16} 
                      color={index < aiStep ? Colors.positive : Colors.primary} 
                    />
                    <Text style={[styles.stepText, index < aiStep && styles.stepTextCompleted]}>
                      {log}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* ── RESULT STATE ── */}
        {mode === 'result' && parsedReceipt && (
          <>
            <View style={styles.resultHeader}>
              <View style={styles.successBadge}>
                <Ionicons name="sparkles" size={18} color={Colors.positive} />
                <Text style={styles.successText}>AI Analysis Complete</Text>
              </View>
              <TouchableOpacity onPress={handleReset}>
                <Text style={styles.rescanText}>Reset Scan</Text>
              </TouchableOpacity>
            </View>

            {/* Parsed Receipt Card */}
            <Card style={styles.parsedCard} elevated>
              <View style={styles.parsedHeader}>
                <View style={styles.merchantIcon}>
                  <Ionicons name="storefront" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantValueText}>
                    {parsedReceipt.merchant || 'Scanned Merchant'}
                  </Text>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Date: </Text>
                    <Text style={styles.dateValueText}>
                      {parsedReceipt.date || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Line Items */}
              <View style={styles.itemsHeaderRow}>
                <Text style={styles.parsedSectionTitle}>Line Items</Text>
                <Text style={[styles.parsedSectionTitle, { textAlign: 'right' }]}>Price</Text>
              </View>

              {parsedReceipt.lineItems.length === 0 ? (
                <Text style={styles.noItemsText}>No specific line items detected.</Text>
              ) : (
                parsedReceipt.lineItems.map((item, i) => (
                  <View key={i} style={styles.lineItemRow}>
                    <Text style={styles.lineItemNameText}>{item.name}</Text>
                    <Text style={styles.lineItemPriceText}>
                      {formatCurrency(item.price, 'INR')}
                    </Text>
                  </View>
                ))
              )}

              <View style={styles.parsedDivider} />

              {/* Totals */}
              <View style={styles.totalsEditContainer}>
                {parsedReceipt.tax !== undefined && parsedReceipt.tax > 0 && (
                  <View style={styles.totalRowEdit}>
                    <Text style={styles.totalLabelEdit}>Tax / GST</Text>
                    <Text style={styles.taxValueText}>
                      {formatCurrency(parsedReceipt.tax, 'INR')}
                    </Text>
                  </View>
                )}

                <View style={[styles.totalRowEdit, styles.grandTotalEdit]}>
                  <Text style={styles.grandTotalLabelEdit}>Grand Total</Text>
                  <Text style={styles.grandTotalValueText}>
                    {formatCurrency(parsedReceipt.total || 0, 'INR')}
                  </Text>
                </View>
              </View>
            </Card>

            {/* AI Suggested Category */}
            <Card style={styles.categoryCard}>
              <View style={styles.categoryRow}>
                <Ionicons name="sparkles" size={16} color={Colors.accent} />
                <Text style={styles.categoryLabel}>AI Category Decision</Text>
              </View>
              {(() => {
                const catId = parsedReceipt.category || detectCategoryFromText(parsedReceipt.merchant ?? '');
                const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES.find((c) => c.id === 'other')!;
                return (
                  <View style={styles.suggestedCategory}>
                    <LinearGradient
                      colors={cat.gradientColors}
                      style={styles.catIcon}
                    >
                      <Ionicons name={cat.icon as any} size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.catName}>{cat.label}</Text>
                    <Badge label="AI Structured" color={Colors.accent} size="sm" />
                  </View>
                );
              })()}
            </Card>

            <Button
              label="Save to SplitSmart →"
              icon="arrow-forward"
              iconPosition="right"
              onPress={handleUseExpense}
              fullWidth
              style={{ marginTop: Spacing.sm }}
            />
          </>
        )}

        {/* ── ERROR STATE ── */}
        {mode === 'error' && (
          <View style={styles.errorContainer}>
            <Card style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={48} color={Colors.error} style={{ marginBottom: Spacing.sm }} />
                <Text style={styles.errorTitle}>Scanning Failed</Text>
              </View>
              <Text style={styles.errorSubtitle}>
                {scanError || 'The automated scanner was unable to parse your receipt correctly.'}
              </Text>
              <Button
                label="Retry Scan 🔄"
                onPress={handleReset}
                style={{ marginTop: Spacing.md }}
                fullWidth
              />
            </Card>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  headerSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 4,
    width: '90%',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
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
  actionContainer: {
    gap: Spacing.md,
    width: '100%',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  primaryAction: {
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
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
    lineHeight: 18,
  },
  // Processing
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.md,
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
    opacity: 0.35,
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
  pdfPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pdfPreviewText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  checklistCard: {
    width: '100%',
    gap: Spacing.md,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: Spacing.sm,
  },
  checklistTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  stepsContainer: {
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
  },
  stepTextCompleted: {
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.bold,
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
  editableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  merchantInput: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  dateInput: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    padding: 0,
    minWidth: 90,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: 4,
  },
  parsedSectionTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noItemsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  lineItemEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  lineItemNameInput: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
    paddingVertical: 4,
  },
  lineItemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 90,
    justifyContent: 'flex-end',
  },
  currencySymbolInput: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  lineItemPriceInput: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    textAlign: 'right',
    paddingVertical: 4,
    minWidth: 60,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  addItemBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  parsedDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.sm,
  },
  totalsEditContainer: {
    gap: Spacing.sm,
  },
  totalRowEdit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabelEdit: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  taxInput: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    textAlign: 'right',
    paddingVertical: 2,
    minWidth: 60,
  },
  grandTotalEdit: {
    marginTop: Spacing.sm,
  },
  grandTotalLabelEdit: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  grandTotalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  grandTotalCurrencySymbol: {
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  grandTotalInput: {
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.extraBold,
    textAlign: 'right',
    paddingVertical: 2,
    minWidth: 80,
  },
  merchantValueText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    flex: 1,
  },
  dateValueText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  lineItemNameText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
  },
  lineItemPriceText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'right',
  },
  taxValueText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    textAlign: 'right',
  },
  grandTotalValueText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.extraBold,
    textAlign: 'right',
  },
  errorContainer: {
    width: '100%',
    paddingVertical: Spacing.base,
  },
  errorCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorHeader: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginTop: Spacing.xs,
  },
  errorSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
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
  // Modal Sheet Settings Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 16,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
