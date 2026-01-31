export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

export const ASSET_TYPES = {
  CASH: 'cash',
  BANK: 'bank',
  INVESTMENT: 'investment',
  OTHER: 'other',
} as const;

export const LIABILITY_TYPES = {
  CREDIT_CARD: 'credit_card',
  LOAN: 'loan',
  MORTGAGE: 'mortgage',
  OTHER: 'other',
} as const;

export const INVESTMENT_TYPES = {
  STOCK: 'stock',
  BOND: 'bond',
  FUND: 'fund',
  OTHER: 'other',
} as const;

export const FREQUENCY_TYPES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  BIWEEKLY: 'biweekly',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const RECURRENCE_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const;

export type RecurrencePeriod = typeof RECURRENCE_PERIODS[keyof typeof RECURRENCE_PERIODS];

export const RECURRENCE_PERIOD_LABELS: Record<RecurrencePeriod, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};
