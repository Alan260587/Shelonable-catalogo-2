-- =============================================================================
-- SHELÓ NABEL 2026 + BETTERWARE NOVIEMBRE 2026 + PROMOCIONES OFICIALES
-- ESQUEMA SQL COMPLETO PARA SUPABASE (PostgreSQL + RLS + Realtime + Storage)
-- =============================================================================
-- Instrucciones:
-- 1. Copia y pega todo este script en el SQL Editor de Supabase y pulsa "Run".
-- 2. Después ejecuta supabase/seed_products.sql para poblar los 3 apartados:
--    • Sheló NABEL 2026 (13 categorías y 33 productos)
--    • Betterware Noviembre 2026 (11 categorías y 50 productos)
--    • Apartado de Promociones (2 promociones oficiales de afiliación y membresía)
-- =============================================================================

-- 1. Extensión para generación de UUIDs
create extension if not exists "pgcrypto";

-- =============================================================================
-- 2. TABLA DE CATEGORÍAS DE TODOS LOS APARTADOS: public.categories
-- =============================================================================
create table if not exists public.categories (
  id text primary key,                          -- ID único (ej. 'lo-nuevo-en-casa', 'bw-navidad')
  brand text not null default 'shelo',          -- Apartado ('shelo' | 'betterware' | 'promociones')
  name text not null,                           -- Nombre oficial de la categoría
  page_number text not null default '01',       -- Página impresa mostrada en el índice
  pdf_page integer not null default 1,          -- Página real en el visor PDF interactivo
  color text not null default '#0284C7',        -- Color distintivo hex
  text_color text not null default '#FFFFFF',   -- Color de texto hex
  image_url text not null default '',           -- URL o ruta de imagen de portada de categoría
  description text not null default '',         -- Descripción editorial de la categoría
  sort_order integer not null default 0,        -- Orden de aparición en el menú
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_brand on public.categories (brand);
create index if not exists idx_categories_sort_order on public.categories (sort_order);

-- =============================================================================
-- 3. TABLA PRINCIPAL DE PRODUCTOS (SHELÓ + BETTERWARE + PROMOCIONES): public.products
-- =============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                     -- Clave oficial única ('S1701', '25971', 'PROMO-01')
  name text not null,                           -- Nombre del producto o título de promoción
  subtitle text not null default '',            -- Subtítulo / beneficio corto
  description text not null default '',         -- Descripción detallada
  price numeric(10, 2) not null default 0,      -- Precio actual en MXN
  original_price numeric(10, 2) default null,   -- Precio regular tachado (si aplica oferta)
  image_url text not null default '',           -- URL pública de la imagen o ruta local
  image_path text not null default '',          -- Ruta interna en el bucket product-images
  category text not null,                       -- ID de la categoría (ej. 'lo-nuevo-en-casa', 'bw-navidad')
  page integer not null default 1,              -- Número de página en el catálogo
  size text not null default '',                -- Presentación / contenido / etiqueta
  brand text not null default 'shelo',          -- Apartado ('shelo' | 'betterware' | 'promociones')
  featured boolean not null default false,      -- Producto destacado
  price_tag_style text not null default 'blue', -- Estilo visual ('blue' | 'amber' | 'emerald' | 'rose')
  is_active boolean not null default true,      -- Permite ocultar/desactivar sin borrar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migraciones seguras e idempotentes por si la tabla public.products ya existía:
alter table public.products add column if not exists brand text not null default 'shelo';
alter table public.products add column if not exists original_price numeric(10, 2) default null;
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists price_tag_style text not null default 'blue';

-- Índices para búsquedas rápidas por apartado, categoría y clave
create index if not exists idx_products_brand on public.products (brand);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_key on public.products (key);
create index if not exists idx_products_is_active on public.products (is_active);

-- =============================================================================
-- 4. TABLA DEDICADA DE PROMOCIONES GRANDES: public.promotions
-- =============================================================================
create table if not exists public.promotions (
  id text primary key,                          -- 'promo-01', 'promo-02'
  key text unique not null,                     -- 'PROMO-01', 'PROMO-02'
  title text not null,                          -- Título principal editable
  subtitle text not null default '',            -- Subtítulo editable
  description text not null default '',         -- Descripción completa editable
  badge_text text not null default 'PROMOCIÓN ESPECIAL',
  price numeric(10, 2) not null default 0,      -- Inversión / monto promocional en MXN
  image_url text not null default '',           -- URL pública o ruta local de imagen grande
  image_path text not null default '',          -- Ruta interna en el bucket product-images
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_promotions_key on public.promotions (key);
create index if not exists idx_promotions_is_active on public.promotions (is_active);

-- =============================================================================
-- 5. VISTAS ESTRUCTURADAS POR APARTADO (SHELÓ, BETTERWARE Y PROMOCIONES)
-- =============================================================================
create or replace view public.v_shelo_products as
select *
from public.products
where is_active = true
  and brand = 'shelo'
order by page asc, key asc;

create or replace view public.v_betterware_products as
select *
from public.products
where is_active = true
  and brand = 'betterware'
order by page asc, key asc;

create or replace view public.v_promotions_catalog as
select *
from public.products
where is_active = true
  and (brand = 'promociones' or category = 'promociones-shelo' or key like 'PROMO-%')
order by key asc;

-- =============================================================================
-- 6. TRIGGERS AUTOMÁTICOS DE updated_at
-- =============================================================================
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Mantener compatibilidad con el nombre anterior de función
create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_products_updated_at();

drop trigger if exists trg_promotions_updated_at on public.promotions;
create trigger trg_promotions_updated_at
before update on public.promotions
for each row
execute function public.set_updated_at_timestamp();

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- • Lectura (SELECT): Pública para 'anon' y 'authenticated' (filas activas).
-- • Escritura (INSERT, UPDATE, DELETE): Exclusiva para usuarios 'authenticated'.
-- =============================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;

-- 7A. Políticas en public.categories
drop policy if exists "Lectura pública de categorías" on public.categories;
drop policy if exists "Inserción de categorías para autenticados" on public.categories;
drop policy if exists "Actualización de categorías para autenticados" on public.categories;
drop policy if exists "Eliminación de categorías para autenticados" on public.categories;

create policy "Lectura pública de categorías"
on public.categories
for select
to anon, authenticated
using (is_active = true);

create policy "Inserción de categorías para autenticados"
on public.categories
for insert
to authenticated
with check (true);

create policy "Actualización de categorías para autenticados"
on public.categories
for update
to authenticated
using (true)
with check (true);

create policy "Eliminación de categorías para autenticados"
on public.categories
for delete
to authenticated
using (true);

-- 7B. Políticas en public.products
drop policy if exists "Lectura pública de productos" on public.products;
drop policy if exists "Inserción de productos para anon" on public.products;
drop policy if exists "Actualización de productos para anon" on public.products;
drop policy if exists "Eliminación de productos para anon" on public.products;
drop policy if exists "Inserción de productos para autenticados" on public.products;
drop policy if exists "Actualización de productos para autenticados" on public.products;
drop policy if exists "Eliminación de productos para autenticados" on public.products;

create policy "Lectura pública de productos"
on public.products
for select
to anon, authenticated
using (is_active = true);

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

-- 7C. Políticas en public.promotions
drop policy if exists "Lectura pública de promociones" on public.promotions;
drop policy if exists "Inserción de promociones para autenticados" on public.promotions;
drop policy if exists "Actualización de promociones para autenticados" on public.promotions;
drop policy if exists "Eliminación de promociones para autenticados" on public.promotions;

create policy "Lectura pública de promociones"
on public.promotions
for select
to anon, authenticated
using (is_active = true);

create policy "Inserción de promociones para autenticados"
on public.promotions
for insert
to authenticated
with check (true);

create policy "Actualización de promociones para autenticados"
on public.promotions
for update
to authenticated
using (true)
with check (true);

create policy "Eliminación de promociones para autenticados"
on public.promotions
for delete
to authenticated
using (true);

-- =============================================================================
-- 8. STORAGE BUCKET PÚBLICO: product-images (IMÁGENES + PDFs DE CATÁLOGOS)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "Lectura pública en product-images" on storage.objects;
drop policy if exists "Subida de imágenes en product-images para anon" on storage.objects;
drop policy if exists "Actualización de imágenes en product-images para anon" on storage.objects;
drop policy if exists "Eliminación de imágenes en product-images para anon" on storage.objects;
drop policy if exists "Subida de imágenes en product-images para autenticados" on storage.objects;
drop policy if exists "Actualización de imágenes en product-images para autenticados" on storage.objects;
drop policy if exists "Eliminación de imágenes en product-images para autenticados" on storage.objects;

create policy "Lectura pública en product-images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

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

-- =============================================================================
-- 9. HABILITAR SUPABASE REALTIME EN LAS TABLAS DEL CATÁLOGO (IDEMPOTENTE)
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
    ) then
      alter publication supabase_realtime add table public.products;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
    ) then
      alter publication supabase_realtime add table public.categories;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'promotions'
    ) then
      alter publication supabase_realtime add table public.promotions;
    end if;
  end if;
end $$;
