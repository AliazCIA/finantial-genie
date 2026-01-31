# 📊 Visualizadores para SQLite

## 🗄️ Tipo de Base de Datos

**SQLite** - Base de datos embebida en un archivo único
- **Ubicación**: `server/data/finantial-genie.db`
- **Ventajas**: 
  - ✅ No requiere servidor separado
  - ✅ Archivo único y portable
  - ✅ Perfecto para aplicaciones locales
  - ✅ Muy rápido para operaciones pequeñas/medianas

---

## 🛠️ Opciones de Visualizadores

### 1. **DB Browser for SQLite** (Recomendado) ⭐

**Gratis y Open Source**

- **Descarga**: https://sqlitebrowser.org/
- **Características**:
  - ✅ Interfaz gráfica intuitiva
  - ✅ Ver y editar datos en tablas
  - ✅ Ejecutar consultas SQL
  - ✅ Ver estructura de tablas
  - ✅ Exportar/Importar datos
  - ✅ Multiplataforma (Windows, Mac, Linux)

**Cómo usar**:
1. Descarga e instala DB Browser for SQLite
2. Abre la aplicación
3. Click en "Open Database"
4. Navega a: `server/data/finantial-genie.db`
5. ¡Listo! Puedes ver todas tus tablas y datos

---

### 2. **SQLiteStudio**

**Gratis y Open Source**

- **Descarga**: https://sqlitestudio.pl/
- **Características**:
  - ✅ Interfaz moderna
  - ✅ Editor SQL avanzado
  - ✅ Soporte para plugins
  - ✅ Multiplataforma

---

### 3. **DBeaver Community Edition**

**Gratis (también soporta otras bases de datos)**

- **Descarga**: https://dbeaver.io/download/
- **Características**:
  - ✅ Soporta múltiples tipos de bases de datos
  - ✅ Editor SQL potente
  - ✅ Visualización de relaciones
  - ✅ Exportación avanzada

**Cómo usar con SQLite**:
1. Instala DBeaver
2. Click en "New Database Connection"
3. Selecciona "SQLite"
4. En "Path", navega a: `server/data/finantial-genie.db`
5. Click "Test Connection" y luego "Finish"

---

### 4. **VS Code Extension** (Si usas VS Code)

**SQLite Viewer** o **SQLite** extension

- **Instalación**: 
  - Abre VS Code
  - Ve a Extensions (Ctrl+Shift+X)
  - Busca "SQLite Viewer" o "SQLite"
  - Instala la extensión

- **Uso**:
  - Click derecho en `finantial-genie.db`
  - Selecciona "Open Database" o "View Database"

---

### 5. **Visualizador por Consola** (Ya incluido)

Ya tienes un script que muestra los datos:

```bash
cd server
node view_database.js
```

**Ventajas**:
- ✅ No requiere instalación adicional
- ✅ Funciona desde la terminal
- ✅ Oculta contraseñas automáticamente

---

## 📋 Comparación Rápida

| Visualizador | Gratis | Interfaz | Facilidad | Recomendado |
|-------------|--------|----------|-----------|-------------|
| DB Browser | ✅ | Gráfica | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| SQLiteStudio | ✅ | Gráfica | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| DBeaver | ✅ | Gráfica | ⭐⭐⭐ | ⭐⭐⭐ |
| VS Code Ext | ✅ | Integrada | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Consola (script) | ✅ | Terminal | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Recomendación

**Para empezar rápido**: **DB Browser for SQLite**
- Es el más popular y fácil de usar
- Interfaz clara y directa
- Perfecto para ver y editar datos

**Para desarrollo**: **VS Code Extension** (si usas VS Code)
- Integrado en tu editor
- No necesitas abrir otra aplicación

---

## 🔒 Seguridad

⚠️ **Importante**: 
- El archivo `finantial-genie.db` contiene información sensible
- Las contraseñas están hasheadas, pero aún así:
  - No compartas el archivo `.db`
  - No lo subas a repositorios públicos
  - Mantén backups seguros

---

## 📝 Notas Técnicas

### Estructura de la Base de Datos

Las tablas principales son:
- `users` - Usuarios y autenticación
- `transactions` - Transacciones financieras
- `categories` - Categorías de gastos
- `credit_cards` - Tarjetas de crédito
- `assets` - Activos
- `liabilities` - Pasivos
- `investments` - Inversiones
- `recurring_expenses` - Gastos recurrentes
- `installment_purchases` - Compras a plazos
- `installment_payments` - Pagos a plazos
- `fixed_expenses` - Gastos fijos
- `investment_opportunities` - Oportunidades de inversión

### Formato de Datos

Los datos se almacenan como JSON en la columna `data`:
```sql
SELECT id, data, created_at, updated_at FROM transactions;
```

Para ver el contenido JSON formateado, usa:
```sql
SELECT id, json(data) as transaction_data FROM transactions;
```
