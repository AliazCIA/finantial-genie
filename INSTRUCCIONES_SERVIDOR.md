# Instrucciones para Usar el Servidor

## ✅ Estado: Servidor Funcionando

El servidor está **instalado y funcionando correctamente**.

## Cómo Iniciar el Servidor

### Opción 1: Desde la Terminal (Recomendado)

```bash
cd server
node index.js
```

### Opción 2: Usando los Scripts Incluidos

**Windows:**
```bash
cd server
.\start.bat
```

O con PowerShell:
```bash
cd server
.\start.ps1
```

## Verificar que Funciona

El servidor estará disponible en: **http://localhost:3001**

Puedes verificar que funciona visitando:
- **Health Check**: http://localhost:3001/health
- **Datos**: http://localhost:3001/api/data

## Configurar en la App

1. Abre la app en tu navegador
2. Ve a la pantalla de **Sincronización** (botón en Dashboard o navegación)
3. Ingresa la URL del servidor: `http://localhost:3001`
4. Haz clic en **"Guardar URL"**
5. Haz clic en **"Sincronizar ahora"** para probar la conexión

## Base de Datos

La base de datos SQLite se crea automáticamente en:
```
server/data/finantial-genie.db
```

### Respaldo

Para respaldar tus datos:
```bash
cp server/data/finantial-genie.db backup/finantial-genie-backup.db
```

## Usar desde Otros Dispositivos

Si quieres usar el servidor desde tu celular u otra PC:

1. **Encuentra la IP de tu servidor**:
   - Windows: `ipconfig` (busca "IPv4")
   - Ejemplo: `192.168.1.100`

2. **En la app del otro dispositivo**:
   - Usa: `http://192.168.1.100:3001`
   - Asegúrate de que ambos dispositivos estén en la misma red WiFi

3. **Configura el firewall de Windows**:
   - Permite conexiones entrantes en el puerto 3001

## Solución de Problemas

### El servidor no inicia
- Verifica que Node.js esté instalado: `node --version`
- Verifica que las dependencias estén instaladas: `cd server && npm install`

### Error de conexión desde la app
- Verifica que el servidor esté corriendo
- Verifica que la URL sea correcta (debe incluir `http://`)
- Verifica que no haya firewall bloqueando el puerto 3001

### Error 500 en los endpoints
- Espera unos segundos después de iniciar el servidor (la base de datos se inicializa)
- Verifica los logs del servidor para ver errores específicos

## Próximos Pasos

1. ✅ Servidor instalado y funcionando
2. ✅ Base de datos creada
3. ✅ Endpoints probados y funcionando
4. ⏭️ Configurar la app para conectarse al servidor
5. ⏭️ Probar sincronización desde la app
