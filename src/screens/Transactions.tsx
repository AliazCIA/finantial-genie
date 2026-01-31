import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTransactions } from '../hooks/useTransactions';
import { useCreditCards } from '../hooks/useCreditCards';
import { useInstallments } from '../hooks/useInstallments';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import MonthSelector from '../components/MonthSelector';
import TransactionModal from '../components/TransactionModal';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format, differenceInDays, subDays } from 'date-fns';
import { getPaymentsForCurrentMonth } from '../services/calculations/installmentCalculator';
import { TransactionSchema } from '../services/database/schema';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { isDesktop, isMobile, getCardPadding } from '../utils/responsive';
import { RECURRENCE_PERIOD_LABELS } from '../utils/constants';

export default function Transactions() {
  const navigation = useNavigation();
  const { transactions, loading, deleteTransaction, refresh } = useTransactions();
  const { creditCards } = useCreditCards();
  const { payments } = useInstallments();
  const { categories } = useCategories();
  const { theme, isDark } = useTheme();
  const themeColors = getThemeColors(theme);
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [creditCardFilter, setCreditCardFilter] = useState<'all' | 'withCard' | 'withoutCard'>('all');
  const [recurringFilter, setRecurringFilter] = useState<'all' | 'recurring' | 'nonRecurring'>('all');
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<'income' | 'expense' | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<TransactionSchema | null>(null);
  
  // Refresh transactions when screen comes into focus (e.g., after uploading statement)
  useEffect(() => {
    const unsubscribe = (navigation as any)?.addListener?.('focus', () => {
      refresh();
    });
    
    return unsubscribe;
  }, [navigation, refresh]);

  // Get installment payments for the selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const monthPayments = payments.filter(payment => {
    if (payment.status !== 'pending') return false;
    const dueDate = parseISO(payment.dueDate);
    return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
  });

  // Get the purchase for each payment to get credit card association
  const { purchases } = useInstallments();
  
  // Convert installment payments to virtual transactions for display
  const virtualTransactions: (TransactionSchema & { isInstallment?: boolean; paymentId?: string })[] = monthPayments.map(payment => {
    const purchase = purchases.find(p => p.id === payment.installmentPurchaseId);
    return {
      id: `installment_${payment.id}`,
      type: 'expense' as const,
      amount: payment.amount,
      description: `Pago a meses - Pago #${payment.paymentNumber}`,
      tags: [],
      date: payment.dueDate,
      isRecurring: false,
      recurrencePeriod: null,
      recurrenceStartDate: null,
      parentRecurringId: null,
      creditCardId: purchase?.creditCardId || null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      isInstallment: true,
      paymentId: payment.id,
    };
  });

  // Combine real transactions with virtual installment transactions
  const allTransactions = [...transactions, ...virtualTransactions];

  // Check if there are any transactions in the selected month
  const hasTransactionsInMonth = allTransactions.some(txn => {
    const txnDate = parseISO(txn.date);
    return isWithinInterval(txnDate, { start: monthStart, end: monthEnd });
  });

  const filteredTransactions = allTransactions.filter(txn => {
    // Filter by type
    if (filter !== 'all' && txn.type !== filter) {
      return false;
    }
    
    // Filter by credit card
    if (creditCardFilter === 'withCard' && !txn.creditCardId) {
      return false;
    }
    if (creditCardFilter === 'withoutCard' && txn.creditCardId) {
      return false;
    }
    
    // If filtering by specific credit card
    if (creditCardFilter === 'withCard' && selectedCreditCardId && txn.creditCardId !== selectedCreditCardId) {
      return false;
    }
    
    // Filter by recurring status
    if (recurringFilter === 'recurring') {
      // Show only recurring parent transactions (not generated ones)
      if (!txn.isRecurring || txn.parentRecurringId) {
        return false;
      }
    } else if (recurringFilter === 'nonRecurring') {
      // Show only non-recurring transactions
      if (txn.isRecurring && !txn.parentRecurringId) {
        return false;
      }
    }
    
    // Filter by month - show all transactions in the selected month
    const txnDate = parseISO(txn.date);
    const isInSelectedMonth = isWithinInterval(txnDate, { start: monthStart, end: monthEnd });
    
    if (!isInSelectedMonth) {
      return false;
    }
    
    // Show all transactions in the selected month, regardless of cut date
    // This ensures that when users upload statements, all transactions are visible
    return true;
  });
  

  // Verificar si una transacción es antigua (más de 30 días)
  const isOldTransaction = (transactionDate: string): boolean => {
    const daysDiff = differenceInDays(new Date(), parseISO(transactionDate));
    return daysDiff > 30;
  };

  const handleDelete = async (transaction: TransactionSchema) => {
    const isOld = isOldTransaction(transaction.date);
    const isRecurring = transaction.isRecurring && !transaction.parentRecurringId; // Es padre recurrente
    
    let confirmMessage = `¿Estás seguro de eliminar "${transaction.description}"?`;
    
    if (isRecurring) {
      confirmMessage = `⚠️ Esta es una transacción RECURRENTE.\n\nAl eliminarla, se detendrá la generación automática de transacciones futuras desde hoy en adelante.\n\n¿Deseas continuar?`;
    }
    
    if (isOld) {
      confirmMessage = `⚠️ Esta transacción es antigua (más de 30 días).\n\n${confirmMessage}\n\nSe requiere confirmación adicional para eliminar registros antiguos.`;
    }

    const showConfirmation = (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm(confirmMessage));
        } else {
          Alert.alert(
            'Eliminar Transacción',
            confirmMessage,
            [
              { 
                text: 'Cancelar', 
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                  // Si es antigua, pedir confirmación adicional
                  if (isOld) {
                    Alert.alert(
                      'Confirmación Final',
                      'Esta acción no se puede deshacer. ¿Estás completamente seguro?',
                      [
                        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Sí, eliminar', style: 'destructive', onPress: () => resolve(true) }
                      ]
                    );
                  } else {
                    resolve(true);
                  }
                },
              },
            ]
          );
        }
      });
    };

    const confirmed = await showConfirmation();
    
    if (confirmed) {
      try {
        await deleteTransaction(transaction.id);
        showToast('Transacción eliminada correctamente', 'success');
        await refresh();
      } catch (error) {
        console.error('[handleDelete] Error:', error);
        showToast('Error al eliminar la transacción', 'error');
      }
    }
  };

  const renderTransaction = ({ item }: { item: typeof transactions[0] }) => {
    // Check if this is an installment payment
    const isInstallment = (item as any).isInstallment === true;
    const isRecurring = item.isRecurring && !item.parentRecurringId; // Es padre recurrente
    const isGenerated = !!item.parentRecurringId; // Es transacción generada
    const isOld = !isInstallment && isOldTransaction(item.date);
    
    // Get credit card color if transaction is associated with a card
    const associatedCard = item.creditCardId 
      ? creditCards.find(card => card.id === item.creditCardId)
      : null;
    const cardColor = associatedCard?.color || null;
    
    // Get category color (use first category if multiple)
    const categoryColor = item.tags && item.tags.length > 0
      ? categories.find(cat => cat.id === item.tags[0])?.color || null
      : null;

    const dynamicItemStyles = StyleSheet.create({
      transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        borderLeftWidth: cardColor ? 4 : 0,
        borderLeftColor: cardColor || 'transparent',
      },
      transactionDescription: {
        ...typography.body,
        color: themeColors.text,
        marginBottom: 1,
        fontSize: isDesktop ? 15 : isMobile ? 13 : 14,
        lineHeight: isDesktop ? 20 : isMobile ? 16 : 18,
      },
      transactionDate: {
        ...typography.caption,
        color: themeColors.textSecondary,
        marginBottom: 0,
        fontSize: isDesktop ? 12 : isMobile ? 10 : 11,
        lineHeight: isDesktop ? 16 : isMobile ? 12 : 14,
      },
      tag: {
        backgroundColor: themeColors.primary + '20',
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
        borderRadius: 6,
        marginRight: spacing.xs / 2,
      },
      tagText: {
        ...typography.caption,
        color: themeColors.primary,
        fontSize: isDesktop ? 10 : isMobile ? 8 : 9,
        lineHeight: isDesktop ? 12 : isMobile ? 10 : 11,
      },
    });

    return (
      <Card 
        padding={isMobile ? spacing.xs : spacing.sm} 
        marginBottom={spacing.xs / 2}
        style={{
          ...(categoryColor && {
            borderLeftWidth: 4,
            borderLeftColor: categoryColor,
            backgroundColor: categoryColor + '08',
          }),
          ...(cardColor && !categoryColor && {
            borderLeftWidth: 4,
            borderLeftColor: cardColor,
          }),
          ...(isOld && {
            opacity: 0.85,
          }),
        }}
      >
        <View style={dynamicItemStyles.transactionItem}>
          <View style={styles.transactionContent}>
          <View style={styles.transactionInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', marginBottom: 1 }}>
              <Text style={dynamicItemStyles.transactionDescription}>{item.description}</Text>
              {isInstallment && (
                <View style={{
                  backgroundColor: themeColors.secondary + '30',
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    ...typography.caption,
                    color: themeColors.secondary,
                    fontWeight: '600',
                  }}>
                    A Meses
                  </Text>
                </View>
              )}
              {isRecurring && (
                <View style={{
                  backgroundColor: themeColors.primary + '30',
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    ...typography.caption,
                    color: themeColors.primary,
                    fontWeight: '600',
                    fontSize: 10,
                  }}>
                    🔄 {item.recurrencePeriod ? RECURRENCE_PERIOD_LABELS[item.recurrencePeriod] : 'Recurrente'}
                  </Text>
                </View>
              )}
              {isGenerated && (
                <View style={{
                  backgroundColor: themeColors.textSecondary + '20',
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    ...typography.caption,
                    color: themeColors.textSecondary,
                    fontWeight: '500',
                    fontSize: 9,
                  }}>
                    Auto
                  </Text>
                </View>
              )}
              {isOld && (
                <View style={{
                  backgroundColor: themeColors.error + '20',
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    ...typography.caption,
                    color: themeColors.error,
                    fontWeight: '500',
                    fontSize: 9,
                  }}>
                    Antigua
                  </Text>
                </View>
              )}
            </View>
            <Text style={dynamicItemStyles.transactionDate}>{formatDate(item.date)}</Text>
            {!isInstallment && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 3).map(tag => {
                  const category = categories.find(cat => cat.id === tag);
                  return (
                    <View 
                      key={tag} 
                      style={[
                        dynamicItemStyles.tag,
                        category && {
                          backgroundColor: category.color + '20',
                          borderColor: category.color + '40',
                          borderWidth: 1,
                        }
                      ]}
                    >
                      <Text style={[
                        dynamicItemStyles.tagText,
                        category && { color: category.color }
                      ]}>
                        {category ? `${category.icon} ${category.name}` : tag}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <Text
            style={[
              styles.transactionAmount,
              { color: item.type === 'income' ? themeColors.accent : themeColors.secondary },
            ]}
          >
            {item.type === 'income' ? '+' : '-'}
            {formatCurrency(item.amount)}
          </Text>
        </View>
        {!isInstallment && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.editButton, { 
                backgroundColor: isOld ? themeColors.textSecondary + '30' : themeColors.primary + '40',
                opacity: isOld ? 0.7 : 1,
              }]}
              onPress={(e?: any) => {
                if (e) {
                  e.stopPropagation();
                }
                if (isOld) {
                  Alert.alert(
                    'Editar Transacción Antigua',
                    'Esta transacción es antigua (más de 30 días). ¿Deseas continuar con la edición?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Continuar', 
                        onPress: () => {
                          setEditingTransaction(item);
                          setShowModal(true);
                        }
                      }
                    ]
                  );
                } else {
                  setEditingTransaction(item);
                  setShowModal(true);
                }
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: themeColors.error + '40' }]}
              onPress={(e?: any) => {
                if (e) {
                  e.stopPropagation();
                }
                handleDelete(item);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.surface,
    },
    header: {
      paddingHorizontal: isDesktop ? spacing.xl : spacing.md,
      paddingVertical: isMobile ? spacing.xs : spacing.sm,
      backgroundColor: themeColors.background,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      ...typography.h1,
      color: themeColors.primary,
      fontSize: isDesktop ? 28 : isMobile ? 20 : 24,
    },
    addButton: {
      backgroundColor: themeColors.secondary,
      paddingHorizontal: isDesktop ? spacing.lg : spacing.md,
      paddingVertical: isMobile ? spacing.xs : spacing.sm,
      borderRadius: 8,
    },
    addButtonText: {
      ...typography.button,
      color: themeColors.background,
      fontSize: isDesktop ? 16 : isMobile ? 12 : 14,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Transacciones</Text>
        <TouchableOpacity style={dynamicStyles.addButton} onPress={() => {
          setModalInitialType(undefined);
          setShowModal(true);
        }}>
          <Text style={dynamicStyles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthSelectorContainer}>
        <MonthSelector selectedDate={selectedMonth} onDateChange={setSelectedMonth} transactions={transactions} />
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        {/* Primera fila: Tipo y Recurrencia */}
        <View style={styles.filterRow}>
          <View style={[styles.filterSection, { flex: 1, marginRight: spacing.xs }]}>
            <Text style={[styles.filterSectionLabel, { color: themeColors.textSecondary }]}>Tipo</Text>
            <View style={styles.filters}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: filter === 'all' ? themeColors.primary : themeColors.surface,
                    borderColor: filter === 'all' ? themeColors.primary : themeColors.border,
                  },
                  filter === 'all' && styles.filterButtonActive
                ]}
                onPress={() => setFilter('all')}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === 'all' ? themeColors.background : themeColors.text },
                  filter === 'all' && styles.filterTextActive
                ]}>
                  Todas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: filter === 'income' ? themeColors.accent : themeColors.surface,
                    borderColor: filter === 'income' ? themeColors.accent : themeColors.border,
                  },
                  filter === 'income' && styles.filterButtonActive
                ]}
                onPress={() => setFilter('income')}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === 'income' ? themeColors.background : themeColors.text },
                  filter === 'income' && styles.filterTextActive
                ]}>
                  💰 Ingresos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: filter === 'expense' ? themeColors.secondary : themeColors.surface,
                    borderColor: filter === 'expense' ? themeColors.secondary : themeColors.border,
                  },
                  filter === 'expense' && styles.filterButtonActive
                ]}
                onPress={() => setFilter('expense')}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === 'expense' ? themeColors.background : themeColors.text },
                  filter === 'expense' && styles.filterTextActive
                ]}>
                  💸 Gastos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[styles.filterSection, { flex: 1, marginLeft: spacing.xs }]}>
            <Text style={[styles.filterSectionLabel, { color: themeColors.textSecondary }]}>Recurrencia</Text>
            <View style={styles.filters}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: recurringFilter === 'all' ? themeColors.primary : themeColors.surface,
                    borderColor: recurringFilter === 'all' ? themeColors.primary : themeColors.border,
                  },
                  recurringFilter === 'all' && styles.filterButtonActive
                ]}
                onPress={() => setRecurringFilter('all')}
              >
                <Text style={[
                  styles.filterText,
                  { color: recurringFilter === 'all' ? themeColors.background : themeColors.text },
                  recurringFilter === 'all' && styles.filterTextActive
                ]}>
                  Todas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: recurringFilter === 'recurring' ? themeColors.primary : themeColors.surface,
                    borderColor: recurringFilter === 'recurring' ? themeColors.primary : themeColors.border,
                  },
                  recurringFilter === 'recurring' && styles.filterButtonActive
                ]}
                onPress={() => setRecurringFilter('recurring')}
              >
                <Text style={[
                  styles.filterText,
                  { color: recurringFilter === 'recurring' ? themeColors.background : themeColors.text },
                  recurringFilter === 'recurring' && styles.filterTextActive
                ]}>
                  🔄 Recurrentes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: recurringFilter === 'nonRecurring' ? themeColors.primary : themeColors.surface,
                    borderColor: recurringFilter === 'nonRecurring' ? themeColors.primary : themeColors.border,
                  },
                  recurringFilter === 'nonRecurring' && styles.filterButtonActive
                ]}
                onPress={() => setRecurringFilter('nonRecurring')}
              >
                <Text style={[
                  styles.filterText,
                  { color: recurringFilter === 'nonRecurring' ? themeColors.background : themeColors.text },
                  recurringFilter === 'nonRecurring' && styles.filterTextActive
                ]}>
                  No Recurrentes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Segunda fila: Tarjeta */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterSectionLabel, { color: themeColors.textSecondary }]}>Tarjeta</Text>
          <View style={styles.filters}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { 
                  backgroundColor: creditCardFilter === 'all' ? themeColors.secondary : themeColors.surface,
                  borderColor: creditCardFilter === 'all' ? themeColors.secondary : themeColors.border,
                },
                creditCardFilter === 'all' && styles.filterButtonActive
              ]}
              onPress={() => {
                setCreditCardFilter('all');
                setSelectedCreditCardId(null);
              }}
            >
              <Text style={[
                styles.filterText,
                { color: creditCardFilter === 'all' ? themeColors.background : themeColors.text },
                creditCardFilter === 'all' && styles.filterTextActive
              ]}>
                Todas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { 
                  backgroundColor: creditCardFilter === 'withCard' ? themeColors.secondary : themeColors.surface,
                  borderColor: creditCardFilter === 'withCard' ? themeColors.secondary : themeColors.border,
                },
                creditCardFilter === 'withCard' && styles.filterButtonActive
              ]}
              onPress={() => {
                setCreditCardFilter('withCard');
                if (!selectedCreditCardId && creditCards.length > 0) {
                  setSelectedCreditCardId(null);
                }
              }}
            >
              <Text style={[
                styles.filterText,
                { color: creditCardFilter === 'withCard' ? themeColors.background : themeColors.text },
                creditCardFilter === 'withCard' && styles.filterTextActive
              ]}>
                💳 Con Tarjeta
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { 
                  backgroundColor: creditCardFilter === 'withoutCard' ? themeColors.secondary : themeColors.surface,
                  borderColor: creditCardFilter === 'withoutCard' ? themeColors.secondary : themeColors.border,
                },
                creditCardFilter === 'withoutCard' && styles.filterButtonActive
              ]}
              onPress={() => {
                setCreditCardFilter('withoutCard');
                setSelectedCreditCardId(null);
              }}
            >
              <Text style={[
                styles.filterText,
                { color: creditCardFilter === 'withoutCard' ? themeColors.background : themeColors.text },
                creditCardFilter === 'withoutCard' && styles.filterTextActive
              ]}>
                Sin Tarjeta
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {creditCardFilter === 'withCard' && creditCards.filter(card => card.isActive).length > 0 && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionLabel, { color: themeColors.textSecondary }]}>Seleccionar Tarjeta</Text>
            <View style={[styles.filters, { flexWrap: 'wrap' }]}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { 
                    backgroundColor: selectedCreditCardId === null ? themeColors.secondary : themeColors.surface,
                    borderColor: selectedCreditCardId === null ? themeColors.secondary : themeColors.border,
                  },
                  selectedCreditCardId === null && styles.filterButtonActive
                ]}
                onPress={() => setSelectedCreditCardId(null)}
              >
                <Text style={[
                  styles.filterText,
                  { color: selectedCreditCardId === null ? themeColors.background : themeColors.text },
                  selectedCreditCardId === null && styles.filterTextActive
                ]}>
                  Todas
                </Text>
              </TouchableOpacity>
              {creditCards.filter(card => card.isActive).map(card => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.filterButton,
                    { 
                      backgroundColor: selectedCreditCardId === card.id ? card.color : themeColors.surface,
                      borderColor: card.color,
                      borderWidth: selectedCreditCardId === card.id ? 2 : 1
                    },
                    selectedCreditCardId === card.id && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedCreditCardId(card.id)}
                >
                  <Text style={[
                    styles.filterText,
                    { color: selectedCreditCardId === card.id ? themeColors.background : card.color },
                    selectedCreditCardId === card.id && styles.filterTextActive
                  ]}>
                    {card.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="💰"
            title="No hay transacciones este mes"
            message={!hasTransactionsInMonth
              ? "Comienza registrando tus ingresos para tener un mejor control de tus finanzas."
              : "No hay transacciones que coincidan con los filtros seleccionados."}
            actionLabel={!hasTransactionsInMonth
              ? "➕ Agregar Ingreso"
              : undefined}
            onAction={!hasTransactionsInMonth
              ? () => {
                  setModalInitialType('income');
                  setShowModal(true);
                }
              : undefined}
            compact={true}
          />
        }
      />

      <TransactionModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setModalInitialType(undefined);
          setEditingTransaction(null);
          refresh();
        }}
        initialType={modalInitialType || 'expense'}
        isQuickCapture={false}
        initialDate={selectedMonth}
        transaction={editingTransaction || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthSelectorContainer: {
    paddingHorizontal: isDesktop ? spacing.lg : spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filtersContainer: {
    paddingHorizontal: isDesktop ? spacing.lg : spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  filterSection: {
    marginBottom: spacing.xs / 2,
  },
  filterSectionLabel: {
    ...typography.bodySmall,
    fontSize: isDesktop ? 11 : isMobile ? 9 : 10,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: isDesktop ? spacing.xs : 6,
    paddingVertical: isMobile ? 2 : spacing.xs / 2,
    borderRadius: 6,
    borderWidth: 1.5,
    minHeight: isMobile ? 24 : 26,
    minWidth: isMobile ? 32 : 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  filterButtonActive: {
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  filterText: {
    ...typography.bodySmall,
    fontSize: isDesktop ? 12 : isMobile ? 10 : 11,
    fontWeight: '500',
    lineHeight: isDesktop ? 16 : isMobile ? 14 : 15,
  },
  filterTextActive: {
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: isDesktop ? spacing.lg : spacing.md,
    paddingVertical: spacing.xs,
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: spacing.xs,
    paddingVertical: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  editButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    width: isMobile ? 32 : 36,
    height: isMobile ? 32 : 36,
    zIndex: 10,
  },
  editButtonText: {
    fontSize: isMobile ? 14 : 16,
  },
  deleteButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    width: isMobile ? 32 : 36,
    height: isMobile ? 32 : 36,
    zIndex: 10,
  },
  deleteButtonText: {
    fontSize: isMobile ? 14 : 16,
  },
  transactionInfo: {
    flex: 1,
    paddingVertical: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  transactionAmount: {
    fontSize: isDesktop ? 18 : isMobile ? 14 : 16,
    fontWeight: '700',
    letterSpacing: -0.01,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
});

