import { useState } from 'react';
import { processStatement, ExtractedTransaction, BillingPeriod, getLambdaEndpoint } from '../services/statementProcessor';
import { useTransactions } from './useTransactions';
import { useCreditCards } from './useCreditCards';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { TransactionSchema } from '../services/database/schema';
import { getDatabase } from '../services/database/adapter';
import { format, parseISO, isWithinInterval } from 'date-fns';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingTransaction?: TransactionSchema;
  reason?: string;
}

/**
 * Hook to process credit card statements and detect duplicates
 */
export const useStatementProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const { transactions, refresh: loadTransactions } = useTransactions();
  const { creditCards } = useCreditCards();

  /**
   * Process a statement PDF file
   */
  const processStatementFile = async (
    pdfFile: File | string,
    creditCardId: string,
    billingPeriod: BillingPeriod
  ) => {
    try {
      setProcessing(true);
      setError(null);
      setExtractedTransactions([]);

      // Find credit card details
      const creditCard = creditCards.find(card => card.id === creditCardId);
      if (!creditCard) {
        throw new Error('Credit card not found');
      }

      const lambdaEndpoint = getLambdaEndpoint();
      const result = await processStatement(
        pdfFile,
        creditCardId,
        creditCard.name,
        creditCard.cutDate,
        billingPeriod,
        lambdaEndpoint
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process statement');
      }

      setExtractedTransactions(result.transactions || []);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Check if a transaction is a duplicate
   * 
   * Checks for duplicates based on:
   * - Same date (within 1 day tolerance)
   * - Same amount (within 0.01 tolerance)
   * - Similar description (fuzzy match)
   * - Same credit card
   */
  const checkDuplicate = async (
    transaction: ExtractedTransaction,
    creditCardId: string
  ): Promise<DuplicateCheckResult> => {
    const transactionDate = parseISO(transaction.date);
    const amountTolerance = 0.01;
    const dateTolerance = 1; // days

    console.log('[checkDuplicate] Checking transaction:', {
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      creditCardId,
    });

    // Find potential duplicates
    const potentialDuplicates = transactions.filter(txn => {
      // Must be same credit card
      if (txn.creditCardId !== creditCardId) return false;

      // Check amount (within tolerance)
      const amountDiff = Math.abs(txn.amount - transaction.amount);
      if (amountDiff > amountTolerance) return false;

      // Check date (within tolerance)
      const txnDate = parseISO(txn.date);
      const daysDiff = Math.abs(
        (transactionDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > dateTolerance) return false;

      return true;
    });

    console.log('[checkDuplicate] Found potential duplicates:', potentialDuplicates.length);

    if (potentialDuplicates.length === 0) {
      console.log('[checkDuplicate] No duplicates found');
      return { isDuplicate: false };
    }

    // Check description similarity
    const normalizedDescription = normalizeDescription(transaction.description);
    const similarTxn = potentialDuplicates.find(txn => {
      const txnDescription = normalizeDescription(txn.description);
      const isSimilar = areDescriptionsSimilar(normalizedDescription, txnDescription);
      if (isSimilar) {
        console.log('[checkDuplicate] Found similar transaction:', {
          new: transaction.description,
          existing: txn.description,
        });
      }
      return isSimilar;
    });

    if (similarTxn) {
      console.log('[checkDuplicate] Duplicate confirmed');
      return {
        isDuplicate: true,
        existingTransaction: similarTxn,
        reason: `Duplicate found: ${similarTxn.description} on ${format(parseISO(similarTxn.date), 'MMM dd, yyyy')}`,
      };
    }

    console.log('[checkDuplicate] No similar description found, not a duplicate');
    return { isDuplicate: false };
  };

  /**
   * Check all extracted transactions for duplicates
   */
  const checkAllDuplicates = async (
    transactions: ExtractedTransaction[],
    creditCardId: string
  ): Promise<Map<number, DuplicateCheckResult>> => {
    const results = new Map<number, DuplicateCheckResult>();
    
    for (let i = 0; i < transactions.length; i++) {
      const result = await checkDuplicate(transactions[i], creditCardId);
      results.set(i, result);
    }

    return results;
  };

  /**
   * Save non-duplicate transactions to database
   */
  const saveTransactions = async (
    transactions: ExtractedTransaction[],
    creditCardId: string,
    duplicateResults: Map<number, DuplicateCheckResult>
  ): Promise<{ saved: number; skipped: number }> => {
    const db = await getDatabase();
    let saved = 0;
    let skipped = 0;

    console.log('[saveTransactions] Starting save process...');
    console.log('[saveTransactions] Total transactions:', transactions.length);
    console.log('[saveTransactions] Duplicate results:', Array.from(duplicateResults.entries()).map(([i, r]) => ({ index: i, isDuplicate: r.isDuplicate })));

    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      const duplicateResult = duplicateResults.get(i);

      if (duplicateResult?.isDuplicate) {
        console.log(`[saveTransactions] Skipping duplicate transaction ${i}:`, txn.description);
        skipped++;
        continue;
      }

      // Find category ID
      const category = DEFAULT_CATEGORIES.find(
        cat => cat.name.toLowerCase() === txn.category.toLowerCase()
      );
      const categoryId = category?.id || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1].id; // Default to "Otros"

      try {
        console.log(`[saveTransactions] Saving transaction ${i}:`, {
          description: txn.description,
          amount: txn.amount,
          date: txn.date,
          creditCardId,
          categoryId,
        });
        
        // Verify date is valid
        const transactionDate = parseISO(txn.date);
        if (isNaN(transactionDate.getTime())) {
          console.error(`[saveTransactions] Invalid date for transaction ${i}:`, txn.date);
          skipped++;
          continue;
        }
        
        const created = await db.transactions.create({
          type: 'expense',
          amount: txn.amount,
          description: txn.description,
          tags: [categoryId],
          date: txn.date,
          isRecurring: false,
          creditCardId,
        });
        
        console.log(`[saveTransactions] Transaction ${i} saved successfully:`, {
          id: created.id,
          description: created.description,
          date: created.date,
          amount: created.amount,
          creditCardId: created.creditCardId,
          month: format(transactionDate, 'yyyy-MM'),
        });
        saved++;
      } catch (err) {
        console.error(`[saveTransactions] Error saving transaction ${i}:`, err);
        console.error(`[saveTransactions] Transaction data:`, txn);
        skipped++;
      }
    }

    console.log(`[saveTransactions] Save complete. Saved: ${saved}, Skipped: ${skipped}`);

    // Reload transactions to ensure UI is updated
    console.log('[saveTransactions] Reloading transactions...');
    await loadTransactions();
    console.log('[saveTransactions] Transactions reloaded');

    return { saved, skipped };
  };

  return {
    processing,
    error,
    extractedTransactions,
    processStatementFile,
    checkDuplicate,
    checkAllDuplicates,
    saveTransactions,
  };
};

/**
 * Normalize description for comparison
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if two descriptions are similar (fuzzy match)
 */
function areDescriptionsSimilar(desc1: string, desc2: string): boolean {
  const normalized1 = normalizeDescription(desc1);
  const normalized2 = normalizeDescription(desc2);

  // Exact match
  if (normalized1 === normalized2) return true;

  // Check if one contains the other (for partial matches)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Require at least 70% similarity for partial matches
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
    return shorter.length / longer.length >= 0.7;
  }

  // Calculate Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= 0.8; // 80% similarity threshold
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
