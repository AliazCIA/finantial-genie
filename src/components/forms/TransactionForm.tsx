import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useToast } from '../../context/ToastContext';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { TRANSACTION_TYPES } from '../../utils/constants';
import CurrencyInput from './CurrencyInput';
import DatePicker from '../DatePicker';
import CreditCardPicker from '../CreditCardPicker';
import { TransactionSchema } from '../../services/database/schema';

interface TransactionFormProps {
  onClose: () => void;
  initialDate?: Date;
  transaction?: TransactionSchema; // For editing
  initialType?: 'income' | 'expense'; // Initial type when opening form
}

export default function TransactionForm({ onClose, initialDate, transaction, initialType }: TransactionFormProps) {
  const { createTransaction, updateTransaction } = useTransactions();
  const { categories } = useCategories();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  
  const isEditing = !!transaction;
  
  const [type, setType] = useState<'income' | 'expense'>(
    transaction?.type || initialType || TRANSACTION_TYPES.EXPENSE
  );
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(transaction?.tags || []);
  const [date, setDate] = useState(
    transaction ? new Date(transaction.date) : (initialDate || new Date())
  );
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring || false);
  const [isPaid, setIsPaid] = useState(true);
  const [creditCardId, setCreditCardId] = useState<string | null>(transaction?.creditCardId || null);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

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

    try {
      if (isEditing && transaction) {
        await updateTransaction(transaction.id, {
          type,
          amount: amountNum,
          description: description.trim(),
          tags: selectedTags,
          date: date.toISOString().split('T')[0],
          isRecurring,
          creditCardId: type === TRANSACTION_TYPES.EXPENSE ? creditCardId : null,
        });
        showToast('Transacción actualizada correctamente', 'success');
      } else {
        await createTransaction({
          type,
          amount: amountNum,
          description: description.trim(),
          tags: selectedTags,
          date: date.toISOString().split('T')[0],
          isRecurring,
          creditCardId: type === TRANSACTION_TYPES.EXPENSE ? creditCardId : null,
        });
        showToast('Transacción agregada correctamente', 'success');
      }
      onClose();
    } catch (error) {
      showToast(
        isEditing ? 'Error al actualizar la transacción' : 'Error al agregar la transacción',
        'error'
      );
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: 80, // Extra space for button
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h3,
      color: themeColors.text,
      fontWeight: '700',
    },
    closeButton: {
      padding: spacing.xs,
    },
    closeText: {
      fontSize: 24,
      color: themeColors.textSecondary,
    },
    section: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '500',
    },
    input: {
      ...typography.body,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: themeColors.text,
      backgroundColor: themeColors.background,
      marginBottom: spacing.md,
    },
    typeContainer: {
      flexDirection: 'row',
      marginBottom: spacing.md,
      borderRadius: 8,
      backgroundColor: themeColors.background,
      padding: spacing.xs,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
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
    typeButtonTextInactive: {
      color: themeColors.text,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.background,
    },
    tagSelected: {
      backgroundColor: themeColors.primary + '20',
      borderColor: themeColors.primary,
    },
    tagText: {
      ...typography.bodySmall,
      color: themeColors.text,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 0,
      marginTop: 0,
    },
    submitButton: {
      backgroundColor: themeColors.primary,
      paddingVertical: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    submitButtonText: {
      ...typography.body,
      color: themeColors.background,
      fontWeight: '600',
    },
    buttonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: themeColors.background,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <ScrollView 
        style={dynamicStyles.container} 
        contentContainerStyle={dynamicStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </Text>
          <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
            <Text style={dynamicStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tipo de transacción */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.label}>Tipo</Text>
          <View style={dynamicStyles.typeContainer}>
            <TouchableOpacity
              style={[
                dynamicStyles.typeButton,
                type === TRANSACTION_TYPES.INCOME && dynamicStyles.typeButtonActive,
              ]}
              onPress={() => setType(TRANSACTION_TYPES.INCOME)}
            >
              <Text
                style={[
                  dynamicStyles.typeButtonText,
                  type === TRANSACTION_TYPES.INCOME 
                    ? dynamicStyles.typeButtonTextActive 
                    : dynamicStyles.typeButtonTextInactive,
                ]}
              >
                Ingreso
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dynamicStyles.typeButton,
                type === TRANSACTION_TYPES.EXPENSE && dynamicStyles.typeButtonActive,
              ]}
              onPress={() => setType(TRANSACTION_TYPES.EXPENSE)}
            >
              <Text
                style={[
                  dynamicStyles.typeButtonText,
                  type === TRANSACTION_TYPES.EXPENSE 
                    ? dynamicStyles.typeButtonTextActive 
                    : dynamicStyles.typeButtonTextInactive,
                ]}
              >
                Gasto
              </Text>
            </TouchableOpacity>
          </View>
          {/* Gasto recurrente - debajo de los botones de tipo */}
          <View style={[dynamicStyles.switchRow, { marginTop: spacing.xs }]}>
            <Text style={[dynamicStyles.label, { marginBottom: 0 }]}>Gasto recurrente</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor={themeColors.background}
            />
          </View>
        </View>

        {/* Concepto */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.label}>Concepto</Text>
          <TextInput
            style={dynamicStyles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Comida, Salario, etc."
            placeholderTextColor={themeColors.textSecondary}
          />
        </View>

        {/* Monto */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.label}>Monto</Text>
          <CurrencyInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
          />
        </View>

        {/* Fecha */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.label}>Fecha</Text>
          <DatePicker value={date} onChange={setDate} />
        </View>

        {/* Tarjeta de Crédito (solo para gastos) */}
        {type === TRANSACTION_TYPES.EXPENSE && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.label}>Tarjeta de Crédito (opcional)</Text>
            <CreditCardPicker
              value={creditCardId}
              onChange={setCreditCardId}
              placeholder="Seleccionar tarjeta"
            />
          </View>
        )}

        {/* Categorías/Etiquetas */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.label}>Categorías</Text>
          <View style={dynamicStyles.tagsContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  dynamicStyles.tag,
                  selectedTags.includes(category.id) && dynamicStyles.tagSelected,
                  { borderColor: category.color },
                ]}
                onPress={() => toggleTag(category.id)}
              >
                <Text
                  style={[
                    dynamicStyles.tagText,
                    selectedTags.includes(category.id) && { color: category.color },
                  ]}
                >
                  {category.icon} {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pagado (solo para gastos) */}
        {type === TRANSACTION_TYPES.EXPENSE && (
          <View style={dynamicStyles.section}>
            <View style={dynamicStyles.switchRow}>
              <Text style={dynamicStyles.label}>¿Ya se pagó?</Text>
              <Switch
                value={isPaid}
                onValueChange={setIsPaid}
                trackColor={{ false: themeColors.border, true: themeColors.accent }}
                thumbColor={themeColors.background}
              />
            </View>
          </View>
        )}

        {/* Spacer for fixed button */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Botón de guardar fijo en la parte inferior */}
      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity style={dynamicStyles.submitButton} onPress={handleSubmit}>
          <Text style={dynamicStyles.submitButtonText}>
            {isEditing ? '💾 Guardar Cambios' : '✨ Guardar Transacción'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
