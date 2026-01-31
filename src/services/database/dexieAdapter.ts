import Dexie, { Table } from 'dexie';
import { DEFAULT_CATEGORIES } from '../../utils/categories';
import {
  DatabaseAdapter,
  TransactionRepository,
  CategoryRepository,
  FixedExpenseRepository,
  InstallmentPurchaseRepository,
  InstallmentPaymentRepository,
  AssetRepository,
  LiabilityRepository,
  InvestmentRepository,
  InvestmentOpportunityRepository,
  CreditCardRepository,
  RecurringExpenseRepository,
} from './adapter.interface';
import {
  TransactionSchema,
  CategorySchema,
  FixedExpenseSchema,
  InstallmentPurchaseSchema,
  InstallmentPaymentSchema,
  AssetSchema,
  LiabilitySchema,
  InvestmentSchema,
  InvestmentOpportunitySchema,
  CreditCardSchema,
  RecurringExpenseSchema,
} from './schema';

class FinancialGenieDB extends Dexie {
  transactions!: Table<TransactionSchema>;
  categories!: Table<CategorySchema>;
  fixedExpenses!: Table<FixedExpenseSchema>;
  installmentPurchases!: Table<InstallmentPurchaseSchema>;
  installmentPayments!: Table<InstallmentPaymentSchema>;
  assets!: Table<AssetSchema>;
  liabilities!: Table<LiabilitySchema>;
  investments!: Table<InvestmentSchema>;
  investmentOpportunities!: Table<InvestmentOpportunitySchema>;
  creditCards!: Table<CreditCardSchema>;
  recurringExpenses!: Table<RecurringExpenseSchema>;

  constructor() {
    super('FinancialGenieDB');
    
    // Version 1: Initial schema
    this.version(1).stores({
      transactions: 'id, date, type, *tags',
      categories: 'id',
      fixedExpenses: 'id, startDate',
      installmentPurchases: 'id, startDate',
      installmentPayments: 'id, installmentPurchaseId, dueDate, status',
      assets: 'id',
      liabilities: 'id',
      investments: 'id',
      investmentOpportunities: 'id, isActive',
    });
    
    // Version 2: Added credit cards and creditCardId fields
    this.version(2).stores({
      transactions: 'id, date, type, *tags, creditCardId',
      categories: 'id',
      fixedExpenses: 'id, startDate',
      installmentPurchases: 'id, startDate, creditCardId',
      installmentPayments: 'id, installmentPurchaseId, dueDate, status',
      assets: 'id',
      liabilities: 'id',
      investments: 'id',
      investmentOpportunities: 'id, isActive',
      creditCards: 'id, isActive',
    }).upgrade(async (tx) => {
      // Migration: Add default values for new fields
      const transactions = await tx.table('transactions').toCollection().toArray();
      for (const txn of transactions) {
        if (txn.creditCardId === undefined) {
          await tx.table('transactions').update(txn.id, { creditCardId: null });
        }
      }
      
      const purchases = await tx.table('installmentPurchases').toCollection().toArray();
      for (const purchase of purchases) {
        if (purchase.creditCardId === undefined) {
          await tx.table('installmentPurchases').update(purchase.id, { creditCardId: null });
        }
      }
    });
    
    // Version 3: Add color field to credit cards
    this.version(3).stores({
      transactions: 'id, date, type, *tags, creditCardId',
      categories: 'id',
      fixedExpenses: 'id, startDate',
      installmentPurchases: 'id, startDate, creditCardId',
      installmentPayments: 'id, installmentPurchaseId, dueDate, status',
      assets: 'id',
      liabilities: 'id',
      investments: 'id',
      investmentOpportunities: 'id, isActive',
      creditCards: 'id, isActive',
    }).upgrade(async (tx) => {
      // Migration: Add default color to existing credit cards
      const creditCards = await tx.table('creditCards').toCollection().toArray();
      const defaultColors = ['#3949ab', '#ff9800', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548'];
      let colorIndex = 0;
      
      for (const card of creditCards) {
        if (!card.color || card.color === undefined) {
          const color = defaultColors[colorIndex % defaultColors.length];
          await tx.table('creditCards').update(card.id, { color });
          colorIndex++;
        }
      }
      
      // Also ensure transactions and purchases have null for creditCardId if undefined
      const transactions = await tx.table('transactions').toCollection().toArray();
      for (const txn of transactions) {
        if (txn.creditCardId === undefined) {
          await tx.table('transactions').update(txn.id, { creditCardId: null });
        }
      }
      
      const purchases = await tx.table('installmentPurchases').toCollection().toArray();
      for (const purchase of purchases) {
        if (purchase.creditCardId === undefined) {
          await tx.table('installmentPurchases').update(purchase.id, { creditCardId: null });
        }
      }
    });
    
    // Version 4: Add recurring expenses
    this.version(4).stores({
      transactions: 'id, date, type, *tags, creditCardId',
      categories: 'id',
      fixedExpenses: 'id, startDate',
      installmentPurchases: 'id, startDate, creditCardId',
      installmentPayments: 'id, installmentPurchaseId, dueDate, status',
      assets: 'id',
      liabilities: 'id',
      investments: 'id',
      investmentOpportunities: 'id, isActive',
      creditCards: 'id, isActive',
      recurringExpenses: 'id, startDate, isActive',
    });

    // Version 5: Added recurrence fields to transactions
    this.version(5).stores({
      transactions: 'id, date, type, *tags, creditCardId, parentRecurringId',
      categories: 'id',
      fixedExpenses: 'id, startDate',
      installmentPurchases: 'id, startDate, creditCardId',
      installmentPayments: 'id, installmentPurchaseId, dueDate, status',
      assets: 'id',
      liabilities: 'id',
      investments: 'id',
      investmentOpportunities: 'id, isActive',
      creditCards: 'id, isActive',
      recurringExpenses: 'id, startDate, isActive',
    }).upgrade(async (tx) => {
      // Migration: Add default values for new recurrence fields
      const transactions = await tx.table('transactions').toCollection().toArray();
      for (const txn of transactions) {
        const updates: any = {};
        if (txn.recurrencePeriod === undefined) {
          updates.recurrencePeriod = null;
        }
        if (txn.recurrenceStartDate === undefined) {
          updates.recurrenceStartDate = null;
        }
        if (txn.parentRecurringId === undefined) {
          updates.parentRecurringId = null;
        }
        if (Object.keys(updates).length > 0) {
          await tx.table('transactions').update(txn.id, updates);
        }
      }
    });
  }
}

class DexieTransactionRepository implements TransactionRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<TransactionSchema[]> {
    return this.db.transactions.toArray();
  }

  async getById(id: string): Promise<TransactionSchema | null> {
    return (await this.db.transactions.get(id)) || null;
  }

  async create(data: Omit<TransactionSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<TransactionSchema> {
    const now = new Date().toISOString();
    const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: TransactionSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.transactions.add(record);
    return record;
  }

  async update(id: string, data: Partial<TransactionSchema>): Promise<TransactionSchema> {
    const existing = await this.db.transactions.get(id);
    if (!existing) throw new Error('Transaction not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.transactions.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    try {
      console.log('[DexieAdapter.delete] Starting delete for id:', id);
      // Try to get the record first to verify it exists
      const record = await this.db.transactions.get(id);
      console.log('[DexieAdapter.delete] Record found:', record);
      
      if (!record) {
        console.error('[DexieAdapter.delete] Record not found for id:', id);
        throw new Error(`Transaction with id ${id} not found`);
      }
      
      // Delete using the primary key
      console.log('[DexieAdapter.delete] Calling db.transactions.delete...');
      await this.db.transactions.delete(id);
      console.log('[DexieAdapter.delete] Delete completed');
      
      // Verify deletion
      const verify = await this.db.transactions.get(id);
      console.log('[DexieAdapter.delete] Verification after delete:', verify);
      
      if (verify) {
        console.error('[DexieAdapter.delete] Record still exists after delete!');
        throw new Error('Failed to delete transaction');
      }
      
      console.log('[DexieAdapter.delete] Delete verified successfully');
    } catch (err) {
      console.error('[DexieAdapter.delete] Error:', err);
      throw err;
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<TransactionSchema[]> {
    return this.db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async getByTags(tags: string[]): Promise<TransactionSchema[]> {
    return this.db.transactions
      .filter(txn => tags.some(tag => txn.tags.includes(tag)))
      .toArray();
  }
}

class DexieCategoryRepository implements CategoryRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<CategorySchema[]> {
    return this.db.categories.toArray();
  }

  async getById(id: string): Promise<CategorySchema | null> {
    return (await this.db.categories.get(id)) || null;
  }

  async create(data: Omit<CategorySchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<CategorySchema> {
    const now = new Date().toISOString();
    const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: CategorySchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.categories.add(record);
    return record;
  }

  async update(id: string, data: Partial<CategorySchema>): Promise<CategorySchema> {
    const existing = await this.db.categories.get(id);
    if (!existing) throw new Error('Category not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.categories.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.categories.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Category with id ${id} not found`);
    }
  }
}

class DexieFixedExpenseRepository implements FixedExpenseRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<FixedExpenseSchema[]> {
    return this.db.fixedExpenses.toArray();
  }

  async getById(id: string): Promise<FixedExpenseSchema | null> {
    return (await this.db.fixedExpenses.get(id)) || null;
  }

  async create(data: Omit<FixedExpenseSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<FixedExpenseSchema> {
    const now = new Date().toISOString();
    const id = `fixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: FixedExpenseSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.fixedExpenses.add(record);
    return record;
  }

  async update(id: string, data: Partial<FixedExpenseSchema>): Promise<FixedExpenseSchema> {
    const existing = await this.db.fixedExpenses.get(id);
    if (!existing) throw new Error('Fixed expense not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.fixedExpenses.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.fixedExpenses.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Fixed expense with id ${id} not found`);
    }
  }
}

class DexieInstallmentPurchaseRepository implements InstallmentPurchaseRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<InstallmentPurchaseSchema[]> {
    return this.db.installmentPurchases.toArray();
  }

  async getById(id: string): Promise<InstallmentPurchaseSchema | null> {
    return (await this.db.installmentPurchases.get(id)) || null;
  }

  async create(data: Omit<InstallmentPurchaseSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstallmentPurchaseSchema> {
    const now = new Date().toISOString();
    const id = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: InstallmentPurchaseSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.installmentPurchases.add(record);
    return record;
  }

  async update(id: string, data: Partial<InstallmentPurchaseSchema>): Promise<InstallmentPurchaseSchema> {
    const existing = await this.db.installmentPurchases.get(id);
    if (!existing) throw new Error('Installment purchase not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.installmentPurchases.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Also delete related payments
    await this.db.installmentPayments.where('installmentPurchaseId').equals(id).delete();
    const count = await this.db.installmentPurchases.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Installment purchase with id ${id} not found`);
    }
  }
}

class DexieInstallmentPaymentRepository implements InstallmentPaymentRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<InstallmentPaymentSchema[]> {
    return this.db.installmentPayments.toArray();
  }

  async getByPurchaseId(purchaseId: string): Promise<InstallmentPaymentSchema[]> {
    return this.db.installmentPayments.where('installmentPurchaseId').equals(purchaseId).toArray();
  }

  async getById(id: string): Promise<InstallmentPaymentSchema | null> {
    return (await this.db.installmentPayments.get(id)) || null;
  }

  async create(data: Omit<InstallmentPaymentSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstallmentPaymentSchema> {
    const now = new Date().toISOString();
    const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: InstallmentPaymentSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.installmentPayments.add(record);
    return record;
  }

  async update(id: string, data: Partial<InstallmentPaymentSchema>): Promise<InstallmentPaymentSchema> {
    const existing = await this.db.installmentPayments.get(id);
    if (!existing) throw new Error('Installment payment not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.installmentPayments.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.installmentPayments.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Installment payment with id ${id} not found`);
    }
  }

  async getPending(): Promise<InstallmentPaymentSchema[]> {
    return this.db.installmentPayments.where('status').equals('pending').toArray();
  }
}

class DexieAssetRepository implements AssetRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<AssetSchema[]> {
    return this.db.assets.toArray();
  }

  async getById(id: string): Promise<AssetSchema | null> {
    return (await this.db.assets.get(id)) || null;
  }

  async create(data: Omit<AssetSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetSchema> {
    const now = new Date().toISOString();
    const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: AssetSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.assets.add(record);
    return record;
  }

  async update(id: string, data: Partial<AssetSchema>): Promise<AssetSchema> {
    const existing = await this.db.assets.get(id);
    if (!existing) throw new Error('Asset not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.assets.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.assets.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Asset with id ${id} not found`);
    }
  }
}

class DexieLiabilityRepository implements LiabilityRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<LiabilitySchema[]> {
    return this.db.liabilities.toArray();
  }

  async getById(id: string): Promise<LiabilitySchema | null> {
    return (await this.db.liabilities.get(id)) || null;
  }

  async create(data: Omit<LiabilitySchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<LiabilitySchema> {
    const now = new Date().toISOString();
    const id = `liab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: LiabilitySchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.liabilities.add(record);
    return record;
  }

  async update(id: string, data: Partial<LiabilitySchema>): Promise<LiabilitySchema> {
    const existing = await this.db.liabilities.get(id);
    if (!existing) throw new Error('Liability not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.liabilities.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.liabilities.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Liability with id ${id} not found`);
    }
  }
}

class DexieInvestmentRepository implements InvestmentRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<InvestmentSchema[]> {
    return this.db.investments.toArray();
  }

  async getById(id: string): Promise<InvestmentSchema | null> {
    return (await this.db.investments.get(id)) || null;
  }

  async create(data: Omit<InvestmentSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvestmentSchema> {
    const now = new Date().toISOString();
    const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: InvestmentSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.investments.add(record);
    return record;
  }

  async update(id: string, data: Partial<InvestmentSchema>): Promise<InvestmentSchema> {
    const existing = await this.db.investments.get(id);
    if (!existing) throw new Error('Investment not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.investments.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.investments.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Investment with id ${id} not found`);
    }
  }
}

class DexieInvestmentOpportunityRepository implements InvestmentOpportunityRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<InvestmentOpportunitySchema[]> {
    return this.db.investmentOpportunities.toArray();
  }

  async getActive(): Promise<InvestmentOpportunitySchema[]> {
    return this.db.investmentOpportunities.filter((item) => item.isActive === true).toArray();
  }

  async getById(id: string): Promise<InvestmentOpportunitySchema | null> {
    return (await this.db.investmentOpportunities.get(id)) || null;
  }

  async create(data: Omit<InvestmentOpportunitySchema, 'id' | 'createdAt'>): Promise<InvestmentOpportunitySchema> {
    const now = new Date().toISOString();
    const id = `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: InvestmentOpportunitySchema = {
      ...data,
      id,
      createdAt: now,
    };
    await this.db.investmentOpportunities.add(record);
    return record;
  }

  async update(id: string, data: Partial<InvestmentOpportunitySchema>): Promise<InvestmentOpportunitySchema> {
    const existing = await this.db.investmentOpportunities.get(id);
    if (!existing) throw new Error('Investment opportunity not found');
    const updated = { ...existing, ...data };
    await this.db.investmentOpportunities.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.investmentOpportunities.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Investment opportunity with id ${id} not found`);
    }
  }
}

class DexieCreditCardRepository implements CreditCardRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<CreditCardSchema[]> {
    return this.db.creditCards.toArray();
  }

  async getActive(): Promise<CreditCardSchema[]> {
    return this.db.creditCards.filter((item) => item.isActive === true).toArray();
  }

  async getById(id: string): Promise<CreditCardSchema | null> {
    return (await this.db.creditCards.get(id)) || null;
  }

  async create(data: Omit<CreditCardSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCardSchema> {
    const now = new Date().toISOString();
    const id = `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: CreditCardSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.creditCards.add(record);
    return record;
  }

  async update(id: string, data: Partial<CreditCardSchema>): Promise<CreditCardSchema> {
    const existing = await this.db.creditCards.get(id);
    if (!existing) throw new Error('Credit card not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.creditCards.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.creditCards.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Credit card with id ${id} not found`);
    }
  }
}

class DexieRecurringExpenseRepository implements RecurringExpenseRepository {
  constructor(private db: FinancialGenieDB) {}

  async getAll(): Promise<RecurringExpenseSchema[]> {
    return this.db.recurringExpenses.toArray();
  }

  async getActive(): Promise<RecurringExpenseSchema[]> {
    return this.db.recurringExpenses.filter((item) => item.isActive === true).toArray();
  }

  async getById(id: string): Promise<RecurringExpenseSchema | null> {
    return (await this.db.recurringExpenses.get(id)) || null;
  }

  async create(data: Omit<RecurringExpenseSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringExpenseSchema> {
    const now = new Date().toISOString();
    const id = `recur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: RecurringExpenseSchema = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.recurringExpenses.add(record);
    return record;
  }

  async update(id: string, data: Partial<RecurringExpenseSchema>): Promise<RecurringExpenseSchema> {
    const existing = await this.db.recurringExpenses.get(id);
    if (!existing) throw new Error('Recurring expense not found');
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this.db.recurringExpenses.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.db.recurringExpenses.where('id').equals(id).delete();
    if (count === 0) {
      throw new Error(`Recurring expense with id ${id} not found`);
    }
  }
}

export class DexieAdapter implements DatabaseAdapter {
  private db: FinancialGenieDB;

  transactions: TransactionRepository;
  categories: CategoryRepository;
  fixedExpenses: FixedExpenseRepository;
  installmentPurchases: InstallmentPurchaseRepository;
  installmentPayments: InstallmentPaymentRepository;
  assets: AssetRepository;
  liabilities: LiabilityRepository;
  investments: InvestmentRepository;
  investmentOpportunities: InvestmentOpportunityRepository;
  creditCards: CreditCardRepository;
  recurringExpenses: RecurringExpenseRepository;

  constructor() {
    this.db = new FinancialGenieDB();
    this.transactions = new DexieTransactionRepository(this.db);
    this.categories = new DexieCategoryRepository(this.db);
    this.fixedExpenses = new DexieFixedExpenseRepository(this.db);
    this.installmentPurchases = new DexieInstallmentPurchaseRepository(this.db);
    this.installmentPayments = new DexieInstallmentPaymentRepository(this.db);
    this.assets = new DexieAssetRepository(this.db);
    this.liabilities = new DexieLiabilityRepository(this.db);
    this.investments = new DexieInvestmentRepository(this.db);
    this.investmentOpportunities = new DexieInvestmentOpportunityRepository(this.db);
    this.creditCards = new DexieCreditCardRepository(this.db);
    this.recurringExpenses = new DexieRecurringExpenseRepository(this.db);
  }

  async initialize(): Promise<void> {
    // Dexie initializes automatically, but we can add default data here if needed
    const existingCategories = await this.categories.getAll();
    
    for (const cat of DEFAULT_CATEGORIES) {
      // Check if category already exists by name (since we're using generated IDs)
      const exists = existingCategories.some(ec => ec.name === cat.name);
      if (!exists) {
        await this.categories.create({
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isCustom: false,
        });
      }
    }
    
    // Ensure existing records have proper default values for new fields
    await this.migrateExistingData();
  }
  
  private async migrateExistingData(): Promise<void> {
    try {
      // Ensure all transactions have creditCardId as null if undefined
      const transactions = await this.transactions.getAll();
      for (const txn of transactions) {
        if ((txn as any).creditCardId === undefined) {
          await this.transactions.update(txn.id, { creditCardId: null });
        }
      }
      
      // Ensure all installment purchases have creditCardId as null if undefined
      const purchases = await this.installmentPurchases.getAll();
      for (const purchase of purchases) {
        if ((purchase as any).creditCardId === undefined) {
          await this.installmentPurchases.update(purchase.id, { creditCardId: null });
        }
      }
      
      // Ensure all credit cards have a color
      const creditCards = await this.creditCards.getAll();
      const defaultColors = ['#3949ab', '#ff9800', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#795548'];
      let colorIndex = 0;
      
      for (const card of creditCards) {
        if (!card.color || (card as any).color === undefined) {
          const color = defaultColors[colorIndex % defaultColors.length];
          await this.creditCards.update(card.id, { color });
          colorIndex++;
        }
      }
    } catch (error) {
      console.error('Error migrating existing data:', error);
      // Don't throw - migration errors shouldn't break the app
    }
  }
}

