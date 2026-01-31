import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../services/database/adapter';
import { TransactionSchema } from '../services/database/schema';
import { generateAllRecurringTransactions, generateRecurringTransactions } from '../services/recurringTransactions';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<TransactionSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const data = await db.transactions.getAll();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error('[loadTransactions] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    
    // Generar transacciones recurrentes pendientes al cargar
    const generateRecurring = async () => {
      try {
        await generateAllRecurringTransactions();
        // Recargar después de generar para mostrar las nuevas transacciones
        await loadTransactions();
      } catch (err) {
        console.error('Error generating recurring transactions on load:', err);
      }
    };
    
    generateRecurring();
  }, [loadTransactions]);

  const createTransaction = async (data: Omit<TransactionSchema, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const db = await getDatabase();
      const newTransaction = await db.transactions.create(data);
      
      // Si es una transacción recurrente, generar las transacciones futuras
      if (newTransaction.isRecurring && newTransaction.recurrencePeriod && newTransaction.recurrenceStartDate) {
        try {
          await generateRecurringTransactions(newTransaction);
        } catch (recurringErr) {
          console.error('Error generating recurring transactions:', recurringErr);
          // No fallar la creación si hay error en la generación de recurrentes
        }
      }
      
      await loadTransactions(); // Reload to ensure consistency
      return newTransaction;
    } catch (err) {
      console.error('Error creating transaction:', err);
      throw new Error(err instanceof Error ? err.message : 'Error al crear transacción');
    }
  };

  const updateTransaction = async (id: string, data: Partial<TransactionSchema>) => {
    try {
      const db = await getDatabase();
      const updated = await db.transactions.update(id, data);
      setTransactions(prev => prev.map(txn => txn.id === id ? updated : txn));
      return updated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al actualizar transacción');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      console.log('[deleteTransaction] Starting delete for id:', id);
      const db = await getDatabase();
      console.log('[deleteTransaction] Database obtained');
      
      // Verify the transaction exists before deleting
      const existing = await db.transactions.getById(id);
      console.log('[deleteTransaction] Existing transaction:', existing);
      
      if (!existing) {
        console.error('[deleteTransaction] Transaction not found:', id);
        throw new Error('Transacción no encontrada');
      }
      
      console.log('[deleteTransaction] Transaction found, calling delete...');
      await db.transactions.delete(id);
      console.log('[deleteTransaction] Delete call completed');
      
      // Update local state immediately
      console.log('[deleteTransaction] Updating local state, current count:', transactions.length);
      setTransactions(prev => {
        const filtered = prev.filter(txn => txn.id !== id);
        console.log('[deleteTransaction] Previous count:', prev.length, 'New count:', filtered.length);
        return filtered;
      });
      
      // Reload to ensure consistency
      console.log('[deleteTransaction] Reloading transactions...');
      await loadTransactions();
      console.log('[deleteTransaction] Complete');
    } catch (err) {
      console.error('[deleteTransaction] Error:', err);
      console.error('[deleteTransaction] Error stack:', err instanceof Error ? err.stack : 'No stack');
      throw new Error(err instanceof Error ? err.message : 'Error al eliminar transacción');
    }
  };

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: loadTransactions,
  };
};

