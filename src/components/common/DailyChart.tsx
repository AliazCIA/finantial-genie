import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme, getThemeColors } from '../../context/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../utils/formatters';
import { format, parseISO, getDate, isWithinInterval, startOfMonth, endOfMonth, addDays, differenceInDays } from 'date-fns';
import { isDesktop } from '../../utils/responsive';
import type { DailyExpense } from '../../services/calculations/dailyExpenses';
import type { TransactionSchema } from '../../services/database/schema';
import type { CategorySchema } from '../../services/database/schema';

interface DailyChartProps {
  dailyData: DailyExpense[];
  transactions: TransactionSchema[];
  categories: CategorySchema[];
  selectedYear: number;
  selectedMonth: number;
  height?: number;
}

export default function DailyChart({ 
  dailyData, 
  transactions, 
  categories, 
  selectedYear, 
  selectedMonth,
  height = 200 
}: DailyChartProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Get transactions for the selected month
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));
  
  const monthTransactions = transactions.filter(txn => {
    const txnDate = parseISO(txn.date);
    return isWithinInterval(txnDate, { start: monthStart, end: monthEnd });
  });
  
  // Calculate quincenal summaries
  const firstHalf = dailyData.filter(d => d.day <= 15);
  const secondHalf = dailyData.filter(d => d.day > 15);
  
  const firstHalfTotal = firstHalf.reduce((sum, d) => sum + d.expenses, 0);
  const secondHalfTotal = secondHalf.reduce((sum, d) => sum + d.expenses, 0);
  const firstHalfIncome = firstHalf.reduce((sum, d) => sum + d.income, 0);
  const secondHalfIncome = secondHalf.reduce((sum, d) => sum + d.income, 0);
  
  // Get current day of month
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() + 1 === selectedMonth;
  const currentDay = isCurrentMonth ? today.getDate() : null;
  
  // Helper to get category color
  const getCategoryColor = (categoryId: string | null): string => {
    if (!categoryId) return themeColors.secondary;
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || themeColors.secondary;
  };
  
  // Group transactions by day and category
  const getDayTransactions = (day: number) => {
    return monthTransactions.filter(txn => {
      const txnDate = parseISO(txn.date);
      return getDate(txnDate) === day && txn.type === 'expense';
    });
  };
  
  // Get day details for tooltip
  const getDayDetails = (day: number) => {
    const dayData = dailyData.find(d => d.day === day);
    if (!dayData) return null;
    
    const dayTransactions = getDayTransactions(day);
    const categoryBreakdown = new Map<string, { amount: number; count: number; name: string; icon: string; color: string }>();
    
    dayTransactions.forEach(txn => {
      const categoryId = txn.tags && txn.tags.length > 0 ? txn.tags[0] : null;
      const category = categoryId ? categories.find(cat => cat.id === categoryId) : null;
      const key = categoryId || '__no_category__';
      
      const existing = categoryBreakdown.get(key) || {
        amount: 0,
        count: 0,
        name: category?.name || 'Sin categoría',
        icon: category?.icon || '📦',
        color: category?.color || themeColors.textSecondary,
      };
      
      existing.amount += txn.amount;
      existing.count += 1;
      categoryBreakdown.set(key, existing);
    });
    
    return {
      day: dayData.day,
      date: dayData.date,
      expenses: dayData.expenses,
      income: dayData.income,
      balance: dayData.balance,
      categories: Array.from(categoryBreakdown.values()),
    };
  };
  
  // Calculate max expense for scaling
  const maxExpense = Math.max(...dailyData.map(d => d.expenses), 1);
  const maxIncome = Math.max(...dailyData.map(d => d.income), 1);
  const maxValue = Math.max(maxExpense, maxIncome);
  
  // Get sample days to show labels (every ~5 days or so)
  const sampleDays = dailyData.filter((_, index) => {
    const totalDays = dailyData.length;
    if (totalDays <= 7) return true; // Show all if week or less
    const step = Math.ceil(totalDays / 7); // Show ~7 labels
    return index % step === 0 || index === totalDays - 1;
  });
  
  const dynamicStyles = StyleSheet.create({
    container: {
      marginTop: spacing.md,
    },
    chartContainer: {
      height,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs / 2,
      marginBottom: spacing.xs,
      borderBottomWidth: 0.5,
      borderBottomColor: themeColors.border,
      paddingBottom: spacing.xs / 2,
    },
    barContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginHorizontal: 1,
      height: '100%',
    },
    barStack: {
      width: '100%',
      maxWidth: isDesktop ? 12 : 8,
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
    },
    expenseBar: {
      width: '100%',
      backgroundColor: themeColors.secondary,
      borderRadius: 2,
      marginBottom: 1,
      minHeight: 2,
    },
    incomeBar: {
      width: '100%',
      backgroundColor: themeColors.accent,
      borderRadius: 2,
      minHeight: 2,
    },
    labelsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xs / 2,
      marginTop: spacing.xs,
    },
    label: {
      ...typography.caption,
      color: themeColors.textSecondary,
      fontSize: isDesktop ? 8 : 7,
      fontWeight: '300',
      flex: 1,
      textAlign: 'center',
    },
    emptyText: {
      ...typography.bodySmall,
      color: themeColors.textSecondary,
      textAlign: 'center',
      padding: spacing.lg,
      fontStyle: 'italic',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 0.5,
      borderTopColor: themeColors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      ...typography.caption,
      color: themeColors.textSecondary,
      fontSize: isDesktop ? 12 : 10,
      marginBottom: spacing.xs / 2,
    },
    statValue: {
      ...typography.body,
      fontWeight: '600',
      fontSize: isDesktop ? 16 : 14,
    },
    todayIndicator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 2,
      alignSelf: 'center',
    },
    tooltipContainer: {
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    tooltip: {
      padding: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      ...(Platform.OS === 'web' && {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }),
    },
    tooltipHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    tooltipTitle: {
      ...typography.body,
      fontWeight: '600',
      fontSize: isDesktop ? 14 : 13,
    },
    tooltipClose: {
      fontSize: 18,
      fontWeight: '600',
    },
    tooltipStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: spacing.xs,
      paddingBottom: spacing.xs,
      borderBottomWidth: 0.5,
      borderBottomColor: themeColors.border,
    },
    tooltipStat: {
      alignItems: 'center',
      flex: 1,
    },
    tooltipStatLabel: {
      ...typography.caption,
      fontSize: isDesktop ? 10 : 9,
      marginBottom: 2,
    },
    tooltipStatValue: {
      ...typography.body,
      fontWeight: '600',
      fontSize: isDesktop ? 14 : 12,
    },
    tooltipCategories: {
      marginTop: spacing.xs,
    },
    tooltipSectionTitle: {
      ...typography.bodySmall,
      fontWeight: '600',
      fontSize: isDesktop ? 12 : 11,
      marginBottom: spacing.xs / 2,
    },
    tooltipCategory: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs / 2,
    },
    tooltipCategoryColor: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.xs / 2,
    },
    tooltipCategoryText: {
      ...typography.caption,
      fontSize: isDesktop ? 11 : 10,
      flex: 1,
    },
    quincenalContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    quincenalCard: {
      flex: 1,
      padding: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
    },
    quincenalTitle: {
      ...typography.bodySmall,
      fontWeight: '600',
      fontSize: isDesktop ? 12 : 11,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    quincenalStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: spacing.xs,
    },
    quincenalStat: {
      alignItems: 'center',
      flex: 1,
    },
    quincenalLabel: {
      ...typography.caption,
      fontSize: isDesktop ? 9 : 8,
      marginBottom: 2,
    },
    quincenalValue: {
      ...typography.body,
      fontWeight: '600',
      fontSize: isDesktop ? 13 : 11,
    },
  });
  
  if (dailyData.length === 0) {
    return (
      <View style={dynamicStyles.container}>
        <Text style={dynamicStyles.emptyText}>No hay datos para mostrar</Text>
      </View>
    );
  }
  
  // Calculate averages
  const totalExpenses = dailyData.reduce((sum, d) => sum + d.expenses, 0);
  const totalIncome = dailyData.reduce((sum, d) => sum + d.income, 0);
  const avgDaily = totalExpenses / dailyData.length;
  const todayData = dailyData[dailyData.length - 1];
  const weekData = dailyData.slice(-7);
  const weekTotal = weekData.reduce((sum, d) => sum + d.expenses, 0);
  
  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.chartContainer}>
        {dailyData.map((day, index) => {
          const expenseHeight = maxValue > 0 ? (day.expenses / maxValue) * 100 : 0;
          const incomeHeight = maxValue > 0 ? (day.income / maxValue) * 100 : 0;
          
          // Get transactions for this day grouped by category
          const dayTransactions = getDayTransactions(day.day);
          const categoryGroups = new Map<string, number>();
          
          dayTransactions.forEach(txn => {
            const categoryId = txn.tags && txn.tags.length > 0 ? txn.tags[0] : null;
            const key = categoryId || '__no_category__';
            categoryGroups.set(key, (categoryGroups.get(key) || 0) + txn.amount);
          });
          
          // Calculate heights for each category (will be stacked)
          const categoryBars: Array<{ color: string; height: number }> = [];
          
          categoryGroups.forEach((amount, categoryId) => {
            const height = maxValue > 0 ? (amount / maxValue) * 100 : 0;
            if (height > 0) {
              const color = categoryId === '__no_category__' 
                ? themeColors.secondary 
                : getCategoryColor(categoryId);
              categoryBars.push({ color, height });
            }
          });
          
          // If no categories but there are expenses, use default color
          if (categoryBars.length === 0 && expenseHeight > 0) {
            categoryBars.push({ 
              color: themeColors.secondary, 
              height: expenseHeight
            });
          }
          
          const isToday = isCurrentMonth && day.day === currentDay;
          const isSelected = selectedDay === day.day;
          
          return (
            <TouchableOpacity
              key={day.date}
              style={dynamicStyles.barContainer}
              onPress={() => setSelectedDay(selectedDay === day.day ? null : day.day)}
              activeOpacity={0.7}
            >
              <View style={[
                dynamicStyles.barStack,
                isToday && { borderWidth: 2, borderColor: themeColors.primary, borderRadius: 4 },
                isSelected && { borderWidth: 2, borderColor: themeColors.accent, borderRadius: 4 },
              ]}>
                {incomeHeight > 0 && (
                  <View
                    style={[
                      dynamicStyles.incomeBar,
                      { height: `${incomeHeight}%` },
                    ]}
                  />
                )}
                {categoryBars.map((bar, barIndex) => (
                  <View
                    key={barIndex}
                    style={[
                      {
                        width: '100%',
                        backgroundColor: bar.color,
                        borderRadius: 2,
                        marginBottom: barIndex < categoryBars.length - 1 ? 1 : 0,
                        minHeight: 2,
                      },
                      { height: `${bar.height}%` },
                    ]}
                  />
                ))}
              </View>
              {isToday && (
                <View style={[dynamicStyles.todayIndicator, { backgroundColor: themeColors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={dynamicStyles.labelsContainer}>
        {sampleDays.map(day => {
          const dayIndex = dailyData.findIndex(d => d.date === day.date);
          const date = new Date(day.date);
          const label = format(date, isDesktop ? 'd MMM' : 'd');
          
          return (
            <Text key={day.date} style={dynamicStyles.label}>
              {label}
            </Text>
          );
        })}
      </View>
      
      {/* Day Details Tooltip */}
      {selectedDay !== null && (() => {
        const details = getDayDetails(selectedDay);
        if (!details) return null;
        
        return (
          <View style={dynamicStyles.tooltipContainer}>
            <View style={[dynamicStyles.tooltip, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={dynamicStyles.tooltipHeader}>
                <Text style={[dynamicStyles.tooltipTitle, { color: themeColors.text }]}>
                  Día {details.day} - {format(parseISO(details.date), 'd MMM')}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                  <Text style={[dynamicStyles.tooltipClose, { color: themeColors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={dynamicStyles.tooltipStats}>
                <View style={dynamicStyles.tooltipStat}>
                  <Text style={[dynamicStyles.tooltipStatLabel, { color: themeColors.textSecondary }]}>Gastos</Text>
                  <Text style={[dynamicStyles.tooltipStatValue, { color: themeColors.secondary }]}>
                    {formatCurrency(details.expenses)}
                  </Text>
                </View>
                <View style={dynamicStyles.tooltipStat}>
                  <Text style={[dynamicStyles.tooltipStatLabel, { color: themeColors.textSecondary }]}>Ingresos</Text>
                  <Text style={[dynamicStyles.tooltipStatValue, { color: themeColors.accent }]}>
                    {formatCurrency(details.income)}
                  </Text>
                </View>
                <View style={dynamicStyles.tooltipStat}>
                  <Text style={[dynamicStyles.tooltipStatLabel, { color: themeColors.textSecondary }]}>Balance</Text>
                  <Text style={[dynamicStyles.tooltipStatValue, { color: details.balance >= 0 ? themeColors.accent : themeColors.secondary }]}>
                    {formatCurrency(details.balance)}
                  </Text>
                </View>
              </View>
              
              {details.categories.length > 0 && (
                <View style={dynamicStyles.tooltipCategories}>
                  <Text style={[dynamicStyles.tooltipSectionTitle, { color: themeColors.text }]}>Gastos por categoría:</Text>
                  {details.categories.map((cat, idx) => (
                    <View key={idx} style={dynamicStyles.tooltipCategory}>
                      <View style={[dynamicStyles.tooltipCategoryColor, { backgroundColor: cat.color }]} />
                      <Text style={[dynamicStyles.tooltipCategoryText, { color: themeColors.text }]}>
                        {cat.icon} {cat.name}: {formatCurrency(cat.amount)} ({cat.count} {cat.count === 1 ? 'transacción' : 'transacciones'})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })()}
      
      {/* Quincenal Summaries */}
      <View style={dynamicStyles.quincenalContainer}>
        <View style={[dynamicStyles.quincenalCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[dynamicStyles.quincenalTitle, { color: themeColors.text }]}>1ra Quincena (1-15)</Text>
          <View style={dynamicStyles.quincenalStats}>
            <View style={dynamicStyles.quincenalStat}>
              <Text style={[dynamicStyles.quincenalLabel, { color: themeColors.textSecondary }]}>Gastos</Text>
              <Text style={[dynamicStyles.quincenalValue, { color: themeColors.secondary }]}>
                {formatCurrency(firstHalfTotal)}
              </Text>
            </View>
            <View style={dynamicStyles.quincenalStat}>
              <Text style={[dynamicStyles.quincenalLabel, { color: themeColors.textSecondary }]}>Ingresos</Text>
              <Text style={[dynamicStyles.quincenalValue, { color: themeColors.accent }]}>
                {formatCurrency(firstHalfIncome)}
              </Text>
            </View>
            <View style={dynamicStyles.quincenalStat}>
              <Text style={[dynamicStyles.quincenalLabel, { color: themeColors.textSecondary }]}>Balance</Text>
              <Text style={[dynamicStyles.quincenalValue, { color: (firstHalfIncome - firstHalfTotal) >= 0 ? themeColors.accent : themeColors.secondary }]}>
                {formatCurrency(firstHalfIncome - firstHalfTotal)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[dynamicStyles.quincenalCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[dynamicStyles.quincenalTitle, { color: themeColors.text }]}>2da Quincena (16-{dailyData.length})</Text>
          <View style={dynamicStyles.quincenalStats}>
            <View style={dynamicStyles.quincenalStat}>
              <Text style={[dynamicStyles.quincenalLabel, { color: themeColors.textSecondary }]}>Gastos</Text>
              <Text style={[dynamicStyles.quincenalValue, { color: themeColors.secondary }]}>
                {formatCurrency(secondHalfTotal)}
              </Text>
            </View>
            <View style={dynamicStyles.quincenalStat}>
              <Text style={[dynamicStyles.quincenalLabel, { color: themeColors.textSecondary }]}>Ingresos</Text>
              <Text style={[dynamicStyles.quincenalValue, { color: themeColors.accent }]}>
                {formatCurrency(secondHalfIncome)}
              </Text>
            </View>
            <View style={dynamicStyles.quincenalStat}>
              <Text style={[dynamicStyles.quincenalLabel, { color: themeColors.textSecondary }]}>Balance</Text>
              <Text style={[dynamicStyles.quincenalValue, { color: (secondHalfIncome - secondHalfTotal) >= 0 ? themeColors.accent : themeColors.secondary }]}>
                {formatCurrency(secondHalfIncome - secondHalfTotal)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={dynamicStyles.statsContainer}>
        <View style={dynamicStyles.statItem}>
          <Text style={dynamicStyles.statLabel}>Día (prom.)</Text>
          <Text style={[dynamicStyles.statValue, { color: themeColors.text }]}>
            {formatCurrency(avgDaily)}
          </Text>
        </View>
        <View style={dynamicStyles.statItem}>
          <Text style={dynamicStyles.statLabel}>Hoy</Text>
          <Text style={[dynamicStyles.statValue, { color: themeColors.text }]}>
            {formatCurrency(todayData.expenses)}
          </Text>
        </View>
        <View style={dynamicStyles.statItem}>
          <Text style={dynamicStyles.statLabel}>Semana</Text>
          <Text style={[dynamicStyles.statValue, { color: themeColors.text }]}>
            {formatCurrency(weekTotal)}
          </Text>
        </View>
      </View>
    </View>
  );
}
