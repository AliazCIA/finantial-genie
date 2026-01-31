import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, addMonths, subMonths, isSameMonth, isAfter, startOfMonth, parseISO, getYear, getMonth } from 'date-fns';
import { useTheme, getThemeColors } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { TransactionSchema } from '../services/database/schema';

interface MonthSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  transactions?: TransactionSchema[]; // Transacciones para determinar el rango máximo
}

export default function MonthSelector({ selectedDate, onDateChange, transactions = [] }: MonthSelectorProps) {
  const { theme } = useTheme();
  const themeColors = getThemeColors(theme);
  const currentDate = new Date();
  const currentMonthStart = startOfMonth(currentDate);
  const selectedMonthStart = startOfMonth(selectedDate);
  
  const isCurrentMonth = isSameMonth(selectedDate, currentDate);
  
  // Calcular el mes máximo con transacciones (incluyendo futuras)
  const maxMonthWithTransactions = React.useMemo(() => {
    if (transactions.length === 0) {
      return currentMonthStart;
    }
    
    let maxDate = currentMonthStart;
    transactions.forEach(txn => {
      const txnDate = parseISO(txn.date);
      const txnMonthStart = startOfMonth(txnDate);
      if (isAfter(txnMonthStart, maxDate) || isSameMonth(txnDate, maxDate)) {
        maxDate = txnMonthStart;
      }
    });
    
    return maxDate;
  }, [transactions, currentMonthStart]);
  
  const canGoToFuture = isAfter(maxMonthWithTransactions, currentMonthStart) || isSameMonth(maxMonthWithTransactions, currentMonthStart);
  const isFutureMonth = isAfter(selectedMonthStart, currentMonthStart);
  const isWithinAllowedRange = !isAfter(selectedMonthStart, maxMonthWithTransactions);

  const handlePreviousMonth = () => {
    const previousMonth = subMonths(selectedDate, 1);
    onDateChange(previousMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedDate, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    // Permitir ir a meses futuros si hay transacciones en esos meses
    if (!isAfter(nextMonthStart, maxMonthWithTransactions)) {
      onDateChange(nextMonth);
    }
  };
  
  // Verificar si se puede avanzar al siguiente mes
  const canGoNext = () => {
    const nextMonth = addMonths(selectedDate, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    return !isAfter(nextMonthStart, maxMonthWithTransactions);
  };

  const handleToday = () => {
    onDateChange(new Date());
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <TouchableOpacity onPress={handlePreviousMonth} style={[styles.button, { borderColor: themeColors.border }]}>
        <Text style={[styles.buttonText, { color: themeColors.text }]}>‹</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleToday} style={styles.monthContainer}>
        <Text style={[styles.monthText, { color: themeColors.text }]}>
          {format(selectedDate, 'MMMM yyyy')}
        </Text>
        {isCurrentMonth && (
          <Text style={[styles.todayText, { color: themeColors.textSecondary }]}>Hoy</Text>
        )}
        {isFutureMonth && isWithinAllowedRange && (
          <Text style={[styles.todayText, { color: themeColors.primary }]}>Futuro</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleNextMonth} 
        disabled={!canGoNext()}
        style={[
          styles.button, 
          { 
            borderColor: themeColors.border,
            opacity: canGoNext() ? 1 : 0.4,
          }
        ]}
      >
        <Text style={[styles.buttonText, { color: themeColors.text }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  monthText: {
    ...typography.body,
    fontWeight: '600',
    textTransform: 'capitalize',
    fontSize: 14,
  },
  todayText: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
    fontSize: 10,
  },
});

