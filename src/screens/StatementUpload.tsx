import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useCreditCards } from '../hooks/useCreditCards';
import { useStatementProcessor, DuplicateCheckResult } from '../hooks/useStatementProcessor';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { formatCurrency } from '../utils/formatters';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import Card from '../components/common/Card';
import { toTitleCase } from '../utils/textHelpers';
import { isDesktop, getCardPadding } from '../utils/responsive';
import { getLastCutDate } from '../services/calculations/creditCardExpenses';
import { ExtractedTransaction } from '../services/statementProcessor';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import Button from '../components/common/Button';

export default function StatementUpload() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { showToast } = useToast();
  const { creditCards, loading: cardsLoading } = useCreditCards();
  const {
    processing,
    error,
    extractedTransactions,
    processStatementFile,
    checkAllDuplicates,
    saveTransactions,
  } = useStatementProcessor();

  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [localExtractedTransactions, setLocalExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const [duplicateResults, setDuplicateResults] = useState<Map<number, DuplicateCheckResult>>(new Map());
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate billing period based on selected card and month (only months, no specific dates)
  // Returns pair of months: previous month and selected month
  const getBillingPeriod = () => {
    if (!selectedCardId) return null;

    const card = creditCards.find(c => c.id === selectedCardId);
    if (!card) return null;

    // Get the previous month
    const previousMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);

    // Get month names in Spanish
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const startMonthName = monthNames[previousMonth.getMonth()];
    const endMonthName = monthNames[selectedMonth.getMonth()];

    return {
      startMonth: startMonthName,
      endMonth: endMonthName,
      startYear: previousMonth.getFullYear(),
      endYear: selectedMonth.getFullYear(),
    };
  };

  const billingPeriod = getBillingPeriod();

  // Handle file selection
  const handleFileSelect = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,image/png,image/jpeg,image/jpg';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
          if (!validTypes.includes(file.type)) {
            showToast('Por favor selecciona un archivo PDF o imagen (PNG/JPG)', 'error');
            return;
          }
          setPdfFile(file);
          setLocalExtractedTransactions([]);
          setDuplicateResults(new Map());
        }
      };
      input.click();
    } else {
      // For mobile, you might want to use expo-document-picker
      showToast('Funcionalidad no disponible en móvil aún', 'info');
    }
  };

  // Process statement
  const handleProcess = async () => {
    if (!pdfFile || !selectedCardId || !billingPeriod) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    try {
      const result = await processStatementFile(pdfFile, selectedCardId, billingPeriod);
      setLocalExtractedTransactions(result.transactions || []);
      showToast('Estado de cuenta procesado correctamente', 'success');
      
      // Automatically check for duplicates
      if (result.transactions && result.transactions.length > 0) {
        await handleCheckDuplicates(result.transactions);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al procesar estado de cuenta', 'error');
    }
  };

  // Check for duplicates
  const handleCheckDuplicates = async (transactionsToCheck?: ExtractedTransaction[]) => {
    const transactions = transactionsToCheck || localExtractedTransactions;
    if (!selectedCardId || transactions.length === 0) return;

    try {
      setCheckingDuplicates(true);
      const results = await checkAllDuplicates(transactions, selectedCardId);
      setDuplicateResults(results);

      const duplicateCount = Array.from(results.values()).filter(r => r.isDuplicate).length;
      if (duplicateCount > 0) {
        showToast(`${duplicateCount} transacciones duplicadas encontradas`, 'info');
      } else {
        showToast('No se encontraron duplicados', 'success');
      }
    } catch (err) {
      showToast('Error al verificar duplicados', 'error');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Save transactions
  const handleSave = async () => {
    if (!selectedCardId || localExtractedTransactions.length === 0) {
      showToast('No hay transacciones para guardar', 'error');
      return;
    }

    const nonDuplicates = localExtractedTransactions.filter((_, index) => {
      const result = duplicateResults.get(index);
      return !result?.isDuplicate;
    });

    if (nonDuplicates.length === 0) {
      showToast('Todas las transacciones son duplicados', 'info');
      return;
    }

    const confirmMessage = `¿Guardar ${nonDuplicates.length} transacciones nuevas?`;
    let confirmed = false;

    if (Platform.OS === 'web') {
      confirmed = window.confirm(confirmMessage);
    } else {
      Alert.alert('Confirmar', confirmMessage, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar', onPress: () => { confirmed = true; } },
      ]);
    }

    if (!confirmed) return;

    try {
      setSaving(true);
      const { saved, skipped } = await saveTransactions(
        localExtractedTransactions,
        selectedCardId,
        duplicateResults
      );

      // Get dates of saved transactions to help user find them
      if (saved > 0) {
        const savedTxns = localExtractedTransactions.filter((_, i) => !duplicateResults.get(i)?.isDuplicate);
        const dates = savedTxns.map(txn => txn.date).sort();
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const monthRange = firstDate === lastDate
          ? format(parseISO(firstDate), 'MMMM yyyy')
          : `${format(parseISO(firstDate), 'MMMM yyyy')} - ${format(parseISO(lastDate), 'MMMM yyyy')}`;
        
        showToast(`${saved} transacciones guardadas${skipped > 0 ? `, ${skipped} omitidas` : ''}. Mes: ${monthRange}`, 'success');
        console.log('[StatementUpload] Saved transactions info:', { 
          saved, 
          skipped, 
          firstDate, 
          lastDate, 
          monthRange,
          allDates: dates,
        });
      } else if (skipped > 0) {
        showToast(`Todas las transacciones fueron omitidas (${skipped} duplicados)`, 'info');
      } else {
        showToast('No se guardaron transacciones', 'info');
      }
      
      // Reset form
      setPdfFile(null);
      setLocalExtractedTransactions([]);
      setDuplicateResults(new Map());
      
      // Wait a bit to ensure database is updated before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigation.goBack();
    } catch (err) {
      showToast('Error al guardar transacciones', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Month navigation
  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = subMonths(selectedMonth, -1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.surface,
      padding: spacing.md,
    },
    title: {
      ...typography.h1,
      color: themeColors.primary,
      fontWeight: '700',
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h4,
      color: themeColors.text,
      marginBottom: spacing.md,
      fontWeight: '600',
    },
    label: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginBottom: spacing.xs,
    },
    cardSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    cardButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 2,
      minWidth: 120,
    },
    cardButtonActive: {
      backgroundColor: themeColors.primary + '20',
      borderColor: themeColors.primary,
    },
    cardButtonInactive: {
      backgroundColor: 'transparent',
      borderColor: themeColors.border,
    },
    cardButtonText: {
      ...typography.body,
      fontWeight: '600',
    },
    cardButtonTextActive: {
      color: themeColors.primary,
    },
    cardButtonTextInactive: {
      color: themeColors.text,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    monthText: {
      ...typography.h4,
      color: themeColors.text,
      fontWeight: '600',
    },
    monthNavButton: {
      padding: spacing.sm,
      borderRadius: 8,
      backgroundColor: themeColors.background,
    },
    fileInput: {
      padding: spacing.md,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: themeColors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    fileInputText: {
      ...typography.body,
      color: themeColors.textSecondary,
    },
    fileName: {
      ...typography.body,
      color: themeColors.primary,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    transactionItem: {
      padding: spacing.sm,
      borderRadius: 8,
      marginBottom: spacing.xs,
      borderLeftWidth: 4,
    },
    transactionDuplicate: {
      backgroundColor: themeColors.secondary + '20',
      borderLeftColor: themeColors.secondary,
    },
    transactionNew: {
      backgroundColor: themeColors.accent + '10',
      borderLeftColor: themeColors.accent,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    transactionDescription: {
      ...typography.body,
      color: themeColors.text,
      fontWeight: '600',
      flex: 1,
    },
    transactionAmount: {
      ...typography.body,
      color: themeColors.primary,
      fontWeight: '700',
    },
    transactionDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    transactionDetail: {
      ...typography.caption,
      color: themeColors.textSecondary,
    },
    duplicateBadge: {
      backgroundColor: themeColors.secondary,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: spacing.xs,
    },
    duplicateBadgeText: {
      ...typography.caption,
      color: themeColors.background,
      fontWeight: '600',
      fontSize: 10,
    },
    summary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      marginTop: spacing.md,
    },
    summaryText: {
      ...typography.body,
      color: themeColors.text,
      fontWeight: '600',
    },
    emptyText: {
      ...typography.body,
      color: themeColors.textSecondary,
      textAlign: 'center',
      padding: spacing.lg,
      fontStyle: 'italic',
    },
  });

  if (cardsLoading) {
    return (
      <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={{ color: themeColors.text, marginTop: spacing.md }}>Cargando...</Text>
      </View>
    );
  }

  const selectedCard = creditCards.find(c => c.id === selectedCardId);
  const nonDuplicateCount = localExtractedTransactions.filter((_, i) => !duplicateResults.get(i)?.isDuplicate).length;
  const duplicateCount = localExtractedTransactions.length - nonDuplicateCount;
  const totalAmount = localExtractedTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  return (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={dynamicStyles.title}>{toTitleCase('Subir Estado de Cuenta')}</Text>

      {/* Card Selection */}
      <Card padding={getCardPadding()} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>{toTitleCase('Seleccionar Tarjeta')}</Text>
        <View style={dynamicStyles.cardSelector}>
          {creditCards.filter(c => c.isActive).map(card => (
            <TouchableOpacity
              key={card.id}
              style={[
                dynamicStyles.cardButton,
                selectedCardId === card.id
                  ? dynamicStyles.cardButtonActive
                  : dynamicStyles.cardButtonInactive,
              ]}
              onPress={() => setSelectedCardId(card.id)}
            >
              <Text
                style={[
                  dynamicStyles.cardButtonText,
                  selectedCardId === card.id
                    ? dynamicStyles.cardButtonTextActive
                    : dynamicStyles.cardButtonTextInactive,
                ]}
              >
                {card.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedCard && billingPeriod && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={dynamicStyles.label}>
              Período de facturación: {billingPeriod.startMonth} {billingPeriod.startYear} a {billingPeriod.endMonth} {billingPeriod.endYear}
            </Text>
          </View>
        )}
      </Card>

      {/* Month Selection */}
      <Card padding={getCardPadding()} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>{toTitleCase('Mes del Estado de Cuenta')}</Text>
        <View style={dynamicStyles.monthSelector}>
          <TouchableOpacity
            style={dynamicStyles.monthNavButton}
            onPress={handlePreviousMonth}
            disabled={processing}
          >
            <Text style={dynamicStyles.monthText}>‹</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.monthText}>
            {format(selectedMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity
            style={dynamicStyles.monthNavButton}
            onPress={handleNextMonth}
            disabled={processing || subMonths(selectedMonth, -1) > new Date()}
          >
            <Text style={dynamicStyles.monthText}>›</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* File Upload */}
      <Card padding={getCardPadding()} marginBottom={spacing.lg}>
        <Text style={dynamicStyles.sectionTitle}>{toTitleCase('Subir PDF')}</Text>
        <TouchableOpacity style={dynamicStyles.fileInput} onPress={handleFileSelect}>
          <Text style={dynamicStyles.fileInputText}>
            {pdfFile ? '📄 Archivo seleccionado' : '📎 Seleccionar PDF o Imagen'}
          </Text>
          {pdfFile && (
            <Text style={dynamicStyles.fileName}>
              {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
              {pdfFile.type.includes('image') ? ' 📷' : ' 📄'}
            </Text>
          )}
        </TouchableOpacity>
        <Button
          title="Procesar Estado de Cuenta"
          onPress={handleProcess}
          disabled={!pdfFile || !selectedCardId || processing}
          variant="primary"
        />
        {processing && (
          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={[dynamicStyles.label, { marginTop: spacing.xs }]}>
              Procesando PDF con IA...
            </Text>
          </View>
        )}
        {error && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ color: themeColors.secondary, ...typography.caption }}>
              Error: {error}
            </Text>
          </View>
        )}
      </Card>

      {/* Extracted Transactions */}
      {localExtractedTransactions.length > 0 && (
        <Card padding={getCardPadding()} marginBottom={spacing.lg}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={dynamicStyles.sectionTitle}>
              {toTitleCase('Transacciones Extraídas')} ({localExtractedTransactions.length})
            </Text>
            <TouchableOpacity
              onPress={() => handleCheckDuplicates()}
              disabled={checkingDuplicates}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 6,
                backgroundColor: themeColors.background,
              }}
            >
              <Text style={{ ...typography.caption, color: themeColors.primary, fontWeight: '600' }}>
                {checkingDuplicates ? 'Verificando...' : 'Verificar Duplicados'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: isDesktop ? 400 : 300 }}>
            {localExtractedTransactions.map((txn, index) => {
              const duplicateResult = duplicateResults.get(index);
              const isDuplicate = duplicateResult?.isDuplicate;
              const category = DEFAULT_CATEGORIES.find(c => c.name === txn.category);

              return (
                <View
                  key={index}
                  style={[
                    dynamicStyles.transactionItem,
                    isDuplicate ? dynamicStyles.transactionDuplicate : dynamicStyles.transactionNew,
                  ]}
                >
                  <View style={dynamicStyles.transactionHeader}>
                    <Text style={dynamicStyles.transactionDescription} numberOfLines={1}>
                      {category?.icon} {txn.description}
                    </Text>
                    <Text style={dynamicStyles.transactionAmount}>{formatCurrency(txn.amount)}</Text>
                    {isDuplicate && (
                      <View style={dynamicStyles.duplicateBadge}>
                        <Text style={dynamicStyles.duplicateBadgeText}>DUPLICADO</Text>
                      </View>
                    )}
                  </View>
                  <View style={dynamicStyles.transactionDetails}>
                    <Text style={dynamicStyles.transactionDetail}>
                      {format(parseISO(txn.date), 'dd MMM yyyy')}
                    </Text>
                    <Text style={dynamicStyles.transactionDetail}>{txn.category}</Text>
                  </View>
                  {isDuplicate && duplicateResult.reason && (
                    <Text style={[dynamicStyles.transactionDetail, { marginTop: spacing.xs }]}>
                      {duplicateResult.reason}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={dynamicStyles.summary}>
            <Text style={dynamicStyles.summaryText}>
              Total: {formatCurrency(totalAmount)}
            </Text>
            <View>
              <Text style={[dynamicStyles.summaryText, { color: themeColors.accent }]}>
                Nuevas: {nonDuplicateCount}
              </Text>
              <Text style={[dynamicStyles.summaryText, { color: themeColors.secondary }]}>
                Duplicados: {duplicateCount}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Button
              title={`Guardar ${nonDuplicateCount} Transacciones`}
              onPress={handleSave}
              disabled={saving || nonDuplicateCount === 0}
              variant="primary"
            />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
