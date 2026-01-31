import { TransactionSchema } from '../database/schema';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  count: number;
}

export const analyzeExpensesByCategory = (
  transactions: TransactionSchema[],
  categories: { id: string; name: string }[],
  year?: number,
  month?: number
): CategoryExpense[] => {
  let filteredTransactions = transactions.filter(txn => txn.type === 'expense');

  // Filter by date if provided
  if (year && month) {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    filteredTransactions = filteredTransactions.filter(txn => {
      const txnDate = parseISO(txn.date);
      return isWithinInterval(txnDate, { start: monthStart, end: monthEnd });
    });
  }

  // Calculate total expenses
  const totalExpenses = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  // Group by category
  const categoryMap = new Map<string, { total: number; count: number; name: string }>();
  const NO_CATEGORY_KEY = '__no_category__';

  for (const txn of filteredTransactions) {
    // Check if transaction has tags
    if (!txn.tags || txn.tags.length === 0) {
      // Transaction has no categories - group under "Sin categoría"
      const existing = categoryMap.get(NO_CATEGORY_KEY) || { total: 0, count: 0, name: 'Sin categoría' };
      existing.total += txn.amount;
      existing.count += 1;
      categoryMap.set(NO_CATEGORY_KEY, existing);
    } else {
      // Transaction has tags - find valid categories
      const validCategories = txn.tags
        .map(tagId => categories.find(cat => cat.id === tagId))
        .filter((cat): cat is { id: string; name: string } => cat !== undefined);
      
      if (validCategories.length > 0) {
        // Transaction has at least one valid category - count it in each valid category
        for (const category of validCategories) {
          const existing = categoryMap.get(category.id) || { total: 0, count: 0, name: category.name };
          existing.total += txn.amount;
          existing.count += 1;
          categoryMap.set(category.id, existing);
        }
      } else {
        // All tags are invalid or don't exist - group under "Sin categoría" (count once)
        const existing = categoryMap.get(NO_CATEGORY_KEY) || { total: 0, count: 0, name: 'Sin categoría' };
        existing.total += txn.amount;
        existing.count += 1;
        categoryMap.set(NO_CATEGORY_KEY, existing);
      }
    }
  }

  // Convert to array and calculate percentages
  const results: CategoryExpense[] = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
    categoryId: categoryId === NO_CATEGORY_KEY ? NO_CATEGORY_KEY : categoryId,
    categoryName: data.name,
    total: data.total,
    percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    count: data.count,
  }));

  // Sort by total descending
  return results.sort((a, b) => b.total - a.total);
};

export const getTopCategories = (
  categoryExpenses: CategoryExpense[],
  limit: number = 5
): CategoryExpense[] => {
  return categoryExpenses.slice(0, limit);
};

export const compareMonthToMonth = (
  currentMonth: CategoryExpense[],
  previousMonth: CategoryExpense[]
): Array<CategoryExpense & { change: number; changePercentage: number }> => {
  const currentMap = new Map(currentMonth.map(cat => [cat.categoryId, cat]));
  const previousMap = new Map(previousMonth.map(cat => [cat.categoryId, cat]));

  const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()]);

  return Array.from(allCategories).map(categoryId => {
    const current = currentMap.get(categoryId) || { categoryId, total: 0, categoryName: '', percentage: 0, count: 0 };
    const previous = previousMap.get(categoryId) || { categoryId, total: 0, categoryName: '', percentage: 0, count: 0 };

    const change = current.total - previous.total;
    const changePercentage = previous.total > 0 ? (change / previous.total) * 100 : 0;

    return {
      ...current,
      categoryId, // Ensure categoryId is always present
      change,
      changePercentage,
    };
  });
};

