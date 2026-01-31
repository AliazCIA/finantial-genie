# Guía para Configurar Supabase

Esta aplicación **requiere Supabase** para funcionar. Sigue estos pasos para configurarlo:

## Paso 1: Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión o crea una cuenta (es gratis)
3. Haz clic en **"New Project"**
4. Completa el formulario:
   - **Name**: `finantial-genie` (o el nombre que prefieras)
   - **Database Password**: Elige una contraseña segura (guárdala, la necesitarás)
   - **Region**: Elige la región más cercana a ti
   - **Pricing Plan**: Free (suficiente para empezar)
5. Haz clic en **"Create new project"**
6. Espera 1-2 minutos mientras se crea el proyecto

## Paso 2: Obtener Credenciales

Una vez que el proyecto esté listo:

1. En el dashboard de Supabase, ve a **Settings** → **API**
2. Encontrarás dos valores importantes:
   - **Project URL**: Copia este valor (ejemplo: `https://xxxxx.supabase.co`)
   - **anon public key**: Copia este valor (es una clave larga que empieza con `eyJ...`)

## Paso 3: Configurar Variables de Entorno

### Opción A: Archivo `.env` (Recomendado para desarrollo)

1. Crea un archivo `.env` en la raíz del proyecto (al mismo nivel que `package.json`)
2. Agrega estas líneas:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

3. Reemplaza los valores con los que copiaste en el Paso 2

### Opción B: Variables en `app.json` (Para producción)

Si prefieres configurarlo en `app.json`:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_SUPABASE_URL": "https://tu-proyecto.supabase.co",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "tu-anon-key-aqui"
    }
  }
}
```

**⚠️ IMPORTANTE**: 
- **NO** subas el archivo `.env` a Git (debe estar en `.gitignore`)
- Las variables que empiezan con `EXPO_PUBLIC_` son accesibles desde el cliente
- La `anon key` es pública y segura de usar en el cliente (Supabase usa Row Level Security)

## Paso 4: Crear Tablas en Supabase

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **"New query"**
3. Copia y pega el contenido completo del archivo `SUPABASE_SETUP.md`
4. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)
5. Verifica que todas las tablas se crearon correctamente:
   - Ve a **Table Editor** en el menú lateral
   - Deberías ver estas tablas:
     - `transactions`
     - `categories`
     - `fixed_expenses`
     - `installment_purchases`
     - `installment_payments`
     - `assets`
     - `liabilities`
     - `investments`
     - `investment_opportunities`
     - `credit_cards`
     - `recurring_expenses`

## Paso 5: Verificar Configuración

1. Reinicia el servidor de desarrollo:
   ```bash
   # Detén el servidor actual (Ctrl+C)
   npm run web
   ```

2. Abre la app en el navegador
3. Deberías ver la pantalla de **Login**
4. Crea una cuenta nueva haciendo clic en **"Registrarse"**
5. Una vez registrado, podrás usar la app normalmente

## Solución de Problemas

### Error: "Supabase no está configurado"
- Verifica que las variables de entorno estén correctamente escritas
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "No hay sesión activa"
- Verifica que hayas ejecutado el SQL del Paso 4
- Asegúrate de que las políticas RLS (Row Level Security) estén activas

### Error de conexión
- Verifica que la URL de Supabase sea correcta (debe empezar con `https://`)
- Verifica que la `anon key` sea correcta
- Asegúrate de que el proyecto de Supabase esté activo (no pausado)

## Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Autenticación](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
