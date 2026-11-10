# Guía de Configuración y Estructuración SQL de Supabase — Sheló NABEL + Betterware + Promociones (2026)

Esta aplicación cuenta con una arquitectura SQL completa en **Supabase** que cubre los **3 apartados oficiales** de la tienda:
1. **🌿 Sheló NABEL 2026**: 13 categorías y 33 productos oficiales (`brand = 'shelo'`).
2. **🏠 Betterware Noviembre 2026**: 11 categorías y 50 productos oficiales (`brand = 'betterware'`).
3. **✨ Apartado de Promociones**: 2 promociones de afiliación y membresía con imágenes grandes (`PROMO-01` y `PROMO-02`, `brand = 'promociones'`).

> **Importante:** Mientras no configures variables o sesión de Supabase, la aplicación funciona al 100% con el respaldo del servidor Express/SSE y almacenamiento atómico en JSON (`data/catalog.json`, `data/betterware_catalog.json` y `data/promotions.json`), sin perder ningún cambio.

---

## 1. Estructura SQL Completa (`supabase/schema.sql`)

Al ejecutar `supabase/schema.sql` en el **SQL Editor** de Supabase se crean de forma idempotente:

- **Tabla `public.categories` (25 categorías)**:
  - Almacena las 13 categorías de Sheló NABEL, las 11 categorías de Betterware Noviembre 2026 y la categoría `promociones-shelo`.
- **Tabla `public.products` (85 registros totales)**:
  - Columnas: `id`, `key` (única), `name`, `subtitle`, `description`, `price`, `original_price`, `image_url`, `image_path`, `category`, `page`, `size`, `brand` (`'shelo' | 'betterware' | 'promociones'`), `featured`, `price_tag_style`, `is_active`, `created_at`, `updated_at`.
  - Incluye migración automática `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ...` para instalaciones previas.
- **Tabla `public.promotions` (2 promociones principales)**:
  - Almacena las promociones grandes (`promo-01` / `PROMO-01` y `promo-02` / `PROMO-02`) con título, subtítulo, etiqueta destacada, inversión (`price`), descripción e imagen grande.
- **Vistas SQL por Apartado**:
  - `public.v_shelo_products`
  - `public.v_betterware_products`
  - `public.v_promotions_catalog`
- **Seguridad RLS (Row Level Security)**:
  - **Lectura (`SELECT`)**: Pública para `anon` y `authenticated` (`is_active = true`).
  - **Escritura (`INSERT`, `UPDATE`, `DELETE`)**: Reservada exclusivamente para usuarios autenticados (`authenticated`).
- **Storage Bucket Público `product-images`**:
  - Aloja las imágenes subidas de productos/promociones y los 2 catálogos PDF completos (`catalog/Catalogo_Shelo_NABEL2026.pdf` y `catalog/Catalogo_Betterware_Noviembre2026.pdf`).
- **Supabase Realtime (`supabase_realtime`)**:
  - Publicación activa sobre `public.products`, `public.categories` y `public.promotions`.

---

## 2. Semilla SQL de Todos los Apartados (`supabase/seed_products.sql`)

El archivo `supabase/seed_products.sql` inserta con `ON CONFLICT DO NOTHING` (sin sobrescribir precios ni imágenes que ya hayas editado):
- **25 categorías** en `public.categories`.
- **85 registros** en `public.products` (33 de Sheló NABEL + 50 de Betterware Noviembre 2026 + 2 Promociones).
- **2 promociones oficiales** en `public.promotions`.

> **Tip rápido desde el Panel Administrativo (`****`)**: También puedes descargar el archivo SQL unificado (`schema.sql` + `seed_products.sql`) directamente desde el botón **«Descargar SQL Completo»** dentro del Panel Administrativo, o pulsar **«Sincronizar Todo (85)»** una vez iniciada tu sesión de Supabase Auth.
