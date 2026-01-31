import { useState, useEffect } from 'react';
import { getDatabase } from '../services/database/adapter';
import { useTransactions } from './useTransactions';
import { useInstallments } from './useInstallments';
import { calculateBiweeklyAvailability, getMonthlyIncome } from '../services/calculations/biweeklyAvailability';
import { getMonth, getYear } from 'date-fns';
import type { FixedExpenseSchema } from '../services/database/schema';

export const useBiweeklyAvailability = (period: 1 | 2 = 1) => {
  const { transactions } = useTransactions();
  const { payments } = useInstallments();
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFixedExpenses = async () => {
      try {
        const db = await getDatabase();
        const data = await db.fixedExpenses.getAll();
        setFixedExpenses(data);
      } catch (err) {
        console.error('Error loading fixed expenses:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFixedExpenses();
  }, []);

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()) + 1; // getMonth returns 0-11, we need 1-12
  const monthlyIncome = getMonthlyIncome(transactions, currentYear, currentMonth);

  const availability = calculateBiweeklyAvailability(
    monthlyIncome,
    fixedExpenses,
    payments,
    currentYear,
    currentMonth,
    period
  );

  return {
    availability,
    monthlyIncome: monthlyIncome / 2, // Biweekly income
    loading,
  };
};

