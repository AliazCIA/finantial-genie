import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTransactions } from '../hooks/useTransactions';
import { useExpenseAnalysis } from '../hooks/useExpenseAnalysis';
import { useCategories } from '../hooks/useCategories';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { useSync } from '../hooks/useSync';
import { formatCurrency } from '../utils/formatters';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getYear, getMonth, startOfMonth, endOfMonth, isWithinInterval, parseISO, isAfter, isSameMonth } from 'date-fns';
import { calculateMonthlySummary } from '../services/calculations/monthlySummary';
import { calculateDailyExpenses } from '../services/calculations/dailyExpenses';
import Card from '../components/common/Card';
import GradientCard from '../components/common/GradientCard';
import ProgressBar from '../components/common/ProgressBar';
import DailyChart from '../components/common/DailyChart';
import MonthSelector from '../components/MonthSelector';
import ExpandableSyncButton from '../components/common/ExpandableSyncButton';
import QuickAddButton from '../components/common/QuickAddButton';
import TransactionModal from '../components/TransactionModal';
import { isDesktop, isTablet, isMobile, getCardPadding, getContainerMaxWidth } from '../utils/responsive';

export default function Dashboard() {
  const navigation = useNavigation<any>();
  const { transactions, refresh } = useTransactions();
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const { categories } = useCategories();
  const { isConnected, pendingChanges, sync, isSyncing } = useSync();
  const [showQuickModal, setShowQuickModal] = useState(false);
  
  // Refresh transactions when modal closes (in case a transaction was added)
  React.useEffect(() => {
    if (!showQuickModal) {
      // Small delay to ensure any pending operations complete
      const timer = setTimeout(() => {
        refresh();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showQuickModal, refresh]);
  
  // State for selected month - siempre inicia con el mes actual
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return startOfMonth(today); // Asegurar que siempre inicie con el inicio del mes actual
  });
  
  // Verificar que el mes seleccionado tenga transacciones (permitir futuros si hay datos)
  React.useEffect(() => {
    const currentMonthStart = startOfMonth(new Date());
    const selectedMonthStart = startOfMonth(selectedDate);
    
    // Calcular el mes máximo con transacciones
    let maxMonthWithTransactions = currentMonthStart;
    if (transactions.length > 0) {
      transactions.forEach(txn => {
        const txnDate = parseISO(txn.date);
        const txnMonthStart = startOfMonth(txnDate);
        if (isAfter(txnMonthStart, maxMonthWithTransactions) || isSameMonth(txnDate, maxMonthWithTransactions)) {
          maxMonthWithTransactions = txnMonthStart;
        }
      });
    }
    
    // Solo corregir si el mes seleccionado está más allá del mes máximo con transacciones
    if (isAfter(selectedMonthStart, maxMonthWithTransactions)) {
      setSelectedDate(maxMonthWithTransactions);
    }
  }, [selectedDate, transactions]);
  
  const selectedYear = getYear(selectedDate);
  const selectedMonth = getMonth(selectedDate) + 1;
  
  // Calculate monthly summary for selected month
  const monthlySummary = calculateMonthlySummary(transactions, selectedYear, selectedMonth, []);
  
  // Calculate daily expenses
  const dailyExpenses = calculateDailyExpenses(transactions, selectedYear, selectedMonth);
  
  // Get expense analysis for selected month
  const { categoryExpenses } = useExpenseAnalysis(selectedYear, selectedMonth);
  
  // Helper to get category icon and color
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return {
      icon: category?.icon || '📦',
      color: category?.color || themeColors.textSecondary,
    };
  };
  
  // Calculate total for percentage calculation
  const totalCategoryExpenses = categoryExpenses.reduce((sum, cat) => sum + cat.total, 0);
  
  // Calculate available amount (income - expenses)
  const availableAmount = monthlySummary.totalIncome - monthlySummary.totalExpenses;
  
  // Aplicar gradiente al fondo en web usando ref
  const scrollViewRef = React.useRef<any>(null);
  
  React.useEffect(() => {
    if (Platform.OS === 'web' && scrollViewRef.current) {
      const element = scrollViewRef.current as any;
      const gradientBg = theme === 'dark'
        ? 'linear-gradient(180deg, rgba(15, 23, 42, 1) 0%, rgba(30, 41, 59, 0.98) 50%, rgba(15, 23, 42, 0.95) 100%)'
        : 'linear-gradient(180deg, rgba(248, 250, 252, 1) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(248, 250, 252, 0.95) 100%)';
      
      const applyGradient = (el: any) => {
        if (el && el.style) {
          el.style.backgroundImage = gradientBg;
        }
        if (el && el.parentElement && el.parentElement.style) {
          el.parentElement.style.backgroundImage = gradientBg;
        }
      };

      setTimeout(() => {
        if (element._nativeNode) {
          applyGradient(element._nativeNode);
        } else if (element.getNode && element.getNode()) {
          applyGradient(element.getNode());
        } else if (element) {
          applyGradient(element);
        }
      }, 100);
    }
  }, [theme]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    contentWrapper: {
      maxWidth: getContainerMaxWidth(),
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: isDesktop ? spacing.xl : spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
    },
    header: {
      marginBottom: spacing.xs,
      paddingBottom: spacing.xs,
      borderBottomWidth: 0.5,
      borderBottomColor: themeColors.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.xs / 2,
    },
    title: {
      ...typography.h1,
      color: themeColors.primary,
      fontWeight: '700',
      fontSize: isDesktop ? 32 : 26,
    },
    subtitle: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      fontSize: isDesktop ? 15 : 13,
    },
    summaryCards: {
      flexDirection: isDesktop ? 'row' : 'row',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    summaryCard: {
      flex: 1,
    },
    cardTitle: {
      ...typography.h4,
      color: themeColors.text,
      marginBottom: spacing.md,
      fontWeight: '600',
      fontSize: isDesktop ? 20 : 18,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryLabel: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginBottom: spacing.xs,
      fontSize: isDesktop ? 15 : 13,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: isDesktop ? 24 : 20,
      fontWeight: '700',
      letterSpacing: -0.02,
    },
    income: {
      color: themeColors.accent,
    },
    expense: {
      color: themeColors.secondary,
    },
    balanceContainer: {
      alignItems: 'center',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      marginTop: spacing.sm,
    },
    balanceLabel: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      marginBottom: spacing.xs,
      fontSize: isDesktop ? 15 : 13,
      fontWeight: '500',
    },
    balanceValue: {
      fontSize: isDesktop ? 24 : 20,
      fontWeight: '700',
      letterSpacing: -0.02,
    },
    positive: {
      color: themeColors.accent,
    },
    negative: {
      color: themeColors.secondary,
    },
    categoryItem: {
      marginBottom: spacing.md,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryIcon: {
      fontSize: isDesktop ? 26 : 24,
      marginRight: spacing.sm,
    },
    categoryName: {
      ...typography.body,
      color: themeColors.text,
      fontWeight: '600',
      flex: 1,
      fontSize: isDesktop ? 16 : 14,
    },
    categoryAmount: {
      ...typography.body,
      color: themeColors.text,
      fontWeight: '600',
      fontSize: isDesktop ? 18 : 16,
      letterSpacing: -0.01,
    },
    emptyText: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      fontStyle: 'italic',
      fontSize: isDesktop ? 13 : 12,
      textAlign: 'center',
      padding: spacing.lg,
    },
  });

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={dynamicStyles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      <View style={dynamicStyles.contentWrapper}>
        {/* Sync Button - Esquina superior izquierda */}
        <ExpandableSyncButton />

        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerTop}>
            <Text style={dynamicStyles.title}>Dashboard</Text>
            <QuickAddButton onPress={() => setShowQuickModal(true)} />
          </View>
          <Text style={dynamicStyles.subtitle}>Resumen financiero</Text>
        </View>

        {/* Month Selector */}
        <MonthSelector selectedDate={selectedDate} onDateChange={setSelectedDate} transactions={transactions} />

        {/* Summary Cards - Compact Layout */}
        <View style={dynamicStyles.summaryCards}>
          {/* Expenses Card */}
          <View style={dynamicStyles.summaryCard}>
            <GradientCard padding={isMobile ? spacing.xs : spacing.sm} marginBottom={0} gradient="secondary">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[dynamicStyles.cardTitle, { 
                  marginBottom: 0, 
                  fontSize: isDesktop ? 16 : isMobile ? 11 : 14,
                  fontWeight: '600',
                }]}>Gastos</Text>
                <Text style={[dynamicStyles.summaryValue, dynamicStyles.expense, { 
                  fontSize: isDesktop ? 24 : isMobile ? 16 : 20 
                }]}>
                  {formatCurrency(monthlySummary.totalExpenses)}
                </Text>
              </View>
            </GradientCard>
          </View>

          {/* Income Card */}
          <View style={dynamicStyles.summaryCard}>
            <GradientCard padding={isMobile ? spacing.xs : spacing.sm} marginBottom={0} gradient="accent">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[dynamicStyles.cardTitle, { 
                  marginBottom: 0, 
                  fontSize: isDesktop ? 16 : isMobile ? 11 : 14,
                  fontWeight: '600',
                }]}>Ingresos</Text>
                <Text style={[dynamicStyles.summaryValue, dynamicStyles.income, { 
                  fontSize: isDesktop ? 24 : isMobile ? 16 : 20 
                }]}>
                  {formatCurrency(monthlySummary.totalIncome)}
                </Text>
              </View>
            </GradientCard>
          </View>

          {/* Balance Card */}
          <View style={dynamicStyles.summaryCard}>
            <GradientCard padding={isMobile ? spacing.xs : spacing.sm} marginBottom={0} gradient="primary">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[dynamicStyles.balanceLabel, { 
                  marginBottom: 0, 
                  fontSize: isDesktop ? 16 : isMobile ? 11 : 14,
                  fontWeight: '600',
                }]}>Balance</Text>
                <Text style={[dynamicStyles.balanceValue, availableAmount >= 0 ? dynamicStyles.positive : dynamicStyles.negative, { 
                  fontSize: isDesktop ? 24 : isMobile ? 16 : 20 
                }]}>
                  {formatCurrency(availableAmount)}
                </Text>
              </View>
            </GradientCard>
          </View>
        </View>

        {/* Daily Chart */}
        <GradientCard padding={getCardPadding()} marginBottom={spacing.sm} gradient="subtle">
          <Text style={[dynamicStyles.cardTitle, { marginBottom: spacing.xs }]}>Actividad Diaria</Text>
          <DailyChart 
            dailyData={dailyExpenses} 
            transactions={transactions}
            categories={categories}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            height={isDesktop ? 200 : 160} 
          />
        </GradientCard>

        {/* Expenses by Category - Show first on mobile/tablet, after chart on desktop */}
        {categoryExpenses.length > 0 && (
          <GradientCard padding={getCardPadding()} marginBottom={spacing.sm} gradient="subtle">
            <Text style={dynamicStyles.cardTitle}>Gastos por Categoría</Text>
            {categoryExpenses.slice(0, isDesktop ? 8 : 6).map((category, index) => {
              const categoryInfo = getCategoryInfo(category.categoryId);
              const percentage = totalCategoryExpenses > 0 
                ? (category.total / totalCategoryExpenses) * 100 
                : 0;
              
              return (
                <View key={category.categoryId || index} style={dynamicStyles.categoryItem}>
                  <View style={dynamicStyles.categoryHeader}>
                    <View style={dynamicStyles.categoryInfo}>
                      <Text style={dynamicStyles.categoryIcon}>{categoryInfo.icon}</Text>
                      <Text style={dynamicStyles.categoryName}>{category.categoryName}</Text>
                    </View>
                    <Text style={dynamicStyles.categoryAmount}>{formatCurrency(category.total)}</Text>
                  </View>
                  <ProgressBar
                    value={percentage}
                    color={categoryInfo.color}
                    height={isDesktop ? 8 : 6}
                  />
                </View>
              );
            })}
          </GradientCard>
        )}

        {/* Additional Info - Only on Desktop */}
        {isDesktop && (
          <>
            {/* More detailed stats or other info can go here */}
          </>
        )}
      </View>

      {/* Quick Transaction Modal */}
      <TransactionModal
        visible={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        isQuickCapture={true}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
