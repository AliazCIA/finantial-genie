// Schema definitions for both WatermelonDB and Dexie.js

export interface TransactionSchema {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  tags: string[]; // Array of category IDs
  description: string;
  date: string; // ISO date string
  isRecurring: boolean;
  recurrencePeriod: 'monthly' | 'biweekly' | 'weekly' | 'daily' | null; // Período de recurrencia
  recurrenceStartDate: string | null; // Fecha de inicio de la recurrencia
  parentRecurringId: string | null; // ID de la transacción padre si es generada automáticamente
  creditCardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySchema {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FixedExpenseSchema {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'biweekly';
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentPurchaseSchema {
  id: string;
  name: string;
  totalAmount: number;
  numberOfMonths: number;
  monthlyPayment: number;
  startDate: string;
  description: string | null;
  creditCardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentPaymentSchema {
  id: string;
  installmentPurchaseId: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'pending' | 'paid';
  paymentNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSchema {
  id: string;
  type: 'real_estate' | 'vehicle' | 'motorcycle' | 'cash' | 'bank' | 'investment' | 'other';
  name: string;
  value: number;
  currency: string;
  // Value change over time: positive = appreciation (gains value), negative = depreciation (loses value)
  // Expressed as annual percentage (e.g., -10 means 10% depreciation per year, 5 means 5% appreciation per year)
  annualValueChange: number | null; // Percentage per year
  // Liquidity: how easily the asset can be converted to cash
  // 1 = highly liquid (cash), 5 = illiquid (real estate)
  liquidity: 1 | 2 | 3 | 4 | 5;
  purchaseDate: string | null; // ISO date string - when the asset was acquired
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiabilitySchema {
  id: string;
  type: 'credit_card' | 'loan' | 'mortgage' | 'other';
  name: string;
  amount: number;
  interestRate: number | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentSchema {
  id: string;
  symbol: string | null;
  type: 'stock' | 'bond' | 'fund' | 'other';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentOpportunitySchema {
  id: string;
  type: 'fixed_income' | 'variable_income';
  name: string;
  expectedReturn: number; // percentage
  riskLevel: 'low' | 'medium' | 'high';
  minAmount: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreditCardSchema {
  id: string;
  templateId: string; // ID from creditCards.ts templates
  bank: string;
  name: string; // Custom name for the card (e.g., "Mi Tarjeta BBVA")
  last4Digits: string; // Last 4 digits of the card
  color: string; // Color hex code for card identification
  cutDate: number; // Day of month for cut date (1-31)
  paymentDays: number; // Days after cut date to pay without interest
  annualInterestRate: number;
  moratoryInterestRate: number;
  minPaymentPercentage: number;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number; // creditLimit - currentBalance
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpenseSchema {
  id: string;
  name: string; // e.g., "Renta departamento", "Crédito auto", "Hipoteca casa"
  type: 'rent' | 'car_loan' | 'mortgage' | 'other';
  monthlyAmount: number;
  paymentDay: number; // Day of month (1-31) when payment is due
  startDate: string; // ISO date string
  endDate: string | null; // ISO date string or null if indefinite
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardPaymentSchema {
  id: string;
  creditCardId: string;
  amount: number;
  dueDate: string; // ISO date string
  paidDate: string | null;
  status: 'pending' | 'paid';
  billingCycleStart: string; // ISO date string
  billingCycleEnd: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}
