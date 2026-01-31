import { getDatabase } from './database/adapter';
import { TransactionSchema } from './database/schema';
import { RECURRENCE_PERIODS, type RecurrencePeriod } from '../utils/constants';
import { addDays, addWeeks, addMonths, parseISO, format, startOfDay, isBefore, isAfter, endOfMonth } from 'date-fns';

/**
 * Genera transacciones recurrentes basadas en transacciones padre
 * @param parentTransaction - La transacción padre con isRecurring = true
 * @param upToDate - Fecha hasta la cual generar transacciones (por defecto: fin del mes actual)
 */
export async function generateRecurringTransactions(
  parentTransaction: TransactionSchema,
  upToDate?: Date
): Promise<TransactionSchema[]> {
  if (!parentTransaction.isRecurring || !parentTransaction.recurrencePeriod || !parentTransaction.recurrenceStartDate) {
    return [];
  }

  const db = await getDatabase();
  const startDate = parseISO(parentTransaction.recurrenceStartDate);
  
  // Generar transacciones hasta 6 meses en el futuro por defecto
  // Esto permite planificación a mediano plazo
  const defaultEndDate = addMonths(new Date(), 6);
  const endDate = upToDate || defaultEndDate;
  const period = parentTransaction.recurrencePeriod;

  // Verificar si ya existen transacciones generadas para este período
  const existingTransactions = await db.transactions.getAll();
  const existingRecurring = existingTransactions.filter(
    txn => txn.parentRecurringId === parentTransaction.id
  );

  const generatedTransactions: TransactionSchema[] = [];
  let currentDate = startDate;

  // Generar transacciones hasta la fecha límite
  while (isBefore(currentDate, endDate) || format(currentDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
    // Verificar si ya existe una transacción para esta fecha
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const alreadyExists = existingRecurring.some(txn => txn.date === dateStr);

    // Generar transacciones pasadas, presentes y futuras (hasta el límite)
    if (!alreadyExists) {
      // Crear nueva transacción recurrente
      const newTransaction = await db.transactions.create({
        type: parentTransaction.type,
        amount: parentTransaction.amount,
        description: parentTransaction.description,
        date: dateStr,
        tags: parentTransaction.tags,
        isRecurring: false, // Las transacciones generadas no son recurrentes
        recurrencePeriod: null,
        recurrenceStartDate: null,
        parentRecurringId: parentTransaction.id,
        creditCardId: parentTransaction.creditCardId,
      });

      generatedTransactions.push(newTransaction);
    }

    // Avanzar según el período
    switch (period) {
      case RECURRENCE_PERIODS.DAILY:
        currentDate = addDays(currentDate, 1);
        break;
      case RECURRENCE_PERIODS.WEEKLY:
        currentDate = addWeeks(currentDate, 1);
        break;
      case RECURRENCE_PERIODS.BIWEEKLY:
        currentDate = addWeeks(currentDate, 2);
        break;
      case RECURRENCE_PERIODS.MONTHLY:
        currentDate = addMonths(currentDate, 1);
        break;
      default:
        break;
    }

    // Prevenir bucles infinitos
    if (isAfter(currentDate, endDate)) {
      break;
    }
  }

  return generatedTransactions;
}

/**
 * Genera todas las transacciones recurrentes pendientes
 * Genera transacciones hasta 6 meses en el futuro por defecto
 */
export async function generateAllRecurringTransactions(): Promise<TransactionSchema[]> {
  const db = await getDatabase();
  const allTransactions = await db.transactions.getAll();
  
  // Obtener solo las transacciones padre recurrentes (no las generadas)
  const recurringParents = allTransactions.filter(
    txn => txn.isRecurring && !txn.parentRecurringId
  );

  const allGenerated: TransactionSchema[] = [];
  // Generar hasta 6 meses en el futuro
  const endDate = addMonths(new Date(), 6);

  for (const parent of recurringParents) {
    const generated = await generateRecurringTransactions(parent, endDate);
    allGenerated.push(...generated);
  }

  return allGenerated;
}

/**
 * Obtiene todas las transacciones recurrentes (padres)
 */
export async function getRecurringTransactions(): Promise<TransactionSchema[]> {
  const db = await getDatabase();
  const allTransactions = await db.transactions.getAll();
  
  return allTransactions.filter(
    txn => txn.isRecurring && !txn.parentRecurringId
  );
}

/**
 * Obtiene las transacciones generadas a partir de una transacción recurrente padre
 */
export async function getGeneratedTransactions(parentId: string): Promise<TransactionSchema[]> {
  const db = await getDatabase();
  const allTransactions = await db.transactions.getAll();
  
  return allTransactions.filter(txn => txn.parentRecurringId === parentId);
}
