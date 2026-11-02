-- =============================================================================
-- SHELÓ NABEL 2026 — ESQUEMA COMPLETO PARA SUPABASE (PostgreSQL + RLS + Storage)
-- Instrucciones: Copia y pega todo este script en el SQL Editor de Supabase y
-- pulsa "Run" antes de ejecutar supabase/seed_products.sql.
-- =============================================================================

-- 1. Extensión para generación de UUIDs
create extension if not exists "pgcrypto";

-- 2. Tabla principal del catálogo: public.products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                     -- Clave oficial única (ej. 'S1701')
  name text not null,                           -- Nombre del producto
  subtitle text not null default '',            -- Subtítulo / beneficio corto
  description text not null default '',         -- Descripción detallada
  price numeric(10, 2) not null default 0,      -- Precio en MXN
  image_url text not null default '',           -- URL pública de la imagen o ruta local
  image_path text not null default '',          -- Ruta interna en el bucket product-images (si aplica)
  category text not null,                       -- ID de la categoría (ej. 'lo-nuevo-en-casa')
  page integer not null default 1,              -- Número de página en el catálogo
  size text not null default '',                -- Presentación / contenido (ej. '100 ml')
  is_active boolean not null default true,      -- Permite ocultar/desactivar sin borrar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para búsquedas rápidas por categoría y clave
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_key on public.products (key);
create index if not exists idx_products_is_active on public.products (is_active);

-- 3. Trigger para actualizar automáticamente updated_at en cada edición
create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_products_updated_at();

-- 4. Activar Row Level Security (RLS) en public.products
alter table public.products enable row level security;

-- =============================================================================
-- POLÍTICAS RLS EN public.products
-- IMPORTANTE SOBRE AUTENTICACIÓN Y RESPALDO:
-- • Lectura (SELECT): Pública para 'anon' y 'authenticated' (solo filas con is_active = true).
-- • Escritura (INSERT, UPDATE, DELETE): Permitida ÚNICAMENTE para usuarios 'authenticated'.
-- • Mientras el Panel Administrativo (clave actual 1990) no inicie sesión mediante
--   Supabase Auth, cualquier intento de escritura con rol 'anon' quedará bloqueado por RLS
--   y la aplicación guardará los cambios automáticamente en el servidor Express/SSE actual
--   sin perder ninguna edición.
-- • La escritura directa a Supabase se activará sola en cuanto el flujo de administrador
--   cuente con una sesión autenticada de Supabase (supabase.auth.getSession), sin necesidad
--   de cambiar la clave actual del Panel Admin.
-- =============================================================================

-- Limpieza de posibles nombres de políticas anteriores
drop policy if exists "Lectura pública de productos" on public.products;
drop policy if exists "Inserción de productos para anon" on public.products;
drop policy if exists "Actualización de productos para anon" on public.products;
drop policy if exists "Eliminación de productos para anon" on public.products;
drop policy if exists "Inserción de productos para autenticados" on public.products;
drop policy if exists "Actualización de productos para autenticados" on public.products;
drop policy if exists "Eliminación de productos para autenticados" on public.products;

-- Lectura pública (anon y authenticated, solo productos activos)
create policy "Lectura pública de productos"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- Escritura exclusiva para usuarios autenticados (authenticated)
create policy "Inserción de productos para autenticados"
on public.products
for insert
to authenticated
with check (true);

create policy "Actualización de productos para autenticados"
on public.products
for update
to authenticated
using (true)
with check (true);

create policy "Eliminación de productos para autenticados"
on public.products
for delete
to authenticated
using (true);

-- =============================================================================
-- 5. STORAGE BUCKET PÚBLICO: product-images
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

-- =============================================================================
-- POLÍTICAS RLS EN storage.objects PARA EL BUCKET 'product-images'
-- • Lectura (SELECT): Pública para 'anon' y 'authenticated'.
-- • Subida, actualización y borrado (INSERT, UPDATE, DELETE): SOLO para 'authenticated'.
-- • Mientras el Panel Admin no tenga sesión activa en Supabase Auth, la subida de archivos
--   usará de forma transparente el respaldo del servidor Express/SSE actual sin perder la imagen,
--   y pasará automáticamente al bucket cuando exista sesión autenticada de Supabase.
-- =============================================================================

drop policy if exists "Lectura pública en product-images" on storage.objects;
drop policy if exists "Subida de imágenes en product-images para anon" on storage.objects;
drop policy if exists "Actualización de imágenes en product-images para anon" on storage.objects;
drop policy if exists "Eliminación de imágenes en product-images para anon" on storage.objects;
drop policy if exists "Subida de imágenes en product-images para autenticados" on storage.objects;
drop policy if exists "Actualización de imágenes en product-images para autenticados" on storage.objects;
drop policy if exists "Eliminación de imágenes en product-images para autenticados" on storage.objects;

-- Lectura pública de imágenes del bucket
create policy "Lectura pública en product-images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

-- Subida, actualización y borrado exclusivos para usuarios autenticados (authenticated)
create policy "Subida de imágenes en product-images para autenticados"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "Actualización de imágenes en product-images para autenticados"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

create policy "Eliminación de imágenes en product-images para autenticados"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images');

