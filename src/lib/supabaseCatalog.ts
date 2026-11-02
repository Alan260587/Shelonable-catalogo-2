import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Product } from '../types';

export interface SupabaseProductRow {
  id: string;
  key: string;
  name: string;
  subtitle?: string | null;
  description: string | null;
  price: number | string;
  image_url: string | null;
  image_path: string | null;
  category: string;
  page: number | null;
  size: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_BUCKET = 'product-images';

/**
 * Convierte una fila de `public.products` en Supabase al tipo `Product` de la aplicación.
 */
export function rowToProduct(row: SupabaseProductRow): Product {
  const pageNum = row.page !== null && row.page !== undefined ? Number(row.page) : 1;
  const paddedPage = pageNum < 10 ? `0${pageNum}` : String(pageNum);

  return {
    id: `prod-${String(row.key).toLowerCase()}`,
    clave: String(row.key).trim(),
    name: String(row.name || '').trim(),
    subtitle: String(row.subtitle || 'Calidad Natural Sheló NABEL').trim(),
    description: String(row.description || '').trim(),
    presentation: String(row.size || '').trim(),
    price: Number(row.price) || 0,
    categoryId: String(row.category || 'lo-nuevo-en-casa').trim(),
    catalogPage: paddedPage,
    imageUrl: String(row.image_url || '/assets/catalog/page_003.jpg').trim(),
    priceTagStyle: 'blue',
  };
}

/**
 * Convierte un objeto `Product` de la aplicación al formato de fila para `public.products` en Supabase.
 */
export function productToRow(
  product: Product,
  imagePath = ''
): Omit<SupabaseProductRow, 'id' | 'created_at' | 'updated_at'> {
  const parsedPage = parseInt(String(product.catalogPage).replace(/\D/g, ''), 10);
  const cleanImageUrl = String(product.imageUrl || '').trim();

  let resolvedImagePath = imagePath;
  if (!resolvedImagePath && cleanImageUrl.includes(`/${STORAGE_BUCKET}/`)) {
    const parts = cleanImageUrl.split(`/${STORAGE_BUCKET}/`);
    resolvedImagePath = parts[1] || '';
  }

  return {
    key: String(product.clave).trim(),
    name: String(product.name).trim(),
    subtitle: String(product.subtitle || '').trim(),
    description: String(product.description || '').trim(),
    price: Number(product.price) || 0,
    image_url: cleanImageUrl,
    image_path: resolvedImagePath,
    category: String(product.categoryId || 'lo-nuevo-en-casa').trim(),
    page: Number.isNaN(parsedPage) ? 1 : parsedPage,
    size: String(product.presentation || '').trim(),
    is_active: true,
  };
}

/**
 * Lee todos los productos activos desde `public.products` en Supabase.
 * Si Supabase no está configurado o hay error, devuelve `null` para mantener el catálogo actual.
 */
export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('page', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.warn('Error leyendo productos desde Supabase:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as SupabaseProductRow[]).map(rowToProduct);
  } catch (err) {
    console.warn('Excepción consultando productos en Supabase:', err);
    return null;
  }
}

/**
 * Verifica si existe una sesión autenticada activa en Supabase Auth (`authenticated`).
 * Mientras la app no inicie sesión con Supabase Auth, las políticas RLS bloquean escrituras `anon`,
 * por lo que este chequeo evita llamadas rechazadas y permite usar el respaldo del servidor actual.
 */
export async function hasSupabaseAuthSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Inserta o actualiza (`upsert` por `key`) un producto en `public.products` de Supabase.
 * Comprueba primero si existe sesión autenticada en Supabase Auth (`supabase.auth.getSession()`).
 * Si no hay sesión autenticada, devuelve un fallo controlado para que `src/App.tsx` conserve
 * el guardado mediante el servidor Express/SSE actual sin intentar una escritura `anon` rechazada por RLS.
 */
export async function upsertProductToSupabase(
  product: Product,
  imagePath?: string
): Promise<Product | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error(
      'SUPABASE_AUTH_REQUIRED: Sin sesión autenticada en Supabase Auth (escritura reservada a rol authenticated). Guardado mantenido en el servidor actual.'
    );
  }

  try {
    const payload = productToRow(product, imagePath || '');
    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'key' })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data ? rowToProduct(data as SupabaseProductRow) : product;
  } catch (err) {
    console.warn('Error en upsertProductToSupabase:', err);
    throw err;
  }
}

/**
 * Sube un archivo de imagen al bucket público `product-images` en la ruta
 * `products/<clave>-<timestamp>.<ext>` y devuelve su URL pública.
 * Comprueba primero si existe sesión autenticada en Supabase Auth (`supabase.auth.getSession()`).
 * Si no la hay, devuelve un fallo controlado para que `src/App.tsx` suba la imagen al servidor actual.
 */
export async function uploadProductImageToSupabase(
  file: File,
  key: string
): Promise<{ publicUrl: string; imagePath: string }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error(
      'SUPABASE_AUTH_REQUIRED: Sin sesión autenticada en Supabase Auth (subida reservada a rol authenticated). Usando almacenamiento del servidor actual.'
    );
  }

  const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeKey = String(key || 'producto')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const imagePath = `products/${safeKey}-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(imagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath);
  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen en Supabase.');
  }

  return {
    publicUrl: data.publicUrl,
    imagePath,
  };
}

/**
 * Elimina un producto de `public.products` en Supabase (por `key`, o por `id` si es un UUID).
 * Exige una sesión autenticada activa en Supabase Auth (`supabase.auth.getSession()`).
 * Si no hay sesión autenticada, devuelve un fallo controlado con el mismo formato que `upsert` y `upload`.
 */
export async function deleteProductFromSupabase(product: Product): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error(
      'SUPABASE_AUTH_REQUIRED: Sin sesión autenticada en Supabase Auth (eliminación reservada a rol authenticated). Usando respaldo del servidor actual.'
    );
  }

  const cleanKey = String(product.clave || '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(product.id || '').trim()
  );

  try {
    let query = supabase.from('products').delete();
    if (cleanKey) {
      query = query.eq('key', cleanKey);
    } else if (isUuid) {
      query = query.eq('id', String(product.id).trim());
    } else {
      throw new Error('El producto no tiene clave válida para eliminar en Supabase.');
    }

    const { error } = await query;
    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.warn('Error en deleteProductFromSupabase:', err);
    throw err;
  }
}


