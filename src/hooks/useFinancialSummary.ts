import { useState, useEffect } from 'react';
import { getDatabase } from '../services/database/adapter';
import { useTransactions } from './useTransactions';
import { useCreditCards } from './useCreditCards';
import { calculateMonthlySummary } from '../services/calculations/monthlySummary';
import { calculateNetWorth } from '../services/calculations/netWorth';
import { useInstallments } from './useInstallments';
import { calculateBiweeklyAvailability, getMonthlyIncome } from '../services/calculations/biweeklyAvailability';
import { getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { getPaymentsForCurrentMonth } from '../services/calculations/installmentCalculator';
import { calculateCreditCardExpenses } from '../services/calculations/creditCardExpenses';
import type { AssetSchema, LiabilitySchema, FixedExpenseSchema } from '../services/database/schema';

export const useFinancialSummary = () => {
  const { transactions } = useTransactions();
  const { creditCards } = useCreditCards();
  const { totalPending: installmentTotalPending, payments } = useInstallments();
  const [assets, setAssets] = useState<AssetSchema[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilitySchema[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await getDatabase();
        const [assetsData, liabilitiesData, fixedExpensesData] = await Promise.all([
          db.assets.getAll(),
          db.liabilities.getAll(),
          db.fixedExpenses.getAll(),
        ]);
        setAssets(assetsData);
        setLiabilities(liabilitiesData);
        setFixedExpenses(fixedExpensesData);
      } catch (err) {
        console.error('Error loading summary data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const currentYear = getYear(new Date());
  const currentMonth = getMonth(new Date()) + 1; // getMonth returns 0-11, we need 1-12

  const monthlySummary = calculateMonthlySummary(transactions, currentYear, currentMonth, creditCards);
  const netWorth = calculateNetWorth(assets, liabilities);
  const monthlyIncome = getMonthlyIncome(transactions, currentYear, currentMonth);

  // Get installment payments due this month
  const currentMonthPayments = getPaymentsForCurrentMonth(payments);
  const currentMonthDebt = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate credit card expenses by billing cycle
  const { purchases } = useInstallments();
  const creditCardExpenses = calculateCreditCardExpenses(
    transactions,
    payments,
    creditCards,
    purchases
  );

  // Calculate total amount due for credit cards this month
  const totalCreditCardDebt = creditCardExpenses
    .filter(summary => summary.isDueThisMonth)
    .reduce((sum, summary) => sum + summary.totalExpenses, 0);

  // Calculate biweekly availability for current period
  const biweeklyAvailability = calculateBiweeklyAvailability(
    monthlyIncome,
    fixedExpenses,
    [], // installment payments will be loaded separately
    currentYear,
    currentMonth,
    1 // First biweekly period
  );

  return {
    monthlySummary,
    netWorth,
    monthlyIncome,
    biweeklyAvailability,
    installmentTotalPending,
    currentMonthDebt,
    currentMonthPayments,
    creditCardExpenses,
    totalCreditCardDebt,
    loading,
  };
};

