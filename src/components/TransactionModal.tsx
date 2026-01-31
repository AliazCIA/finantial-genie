import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Platform, Alert, Switch, ScrollView } from 'react-native';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useCreditCards } from '../hooks/useCreditCards';
import { useToast } from '../context/ToastContext';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { format, parseISO } from 'date-fns';
import CurrencyInput from './forms/CurrencyInput';
import DatePicker from './DatePicker';
import CreditCardPicker from './CreditCardPicker';
import { TRANSACTION_TYPES, RECURRENCE_PERIODS, RECURRENCE_PERIOD_LABELS, type RecurrencePeriod } from '../utils/constants';
import { TransactionSchema } from '../services/database/schema';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  isQuickCapture?: boolean; // Si es true, bloquea la fecha y usa la fecha actual
  initialDate?: Date; // Fecha inicial (solo se usa si no es captura rápida)
  transaction?: TransactionSchema; // Transacción a editar
}

export default function TransactionModal({ 
  visible, 
  onClose, 
  initialType = 'expense',
  isQuickCapture = false,
  initialDate,
  transaction
}: TransactionModalProps) {
  const { createTransaction, updateTransaction } = useTransactions();
  const isEditing = !!transaction;
  const { categories } = useCategories();
  const { creditCards } = useCreditCards();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);

  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(initialDate || new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod | null>(null);
  const [creditCardId, setCreditCardId] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (transaction) {
        // Editing mode
        setType(transaction.type);
        setDescription(transaction.description);
        setAmount(transaction.amount.toString());
        setSelectedCategoryId(transaction.tags[0] || null);
        setIsRecurring(transaction.isRecurring);
        setRecurrencePeriod(transaction.recurrencePeriod);
        setCreditCardId(transaction.creditCardId);
        setDate(parseISO(transaction.date));
      } else {
        // New transaction
        setType(initialType);
        setDescription('');
        setAmount('');
        setSelectedCategoryId(null);
        setIsRecurring(false);
        setRecurrencePeriod(null);
        setCreditCardId(null);
        if (isQuickCapture) {
          setDate(new Date());
        } else if (initialDate) {
          setDate(initialDate);
        } else {
          setDate(new Date());
        }
      }
    }
  }, [visible, initialType, isQuickCapture, initialDate, transaction]);

  // Get all categories for selection
  const allCategories = categories;

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Por favor ingresa un concepto');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && transaction) {
        await updateTransaction(transaction.id, {
          type,
          amount: amountNum,
          description: description.trim(),
          date: format(date, 'yyyy-MM-dd'),
          tags: selectedCategoryId ? [selectedCategoryId] : [],
          isRecurring: isRecurring,
          recurrencePeriod: isRecurring ? recurrencePeriod : null,
          recurrenceStartDate: isRecurring ? (transaction.recurrenceStartDate || format(date, 'yyyy-MM-dd')) : null,
          parentRecurringId: transaction.parentRecurringId, // Mantener si es una transacción generada
          creditCardId: type === TRANSACTION_TYPES.EXPENSE ? creditCardId : null,
        });
        showToast('Transacción actualizada', 'success');
      } else {
        await createTransaction({
          type,
          amount: amountNum,
          description: description.trim(),
          date: format(date, 'yyyy-MM-dd'),
          tags: selectedCategoryId ? [selectedCategoryId] : [],
          isRecurring: isRecurring,
          recurrencePeriod: isRecurring ? recurrencePeriod : null,
          recurrenceStartDate: isRecurring ? format(date, 'yyyy-MM-dd') : null,
          parentRecurringId: null,
          creditCardId: type === TRANSACTION_TYPES.EXPENSE ? creditCardId : null,
        });
        showToast('Transacción registrada', 'success');
      }
      
      // Reset form
      setDescription('');
      setAmount('');
      setSelectedCategoryId(null);
      setIsRecurring(false);
      setRecurrencePeriod(null);
      setCreditCardId(null);
      
      // Small delay to ensure the transaction is saved
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al registrar transacción');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setAmount('');
    setSelectedCategoryId(null);
    setIsRecurring(false);
    setRecurrencePeriod(null);
    setCreditCardId(null);
    onClose();
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    modal: {
      backgroundColor: themeColors.surface,
      borderRadius: 16,
      padding: spacing.md,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      ...(Platform.OS === 'web' && {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }),
    },
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.h3,
      color: themeColors.text,
      fontWeight: '700',
    },
    closeButton: {
      padding: spacing.xs,
    },
    closeButtonText: {
      fontSize: 24,
      color: themeColors.textSecondary,
    },
    typeSelector: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
      borderRadius: 8,
      backgroundColor: themeColors.background,
      padding: spacing.xs,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: 6,
      alignItems: 'center',
    },
    typeButtonActive: {
      backgroundColor: themeColors.primary,
    },
    typeButtonText: {
      ...typography.body,
      fontWeight: '600',
    },
    typeButtonTextActive: {
      color: themeColors.background,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      ...typography.body,
      color: themeColors.text,
      backgroundColor: themeColors.background,
      marginBottom: spacing.xs,
      minHeight: 36,
    },
    label: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginBottom: 2,
      fontWeight: '500',
      fontSize: 12,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
      paddingVertical: 0,
    },
    categoriesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    categoryButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.background,
    },
    categoryButtonSelected: {
      backgroundColor: themeColors.primary + '20',
      borderColor: themeColors.primary,
    },
    categoryButtonText: {
      ...typography.bodySmall,
      color: themeColors.text,
    },
    categoryButtonTextSelected: {
      color: themeColors.primary,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: themeColors.primary,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: spacing.xs,
      minHeight: 40,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      ...typography.body,
      color: themeColors.background,
      fontWeight: '600',
    },
    recurrencePeriodContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    recurrencePeriodButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.background,
      minWidth: 80,
    },
    recurrencePeriodButtonSelected: {
      backgroundColor: themeColors.primary + '20',
      borderColor: themeColors.primary,
    },
    recurrencePeriodButtonText: {
      ...typography.bodySmall,
      color: themeColors.text,
      textAlign: 'center',
      fontSize: 12,
    },
    recurrencePeriodButtonTextSelected: {
      color: themeColors.primary,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={dynamicStyles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={dynamicStyles.modal}
        >
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>
              {isEditing ? 'Editar Transacción' : (isQuickCapture ? 'Captura Rápida' : 'Nueva Transacción')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={dynamicStyles.closeButton}>
              <Text style={dynamicStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={dynamicStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={dynamicStyles.typeSelector}>
              <TouchableOpacity
                style={[
                  dynamicStyles.typeButton,
                  type === 'expense' && dynamicStyles.typeButtonActive,
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    dynamicStyles.typeButtonText,
                    type === 'expense' && dynamicStyles.typeButtonTextActive,
                    { color: type === 'expense' ? themeColors.background : themeColors.text },
                  ]}
                >
                  Gasto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  dynamicStyles.typeButton,
                  type === 'income' && dynamicStyles.typeButtonActive,
                ]}
                onPress={() => setType('income')}
              >
                <Text
                  style={[
                    dynamicStyles.typeButtonText,
                    type === 'income' && dynamicStyles.typeButtonTextActive,
                    { color: type === 'income' ? themeColors.background : themeColors.text },
                  ]}
                >
                  Ingreso
                </Text>
              </TouchableOpacity>
            </View>

            {/* Transacción recurrente - debajo de los botones de tipo */}
            <View style={dynamicStyles.switchRow}>
              <Text style={dynamicStyles.label}>
                {type === TRANSACTION_TYPES.EXPENSE ? 'Gasto recurrente' : 'Ingreso recurrente'}
              </Text>
              <Switch
                value={isRecurring}
                onValueChange={(value) => {
                  setIsRecurring(value);
                  if (!value) {
                    setRecurrencePeriod(null);
                  } else if (!recurrencePeriod) {
                    // Por defecto, mensual
                    setRecurrencePeriod(RECURRENCE_PERIODS.MONTHLY);
                  }
                }}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            </View>

            {/* Selector de período de recurrencia */}
            {isRecurring && (
              <>
                <Text style={dynamicStyles.label}>Período de recurrencia</Text>
                <View style={dynamicStyles.recurrencePeriodContainer}>
                  {Object.entries(RECURRENCE_PERIODS).map(([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        dynamicStyles.recurrencePeriodButton,
                        recurrencePeriod === value && dynamicStyles.recurrencePeriodButtonSelected,
                      ]}
                      onPress={() => setRecurrencePeriod(value)}
                    >
                      <Text
                        style={[
                          dynamicStyles.recurrencePeriodButtonText,
                          recurrencePeriod === value && dynamicStyles.recurrencePeriodButtonTextSelected,
                        ]}
                      >
                        {RECURRENCE_PERIOD_LABELS[value]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={dynamicStyles.label}>Concepto</Text>
            <TextInput
              style={dynamicStyles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Comida, Salario, etc."
              placeholderTextColor={themeColors.textSecondary}
              autoFocus={!isQuickCapture}
            />

            <Text style={dynamicStyles.label}>Monto</Text>
            <CurrencyInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
            />

            {/* Fecha - solo si no es captura rápida */}
            {!isQuickCapture && (
              <>
                <Text style={dynamicStyles.label}>Fecha</Text>
                <DatePicker value={date} onChange={setDate} />
              </>
            )}

            {/* Tarjeta de Crédito (solo para gastos) */}
            {type === TRANSACTION_TYPES.EXPENSE && (
              <>
                <Text style={dynamicStyles.label}>Tarjeta de Crédito (opcional)</Text>
                <CreditCardPicker
                  value={creditCardId}
                  onChange={setCreditCardId}
                  placeholder="Seleccionar tarjeta"
                />
              </>
            )}

            {allCategories.length > 0 && (
              <>
                <Text style={[dynamicStyles.label, { marginBottom: spacing.xs }]}>Categorías (opcional)</Text>
                <View style={dynamicStyles.categoriesContainer}>
                  {allCategories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        dynamicStyles.categoryButton,
                        selectedCategoryId === category.id && dynamicStyles.categoryButtonSelected,
                      ]}
                      onPress={() => setSelectedCategoryId(
                        selectedCategoryId === category.id ? null : category.id
                      )}
                    >
                      <Text
                        style={[
                          dynamicStyles.categoryButtonText,
                          selectedCategoryId === category.id && dynamicStyles.categoryButtonTextSelected,
                        ]}
                      >
                        {category.icon} {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                dynamicStyles.submitButton,
                isSubmitting && dynamicStyles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={dynamicStyles.submitButtonText}>
                {isSubmitting ? (isEditing ? 'Actualizando...' : 'Registrando...') : (isEditing ? 'Actualizar' : 'Registrar')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
