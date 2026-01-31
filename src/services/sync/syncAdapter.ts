import { DatabaseAdapter } from '../database/adapter.interface';
import { getDatabase } from '../database/adapter';
import { addToSyncQueue } from './syncService';

/**
 * Wrapper adapter that adds sync queue tracking to any database adapter
 */
export class SyncTrackingAdapter implements DatabaseAdapter {
  constructor(private baseAdapter: DatabaseAdapter) {}

  get transactions() {
    return this.wrapRepository(this.baseAdapter.transactions, 'transactions');
  }

  get categories() {
    return this.wrapRepository(this.baseAdapter.categories, 'categories');
  }

  get fixedExpenses() {
    return this.wrapRepository(this.baseAdapter.fixedExpenses, 'fixed_expenses');
  }

  get installmentPurchases() {
    return this.wrapRepository(this.baseAdapter.installmentPurchases, 'installment_purchases');
  }

  get installmentPayments() {
    return this.wrapRepository(this.baseAdapter.installmentPayments, 'installment_payments');
  }

  get assets() {
    return this.wrapRepository(this.baseAdapter.assets, 'assets');
  }

  get liabilities() {
    return this.wrapRepository(this.baseAdapter.liabilities, 'liabilities');
  }

  get investments() {
    return this.wrapRepository(this.baseAdapter.investments, 'investments');
  }

  get investmentOpportunities() {
    return this.wrapRepository(this.baseAdapter.investmentOpportunities, 'investment_opportunities');
  }

  get creditCards() {
    return this.wrapRepository(this.baseAdapter.creditCards, 'credit_cards');
  }

  get recurringExpenses() {
    return this.wrapRepository(this.baseAdapter.recurringExpenses, 'recurring_expenses');
  }

  async initialize(): Promise<void> {
    return this.baseAdapter.initialize();
  }

  private wrapRepository<T extends { id: string }>(
    repository: any,
    tableName: string
  ): any {
    return {
      ...repository,
      create: async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
        const result = await repository.create(data);
        await addToSyncQueue(tableName, 'create', result.id, result);
        return result;
      },
      update: async (id: string, data: Partial<T>) => {
        const result = await repository.update(id, data);
        await addToSyncQueue(tableName, 'update', id, result);
        return result;
      },
      delete: async (id: string) => {
        await repository.delete(id);
        await addToSyncQueue(tableName, 'delete', id);
      },
      // Pass through other methods unchanged
      getAll: repository.getAll.bind(repository),
      getById: repository.getById.bind(repository),
      getByDateRange: repository.getByDateRange?.bind(repository),
      getByTags: repository.getByTags?.bind(repository),
      getByPurchaseId: repository.getByPurchaseId?.bind(repository),
      getPending: repository.getPending?.bind(repository),
      getActive: repository.getActive?.bind(repository),
    };
  }
}

// Export a function to get the sync-enabled database
export async function getSyncDatabase(): Promise<DatabaseAdapter> {
  const baseAdapter = await getDatabase();
  return new SyncTrackingAdapter(baseAdapter);
}
