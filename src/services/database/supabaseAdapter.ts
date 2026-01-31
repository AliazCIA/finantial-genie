import type {
  AssetRepository,
  CategoryRepository,
  CreditCardRepository,
  DatabaseAdapter,
  FixedExpenseRepository,
  InstallmentPaymentRepository,
  InstallmentPurchaseRepository,
  InvestmentOpportunityRepository,
  InvestmentRepository,
  LiabilityRepository,
  RecurringExpenseRepository,
  TransactionRepository,
} from './adapter.interface';
import type {
  AssetSchema,
  CategorySchema,
  CreditCardSchema,
  FixedExpenseSchema,
  InstallmentPaymentSchema,
  InstallmentPurchaseSchema,
  InvestmentOpportunitySchema,
  InvestmentSchema,
  LiabilitySchema,
  RecurringExpenseSchema,
  TransactionSchema,
} from './schema';
import { supabase } from '../supabase/client';

type JsonRow = {
  id: string;
  user_id: string;
  data: any;
  created_at: string;
  updated_at: string;
};

function ensureSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

async function getUserId(): Promise<string> {
  const sb = ensureSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('No hay sesión activa');
  return data.user.id;
}

function toSchema<T extends { id: string; createdAt: string; updatedAt: string }>(row: JsonRow): T {
  return {
    ...row.data,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nowIso() {
  return new Date().toISOString();
}

class SupabaseJsonRepository<TSchema extends { id: string; createdAt: string; updatedAt: string }> {
  constructor(private table: string) {}

  async getAll(): Promise<TSchema[]> {
    const sb = ensureSupabase();
    const userId = await getUserId();
    const { data, error } = await sb.from(this.table).select('*').eq('user_id', userId);
    if (error) throw error;
    return (data as JsonRow[]).map((r) => toSchema<TSchema>(r));
  }

  async getById(id: string): Promise<TSchema | null> {
    const sb = ensureSupabase();
    const userId = await getUserId();
    const { data, error } = await sb.from(this.table).select('*').eq('user_id', userId).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toSchema<TSchema>(data as JsonRow);
  }

  async create(data: Omit<TSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<TSchema> {
    const sb = ensureSupabase();
    const userId = await getUserId();
    const createdAt = nowIso();
    const updatedAt = createdAt;
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const row = { id, user_id: userId, data, created_at: createdAt, updated_at: updatedAt };
    const { data: inserted, error } = await sb.from(this.table).insert(row).select('*').single();
    if (error) throw error;
    return toSchema<TSchema>(inserted as JsonRow);
  }

  async update(id: string, data: Partial<TSchema>): Promise<TSchema> {
    const sb = ensureSupabase();
    const userId = await getUserId();
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Item con id ${id} no existe`);
    const nextData = { ...existing, ...data };
    const updatedAt = nowIso();
    // Persist only the "data payload" (without id/createdAt/updatedAt)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = nextData as any;
    const row = { data: payload, updated_at: updatedAt };
    const { data: updated, error } = await sb
      .from(this.table)
      .update(row)
      .eq('user_id', userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toSchema<TSchema>(updated as JsonRow);
  }

  async delete(id: string): Promise<void> {
    const sb = ensureSupabase();
    const userId = await getUserId();
    const { error } = await sb.from(this.table).delete().eq('user_id', userId).eq('id', id);
    if (error) throw error;
  }
}

class SupabaseTransactionRepository extends SupabaseJsonRepository<TransactionSchema> implements TransactionRepository {
  constructor() {
    super('transactions');
  }

  async getByDateRange(startDate: string, endDate: string): Promise<TransactionSchema[]> {
    const all = await this.getAll();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return all.filter((t) => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });
  }

  async getByTags(tags: string[]): Promise<TransactionSchema[]> {
    const all = await this.getAll();
    const set = new Set(tags);
    return all.filter((t) => t.tags?.some((tag) => set.has(tag)));
  }
}

class SupabaseInstallmentPaymentRepository
  extends SupabaseJsonRepository<InstallmentPaymentSchema>
  implements InstallmentPaymentRepository
{
  constructor() {
    super('installment_payments');
  }

  async getByPurchaseId(purchaseId: string): Promise<InstallmentPaymentSchema[]> {
    const all = await this.getAll();
    return all.filter((p) => p.installmentPurchaseId === purchaseId);
  }

  async getPending(): Promise<InstallmentPaymentSchema[]> {
    const all = await this.getAll();
    return all.filter((p) => p.status === 'pending');
  }
}

class SupabaseInvestmentOpportunityRepository implements InvestmentOpportunityRepository {
  private baseRepo: SupabaseJsonRepository<InvestmentOpportunitySchema & { updatedAt: string }>;

  constructor() {
    this.baseRepo = new SupabaseJsonRepository<InvestmentOpportunitySchema & { updatedAt: string }>('investment_opportunities');
  }

  async getAll(): Promise<InvestmentOpportunitySchema[]> {
    const all = await this.baseRepo.getAll();
    // Remove updatedAt if it exists (for backward compatibility)
    return all.map(({ updatedAt, ...rest }) => rest);
  }

  async getById(id: string): Promise<InvestmentOpportunitySchema | null> {
    const item = await this.baseRepo.getById(id);
    if (!item) return null;
    const { updatedAt, ...rest } = item;
    return rest;
  }

  async create(data: Omit<InvestmentOpportunitySchema, 'id' | 'createdAt'>): Promise<InvestmentOpportunitySchema> {
    // Create with extended schema that includes updatedAt
    const extendedData = data as Omit<InvestmentOpportunitySchema & { updatedAt: string }, 'id' | 'createdAt' | 'updatedAt'>;
    const created = await this.baseRepo.create(extendedData);
    const { updatedAt: _updatedAt, ...rest } = created;
    return rest;
  }

  async update(id: string, data: Partial<InvestmentOpportunitySchema>): Promise<InvestmentOpportunitySchema> {
    const updated = await this.baseRepo.update(id, data as any);
    const { updatedAt, ...rest } = updated;
    return rest;
  }

  async delete(id: string): Promise<void> {
    return this.baseRepo.delete(id);
  }

  async getActive(): Promise<InvestmentOpportunitySchema[]> {
    const all = await this.getAll();
    return all.filter((o) => o.isActive);
  }
}

class SupabaseCreditCardRepository extends SupabaseJsonRepository<CreditCardSchema> implements CreditCardRepository {
  constructor() {
    super('credit_cards');
  }

  async getActive(): Promise<CreditCardSchema[]> {
    const all = await this.getAll();
    return all.filter((c) => c.isActive);
  }
}

class SupabaseRecurringExpenseRepository
  extends SupabaseJsonRepository<RecurringExpenseSchema>
  implements RecurringExpenseRepository
{
  constructor() {
    super('recurring_expenses');
  }

  async getActive(): Promise<RecurringExpenseSchema[]> {
    const all = await this.getAll();
    return all.filter((r) => r.isActive);
  }
}

export class SupabaseAdapter implements DatabaseAdapter {
  transactions: TransactionRepository = new SupabaseTransactionRepository();
  categories: CategoryRepository = new SupabaseJsonRepository<CategorySchema>('categories') as any;
  fixedExpenses: FixedExpenseRepository = new SupabaseJsonRepository<FixedExpenseSchema>('fixed_expenses') as any;
  installmentPurchases: InstallmentPurchaseRepository = new SupabaseJsonRepository<InstallmentPurchaseSchema>(
    'installment_purchases'
  ) as any;
  installmentPayments: InstallmentPaymentRepository = new SupabaseInstallmentPaymentRepository();
  assets: AssetRepository = new SupabaseJsonRepository<AssetSchema>('assets') as any;
  liabilities: LiabilityRepository = new SupabaseJsonRepository<LiabilitySchema>('liabilities') as any;
  investments: InvestmentRepository = new SupabaseJsonRepository<InvestmentSchema>('investments') as any;
  investmentOpportunities: InvestmentOpportunityRepository = new SupabaseInvestmentOpportunityRepository();
  creditCards: CreditCardRepository = new SupabaseCreditCardRepository();
  recurringExpenses: RecurringExpenseRepository = new SupabaseRecurringExpenseRepository();

  async initialize(): Promise<void> {
    // no-op: Supabase is initialized via client.ts; session is handled in AuthProvider
    ensureSupabase();
  }
}

