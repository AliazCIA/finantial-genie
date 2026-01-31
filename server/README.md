# Servidor Local - Financial Genie

Servidor Node.js + SQLite para sincronización de datos de la aplicación Financial Genie.

## Características

- ✅ Base de datos SQLite (archivo local)
- ✅ API REST para sincronización
- ✅ Sincronización bidireccional (cliente ↔ servidor)
- ✅ Offline-first: el cliente funciona sin servidor

## Instalación

```bash
cd server
npm install
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor correrá en `http://localhost:3001` por defecto.

## Configuración

Puedes cambiar el puerto con la variable de entorno:
```bash
PORT=3001 npm start
```

## Estructura de Base de Datos

La base de datos SQLite se crea automáticamente en `server/data/finantial-genie.db`.

Cada tabla almacena los datos como JSON en la columna `data`:
- `id`: ID único del registro
- `data`: JSON con todos los campos del schema
- `created_at`: Timestamp de creación
- `updated_at`: Timestamp de última actualización

## API Endpoints

### `GET /health`
Verifica que el servidor esté funcionando.

### `POST /api/sync`
Sincroniza cambios entre cliente y servidor.

**Request:**
```json
{
  "changes": [
    {
      "table": "transactions",
      "operation": "create",
      "id": "txn_123",
      "data": { ... }
    }
  ],
  "lastSyncTimestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "appliedChanges": [...],
  "serverChanges": [...],
  "serverTimestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/data`
Obtiene todos los datos del servidor (para sincronización inicial).

## Respaldo

Para respaldar la base de datos, simplemente copia el archivo:
```bash
cp server/data/finantial-genie.db backup/finantial-genie-backup.db
```
