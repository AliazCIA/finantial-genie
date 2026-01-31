import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'data', 'finantial-genie.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo base de datos:', err);
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           BASE DE DATOS - FINANCIAL GENIE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📁 Ubicación: ${dbPath}`);
  console.log('');
  
  // Get all table names
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
      console.error('Error obteniendo tablas:', err);
      db.close();
      process.exit(1);
    }
    
    let tableIndex = 0;
    
    const showNextTable = () => {
      if (tableIndex >= tables.length) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        db.close();
        return;
      }
      
      const tableName = tables[tableIndex].name;
      
      db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) {
          console.error(`Error consultando tabla ${tableName}:`, err);
          tableIndex++;
          showNextTable();
          return;
        }
        
        console.log('');
        console.log(`📊 TABLA: ${tableName.toUpperCase()}`);
        console.log('─'.repeat(60));
        
        if (rows.length === 0) {
          console.log('   (vacía)');
        } else {
          // Show column names
          if (rows.length > 0) {
            const columns = Object.keys(rows[0]);
            console.log(`   Columnas: ${columns.join(', ')}`);
            console.log('');
            
            rows.forEach((row, index) => {
              console.log(`   Registro ${index + 1}:`);
              columns.forEach(col => {
                let value = row[col];
                
                // Truncate long values
                if (typeof value === 'string' && value.length > 100) {
                  value = value.substring(0, 100) + '...';
                }
                
                // Format based on column name
                if (col === 'password_hash') {
                  value = '***' + value.substring(value.length - 4); // Show last 4 chars
                }
                
                console.log(`      ${col}: ${value}`);
              });
              console.log('');
            });
          }
        }
        
        console.log(`   Total de registros: ${rows.length}`);
        tableIndex++;
        showNextTable();
      });
    };
    
    showNextTable();
  });
});
