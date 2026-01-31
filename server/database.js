import sqlite3 from 'sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { promisify } from 'util';

export function initDatabase(dbPath) {
  // Ensure data directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Enable WAL mode for better concurrency
      db.run('PRAGMA journal_mode = WAL');

      // Create tables
      const tables = [
        {
          name: 'transactions',
          schema: `
            CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'categories',
          schema: `
            CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'fixed_expenses',
          schema: `
            CREATE TABLE IF NOT EXISTS fixed_expenses (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'installment_purchases',
          schema: `
            CREATE TABLE IF NOT EXISTS installment_purchases (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'installment_payments',
          schema: `
            CREATE TABLE IF NOT EXISTS installment_payments (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'assets',
          schema: `
            CREATE TABLE IF NOT EXISTS assets (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'liabilities',
          schema: `
            CREATE TABLE IF NOT EXISTS liabilities (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'investments',
          schema: `
            CREATE TABLE IF NOT EXISTS investments (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'investment_opportunities',
          schema: `
            CREATE TABLE IF NOT EXISTS investment_opportunities (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'credit_cards',
          schema: `
            CREATE TABLE IF NOT EXISTS credit_cards (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'recurring_expenses',
          schema: `
            CREATE TABLE IF NOT EXISTS recurring_expenses (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
        {
          name: 'users',
          schema: `
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
        },
      ];

      // Create tables sequentially
      let tableIndex = 0;
      const createNextTable = () => {
        if (tableIndex >= tables.length) {
          // Create indexes
          let indexIndex = 0;
          const createNextIndex = () => {
            if (indexIndex >= tables.length) {
              console.log('✅ Base de datos inicializada');
              resolve({
                prepare: (sql) => {
                  const stmt = db.prepare(sql);
                  return {
                    run: (...params) => {
                      return new Promise((resolve, reject) => {
                        stmt.run(...params, function(err) {
                          if (err) reject(err);
                          else resolve({ lastID: this.lastID, changes: this.changes });
                        });
                      });
                    },
                    all: (...params) => {
                      return new Promise((resolve, reject) => {
                        stmt.all(...params, (err, rows) => {
                          if (err) reject(err);
                          else resolve(rows || []);
                        });
                      });
                    },
                    get: (...params) => {
                      return new Promise((resolve, reject) => {
                        stmt.get(...params, (err, row) => {
                          if (err) reject(err);
                          else resolve(row);
                        });
                      });
                    },
                  };
                },
                name: dbPath,
              });
              return;
            }
            const table = tables[indexIndex];
            db.run(
              `CREATE INDEX IF NOT EXISTS idx_${table.name}_updated_at ON ${table.name}(updated_at)`,
              (err) => {
                if (err) {
                  console.error(`Error creating index for ${table.name}:`, err);
                }
                indexIndex++;
                createNextIndex();
              }
            );
          };
          createNextIndex();
          return;
        }
        const table = tables[tableIndex];
        db.run(table.schema, (err) => {
          if (err) {
            console.error(`Error creating table ${table.name}:`, err);
            reject(err);
            return;
          }
          tableIndex++;
          createNextTable();
        });
      };
      createNextTable();
    });
  });
}
