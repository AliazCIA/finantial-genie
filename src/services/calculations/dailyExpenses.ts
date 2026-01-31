import { TransactionSchema } from '../database/schema';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isWithinInterval, getDate } from 'date-fns';

export interface DailyExpense {
  day: number;
  date: string;
  expenses: number;
  income: number;
  balance: number;
}

export const calculateDailyExpenses = (
  transactions: TransactionSchema[],
  year: number,
  month: number
): DailyExpense[] => {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  
  // Get all days in the month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Filter transactions for this month
  const monthTransactions = transactions.filter(txn => {
    const txnDate = parseISO(txn.date);
    return isWithinInterval(txnDate, { start: monthStart, end: monthEnd });
  });
  
  // Initialize daily data
  const dailyData: Map<number, { expenses: number; income: number }> = new Map();
  
  // Initialize all days with zero
  daysInMonth.forEach(day => {
    const dayNum = getDate(day);
    dailyData.set(dayNum, { expenses: 0, income: 0 });
  });
  
  // Aggregate transactions by day
  monthTransactions.forEach(txn => {
    const txnDate = parseISO(txn.date);
    const dayNum = getDate(txnDate);
    const dayData = dailyData.get(dayNum) || { expenses: 0, income: 0 };
    
    if (txn.type === 'expense') {
      dayData.expenses += txn.amount;
    } else if (txn.type === 'income') {
      dayData.income += txn.amount;
    }
    
    dailyData.set(dayNum, dayData);
  });
  
  // Convert to array and calculate balance
  const result: DailyExpense[] = daysInMonth.map(day => {
    const dayNum = getDate(day);
    const data = dailyData.get(dayNum) || { expenses: 0, income: 0 };
    
    return {
      day: dayNum,
      date: format(day, 'yyyy-MM-dd'),
      expenses: data.expenses,
      income: data.income,
      balance: data.income - data.expenses,
    };
  });
  
  return result;
};
