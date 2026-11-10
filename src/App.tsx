import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CatalogData,
  Product,
  Category,
  CartItem,
  AdminStatus,
  CatalogBrand,
  PromotionItem,
} from './types';
import { INITIAL_CATALOG_DATA } from './data/initialCatalog';
import { BETTERWARE_CATALOG_DATA } from './data/betterwareCatalog';
import { INITIAL_PROMOTIONS } from './data/initialPromotions';
import { CatalogIndexMenu } from './components/CatalogIndexMenu';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { AdminModal } from './components/AdminModal';
import { CatalogLightboxModal } from './components/CatalogLightboxModal';
import { PromotionsSection } from './components/PromotionsSection';
import { useDeviceDetection } from './utils/deviceDetector';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import {
  fetchProductsFromSupabase,
  fetchPromotionsFromSupabase,
  upsertProductToSupabase,
  upsertCategoryToSupabase,
  uploadProductImageToSupabase,
  deleteProductFromSupabase,
  subscribeToProductChanges,
  promotionToProduct,
  productToPromotion,
} from './lib/supabaseCatalog';
import {
  ShoppingBag,
  Search,
  Lock,
  ShieldCheck,
  MessageCircle,
  BookOpen,
  PlusCircle,
  Sparkles,
  MapPin,
  Phone,
  Users,
  Edit3,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Download,
} from 'lucide-react';

export default function App() {
  // Automatic real-time detection of machine (Móvil, Tablet, Portátil, Escritorio) & OS (Android, iOS, Windows, macOS, Linux)
  const deviceInfo = useDeviceDetection();

  // Unique ephemeral client ID for this browser tab
  const clientIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // Catalog state synced with backend server for Sheló NABEL
  const [catalog, setCatalog] = useState<CatalogData>(INITIAL_CATALOG_DATA);

  // Active brand switcher: 'shelo' (default) | 'betterware' | 'promociones'
  const [activeBrand, setActiveBrand] = useState<CatalogBrand>('shelo');

  // Betterware catalog state with 11 categories & 50 detailed products
  const [betterwareCatalog, setBetterwareCatalog] = useState<CatalogData>(
    BETTERWARE_CATALOG_DATA as unknown as CatalogData
  );

  // Promotions state (2 large promotional flyers editable in Admin / Supabase)
  const [promotions, setPromotions] = useState<PromotionItem[]>(INITIAL_PROMOTIONS);

  // Ephemeral Admin Session Token (Memory-only: closes automatically on tab close/refresh)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const adminTokenRef = useRef<string | null>(null);
  adminTokenRef.current = adminToken;

  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdminConnected: false,
    connectedSince: null,
    activeUsersCount: 1,
  });

  // UI Navigation & Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Shopping Cart (persisted per customer in localStorage for convenience)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shelo_nabel_cart_2026');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionItem | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [showFullPdfModal, setShowFullPdfModal] = useState(false);
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [supabaseWarning, setSupabaseWarning] = useState<string>('');
  const [hasSupabaseSession, setHasSupabaseSession] = useState<boolean>(false);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | null>(null);
  const hasSupabaseSessionRef = useRef<boolean>(false);
  hasSupabaseSessionRef.current = hasSupabaseSession;
  const lastUploadedPathRef = useRef<string>('');

  const isAdmin = Boolean(adminToken);

  // Subscribe to Supabase Auth session on startup and auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setHasSupabaseSession(false);
      setSupabaseUserEmail(null);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const session = data?.session || null;
        setHasSupabaseSession(Boolean(session));
        setSupabaseUserEmail(session?.user?.email || null);
      })
      .catch(() => {
        if (!isMounted) return;
        setHasSupabaseSession(false);
        setSupabaseUserEmail(null);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setHasSupabaseSession(Boolean(session));
      setSupabaseUserEmail(session?.user?.email || null);
      if (session) {
        setSupabaseWarning('');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shelo_nabel_cart_2026', JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  // Keep cart product prices/images synced if admin updates catalog
  useEffect(() => {
    const allProducts = [...catalog.products, ...betterwareCatalog.products];
    setCart((prevCart) =>
      prevCart.map((item) => {
        const updated = allProducts.find(
          (p) => p.id === item.product.id || p.clave === item.product.clave
        );
        return updated ? { ...item, product: updated } : item;
      })
    );
  }, [catalog.products, betterwareCatalog.products]);

  // 1. Initial Fetch (Express Server + Optional Supabase Override), Supabase Realtime & SSE Multi-User Connection
  useEffect(() => {
    const clientId = clientIdRef.current;
    let isMounted = true;

    const applySupabaseProducts = (
      sbProducts: Product[],
      referenceProducts?: Product[]
    ) => {
      if (!isMounted || !sbProducts || sbProducts.length === 0) return;

      const promoSb = sbProducts.filter(
        (p) =>
          p.brand === 'promociones' ||
          p.categoryId === 'promociones-shelo' ||
          p.clave.toUpperCase().startsWith('PROMO-')
      );
      const bwSb = sbProducts.filter((p) => p.brand === 'betterware');
      const sheloSb = sbProducts.filter(
        (p) =>
          p.brand !== 'betterware' &&
          p.brand !== 'promociones' &&
          p.categoryId !== 'promociones-shelo' &&
          !p.clave.toUpperCase().startsWith('PROMO-')
      );

      if (promoSb.length > 0) {
        setPromotions((prevPromos) => {
          const basePromos = prevPromos && prevPromos.length > 0 ? prevPromos : INITIAL_PROMOTIONS;
          const sbByClave = new Map<string, PromotionItem>(
            promoSb.map((p) => {
              const converted = productToPromotion(p);
              return [converted.clave, converted];
            })
          );
          return basePromos.map((existing) => {
            const override = sbByClave.get(existing.clave);
            if (!override) return existing;
            return {
              ...existing,
              ...override,
              id: existing.id,
            };
          });
        });
      }

      if (sheloSb.length > 0) {
        const sheloSeedProducts = INITIAL_CATALOG_DATA.products;
        const initialByClave = new Map<string, Product>(
          sheloSeedProducts.map((p) => [p.clave, p])
        );

        setCatalog((prev) => {
          const baseProducts =
            referenceProducts ||
            (prev.products && prev.products.length > 0 ? prev.products : sheloSeedProducts);
          const currentByClave = new Map<string, Product>(
            baseProducts.map((p) => [p.clave, p])
          );
          const sbByClave = new Map<string, Product>(
            sheloSb.map((p) => [p.clave, p])
          );

          // Update any existing Sheló seed products that have overrides in Supabase
          const updatedExisting = baseProducts.map((prod) => {
            const sbOverride = sbByClave.get(prod.clave);
            if (!sbOverride) return prod;
            const seedProd = initialByClave.get(prod.clave);
            return {
              ...prod,
              ...sbOverride,
              id: prod.id || seedProd?.id || sbOverride.id,
              featured: prod.featured ?? seedProd?.featured ?? sbOverride.featured,
              priceTagStyle:
                prod.priceTagStyle ||
                seedProd?.priceTagStyle ||
                sbOverride.priceTagStyle ||
                'blue',
            };
          });

          // Append any brand-new Sheló products created in Supabase that weren't in baseProducts
          const extraFromSb = sheloSb
            .filter((sbProd) => !currentByClave.has(sbProd.clave))
            .map((sbProd) => ({
              ...sbProd,
              brand: 'shelo' as const,
              priceTagStyle: sbProd.priceTagStyle || 'blue',
            }));

          return {
            ...prev,
            lastUpdated: new Date().toISOString(),
            products: [...extraFromSb, ...updatedExisting],
          };
        });
      }

      if (bwSb.length > 0) {
        const bwSeedProducts = BETTERWARE_CATALOG_DATA.products as unknown as Product[];
        const bwInitialByClave = new Map<string, Product>(
          bwSeedProducts.map((p) => [p.clave, p])
        );

        setBetterwareCatalog((prev) => {
          const baseProducts = prev.products && prev.products.length > 0 ? prev.products : bwSeedProducts;
          const currentByClave = new Map<string, Product>(
            baseProducts.map((p) => [p.clave, p])
          );
          const sbByClave = new Map<string, Product>(
            bwSb.map((p) => [p.clave, p])
          );

          // Update any existing Betterware seed products that have overrides in Supabase
          const updatedExisting = baseProducts.map((prod) => {
            const sbOverride = sbByClave.get(prod.clave);
            if (!sbOverride) return prod;
            const seedProd = bwInitialByClave.get(prod.clave);
            return {
              ...prod,
              ...sbOverride,
              id: prod.id || seedProd?.id || sbOverride.id,
              originalPrice: prod.originalPrice ?? seedProd?.originalPrice,
              featured: prod.featured ?? seedProd?.featured ?? sbOverride.featured,
              priceTagStyle:
                prod.priceTagStyle || seedProd?.priceTagStyle || sbOverride.priceTagStyle || 'rose',
            };
          });

          // Append any brand-new Betterware products created in Supabase that weren't in baseProducts
          const extraFromSb = bwSb
            .filter((sbProd) => !currentByClave.has(sbProd.clave))
            .map((sbProd) => ({
              ...sbProd,
              brand: 'betterware' as const,
              priceTagStyle: sbProd.priceTagStyle || 'rose',
            }));

          return {
            ...prev,
            lastUpdated: new Date().toISOString(),
            products: [...extraFromSb, ...updatedExisting],
          };
        });
      }
    };

    async function loadInitialCatalog() {
      let localServerCatalog: CatalogData | null = null;
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        if (!isMounted) return;
        if (data.catalog) {
          localServerCatalog = data.catalog as CatalogData;
          setCatalog(data.catalog);
        }
        if (data.betterwareCatalog) {
          setBetterwareCatalog(data.betterwareCatalog);
        }
        if (Array.isArray(data.promotions) && data.promotions.length > 0) {
          setPromotions(data.promotions);
        }
        if (data.adminStatus) {
          setAdminStatus(data.adminStatus);
        }
      } catch (err) {
        console.error('Error loading local catalog:', err);
      }

      // Prioritize reading products & promotions from Supabase when configured; fall back to local server / initialCatalog only if unavailable
      if (isSupabaseConfigured) {
        const [sbProducts, sbPromos] = await Promise.all([
          fetchProductsFromSupabase(),
          fetchPromotionsFromSupabase(),
        ]);
        if (sbProducts && sbProducts.length > 0) {
          applySupabaseProducts(sbProducts, localServerCatalog?.products);
        }
        if (sbPromos && sbPromos.length > 0) {
          setPromotions((prevPromos) => {
            const basePromos = prevPromos && prevPromos.length > 0 ? prevPromos : INITIAL_PROMOTIONS;
            const byClave = new Map(sbPromos.map((p) => [p.clave.toUpperCase(), p]));
            return basePromos.map((existing) => {
              const override = byClave.get(existing.clave.toUpperCase());
              return override ? { ...existing, ...override, id: existing.id } : existing;
            });
          });
        }
      }
    }

    loadInitialCatalog();

    // Subscribe to Supabase Realtime (postgres_changes on public.products)
    const unsubscribeRealtime = subscribeToProductChanges((refreshedProducts) => {
      applySupabaseProducts(refreshedProducts);
    });

    const eventSource = new EventSource(`/api/events?clientId=${encodeURIComponent(clientId)}`);

    eventSource.addEventListener('catalog:updated', (event) => {
      try {
        const updatedCatalog = JSON.parse((event as MessageEvent).data) as CatalogData;
        setCatalog(updatedCatalog);
      } catch (err) {
        console.error('Error parsing catalog update:', err);
      }
    });

    eventSource.addEventListener('betterware:updated', (event) => {
      try {
        const updatedBwCatalog = JSON.parse((event as MessageEvent).data) as CatalogData;
        setBetterwareCatalog(updatedBwCatalog);
      } catch (err) {
        console.error('Error parsing Betterware catalog update:', err);
      }
    });

    eventSource.addEventListener('promotions:updated', (event) => {
      try {
        const updatedPromotions = JSON.parse((event as MessageEvent).data) as PromotionItem[];
        if (Array.isArray(updatedPromotions)) {
          setPromotions(updatedPromotions);
        }
      } catch (err) {
        console.error('Error parsing promotions update:', err);
      }
    });

    eventSource.addEventListener('admin:status', (event) => {
      try {
        const status = JSON.parse((event as MessageEvent).data) as AdminStatus;
        setAdminStatus(status);
        // If server reports no admin is connected, clear local token
        if (!status.isAdminConnected && adminTokenRef.current) {
          setAdminToken(null);
        }
      } catch (err) {
        console.error('Error parsing admin status:', err);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeRealtime();
      eventSource.close();
    };
  }, []);

  // 2. Heartbeat while Admin is connected
  useEffect(() => {
    if (!adminToken) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/heartbeat', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        if (!res.ok) {
          setAdminToken(null);
        }
      } catch {
        // Network hiccup
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [adminToken]);

  // 3. Automatic Admin Logout when closing browser window/tab
  useEffect(() => {
    const handleWindowUnload = () => {
      const currentToken = adminTokenRef.current;
      if (currentToken && navigator.sendBeacon) {
        const payload = JSON.stringify({ token: currentToken });
        navigator.sendBeacon('/api/admin/logout', payload);
      }
    };

    window.addEventListener('beforeunload', handleWindowUnload);
    window.addEventListener('pagehide', handleWindowUnload);
    return () => {
      window.removeEventListener('beforeunload', handleWindowUnload);
      window.removeEventListener('pagehide', handleWindowUnload);
    };
  }, []);

  // Cart Handlers
  const handleAddToCart = useCallback((product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const handleUpdateCartQty = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const handleRemoveCartItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Admin Auth & CRUD Handlers
  const handleAdminLogin = async (password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          clientId: clientIdRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.adminStatus) setAdminStatus(data.adminStatus);
        return { ok: false, error: data.error || 'Error de autenticación.' };
      }
      setAdminToken(data.token);
      if (data.adminStatus) setAdminStatus(data.adminStatus);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Error de conexión con el servidor.' };
    }
  };

  const handleAdminLogout = async () => {
    const token = adminTokenRef.current;
    setAdminToken(null);
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Ignore error
    }
  };

  const handleUploadFile = async (file: File, key?: string): Promise<string> => {
    setSupabaseWarning('');

    // CASE A: Active Supabase Auth session -> Upload exclusively to Supabase Storage bucket 'product-images'
    if (isSupabaseConfigured && hasSupabaseSessionRef.current) {
      try {
        const { publicUrl, imagePath } = await uploadProductImageToSupabase(
          file,
          key || 'producto'
        );
        lastUploadedPathRef.current = imagePath;
        return publicUrl;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(
          `No se pudo subir la imagen al bucket product-images de Supabase: ${detail}`
        );
      }
    }

    // CASE B: No Supabase Auth session -> Try controlled check, then use Express/SSE fallback with non-blocking warning
    if (isSupabaseConfigured) {
      try {
        const { publicUrl, imagePath } = await uploadProductImageToSupabase(
          file,
          key || 'producto'
        );
        lastUploadedPathRef.current = imagePath;
        return publicUrl;
      } catch (err) {
        console.warn('Fallo controlado al subir imagen a Supabase Storage, usando servidor actual:', err);
        setSupabaseWarning(
          'Sin sesión de Supabase Auth activa; la imagen se guardó en el servidor actual.'
        );
      }
    }

    // Fallback / Standard upload to Express server
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminTokenRef.current}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              dataUrl,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error subiendo imagen');
          resolve(data.imageUrl);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProduct = async (productId: string, updates: Partial<Product>) => {
    setSupabaseWarning('');
    const existing =
      catalog.products.find((p) => p.id === productId) ||
      betterwareCatalog.products.find((p) => p.id === productId);
    const isBw = existing?.brand === 'betterware' || updates.brand === 'betterware';

    // CASE A: Active Supabase Auth session -> Persist exclusively in Supabase (public.products)
    if (isSupabaseConfigured && hasSupabaseSessionRef.current) {
      if (!existing) {
        throw new Error('No se encontró el producto seleccionado para actualizar.');
      }
      const productToSync: Product = { ...existing, ...updates };
      try {
        const savedInSb = await upsertProductToSupabase(
          productToSync,
          lastUploadedPathRef.current || undefined
        );
        lastUploadedPathRef.current = '';

        const updatedProduct: Product = {
          ...(savedInSb || productToSync),
          id: existing.id,
          featured: existing.featured,
          priceTagStyle: existing.priceTagStyle || (isBw ? 'rose' : 'blue'),
        };

        if (isBw) {
          setBetterwareCatalog((prev) => ({
            ...prev,
            lastUpdated: new Date().toISOString(),
            products: prev.products.map((p) => (p.id === productId ? updatedProduct : p)),
          }));
        } else {
          setCatalog((prev) => ({
            ...prev,
            lastUpdated: new Date().toISOString(),
            products: prev.products.map((p) => (p.id === productId ? updatedProduct : p)),
          }));
        }

        // Also mirror update to Express backend so local server JSON & SSE clients stay in sync
        if (adminTokenRef.current) {
          void fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminTokenRef.current}`,
            },
            body: JSON.stringify({ ...updatedProduct, brand: isBw ? 'betterware' : 'shelo' }),
          }).catch(() => {});
        }
        return;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`Error al guardar el producto en Supabase: ${detail}`);
      }
    }

    // CASE B: No Supabase Auth session -> Update via Express/SSE server (supports both Sheló & Betterware)
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenRef.current}`,
      },
      body: JSON.stringify({
        ...updates,
        clave: updates.clave ?? existing?.clave,
        brand: isBw ? 'betterware' : 'shelo',
      }),
    });
    const data = await res.json();
    let finalProduct: Product | undefined = data?.product;

    if (res.ok) {
      if (data.catalog) setCatalog(data.catalog);
      if (data.betterwareCatalog) setBetterwareCatalog(data.betterwareCatalog);
    } else if (existing) {
      finalProduct = { ...existing, ...updates };
      if (isBw) {
        setBetterwareCatalog((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === productId ? finalProduct! : p)),
        }));
      } else {
        setCatalog((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === productId ? finalProduct! : p)),
        }));
      }
    }

    if (isSupabaseConfigured && (finalProduct || existing)) {
      const productToSync: Product = finalProduct || { ...existing!, ...updates };
      try {
        await upsertProductToSupabase(productToSync, lastUploadedPathRef.current);
        lastUploadedPathRef.current = '';
      } catch (err) {
        console.warn('Fallo controlado sincronizando producto en Supabase:', err);
        setSupabaseWarning(
          'Sin sesión de Supabase Auth activa; el cambio se conservó en el catálogo actual.'
        );
      }
    }
  };

  const handleCreateProduct = async (newProd: Partial<Product>) => {
    setSupabaseWarning('');
    const isBw = newProd.brand === 'betterware';

    // CASE A: Active Supabase Auth session -> Create exclusively in Supabase (public.products)
    if (isSupabaseConfigured && hasSupabaseSessionRef.current) {
      const cleanClave = String(newProd.clave || (isBw ? '26999' : 'SN2026')).trim();
      const productToCreate: Product = {
        id: isBw ? `bw-${cleanClave.toLowerCase()}` : `prod-${cleanClave.toLowerCase()}`,
        clave: cleanClave,
        name: String(
          newProd.name || (isBw ? 'Nuevo Producto Betterware' : 'Nuevo Producto Sheló NABEL')
        ).trim(),
        subtitle: String(
          newProd.subtitle || (isBw ? 'Soluciones Prácticas para tu Hogar' : 'Calidad Natural Sheló NABEL')
        ).trim(),
        presentation: String(newProd.presentation || (isBw ? '1 pza' : '250 ml')).trim(),
        price: Number(newProd.price) || 199,
        categoryId: String(
          newProd.categoryId ||
            (isBw ? betterwareCatalog.categories[0]?.id : catalog.categories[0]?.id) ||
            'lo-nuevo-en-casa'
        ).trim(),
        catalogPage: String(newProd.catalogPage || '01').trim(),
        description: String(newProd.description || '').trim(),
        imageUrl: String(
          newProd.imageUrl || (isBw ? '/assets/betterware/page_001.jpg' : '/assets/catalog/page_003.jpg')
        ).trim(),
        brand: isBw ? 'betterware' : 'shelo',
        priceTagStyle: isBw ? 'rose' : 'blue',
      };

      try {
        const createdInSb = await upsertProductToSupabase(
          productToCreate,
          lastUploadedPathRef.current || undefined
        );
        lastUploadedPathRef.current = '';

        const finalProduct: Product = {
          ...(createdInSb || productToCreate),
          priceTagStyle: productToCreate.priceTagStyle || (isBw ? 'rose' : 'blue'),
        };

        if (isBw) {
          setBetterwareCatalog((prev) => {
            const existingIdx = prev.products.findIndex((p) => p.clave === finalProduct.clave);
            const nextProducts =
              existingIdx >= 0
                ? prev.products.map((p, idx) => (idx === existingIdx ? finalProduct : p))
                : [...prev.products, finalProduct];
            return {
              ...prev,
              lastUpdated: new Date().toISOString(),
              products: nextProducts,
            };
          });
        } else {
          setCatalog((prev) => {
            const existingIdx = prev.products.findIndex((p) => p.clave === finalProduct.clave);
            const nextProducts =
              existingIdx >= 0
                ? prev.products.map((p, idx) => (idx === existingIdx ? finalProduct : p))
                : [...prev.products, finalProduct];
            return {
              ...prev,
              lastUpdated: new Date().toISOString(),
              products: nextProducts,
            };
          });
        }
        // Also mirror creation to Express backend so local server JSON & SSE clients stay in sync
        if (adminTokenRef.current) {
          void fetch('/api/admin/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminTokenRef.current}`,
            },
            body: JSON.stringify(finalProduct),
          }).catch(() => {});
        }
        return;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`Error al crear el producto en Supabase: ${detail}`);
      }
    }

    // CASE B: No Supabase Auth session -> Express/SSE server (supports both Sheló & Betterware)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenRef.current}`,
      },
      body: JSON.stringify(newProd),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.catalog) setCatalog(data.catalog);
      if (data.betterwareCatalog) setBetterwareCatalog(data.betterwareCatalog);
    }

    if (isSupabaseConfigured && data?.product) {
      try {
        await upsertProductToSupabase(data.product, lastUploadedPathRef.current);
        lastUploadedPathRef.current = '';
      } catch (err) {
        console.warn('Fallo controlado creando producto en Supabase:', err);
        setSupabaseWarning(
          'Sin sesión de Supabase Auth activa; el producto se conservó en el servidor actual.'
        );
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setSupabaseWarning('');
    const targetProduct =
      catalog.products.find((p) => p.id === productId) ||
      betterwareCatalog.products.find((p) => p.id === productId);
    const isBw = targetProduct?.brand === 'betterware';
    const claveQuery = targetProduct?.clave
      ? `?clave=${encodeURIComponent(targetProduct.clave)}`
      : '';

    // CASE A: Active Supabase Auth session -> Delete from Supabase (public.products) & mirror to Express
    if (isSupabaseConfigured && hasSupabaseSessionRef.current) {
      if (!targetProduct) {
        throw new Error('No se encontró el producto a eliminar.');
      }
      try {
        await deleteProductFromSupabase(targetProduct);
        if (isBw) {
          setBetterwareCatalog((prev) => ({
            ...prev,
            lastUpdated: new Date().toISOString(),
            products: prev.products.filter((p) => p.id !== productId),
          }));
        } else {
          setCatalog((prev) => ({
            ...prev,
            lastUpdated: new Date().toISOString(),
            products: prev.products.filter((p) => p.id !== productId),
          }));
        }

        if (adminTokenRef.current) {
          void fetch(`/api/admin/products/${encodeURIComponent(productId)}${claveQuery}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${adminTokenRef.current}`,
            },
          }).catch(() => {});
        }
        return;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`Error al eliminar el producto en Supabase: ${detail}`);
      }
    }

    // CASE B: No Supabase Auth session -> Express server (supports both Sheló & Betterware)
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}${claveQuery}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminTokenRef.current}`,
      },
    });
    const data = await res.json();
    if (res.ok) {
      if (data.catalog) setCatalog(data.catalog);
      if (data.betterwareCatalog) setBetterwareCatalog(data.betterwareCatalog);
    } else if (isBw) {
      setBetterwareCatalog((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
    } else {
      setCatalog((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
    }

    if (isSupabaseConfigured && targetProduct) {
      try {
        await deleteProductFromSupabase(targetProduct);
      } catch (err) {
        console.warn('Fallo controlado eliminando producto en Supabase:', err);
        setSupabaseWarning(
          'Sin sesión de Supabase Auth activa; la eliminación se aplicó en el servidor actual.'
        );
      }
    }
  };

  const handleSaveCategory = async (categoryId: string, updates: Partial<Category>) => {
    const res = await fetch(`/api/admin/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenRef.current}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.catalog) setCatalog(data.catalog);
      if (data.betterwareCatalog) setBetterwareCatalog(data.betterwareCatalog);
    }

    if (isSupabaseConfigured && hasSupabaseSessionRef.current) {
      const allCats = [...catalog.categories, ...betterwareCatalog.categories];
      const existingCat = allCats.find((c) => c.id === categoryId);
      if (existingCat) {
        await upsertCategoryToSupabase(
          { ...existingCat, ...updates },
          categoryId.startsWith('bw-') ? 'betterware' : 'shelo'
        );
      }
    }
  };

  const handleSavePromotion = async (promoId: string, updates: Partial<PromotionItem>) => {
    setSupabaseWarning('');
    const existingPromo =
      promotions.find((p) => p.id === promoId || p.clave === promoId) || INITIAL_PROMOTIONS[0];
    const mergedPromo: PromotionItem = {
      ...existingPromo,
      ...updates,
      id: existingPromo.id,
      clave: existingPromo.clave,
    };

    // CASE A: Authenticated Supabase session -> persist in public.products + sync local server
    if (isSupabaseConfigured && hasSupabaseSessionRef.current) {
      const asProduct = promotionToProduct(mergedPromo);
      const savedProd = await upsertProductToSupabase(asProduct);
      const converted = savedProd ? productToPromotion(savedProd) : mergedPromo;
      setPromotions((prev) =>
        prev.map((p) => (p.id === existingPromo.id ? { ...mergedPromo, ...converted, id: existingPromo.id } : p))
      );

      fetch(`/api/admin/promotions/${encodeURIComponent(existingPromo.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenRef.current}`,
        },
        body: JSON.stringify(mergedPromo),
      }).catch(() => {});
      return;
    }

    // CASE B: Local Express server persistence + SSE broadcast
    const res = await fetch(`/api/admin/promotions/${encodeURIComponent(existingPromo.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminTokenRef.current}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.promotions)) {
      setPromotions(data.promotions);
    } else {
      setPromotions((prev) =>
        prev.map((p) => (p.id === existingPromo.id ? mergedPromo : p))
      );
    }

    if (isSupabaseConfigured) {
      try {
        await upsertProductToSupabase(promotionToProduct(mergedPromo));
      } catch (err) {
        console.warn('Fallo controlado guardando promoción en Supabase:', err);
        setSupabaseWarning(
          'Sin sesión de Supabase Auth activa; la promoción se guardó en el servidor actual.'
        );
      }
    }
  };

  const currentCatalog = activeBrand === 'betterware' ? betterwareCatalog : catalog;

  // Computed Product Counts & Filtered Products
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of currentCatalog.categories) counts[c.id] = 0;
    for (const p of currentCatalog.products) {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    }
    return counts;
  }, [currentCatalog.categories, currentCatalog.products]);

  const filteredProducts = useMemo(() => {
    return currentCatalog.products.filter((p) => {
      const matchesCategory = !selectedCategoryId || p.categoryId === selectedCategoryId;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.clave.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [currentCatalog.products, selectedCategoryId, searchQuery]);

  const categoriesMap = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of [...catalog.categories, ...betterwareCatalog.categories]) {
      map[c.id] = c;
    }
    return map;
  }, [catalog.categories, betterwareCatalog.categories]);

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalAmount = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const activeCategory = selectedCategoryId ? categoriesMap[selectedCategoryId] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="#inicio"
            className="text-xl sm:text-2xl font-bold tracking-tight text-sky-900 whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {activeBrand === 'betterware'
              ? 'Betterware'
              : activeBrand === 'promociones'
              ? 'Promociones Sheló NABEL'
              : 'Sheló NABEL'}
          </a>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
            {activeBrand === 'betterware'
              ? 'Noviembre 2026'
              : activeBrand === 'promociones'
              ? 'Afiliación y Membresía'
              : 'Edición 2026'}
          </span>
        </div>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#inicio"
            className="hover:text-sky-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Inicio
          </a>
          <a
            href="#apartado-promociones"
            onClick={() => setActiveBrand('promociones')}
            className="hover:text-sky-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 font-semibold text-sky-700"
          >
            Promociones
          </a>
          <a
            href="#indice-catalogo"
            className="hover:text-sky-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Índice del Catálogo
          </a>
          <a
            href="#productos-catalogo"
            className="hover:text-sky-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Productos y Precios
          </a>
          <a
            href="#contacto-transferencia"
            className="hover:text-sky-800 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Transferencia y Contacto
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button (Shopping Cart) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Carrito ({cartTotalItems})</span>
            {cartTotalAmount > 0 && (
              <span className="font-mono-num pl-1 border-l border-sky-500">
                ${cartTotalAmount.toLocaleString('es-MX')}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Brand Switcher Bar & Dual PDF Downloads */}
      <div className="bg-slate-100/95 border-b border-slate-200 py-3 px-4 sm:px-8">
        <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand Switcher Tabs */}
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-1">
              Apartado:
            </span>
            <div className="inline-flex flex-wrap rounded-xl p-1 bg-slate-200/90 shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveBrand('shelo');
                  setSelectedCategoryId(null);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  activeBrand === 'shelo'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>🌿 Sheló NABEL ({catalog.products.length} Productos)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveBrand('betterware');
                  setSelectedCategoryId(null);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  activeBrand === 'betterware'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>🏠 Betterware Noviembre 2026 ({betterwareCatalog.products.length} Productos)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveBrand('promociones');
                }}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  activeBrand === 'promociones'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>✨ Promociones ({promotions.length})</span>
              </button>
            </div>
          </div>

          {/* Dual PDF Direct Download Links */}
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
            <span className="text-xs font-semibold text-slate-500 hidden lg:inline">
              Descargar Catálogos:
            </span>
            <a
              href="/api/catalog/pdf"
              download="Catalogo_Shelo_NABEL_2026.pdf"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Descargar Catálogo Oficial Sheló NABEL 2026 (PDF · 148 páginas)"
            >
              <Download className="w-3.5 h-3.5 text-sky-700" />
              <span>PDF Sheló NABEL (148 págs)</span>
            </a>
            <a
              href="/api/catalog/betterware/pdf"
              download="Catalogo_Betterware_Noviembre_2026.pdf"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Descargar Catálogo Oficial Betterware Noviembre 2026 (PDF · 118 páginas)"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>PDF Betterware (118 págs)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {/* When activeBrand === 'promociones', show the Extra-Large Promotions Section right at the top */}
        {activeBrand === 'promociones' && (
          <PromotionsSection
            promotions={promotions}
            isAdmin={isAdmin}
            whatsappNumber={catalog.whatsappNumber}
            onSavePromotion={handleSavePromotion}
            onUploadFile={handleUploadFile}
            onOpenAdminPromotionsTab={(promo) => {
              setEditingProduct(null);
              setEditingCategory(null);
              setEditingPromotion(promo || promotions[0] || null);
              setIsAdminModalOpen(true);
            }}
          />
        )}

        {/* HERO SECTION: Dynamic according to selected Brand */}
        {activeBrand === 'betterware' ? (
          <section
            id="inicio"
            className="relative overflow-hidden bg-gradient-to-b from-amber-50/80 via-white to-[#F8FAFC] border-b border-slate-200/80 pt-8 pb-14 px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: High-Res Betterware Cover Page 001 */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative p-2 rounded-2xl bg-white shadow-xl border-2 border-amber-200/90 max-w-xs sm:max-w-sm">
                  <img
                    src="/assets/betterware/page_001.jpg"
                    alt="Catálogo Oficial Betterware Noviembre 2026 — Edición Navidad y Hogar — Yesenia Jiménez"
                    className="w-full h-auto rounded-xl object-contain shadow-xs"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
                    }}
                  />
                  <div className="absolute -bottom-3 -right-3 bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md">
                    118 Páginas Oficiales
                  </div>
                </div>
              </div>

              {/* Right Column: Betterware Editorial Presentation & Interactive Actions */}
              <div className="lg:col-span-7 text-center lg:text-left space-y-6">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-amber-800">
                  <span>Soluciones para el Hogar</span>
                  <span aria-hidden="true">·</span>
                  <span>Cocina y Organización</span>
                  <span aria-hidden="true">·</span>
                  <span>Navidad & Novedades</span>
                  <span aria-hidden="true">·</span>
                  <span>Catálogo Noviembre 2026</span>
                </div>

                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08]"
                  style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
                >
                  Betterware: Soluciones Prácticas para tu Hogar y Familia
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Explora el catálogo oficial de Noviembre 2026 estructurado en {betterwareCatalog.categories.length} categorías con {betterwareCatalog.products.length} productos detallados: Árbol Fiestas Navideñas, dispensador Vitrolux, charolas de chef, muebles modulares, freidoras, recámara, bienestar y Better Locura. Agrega tus favoritos al carrito y coordina tu pedido por transferencia con{' '}
                  <strong className="text-slate-900">Yesenia Jiménez</strong> en Hermosillo, Sonora.
                </p>

                {/* Primary Hero CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <a
                    href="#indice-catalogo"
                    className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Explorar Categorías Betterware (11)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Ver Carrito y Pedir por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPdfStartPage(1);
                      setShowFullPdfModal(true);
                    }}
                    className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Ver Visor Betterware (118 Págs)</span>
                  </button>

                  <a
                    href="/api/catalog/betterware/pdf"
                    download="Catalogo_Betterware_Noviembre_2026.pdf"
                    className="px-5 py-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-amber-700" />
                    <span>Descargar PDF Betterware</span>
                  </a>
                </div>

                {/* Multi-User & Admin Access Toolbar Strip */}
                <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-between gap-4 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Yesenia Jiménez · Hermosillo, Sonora</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <a
                      href="https://wa.me/526321037155"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono-num font-semibold text-emerald-700 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>+52 632 103 7155</span>
                    </a>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 font-mono-num text-slate-500">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {adminStatus.activeUsersCount}{' '}
                        {adminStatus.activeUsersCount === 1
                          ? 'usuario en línea'
                          : 'usuarios en línea'}
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className="flex items-center gap-1.5 font-medium text-amber-900"
                      title={`Modo adaptado automáticamente: ${deviceInfo.environmentLabel} · Resolución ${deviceInfo.viewportWidth}x${deviceInfo.viewportHeight} (${deviceInfo.orientation})`}
                    >
                      {deviceInfo.machineCategory === 'mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                      ) : deviceInfo.machineCategory === 'tablet' ? (
                        <Tablet className="w-3.5 h-3.5 text-amber-700" />
                      ) : deviceInfo.machineCategory === 'laptop' ? (
                        <Laptop className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-amber-700" />
                      )}
                      <span>
                        Detectado: <strong>{deviceInfo.machineLabel}</strong> ({deviceInfo.os} · {deviceInfo.browser})
                      </span>
                    </span>
                  </div>

                  {/* Admin Access Button */}
                  <div>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setEditingCategory(null);
                          setIsAdminModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Panel Administrativo Activo (Editar Precios / Imágenes)</span>
                      </button>
                    ) : adminStatus.isAdminConnected ? (
                      <button
                        type="button"
                        onClick={() => setIsAdminModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-2 transition-colors"
                        title="El administrador está conectado actualmente; el acceso a la clave está bloqueado para otros usuarios"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Administrador en Sesión (Clave Bloqueada)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setEditingCategory(null);
                          setIsAdminModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Panel Administrativo (****)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section
            id="inicio"
            className="relative overflow-hidden bg-gradient-to-b from-sky-50/90 via-white to-[#F8FAFC] border-b border-slate-200/80 pt-8 pb-14 px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Large Prominent Logo WA0029 */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative p-3 sm:p-4 rounded-full bg-white shadow-xl border-2 border-sky-200/90">
                  <img
                    src="/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg"
                    alt="Logo Oficial Sheló NABEL — Belleza, naturaleza y bienestar — Yesenia Jiménez"
                    className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[370px] lg:h-[370px] rounded-full object-contain"
                  />
                </div>
              </div>

              {/* Right Column: Editorial Presentation & Interactive Actions */}
              <div className="lg:col-span-7 text-center lg:text-left space-y-6">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-sky-800">
                  <span>Productos de Belleza</span>
                  <span aria-hidden="true">·</span>
                  <span>Productos Naturales</span>
                  <span aria-hidden="true">·</span>
                  <span>Cuidado Personal</span>
                  <span aria-hidden="true">·</span>
                  <span>Catálogo Oficial 2026</span>
                </div>

                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08]"
                  style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
                >
                  Sheló NABEL: Belleza, Naturaleza y Bienestar para Ti
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Explora el catálogo interactivo completo estructurado por categorías. Agrega tus productos favoritos al carrito de compras y coordina tu pago por transferencia bancaria directamente por WhatsApp con{' '}
                  <strong className="text-slate-900">Yesenia Jiménez</strong> en Hermosillo, Sonora.
                </p>

                {/* Primary Hero CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <a
                    href="#indice-catalogo"
                    className="px-6 py-3.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Explorar Categorías Sheló NABEL (13)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Ver Carrito y Pedir por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPdfStartPage(1);
                      setShowFullPdfModal(true);
                    }}
                    className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-sky-700" />
                    <span>Ver Visor Sheló (148 Págs)</span>
                  </button>

                  <a
                    href="/api/catalog/pdf"
                    download="Catalogo_Shelo_NABEL_2026.pdf"
                    className="px-5 py-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-sky-700" />
                    <span>Descargar PDF Sheló</span>
                  </a>
                </div>

                {/* Multi-User & Admin Access Toolbar Strip */}
                <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-between gap-4 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-sky-700" />
                      <span>Yesenia Jiménez · Hermosillo, Sonora</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <a
                      href="https://wa.me/526321037155"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono-num font-semibold text-emerald-700 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>+52 632 103 7155</span>
                    </a>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 font-mono-num text-slate-500">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      <span>
                        {adminStatus.activeUsersCount}{' '}
                        {adminStatus.activeUsersCount === 1
                          ? 'usuario en línea'
                          : 'usuarios en línea'}
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className="flex items-center gap-1.5 font-medium text-sky-800"
                      title={`Modo adaptado automáticamente: ${deviceInfo.environmentLabel} · Resolución ${deviceInfo.viewportWidth}x${deviceInfo.viewportHeight} (${deviceInfo.orientation})`}
                    >
                      {deviceInfo.machineCategory === 'mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-sky-700" />
                      ) : deviceInfo.machineCategory === 'tablet' ? (
                        <Tablet className="w-3.5 h-3.5 text-sky-700" />
                      ) : deviceInfo.machineCategory === 'laptop' ? (
                        <Laptop className="w-3.5 h-3.5 text-sky-700" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-sky-700" />
                      )}
                      <span>
                        Detectado: <strong>{deviceInfo.machineLabel}</strong> ({deviceInfo.os} · {deviceInfo.browser})
                      </span>
                    </span>
                  </div>

                  {/* Admin Access Button respecting Single-Session Lock */}
                  <div>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setEditingCategory(null);
                          setIsAdminModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Panel Administrativo Activo (Editar Precios / Imágenes)</span>
                      </button>
                    ) : adminStatus.isAdminConnected ? (
                      <button
                        type="button"
                        onClick={() => setIsAdminModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-2 transition-colors"
                        title="El administrador está conectado actualmente; el acceso a la clave está bloqueado para otros usuarios"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Administrador en Sesión (Clave Bloqueada)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setEditingCategory(null);
                          setIsAdminModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Panel Administrativo (****)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Apartado de Promociones (Imágenes Grandes) enseguida de Sheló NABEL y Betterware */}
        {activeBrand !== 'promociones' && (
          <PromotionsSection
            promotions={promotions}
            isAdmin={isAdmin}
            whatsappNumber={catalog.whatsappNumber}
            onSavePromotion={handleSavePromotion}
            onUploadFile={handleUploadFile}
            onOpenAdminPromotionsTab={(promo) => {
              setEditingProduct(null);
              setEditingCategory(null);
              setEditingPromotion(promo || promotions[0] || null);
              setIsAdminModalOpen(true);
            }}
          />
        )}

        {/* SECTION 2: Interactive Menu Structured Like WA0027 ("Índice") */}
        <CatalogIndexMenu
          categories={currentCatalog.categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          productCounts={productCounts}
          isAdmin={isAdmin}
          currentBrand={activeBrand === 'betterware' ? 'betterware' : 'shelo'}
          onEditCategory={(cat) => {
            setEditingCategory(cat);
            setEditingProduct(null);
            setIsAdminModalOpen(true);
          }}
          onOpenPdfViewer={(pageNumber) => {
            setPdfStartPage(pageNumber || 1);
            setShowFullPdfModal(true);
          }}
        />

        {/* SECTION 3: Full Catalog Products Developed Over the Menu Categories */}
        <section
          id="productos-catalogo"
          className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto space-y-8"
        >
          {/* Products Section Header & Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700">
                  <span>
                    {activeBrand === 'betterware'
                      ? 'Catálogo Interactivo Betterware Noviembre 2026'
                      : 'Catálogo Interactivo Sheló NABEL 2026'}
                  </span>
                  {activeCategory && (
                    <>
                      <span>·</span>
                      <span>Pág. {activeCategory.pageNumber}</span>
                    </>
                  )}
                </div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {activeCategory ? activeCategory.name : 'Todos los Productos del Catálogo'}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {activeCategory
                    ? activeCategory.description
                    : 'Precios oficiales en pesos mexicanos (MXN). Haz clic en cualquier imagen para verla en grande o agrega productos a tu carrito.'}
                </p>
              </div>

              {/* Search Input & Admin Quick Add Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative min-w-[260px] sm:min-w-[300px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeBrand === 'betterware'
                        ? 'Buscar por nombre o clave (ej. 26625)...'
                        : 'Buscar por nombre o clave (ej. S1701)...'
                    }
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setEditingCategory(null);
                      setIsAdminModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-sky-400" />
                    <span>Subir Imagen / Editar Precios</span>
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Quick Category Switcher matching categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategoryId === null
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas las Categorías ({currentCatalog.products.length})
              </button>

              {currentCatalog.categories.map((cat) => {
                const active = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(active ? null : cat.id)}
                    style={
                      active
                        ? {
                            backgroundColor: cat.color,
                            color: cat.textColor || '#FFFFFF',
                          }
                        : undefined
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      active
                        ? 'shadow-xs scale-[1.02]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: active ? '#FFFFFF' : cat.color,
                      }}
                    />
                    <span>
                      {cat.pageNumber}. {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-900">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>
                    <strong>Modo Administrador Activo:</strong> Puedes hacer clic directamente sobre el precio en cualquier imagen para cambiarlo al instante, o hacer clic en <em>&ldquo;Cambiar Imagen / Precio&rdquo;</em> para subir una foto desde tu computadora o mediante URL.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="text-rose-700 font-bold hover:underline whitespace-nowrap shrink-0"
                >
                  Cerrar sesión ahora
                </button>
              </div>
            )}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <p className="text-lg font-semibold text-slate-800">
                No se encontraron productos con ese criterio de búsqueda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSearchQuery('');
                }}
                className="px-5 py-2.5 rounded-xl bg-sky-700 text-white text-sm font-semibold hover:bg-sky-800 transition-colors"
              >
                Ver todos los productos del catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  category={categoriesMap[product.categoryId]}
                  isAdmin={isAdmin}
                  onAddToCart={handleAddToCart}
                  onEditProduct={(prod) => {
                    setEditingProduct(prod);
                    setEditingCategory(null);
                    setIsAdminModalOpen(true);
                  }}
                  onQuickPriceSave={async (prodId, newPrice) => {
                    await handleSaveProduct(prodId, { price: newPrice });
                  }}
                  onPreviewImage={(prod) => setPreviewProduct(prod)}
                />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 4: WhatsApp Bank Transfer & Official Distributor Contact Section */}
        <section
          id="contacto-transferencia"
          className="py-12 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto"
        >
          <div className="bg-gradient-to-br from-sky-900 via-sky-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
                Compra Segura y Atención Personalizada
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                 ¿Cómo realizar tu pedido y pagar por transferencia?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <span className="text-xs font-mono-num text-sky-300 font-bold">
                    01. ELIGE EN EL MENÚ
                  </span>
                  <p className="text-sm font-semibold mt-1">
                    Explora el Índice del Catálogo
                  </p>
                  <p className="text-xs text-sky-100/80 mt-1">
                    Navega por las 13 categorías oficiales Sheló NABEL y agrega tus productos al carrito.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <span className="text-xs font-mono-num text-sky-300 font-bold">
                    02. ENVÍA TU CARRITO
                  </span>
                  <p className="text-sm font-semibold mt-1">
                    Conecta por WhatsApp
                  </p>
                  <p className="text-xs text-sky-100/80 mt-1">
                    Tu pedido se envía automáticamente detallado al WhatsApp +52 632 103 7155.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <span className="text-xs font-mono-num text-sky-300 font-bold">
                    03. TRANSFERENCIA
                  </span>
                  <p className="text-sm font-semibold mt-1">
                    Recibe Datos Bancarios
                  </p>
                  <p className="text-xs text-sky-100/80 mt-1">
                    Yesenia Jiménez confirma existencias y te comparte los datos para tu transferencia.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white text-slate-900 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg"
                  alt="Logo Sheló NABEL"
                  className="w-14 h-14 rounded-full object-contain border border-sky-200 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Yesenia Jiménez
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribuidora Oficial Sheló NABEL · Hermosillo, Sonora
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 font-mono-num">
                <div className="flex justify-between">
                  <span className="text-slate-500">WhatsApp Oficial:</span>
                  <span className="font-bold text-slate-900">+52 632 103 7155</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Método de Pago:</span>
                  <span className="font-semibold text-emerald-700">Transferencia / Depósito</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Abrir Carrito ({cartTotalItems} pzas)</span>
                </button>

                <a
                  href="https://wa.me/526321037155?text=Hola%20Yesenia%2C%20vi%20tu%20cat%C3%A1logo%20web%20de%20Shel%C3%B3%20NABEL%20y%20me%20gustar%C3%ADa%20solicitar%20informaci%C3%B3n%20para%20hacer%20un%20pedido%20por%20transferencia."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contactar por WhatsApp Directo</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-8 mt-12 pb-24 md:pb-8">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <img
              src="/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg"
              alt="Sheló NABEL"
              className="w-8 h-8 rounded-full object-contain border border-slate-200"
            />
            <span>
              © 2026 Sheló NABEL & Betterware — Yesenia Jiménez | 632 103 7155 | Hermosillo, Sonora
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-slate-600">
              Sistema: {deviceInfo.summaryBadge} ({deviceInfo.viewportWidth}×{deviceInfo.viewportHeight})
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <a href="#indice-catalogo" className="hover:text-slate-900">
              Índice
            </a>
            <span>·</span>
            <a
              href="/api/catalog/pdf"
              download="Catalogo_Shelo_NABEL_2026.pdf"
              className="hover:text-sky-700 flex items-center gap-1 font-medium"
            >
              <Download className="w-3 h-3" />
              <span>PDF Sheló</span>
            </a>
            <span>·</span>
            <a
              href="/api/catalog/betterware/pdf"
              download="Catalogo_Betterware_Noviembre_2026.pdf"
              className="hover:text-amber-700 flex items-center gap-1 font-medium"
            >
              <Download className="w-3 h-3" />
              <span>PDF Betterware</span>
            </a>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="hover:text-slate-900"
            >
              Carrito ({cartTotalItems})
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="hover:text-slate-900 flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>
                {isAdmin
                  ? 'Administrador Activo'
                  : adminStatus.isAdminConnected
                  ? 'Admin en línea (Bloqueado)'
                  : 'Panel Admin (****)'}
              </span>
            </button>
          </div>
        </div>
      </footer>

      {/* Adaptive Bottom Quick Bar for Mobile / Tablet (Android & iOS) */}
      {deviceInfo.isMobileOrTablet && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 md:hidden shadow-lg">
          <a
            href="#indice-catalogo"
            className="flex-1 py-2 px-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Índice</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setPdfStartPage(1);
              setShowFullPdfModal(true);
            }}
            className="flex-1 py-2 px-2 rounded-xl bg-sky-50 text-sky-900 border border-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Catálogo PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>Carrito ({cartTotalItems})</span>
          </button>
        </div>
      )}

      {/* Shopping Cart & WhatsApp Transfer Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        whatsappNumber={catalog.whatsappNumber}
      />

      {/* Admin Login & Product Image/Price Editor Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setEditingPromotion(null);
        }}
        isAdmin={isAdmin}
        adminStatus={adminStatus}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        products={[...catalog.products, ...betterwareCatalog.products]}
        categories={[...catalog.categories, ...betterwareCatalog.categories]}
        promotions={promotions}
        initialEditProduct={editingProduct}
        initialEditCategory={editingCategory}
        initialEditPromotion={editingPromotion}
        onSaveProduct={handleSaveProduct}
        onCreateProduct={handleCreateProduct}
        onDeleteProduct={handleDeleteProduct}
        onSaveCategory={handleSaveCategory}
        onSavePromotion={handleSavePromotion}
        onUploadFile={handleUploadFile}
        isSupabaseConnected={isSupabaseConfigured}
        supabaseWarning={supabaseWarning}
        hasSupabaseSession={hasSupabaseSession}
        supabaseUserEmail={supabaseUserEmail}
      />

      {/* Product Image Zoom & Full PDF Catalog Lightbox */}
      <CatalogLightboxModal
        product={previewProduct}
        showFullPdfModal={showFullPdfModal}
        initialPdfPage={pdfStartPage}
        catalogBrand={activeBrand === 'betterware' ? 'betterware' : 'shelo'}
        categories={currentCatalog.categories}
        deviceInfo={deviceInfo}
        onClose={() => {
          setPreviewProduct(null);
          setShowFullPdfModal(false);
        }}
        onAddToCart={handleAddToCart}
        isAdmin={isAdmin}
        onEditProduct={(prod) => {
          setEditingProduct(prod);
          setEditingCategory(null);
          setIsAdminModalOpen(true);
        }}
        onOpenPdfAtPage={(pageNum) => {
          if (previewProduct?.brand === 'betterware' && activeBrand !== 'betterware') {
            setActiveBrand('betterware');
          } else if (previewProduct?.brand === 'shelo' && activeBrand !== 'shelo') {
            setActiveBrand('shelo');
          }
          setPreviewProduct(null);
          setPdfStartPage(pageNum);
          setShowFullPdfModal(true);
        }}
      />
    </div>
  );
}
