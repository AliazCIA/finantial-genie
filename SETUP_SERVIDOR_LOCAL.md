# Configuración del Servidor Local

Esta guía te ayudará a configurar el servidor local para sincronización de datos.

## Arquitectura

- **Cliente (App)**: Funciona offline-first usando IndexedDB (web) o AsyncStorage (móvil)
- **Servidor**: Node.js + SQLite que almacena todos los datos
- **Sincronización**: Bidireccional cuando hay conexión

## Paso 1: Instalar Dependencias del Servidor

```bash
cd server
npm install
```

## Paso 2: Iniciar el Servidor

```bash
npm start
```

El servidor correrá en `http://localhost:3001` por defecto.

### Cambiar Puerto

Puedes cambiar el puerto con una variable de entorno:

```bash
PORT=3001 npm start
```

## Paso 3: Configurar la App

1. Abre la app en tu navegador o dispositivo móvil
2. Ve a **Configuración de Sincronización** (puedes agregar un botón en el Dashboard)
3. Ingresa la URL del servidor:
   - **Local (misma máquina)**: `http://localhost:3001`
   - **Red local**: `http://192.168.1.XXX:3001` (reemplaza XXX con la IP de tu servidor)
4. Haz clic en **"Guardar URL"**

## Paso 4: Sincronizar Datos

### Primera Sincronización (Descargar todo del servidor)

Si es la primera vez que usas el servidor:

1. Haz clic en **"Sincronización inicial"**
2. Esto descargará todos los datos del servidor a tu dispositivo

### Sincronización Normal

Después de la primera vez:

1. La app guarda cambios localmente (funciona offline)
2. Cuando hay conexión, haz clic en **"Sincronizar ahora"**
3. Los cambios pendientes se enviarán al servidor
4. Los cambios nuevos del servidor se descargarán

## Funcionamiento Offline-First

- ✅ La app **siempre funciona** sin servidor
- ✅ Todos los cambios se guardan **localmente primero**
- ✅ Los cambios se sincronizan **automáticamente** cuando hay conexión
- ✅ Puedes usar la app en **múltiples dispositivos** (celular, PC, etc.)

## Ubicación de la Base de Datos

La base de datos SQLite se guarda en:
```
server/data/finantial-genie.db
```

### Respaldo

Para respaldar tus datos, simplemente copia este archivo:

```bash
cp server/data/finantial-genie.db backup/finantial-genie-backup.db
```

## Acceso desde Otros Dispositivos

Para usar el servidor desde otros dispositivos en tu red local:

1. **Encuentra la IP de tu servidor**:
   - Windows: `ipconfig` (busca IPv4)
   - Mac/Linux: `ifconfig` o `ip addr`

2. **Configura el firewall**:
   - Permite conexiones entrantes en el puerto 3001

3. **En la app del otro dispositivo**:
   - Usa `http://IP_DEL_SERVIDOR:3001` como URL del servidor
   - Ejemplo: `http://192.168.1.100:3001`

## Solución de Problemas

### Error: "No se puede conectar al servidor"

1. Verifica que el servidor esté corriendo: `npm start` en la carpeta `server`
2. Verifica que la URL sea correcta (incluye `http://`)
3. Verifica que el puerto sea correcto (3001 por defecto)
4. Si estás en otro dispositivo, verifica que esté en la misma red

### Error: "Error del servidor: 500"

1. Verifica los logs del servidor en la terminal
2. Asegúrate de que la base de datos tenga permisos de escritura
3. Verifica que el directorio `server/data/` exista

### Los cambios no se sincronizan

1. Verifica que el servidor esté conectado (indicator verde en la app)
2. Haz clic en "Sincronizar ahora" manualmente
3. Verifica los logs del servidor para ver errores

## Desarrollo

Para desarrollo con auto-reload:

```bash
npm run dev
```

Esto reiniciará el servidor automáticamente cuando cambies archivos.
