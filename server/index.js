import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize database
let db;
let dbInitialized = false;

// Health check
app.get('/health', (req, res) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ status: 'initializing', timestamp: new Date().toISOString() });
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple hash function (same as client)
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ success: false, error: 'Base de datos no inicializada' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const emailLower = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Check if user already exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existing = await checkStmt.get(emailLower);

    if (existing) {
      return res.status(400).json({ success: false, error: 'Este email ya está registrado' });
    }

    // Create user
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    await stmt.run(userId, emailLower, passwordHash, now, now);

    res.json({
      success: true,
      user: {
        id: userId,
        email: emailLower,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ success: false, error: 'Base de datos no inicializada' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
    }

    const emailLower = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    // Find user
    const stmt = db.prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?');
    const user = await stmt.get(emailLower);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
    }

    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ success: false, error: 'Base de datos no inicializada' });
  }

  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Get user
    const stmt = db.prepare('SELECT id, password_hash FROM users WHERE id = ?');
    const user = await stmt.get(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Verify current password
    const currentPasswordHash = hashPassword(currentPassword);
    if (user.password_hash !== currentPasswordHash) {
      return res.status(401).json({ success: false, error: 'Contraseña actual incorrecta' });
    }

    // Update password
    const newPasswordHash = hashPassword(newPassword);
    const updateStmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
    await updateStmt.run(newPasswordHash, new Date().toISOString(), userId);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
  }
});

// Sync endpoint: push changes from client and get server changes
app.post('/api/sync', async (req, res) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ success: false, error: 'Base de datos no inicializada' });
  }

  try {
    const { changes, lastSyncTimestamp } = req.body;

    // Apply client changes to server
    const appliedChanges = [];
    for (const change of changes || []) {
      try {
        const { table, operation, id, data } = change;
        
        if (operation === 'create') {
          const stmt = db.prepare(`
            INSERT INTO ${table} (id, data, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `);
          const now = new Date().toISOString();
          await stmt.run(id, JSON.stringify(data), now, now);
          appliedChanges.push({ table, operation, id, success: true });
        } else if (operation === 'update') {
          const stmt = db.prepare(`
            UPDATE ${table} 
            SET data = ?, updated_at = ?
            WHERE id = ?
          `);
          await stmt.run(JSON.stringify(data), new Date().toISOString(), id);
          appliedChanges.push({ table, operation, id, success: true });
        } else if (operation === 'delete') {
          const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
          await stmt.run(id);
          appliedChanges.push({ table, operation, id, success: true });
        }
      } catch (err) {
        console.error(`Error applying change:`, err);
        appliedChanges.push({ 
          table: change.table, 
          operation: change.operation, 
          id: change.id, 
          success: false, 
          error: err.message 
        });
      }
    }

    // Get server changes since last sync
    const serverChanges = [];
    const tables = [
      'transactions', 'categories', 'fixed_expenses', 'installment_purchases',
      'installment_payments', 'assets', 'liabilities', 'investments',
      'investment_opportunities', 'credit_cards', 'recurring_expenses'
    ];

    for (const table of tables) {
      const stmt = lastSyncTimestamp
        ? db.prepare(`
            SELECT id, data, created_at, updated_at 
            FROM ${table} 
            WHERE updated_at > ?
            ORDER BY updated_at ASC
          `)
        : db.prepare(`
            SELECT id, data, created_at, updated_at 
            FROM ${table} 
            ORDER BY updated_at ASC
          `);
      
      const rows = lastSyncTimestamp 
        ? await stmt.all(lastSyncTimestamp)
        : await stmt.all();
      
      for (const row of rows) {
        serverChanges.push({
          table,
          operation: 'update', // Server always sends updates
          id: row.id,
          data: JSON.parse(row.data),
          updatedAt: row.updated_at,
        });
      }
    }

    res.json({
      success: true,
      appliedChanges,
      serverChanges,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all data (for initial sync)
app.get('/api/data', async (req, res) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ success: false, error: 'Base de datos no inicializada' });
  }

  try {
    const tables = [
      'transactions', 'categories', 'fixed_expenses', 'installment_purchases',
      'installment_payments', 'assets', 'liabilities', 'investments',
      'investment_opportunities', 'credit_cards', 'recurring_expenses'
    ];

    const data = {};
    for (const table of tables) {
      const stmt = db.prepare('SELECT id, data, created_at, updated_at FROM ' + table);
      const rows = await stmt.all();
      data[table] = rows.map(row => ({
        id: row.id,
        ...JSON.parse(row.data),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server after database initialization
initDatabase(join(__dirname, 'data', 'finantial-genie.db'))
  .then((database) => {
    db = database;
    dbInitialized = true;
    console.log(`📊 Base de datos: ${db.name}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`✅ Listo para recibir conexiones`);
    });
  })
  .catch((err) => {
    console.error('❌ Error inicializando base de datos:', err);
    process.exit(1);
  });
