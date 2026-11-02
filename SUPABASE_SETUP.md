# Guía de Configuración de Supabase — Sheló NABEL 2026

Esta aplicación ya cuenta con toda la integración de **Supabase** lista para usarse (tabla `public.products`, políticas de seguridad RLS y bucket público de imágenes `product-images`).

> **Importante:** Mientras **no** configures las dos variables (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`), **la aplicación sigue funcionando exactamente igual con el catálogo actual y el servidor local**, sin mostrar errores ni dejar el catálogo en blanco.

---

## Paso 1: Crear el Proyecto en Supabase

1. Ingresa a [https://supabase.com/dashboard](https://supabase.com/dashboard) e inicia sesión.
2. Haz clic en **New project**.
3. Asigna un nombre (por ejemplo, `shelo-nabel-2026`), define una contraseña para la base de datos, selecciona la región más cercana y pulsa **Create new project**.
4. Espera aproximadamente 1 a 2 minutos a que termine de aprovisionarse el proyecto.

---

## Paso 2: Ejecutar `supabase/schema.sql` en el SQL Editor

1. En el menú lateral izquierdo de tu proyecto en Supabase, entra a **SQL Editor** y haz clic en **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su contenido y pégalo en el editor SQL de Supabase.
3. Haz clic en **Run** (o presiona `Ctrl + Enter` / `Cmd + Enter`).
4. Esto creará automáticamente:
   - La tabla `public.products` con todos los campos del catálogo (`id`, `key`, `name`, `subtitle`, `description`, `price`, `image_url`, `image_path`, `category`, `page`, `size`, `is_active`, `created_at` y `updated_at`).
   - El activador automático de `updated_at`.
   - Row Level Security (**RLS**) activado en `public.products` con:
     - **Lectura pública (`SELECT`)** para `anon` y `authenticated` (únicamente filas con `is_active = true`).
     - **Escritura (`INSERT`, `UPDATE`, `DELETE`)** restringida **solo a usuarios `authenticated`**.
   - El bucket público de Storage llamado **`product-images`** junto con sus políticas en `storage.objects`:
     - **Lectura pública (`SELECT`)** para `anon` y `authenticated`.
     - **Subida, actualización y borrado (`INSERT`, `UPDATE`, `DELETE`)** restringidos **solo a usuarios `authenticated`**.

### Nota importante sobre políticas de escritura (`authenticated`) y respaldo actual

- El Panel Administrativo mantiene intacto su acceso de sesión única con su llave actual enmascarada (`****`).
- Debido a que las políticas RLS de `public.products` y `storage.objects` exigen el rol `authenticated` para cualquier escritura, **mientras el administrador no inicie sesión con Supabase Auth dentro del panel, las escrituras directas con el rol `anon` quedan bloqueadas por RLS**.
- Por ello, `src/lib/supabaseCatalog.ts` comprueba previamente si existe una sesión autenticada activa (`supabase.auth.getSession()`) antes de ejecutar `upsertProductToSupabase`, `deleteProductFromSupabase` o `uploadProductImageToSupabase`.
- **Sin sesión autenticada de Supabase:** devuelve un fallo controlado y `src/App.tsx` mantiene el guardado por el **servidor Express/SSE actual** con un aviso no bloqueante, sin perder ninguna edición.
- **Con sesión autenticada de Supabase:** todas las operaciones de crear, editar y eliminar productos, así como la subida de imágenes nuevas, van directamente a Supabase (`public.products` y bucket `product-images`).

---

## Paso 3: Cargar los 33 Productos Iniciales con `supabase/seed_products.sql`

1. En el **SQL Editor** de Supabase, abre una nueva consulta (**New query**).
2. Copia **todo** el contenido del archivo `supabase/seed_products.sql` y pégalo en el editor.
3. Haz clic en **Run**.
4. Se insertarán los **33 productos oficiales** del catálogo Sheló NABEL 2026 conservando su clave (`key`), nombre, categoría, precio, descripción, presentación, página e imagen actual.
   - *Nota:* El script se ejecuta desde el SQL Editor de Supabase (con privilegios de propietario) y utiliza `ON CONFLICT (key) DO NOTHING`, por lo que no sobrescribe productos ni precios existentes.

---

## Paso 4: Verificar el Bucket `product-images`

1. En el menú lateral izquierdo de Supabase, entra a **Storage**.
2. Verifica que aparezca el bucket llamado **`product-images`** con la etiqueta **Public**.
   - La lectura de imágenes es pública para cualquier visitante (`anon` y `authenticated`).
   - La subida, actualización y borrado en `product-images` está reservada a `authenticated`.

---

## Paso 5: Copiar las Credenciales Públicas desde Supabase

1. En el menú lateral de Supabase, ve a **Project Settings** (ícono de engrane) > **API**.
2. Copia los siguientes **dos valores**:
   - **Project URL**
   - **Project API keys > `anon` `public`**
   - ⚠️ **Nunca uses la clave `service_role` en el frontend**; usa únicamente la clave `anon` `public`.

---

## Paso 6: Configurar las Variables en AI Studio (Secrets)

1. En AI Studio, abre **Settings > Secrets** (o el panel de variables de entorno).
2. Añade estas dos variables:
   - **`VITE_SUPABASE_URL`** = *(tu Project URL de Supabase)*
   - **`VITE_SUPABASE_ANON_KEY`** = *(tu clave `anon` `public` de Supabase)*
3. Al recargar la aplicación, la lectura pública de los 33 productos desde Supabase queda activa y dentro del **Panel Administrativo** el indicador muestra:
   - **`Supabase: conectado`**
4. Si esas variables están vacías, el indicador muestra:
   - **`Supabase: no configurado — funciona con el catálogo actual`**

---

## Paso 7: Activar el Guardado Automático desde la Página (Supabase Auth)

Para que los productos e imágenes agregados, editados o eliminados desde el Panel Administrativo se guarden **automáticamente en Supabase** (sin ejecutar SQL nuevo ni modificar las políticas ya creadas):

1. **Crear el usuario administrador en Supabase:**
   - Entra al dashboard de tu proyecto en Supabase.
   - En el menú lateral izquierdo, ve a **Authentication → Users**.
   - Haz clic en el botón **Add user** → **Create new user**.
   - Escribe el **correo electrónico** y la **contraseña** que usarás como administrador, deja activada la casilla **Auto Confirm User** y pulsa **Create user**.

2. **Iniciar sesión dentro del Panel Administrativo de la app:**
   - En la página web, abre el **Panel Admin** e ingresa primero con tu **llave actual del panel** (`****`).
   - Una vez dentro del panel, verás la sección **«Sesión de Supabase (para guardar en la base de datos)»**, que mostrará inicialmente **`Sesión de Supabase no iniciada`**.
   - Escribe el **correo** y la **contraseña** del usuario que creaste en Supabase y pulsa **«Iniciar sesión en Supabase»**.
   - El estado cambiará a **`Sesión de Supabase iniciada: <tu-correo>`** y la sesión se mantendrá activa aunque recargues la página mientras Supabase la conserve vigente.

3. **Qué sucede a partir de ese momento (CON sesión iniciada):**
   - **Crear o editar productos:** Se guardan automáticamente en la tabla `public.products` mediante `upsertProductToSupabase`.
   - **Subir imágenes desde tu computadora:** Se suben primero al bucket público `product-images` (bajo `products/<clave>-<timestamp>.<ext>`) y su URL pública y ruta se guardan automáticamente en `image_url` e `image_path` de `public.products`.
   - **Eliminar productos:** Se eliminan directamente de `public.products` mediante `deleteProductFromSupabase`.
   - Si ocurriera algún error en Supabase con la sesión activa, el panel mostrará un mensaje de error claro sin fingir que se guardó en la base de datos.

4. **Cómo cerrar la sesión de Supabase y comportamiento SIN sesión:**
   - Para cerrar únicamente la sesión de la base de datos, haz clic en el botón **«Cerrar sesión de Supabase»** dentro de esa misma sección; **esto no cierra el Panel Admin ni cambia su llave actual**.
   - Mientras la sesión de Supabase esté cerrada (`Sesión de Supabase no iniciada`), crear, editar, eliminar y subir imágenes seguirá funcionando mediante el **respaldo del servidor Express/SSE actual** con su aviso no bloqueante, sin perder tus cambios locales.


