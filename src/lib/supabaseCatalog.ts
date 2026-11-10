import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Product, Category, PromotionItem } from '../types';

export interface SupabaseProductRow {
  id: string;
  key: string;
  name: string;
  subtitle?: string | null;
  description: string | null;
  price: number | string;
  original_price?: number | string | null;
  image_url: string | null;
  image_path: string | null;
  category: string;
  page: number | null;
  size: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  brand?: string | null;
  featured?: boolean | null;
  price_tag_style?: string | null;
}

export interface SupabaseCategoryRow {
  id: string;
  brand: string;
  name: string;
  page_number: string;
  pdf_page: number;
  color: string;
  text_color: string;
  image_url: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface SupabasePromotionRow {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  description: string;
  badge_text: string;
  price: number | string;
  image_url: string;
  image_path: string;
  sort_order: number;
  is_active: boolean;
}

const STORAGE_BUCKET = 'product-images';
export const CATALOG_PDF_STORAGE_PATH = 'catalog/Catalogo_Shelo_NABEL2026.pdf';
export const BETTERWARE_CATALOG_PDF_STORAGE_PATH = 'catalog/Catalogo_Betterware_Noviembre2026.pdf';

/**
 * Convierte una fila de `public.products` en Supabase al tipo `Product` de la aplicación.
 */
export function rowToProduct(row: SupabaseProductRow): Product {
  const pageNum = row.page !== null && row.page !== undefined ? Number(row.page) : 1;
  const paddedPage = pageNum < 10 ? `0${pageNum}` : String(pageNum);
  const cleanKey = String(row.key || '').trim();
  const cleanCat = String(row.category || 'lo-nuevo-en-casa').trim();
  const cleanImg = String(row.image_url || '/assets/catalog/page_003.jpg').trim();

  const isPromo =
    row.brand === 'promociones' ||
    cleanCat === 'promociones-shelo' ||
    cleanKey.toUpperCase().startsWith('PROMO-');

  const isBetterware =
    !isPromo &&
    (row.brand === 'betterware' ||
      cleanCat.startsWith('bw-') ||
      cleanImg.includes('/assets/betterware/') ||
      /^\d{5}$/.test(cleanKey));

  const parsedOrigPrice =
    row.original_price !== null &&
    row.original_price !== undefined &&
    Number(row.original_price) > 0
      ? Number(row.original_price)
      : undefined;

  const validTagStyle =
    row.price_tag_style === 'blue' ||
    row.price_tag_style === 'amber' ||
    row.price_tag_style === 'emerald' ||
    row.price_tag_style === 'rose'
      ? row.price_tag_style
      : isBetterware
      ? 'rose'
      : 'blue';

  return {
    id: isPromo
      ? cleanKey.toLowerCase()
      : isBetterware
      ? `bw-${cleanKey.toLowerCase()}`
      : `prod-${cleanKey.toLowerCase()}`,
    clave: cleanKey,
    name: String(row.name || '').trim(),
    subtitle: String(
      row.subtitle ||
        (isPromo
          ? 'Promoción Oficial Sheló NABEL'
          : isBetterware
          ? 'Soluciones Prácticas Betterware'
          : 'Calidad Natural Sheló NABEL')
    ).trim(),
    description: String(row.description || '').trim(),
    presentation: String(row.size || '').trim(),
    price: Number(row.price) || 0,
    ...(parsedOrigPrice !== undefined ? { originalPrice: parsedOrigPrice } : {}),
    categoryId: cleanCat,
    catalogPage: paddedPage,
    imageUrl: cleanImg,
    brand: isPromo ? 'promociones' : isBetterware ? 'betterware' : 'shelo',
    featured: row.featured ?? undefined,
    priceTagStyle: validTagStyle,
  };
}

export function promotionToProduct(promo: PromotionItem): Product {
  return {
    id: promo.id || promo.clave.toLowerCase(),
    clave: promo.clave || 'PROMO-01',
    name: promo.title,
    subtitle: promo.subtitle,
    description: promo.description,
    presentation: promo.badgeText || 'Promoción Especial',
    price: Number(promo.price) || 300,
    categoryId: 'promociones-shelo',
    catalogPage: '01',
    imageUrl: promo.imageUrl,
    brand: 'promociones',
    featured: true,
    priceTagStyle: 'blue',
  };
}

export function productToPromotion(prod: Product): PromotionItem {
  return {
    id: prod.id.startsWith('promo-') ? prod.id : prod.clave.toLowerCase(),
    clave: prod.clave.toUpperCase(),
    title: prod.name,
    subtitle: prod.subtitle,
    description: prod.description,
    badgeText: prod.presentation || 'PROMOCIÓN ESPECIAL',
    price: prod.price,
    imageUrl: prod.imageUrl,
  };
}

export function promotionRowToPromotion(row: SupabasePromotionRow): PromotionItem {
  return {
    id: String(row.id || row.key.toLowerCase()).trim(),
    clave: String(row.key || 'PROMO-01').trim().toUpperCase(),
    title: String(row.title || '').trim(),
    subtitle: String(row.subtitle || '').trim(),
    description: String(row.description || '').trim(),
    badgeText: String(row.badge_text || 'PROMOCIÓN ESPECIAL').trim(),
    price: Number(row.price) || 0,
    imageUrl: String(row.image_url || '').trim(),
  };
}

/**
 * Convierte un objeto `Product` de la aplicación al formato de fila base para `public.products` en Supabase.
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
    original_price:
      product.originalPrice !== undefined && product.originalPrice !== null
        ? Number(product.originalPrice)
        : null,
    image_url: cleanImageUrl,
    image_path: resolvedImagePath,
    category: String(product.categoryId || 'lo-nuevo-en-casa').trim(),
    page: Number.isNaN(parsedPage) ? 1 : parsedPage,
    size: String(product.presentation || '').trim(),
    brand: product.brand || 'shelo',
    featured: Boolean(product.featured),
    price_tag_style: product.priceTagStyle || (product.brand === 'betterware' ? 'rose' : 'blue'),
    is_active: true,
  };
}

/**
 * Convierte una fila extendida al formato mínimo compatible con versiones anteriores de `public.products`.
 */
function stripExtendedProductColumns(
  row: Omit<SupabaseProductRow, 'id' | 'created_at' | 'updated_at'>
) {
  const {
    brand: _b,
    original_price: _op,
    featured: _f,
    price_tag_style: _pts,
    ...minimalRow
  } = row;
  return minimalRow;
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
 * Lee las promociones activas desde `public.promotions` en Supabase si la tabla existe.
 */
export async function fetchPromotionsFromSupabase(): Promise<PromotionItem[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    return (data as SupabasePromotionRow[]).map(promotionRowToPromotion);
  } catch {
    return null;
  }
}

/**
 * Verifica si existe una sesión autenticada activa en Supabase Auth (`authenticated`).
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
 * Exige sesión autenticada activa en Supabase Auth (`supabase.auth.getSession()`).
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
    let { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'key' })
      .select('*')
      .single();

    // Si la tabla remota aún no tiene columnas nuevas (brand, original_price, featured, price_tag_style), reintentamos con las columnas base
    if (
      error &&
      error.message &&
      (error.message.toLowerCase().includes('column') ||
        error.message.toLowerCase().includes('brand') ||
        error.message.toLowerCase().includes('original_price') ||
        error.message.toLowerCase().includes('featured') ||
        error.message.toLowerCase().includes('price_tag_style'))
    ) {
      const minimalPayload = stripExtendedProductColumns(payload);
      const retry = await supabase
        .from('products')
        .upsert(minimalPayload, { onConflict: 'key' })
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    // Si es una promoción, también sincronizamos de forma transparente con public.promotions si la tabla existe
    if (
      product.brand === 'promociones' ||
      product.categoryId === 'promociones-shelo' ||
      product.clave.toUpperCase().startsWith('PROMO-')
    ) {
      const promoItem = productToPromotion(product);
      void supabase
        .from('promotions')
        .upsert(
          {
            id: promoItem.id,
            key: promoItem.clave,
            title: promoItem.title,
            subtitle: promoItem.subtitle,
            description: promoItem.description,
            badge_text: promoItem.badgeText,
            price: Number(promoItem.price) || 0,
            image_url: promoItem.imageUrl,
            image_path: payload.image_path || '',
            sort_order: promoItem.clave.endsWith('2') ? 2 : 1,
            is_active: true,
          },
          { onConflict: 'id' }
        )
        .then(() => {});
    }

    return data ? rowToProduct(data as SupabaseProductRow) : product;
  } catch (err) {
    console.warn('Error en upsertProductToSupabase:', err);
    throw err;
  }
}

/**
 * Inserta o actualiza una categoría en `public.categories` de Supabase cuando existe sesión autenticada.
 */
export async function upsertCategoryToSupabase(
  category: Category,
  brand: 'shelo' | 'betterware' = 'shelo'
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return;

  try {
    await supabase.from('categories').upsert(
      {
        id: category.id,
        brand: category.id.startsWith('bw-') ? 'betterware' : brand,
        name: category.name,
        page_number: category.pageNumber,
        pdf_page: Number(category.pdfPage) || 1,
        color: category.color || '#0284C7',
        text_color: category.textColor || '#FFFFFF',
        image_url: category.imageUrl,
        description: category.description,
        is_active: true,
      },
      { onConflict: 'id' }
    );
  } catch {
    // Si la tabla public.categories aún no se ha creado en el proyecto remoto, ignorar silenciosamente
  }
}

/**
 * Sincroniza un lote de productos (ej. los 50 productos de Betterware, los 33 de Sheló NABEL y las 2 Promociones)
 * hacia `public.products` en Supabase mediante `upsert` con `onConflict: 'key'`.
 * Exige sesión autenticada activa en Supabase Auth.
 */
export async function syncProductsBatchToSupabase(products: Product[]): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error('Debes iniciar sesión en Supabase Auth para sincronizar productos.');
  }

  const rows = products.map((p) => productToRow(p));
  let { data, error } = await supabase
    .from('products')
    .upsert(rows, { onConflict: 'key' })
    .select('key');

  if (
    error &&
    error.message &&
    (error.message.toLowerCase().includes('column') ||
      error.message.toLowerCase().includes('brand') ||
      error.message.toLowerCase().includes('original_price') ||
      error.message.toLowerCase().includes('featured') ||
      error.message.toLowerCase().includes('price_tag_style'))
  ) {
    const minimalRows = rows.map(stripExtendedProductColumns);
    const retry = await supabase
      .from('products')
      .upsert(minimalRows, { onConflict: 'key' })
      .select('key');
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return data ? data.length : rows.length;
}

/**
 * Sincroniza TODOS los apartados (Sheló NABEL + Betterware + Promociones + Categorías)
 * en una sola operación autenticada hacia Supabase.
 */
export async function syncAllApartadosToSupabase(
  products: Product[],
  categories: Category[],
  promotions: PromotionItem[]
): Promise<{ totalSynced: number }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error('Debes iniciar sesión en Supabase Auth para sincronizar todos los apartados.');
  }

  const promoAsProducts = promotions.map(promotionToProduct);
  const allProductsToSync = [...products, ...promoAsProducts];
  const totalSynced = await syncProductsBatchToSupabase(allProductsToSync);

  // Sincronizar también en tablas dedicadas public.categories y public.promotions si existen
  try {
    const catRows = categories.map((c, idx) => ({
      id: c.id,
      brand: c.id.startsWith('bw-') ? 'betterware' : 'shelo',
      name: c.name,
      page_number: c.pageNumber,
      pdf_page: Number(c.pdfPage) || 1,
      color: c.color || '#0284C7',
      text_color: c.textColor || '#FFFFFF',
      image_url: c.imageUrl,
      description: c.description,
      sort_order: idx + 1,
      is_active: true,
    }));
    await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
  } catch {
    // Tabla opcional si aún no corrieron la migración de categories
  }

  try {
    const promoRows = promotions.map((p, idx) => ({
      id: p.id,
      key: p.clave,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      badge_text: p.badgeText,
      price: Number(p.price) || 0,
      image_url: p.imageUrl,
      image_path: '',
      sort_order: idx + 1,
      is_active: true,
    }));
    await supabase.from('promotions').upsert(promoRows, { onConflict: 'id' });
  } catch {
    // Tabla opcional si aún no corrieron la migración de promotions
  }

  return { totalSynced };
}

/**
 * Sube un archivo de imagen al bucket público `product-images` en la ruta
 * `products/<clave>-<timestamp>.<ext>` y devuelve su URL pública.
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

/**
 * Sube el archivo PDF completo del catálogo al bucket público `product-images`
 * en la ruta correspondiente en Supabase Storage (Sheló NABEL o Betterware).
 * Exige una sesión autenticada activa en Supabase Auth (`supabase.auth.getSession()`).
 */
export async function uploadCatalogPdfToSupabase(
  pdfBlob: Blob,
  brand: 'shelo' | 'betterware' = 'shelo'
): Promise<{ publicUrl: string; storagePath: string }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error(
      'SUPABASE_AUTH_REQUIRED: Sin sesión autenticada en Supabase Auth (subida reservada a rol authenticated).'
    );
  }

  if (!pdfBlob || pdfBlob.size === 0) {
    throw new Error('El archivo PDF obtenido está vacío.');
  }

  const targetPath =
    brand === 'betterware'
      ? BETTERWARE_CATALOG_PDF_STORAGE_PATH
      : CATALOG_PDF_STORAGE_PATH;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(targetPath, pdfBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(targetPath);
  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública del PDF en Supabase Storage.');
  }

  return {
    publicUrl: data.publicUrl,
    storagePath: targetPath,
  };
}

/**
 * Se suscribe en tiempo real a los cambios (`INSERT`, `UPDATE`, `DELETE`) de la tabla
 * `public.products` mediante Supabase Realtime (`postgres_changes`).
 */
export function subscribeToProductChanges(
  onProductsUpdated: (products: Product[]) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const client = supabase;
  const channel = client
    .channel('public:products:catalog-sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
      },
      async () => {
        const refreshedProducts = await fetchProductsFromSupabase();
        if (refreshedProducts !== null && refreshedProducts.length > 0) {
          onProductsUpdated(refreshedProducts);
        }
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
