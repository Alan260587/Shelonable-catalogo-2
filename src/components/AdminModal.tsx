import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, AdminStatus, PromotionItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  uploadCatalogPdfToSupabase,
  syncProductsBatchToSupabase,
  syncAllApartadosToSupabase,
} from '../lib/supabaseCatalog';
import {
  X,
  Lock,
  ShieldAlert,
  Upload,
  Link as LinkIcon,
  DollarSign,
  Save,
  PlusCircle,
  Trash2,
  LogOut,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  FileText,
  Database,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  adminStatus: AdminStatus;
  onLogin: (password: string) => Promise<{ ok: boolean; error?: string }>;
  onLogout: () => Promise<void>;
  products: Product[];
  categories: Category[];
  initialEditProduct: Product | null;
  initialEditCategory: Category | null;
  onSaveProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  onCreateProduct: (newProd: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSaveCategory: (categoryId: string, updates: Partial<Category>) => Promise<void>;
  onUploadFile: (file: File, key?: string) => Promise<string>;
  promotions?: PromotionItem[];
  initialEditPromotion?: PromotionItem | null;
  onSavePromotion?: (promoId: string, updates: Partial<PromotionItem>) => Promise<void>;
  isSupabaseConnected?: boolean;
  supabaseWarning?: string;
  hasSupabaseSession?: boolean;
  supabaseUserEmail?: string | null;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  adminStatus,
  onLogin,
  onLogout,
  products,
  categories,
  initialEditProduct,
  initialEditCategory,
  onSaveProduct,
  onCreateProduct,
  onDeleteProduct,
  onSaveCategory,
  onUploadFile,
  promotions = [],
  initialEditPromotion = null,
  onSavePromotion,
  isSupabaseConnected = false,
  supabaseWarning = '',
  hasSupabaseSession = false,
  supabaseUserEmail = null,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Supabase Auth State (separate additional step inside Admin Panel)
  const [sbEmail, setSbEmail] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [sbAuthError, setSbAuthError] = useState('');
  const [sbAuthLoading, setSbAuthLoading] = useState(false);
  const [uploadingCatalogPdf, setUploadingCatalogPdf] = useState(false);
  const [syncingBetterware, setSyncingBetterware] = useState(false);
  const [syncingAllApartados, setSyncingAllApartados] = useState(false);
  const [catalogPdfUploadResult, setCatalogPdfUploadResult] = useState<{
    storagePath: string;
    publicUrl: string;
  } | null>(null);
  const [catalogPdfUploadError, setCatalogPdfUploadError] = useState('');

  const [activeTab, setActiveTab] = useState<'edit-product' | 'new-product' | 'edit-category' | 'edit-promotion'>('edit-product');
  const [adminBrandFilter, setAdminBrandFilter] = useState<'all' | 'shelo' | 'betterware'>('all');

  // Selected Product State
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialEditProduct?.id || products[0]?.id || ''
  );
  const [prodName, setProdName] = useState('');
  const [prodClave, setProdClave] = useState('');
  const [prodSubtitle, setProdSubtitle] = useState('');
  const [prodPresentation, setProdPresentation] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodCatalogPage, setProdCatalogPage] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodBrand, setProdBrand] = useState<'shelo' | 'betterware'>('shelo');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');

  // Selected Category State
  const [selectedCatId, setSelectedCatId] = useState<string>(
    initialEditCategory?.id || categories[0]?.id || ''
  );
  const [catName, setCatName] = useState('');
  const [catPageNumber, setCatPageNumber] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');

  // Selected Promotion State
  const [selectedPromoId, setSelectedPromoId] = useState<string>(
    initialEditPromotion?.id || promotions[0]?.id || 'promo-01'
  );
  const [promoTitle, setPromoTitle] = useState('');
  const [promoSubtitle, setPromoSubtitle] = useState('');
  const [promoBadgeText, setPromoBadgeText] = useState('');
  const [promoPrice, setPromoPrice] = useState('300');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');

  // Status Feedback
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [operationError, setOperationError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const catFileInputRef = useRef<HTMLInputElement>(null);
  const promoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync when modal opens with a specific product, category, or promotion
  useEffect(() => {
    if (initialEditPromotion) {
      setActiveTab('edit-promotion');
      setSelectedPromoId(initialEditPromotion.id);
    } else if (initialEditCategory) {
      setActiveTab('edit-category');
      setSelectedCatId(initialEditCategory.id);
    } else if (initialEditProduct) {
      setActiveTab('edit-product');
      setSelectedProductId(initialEditProduct.id);
    }
  }, [initialEditProduct, initialEditCategory, initialEditPromotion]);

  // Populate product fields when selection or tab changes
  useEffect(() => {
    if (activeTab === 'edit-product') {
      const target = products.find((p) => p.id === selectedProductId) || products[0];
      if (target) {
        setSelectedProductId(target.id);
        setProdName(target.name);
        setProdClave(target.clave);
        setProdSubtitle(target.subtitle);
        setProdPresentation(target.presentation);
        setProdPrice(String(target.price));
        setProdCategoryId(target.categoryId);
        setProdCatalogPage(target.catalogPage);
        setProdDescription(target.description);
        setProdImageUrl(target.imageUrl);
        setProdBrand(target.brand === 'betterware' ? 'betterware' : 'shelo');
      }
    } else if (activeTab === 'new-product') {
      setProdName('');
      setProdClave('S1750');
      setProdSubtitle('Calidad Natural Sheló NABEL');
      setProdPresentation('250 ml');
      setProdPrice('299');
      setProdCategoryId(categories[0]?.id || 'lo-nuevo-en-casa');
      setProdCatalogPage('01');
      setProdDescription('');
      setProdImageUrl('/assets/catalog/page_003.jpg');
      setProdBrand('shelo');
    }
  }, [activeTab, selectedProductId, products, categories]);

  // Populate category fields
  useEffect(() => {
    const cat = categories.find((c) => c.id === selectedCatId) || categories[0];
    if (cat) {
      setSelectedCatId(cat.id);
      setCatName(cat.name);
      setCatPageNumber(cat.pageNumber);
      setCatDescription(cat.description);
      setCatImageUrl(cat.imageUrl);
    }
  }, [selectedCatId, categories]);

  // Populate promotion fields
  useEffect(() => {
    const promo = promotions.find((p) => p.id === selectedPromoId) || promotions[0];
    if (promo) {
      setSelectedPromoId(promo.id);
      setPromoTitle(promo.title);
      setPromoSubtitle(promo.subtitle);
      setPromoBadgeText(promo.badgeText);
      setPromoPrice(String(promo.price ?? 300));
      setPromoDescription(promo.description);
      setPromoImageUrl(promo.imageUrl);
    }
  }, [selectedPromoId, promotions]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const result = await onLogin(passwordInput);
      if (!result.ok) {
        setLoginError(result.error || 'Clave incorrecta.');
      } else {
        setPasswordInput('');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSupabaseLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbAuthError('');
    if (!supabase) {
      setSbAuthError('El cliente de Supabase no está configurado.');
      return;
    }
    const cleanEmail = sbEmail.trim();
    if (!cleanEmail || !sbPassword) {
      setSbAuthError('Por favor ingresa tu correo y contraseña de Supabase.');
      return;
    }
    setSbAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: sbPassword,
      });
      if (error) {
        setSbAuthError(
          error.message === 'Invalid login credentials'
            ? 'Credenciales inválidas. Verifica el correo y contraseña creados en Supabase (Authentication → Users).'
            : `No se pudo iniciar sesión en Supabase: ${error.message}`
        );
      } else {
        setSbPassword('');
        setSbAuthError('');
      }
    } catch {
      setSbAuthError('Error de red al intentar iniciar sesión en Supabase.');
    } finally {
      setSbAuthLoading(false);
    }
  };

  const handleSupabaseLogoutClick = async () => {
    setSbAuthError('');
    setCatalogPdfUploadError('');
    setCatalogPdfUploadResult(null);
    if (!supabase) return;
    setSbAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSbAuthError(`No se pudo cerrar la sesión de Supabase: ${error.message}`);
      } else {
        setSbPassword('');
      }
    } catch {
      setSbAuthError('Error al cerrar la sesión de Supabase.');
    } finally {
      setSbAuthLoading(false);
    }
  };

  const handleUploadCatalogPdfToSupabase = async (brand: 'shelo' | 'betterware' = 'shelo') => {
    setCatalogPdfUploadError('');
    setCatalogPdfUploadResult(null);
    if (!supabase || !hasSupabaseSession) {
      setCatalogPdfUploadError('Debes iniciar sesión en Supabase para subir el PDF del catálogo.');
      return;
    }
    setUploadingCatalogPdf(true);
    try {
      const endpoint =
        brand === 'betterware'
          ? '/api/catalog/betterware/pdf?source=local'
          : '/api/catalog/pdf?source=local';
      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        throw new Error(`No se pudo obtener el PDF desde ${endpoint} (HTTP ${res.status}).`);
      }
      const pdfBlob = await res.blob();
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error(`El archivo PDF obtenido desde ${endpoint} está vacío.`);
      }
      const result = await uploadCatalogPdfToSupabase(pdfBlob, brand);
      setCatalogPdfUploadResult(result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error al subir el PDF del catálogo a Supabase Storage.';
      setCatalogPdfUploadError(msg);
    } finally {
      setUploadingCatalogPdf(false);
    }
  };

  const handleSyncBetterwareToSupabase = async () => {
    setCatalogPdfUploadError('');
    setOperationError('');
    setStatusMessage('');
    if (!supabase || !hasSupabaseSession) {
      setCatalogPdfUploadError('Debes iniciar sesión en Supabase para sincronizar el catálogo.');
      return;
    }
    const bwProducts = products.filter((p) => p.brand === 'betterware');
    if (bwProducts.length === 0) return;

    setSyncingBetterware(true);
    try {
      const count = await syncProductsBatchToSupabase(bwProducts);
      setStatusMessage(
        `¡${count} productos del Catálogo Betterware Noviembre 2026 sincronizados automáticamente en Supabase (public.products)!`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error al sincronizar los productos de Betterware en Supabase.';
      setCatalogPdfUploadError(msg);
    } finally {
      setSyncingBetterware(false);
    }
  };

  const handleSyncAllApartadosToSupabase = async () => {
    setCatalogPdfUploadError('');
    setOperationError('');
    setStatusMessage('');
    if (!supabase || !hasSupabaseSession) {
      setCatalogPdfUploadError(
        'Debes iniciar sesión en Supabase para sincronizar todos los apartados.'
      );
      return;
    }

    setSyncingAllApartados(true);
    try {
      const { totalSynced } = await syncAllApartadosToSupabase(
        products,
        categories,
        promotions
      );
      setStatusMessage(
        `¡Sincronización completa exitosa! ${totalSynced} registros (Sheló NABEL + Betterware + Promociones + Categorías) guardados en Supabase.`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error al sincronizar todos los apartados en Supabase.';
      setCatalogPdfUploadError(msg);
    } finally {
      setSyncingAllApartados(false);
    }
  };

  const handleComputerFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'product' | 'category' | 'promotion'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setStatusMessage('');
    setOperationError('');
    try {
      const uploadKey =
        target === 'product'
          ? prodClave || 'producto'
          : target === 'promotion'
          ? selectedPromoId || 'promo'
          : selectedCatId || 'categoria';
      const uploadedUrl = await onUploadFile(file, uploadKey);
      if (target === 'product') {
        setProdImageUrl(uploadedUrl);
      } else if (target === 'promotion') {
        setPromoImageUrl(uploadedUrl);
      } else {
        setCatImageUrl(uploadedUrl);
      }
      setStatusMessage('Imagen cargada desde tu computadora correctamente. Haz clic en Guardar Cambios.');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error al subir la imagen desde tu computadora.';
      setOperationError(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSavePromotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromoId || !onSavePromotion) return;
    setSaving(true);
    setStatusMessage('');
    setOperationError('');
    try {
      await onSavePromotion(selectedPromoId, {
        title: promoTitle,
        subtitle: promoSubtitle,
        badgeText: promoBadgeText,
        price: Number(promoPrice) || 0,
        description: promoDescription,
        imageUrl: promoImageUrl,
      });
      setStatusMessage(
        hasSupabaseSession
          ? '¡Promoción actualizada y guardada automáticamente en Supabase y en la página!'
          : '¡Título e imagen de la promoción actualizados en tiempo real!'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la promoción.';
      setOperationError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage('');
    setOperationError('');
    try {
      if (activeTab === 'edit-product' && selectedProductId) {
        await onSaveProduct(selectedProductId, {
          name: prodName,
          clave: prodClave,
          subtitle: prodSubtitle,
          presentation: prodPresentation,
          price: Number(prodPrice) || 0,
          categoryId: prodCategoryId,
          catalogPage: prodCatalogPage,
          description: prodDescription,
          imageUrl: prodImageUrl,
          brand: prodBrand,
        });
        setStatusMessage(
          hasSupabaseSession
            ? '¡Producto actualizado y guardado automáticamente en Supabase (public.products)!'
            : '¡Precio e imagen del producto actualizados en tiempo real para todos los usuarios!'
        );
      } else if (activeTab === 'new-product') {
        await onCreateProduct({
          name: prodName || (prodBrand === 'betterware' ? 'Nuevo Producto Betterware' : 'Nuevo Producto Sheló NABEL'),
          clave: prodClave || (prodBrand === 'betterware' ? 'BW2026' : 'SN2026'),
          subtitle: prodSubtitle,
          presentation: prodPresentation,
          price: Number(prodPrice) || 199,
          categoryId: prodCategoryId,
          catalogPage: prodCatalogPage,
          description: prodDescription,
          imageUrl: prodImageUrl,
          brand: prodBrand,
        });
        setStatusMessage(
          hasSupabaseSession
            ? '¡Nuevo producto agregado y guardado automáticamente en Supabase (public.products)!'
            : '¡Nuevo producto agregado exitosamente al catálogo!'
        );
        setActiveTab('edit-product');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar el producto.';
      setOperationError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) return;
    setSaving(true);
    setStatusMessage('');
    setOperationError('');
    try {
      await onSaveCategory(selectedCatId, {
        name: catName,
        pageNumber: catPageNumber,
        description: catDescription,
        imageUrl: catImageUrl,
      });
      setStatusMessage('¡Categoría del menú Índice actualizada correctamente!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la categoría.';
      setOperationError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadAdminManualPdf = async () => {
    setStatusMessage('Descargando Manual Oficial en PDF...');
    try {
      const res = await fetch('/Manual_Uso_Shelo_NABEL_2026.pdf', {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al obtener el manual PDF.');
      const blob = await res.blob();
      const fileName = 'Manual_Uso_Shelo_NABEL_2026.pdf';

      if (typeof navigator.canShare === 'function' && typeof File !== 'undefined') {
        const fileObj = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [fileObj] })) {
          try {
            await navigator.share({
              files: [fileObj],
              title: 'Manual Oficial Sheló NABEL 2026',
            });
            setStatusMessage('¡Manual PDF descargado/compartido correctamente!');
            return;
          } catch {
            // Fallback to blob link
          }
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      setStatusMessage('¡Manual_Uso_Shelo_NABEL_2026.pdf descargado en tu dispositivo!');
    } catch (err) {
      console.error(err);
      setStatusMessage('No se pudo descargar el manual PDF.');
    }
  };

  // Check if ANOTHER user is currently logged in as administrator
  const isLockedByAnotherAdmin = !isAdmin && adminStatus.isAdminConnected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Panel Administrativo · Sheló NABEL &amp; Betterware
              </h2>
              <p className="text-xs text-slate-300">
                {isAdmin
                  ? 'Sesión Administrativa Activa (Se cerrará automáticamente al cerrar la ventana)'
                  : isLockedByAnotherAdmin
                  ? 'Acceso Bloqueado — Administrador en línea'
                  : 'Ingresa la clave de administrador para editar precios e imágenes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadAdminManualPdf}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Descargar Manual de Uso y Funcionamiento en PDF (Solo visible para el Administrador)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Descargar Manual PDF</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onLogout();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CASE 1: Another user is already logged in as Administrator -> HIDE PASSWORD INPUT COMPLETELY */}
        {isLockedByAnotherAdmin ? (
          <div className="p-8 sm:p-12 text-center max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Administrador Conectado Actualmente
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              En este momento ya existe una sesión de administrador activa. Por políticas de seguridad,{' '}
              <strong>ningún otro usuario tiene acceso al campo de clave</strong> mientras el administrador está conectado y no pueden existir dos sesiones de administrador a la vez.
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Cuando el administrador actual cierre su sesión o cierre la ventana de su navegador, el acceso a la clave se habilitará nuevamente.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Entendido, volver al catálogo
            </button>
          </div>
        ) : !isAdmin ? (
          /* CASE 2: No Administrator Connected -> Show Masked Password Input (****) */
          <form onSubmit={handleLoginSubmit} className="p-8 sm:p-12 max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Acceso Exclusivo de Administrador
              </h3>
              <p className="text-xs text-slate-500">
                Introduce la clave secreta para abrir el panel de edición de imágenes y precios. Al conectarte, ningún otro usuario tendrá acceso a la clave.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 text-center">
                Clave de Seguridad (****)
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="****"
                maxLength={12}
                autoFocus
                required
                autoComplete="off"
                className="w-full px-4 py-3.5 text-center text-2xl tracking-[0.5em] font-mono-num rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-sky-600 bg-slate-50"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 px-6 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-sm shadow-md transition-colors"
            >
              {loggingIn ? 'Verificando clave...' : 'Desbloquear Panel Administrativo'}
            </button>

            <p className="text-[11px] text-center text-slate-400">
              Nota: Tu sesión se cerrará automáticamente al cerrar la pestaña o ventana del navegador.
            </p>
          </form>
        ) : (
          /* CASE 3: Authenticated Administrator -> Full Product Image & Price Editor */
          <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto space-y-6">
            {/* Private Supabase Status Indicator (Only visible inside Admin Panel) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold">
                {isSupabaseConnected
                  ? 'Supabase: conectado'
                  : 'Supabase: no configurado — funciona con el catálogo actual'}
              </span>
              {supabaseWarning && (
                <span className="text-amber-700 font-medium">
                  Aviso: {supabaseWarning}
                </span>
              )}
            </div>

            {/* Clearly Separated Supabase Auth Section inside Admin Panel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-700 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Sesión de Supabase (para guardar en la base de datos)
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    hasSupabaseSession
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {hasSupabaseSession && supabaseUserEmail
                    ? `Sesión de Supabase iniciada: ${supabaseUserEmail}`
                    : 'Sesión de Supabase no iniciada'}
                </span>
              </div>

              {hasSupabaseSession ? (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Los productos creados, editados o eliminados y las imágenes subidas se guardan automáticamente en Supabase (<code className="font-mono-num">public.products</code> y bucket <code className="font-mono-num">product-images</code>).
                    </p>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSyncAllApartadosToSupabase}
                        disabled={
                          syncingAllApartados ||
                          syncingBetterware ||
                          uploadingCatalogPdf ||
                          sbAuthLoading
                        }
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors shadow-2xs"
                        title="Sincronizar los 3 apartados completos (33 Sheló NABEL + 50 Betterware + 2 Promociones + 24 Categorías) en Supabase"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>
                          {syncingAllApartados
                            ? 'Sincronizando Todo…'
                            : `Sincronizar Todo (${products.length + promotions.length})`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncBetterwareToSupabase}
                        disabled={
                          syncingBetterware ||
                          syncingAllApartados ||
                          uploadingCatalogPdf ||
                          sbAuthLoading
                        }
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        title="Guardar o actualizar todos los productos de Betterware en la tabla public.products de Supabase"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>
                          {syncingBetterware
                            ? 'Sincronizando…'
                            : `Sincronizar Betterware (${products.filter((p) => p.brand === 'betterware').length})`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUploadCatalogPdfToSupabase('shelo')}
                        disabled={
                          uploadingCatalogPdf ||
                          syncingBetterware ||
                          syncingAllApartados ||
                          sbAuthLoading
                        }
                        className="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        title="Subir PDF oficial de Sheló NABEL (148 págs) a Supabase Storage"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingCatalogPdf
                            ? 'Subiendo…'
                            : 'Subir PDF Sheló NABEL'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUploadCatalogPdfToSupabase('betterware')}
                        disabled={
                          uploadingCatalogPdf ||
                          syncingBetterware ||
                          syncingAllApartados ||
                          sbAuthLoading
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        title="Subir PDF oficial de Betterware Noviembre 2026 (118 págs) a Supabase Storage"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingCatalogPdf
                            ? 'Subiendo…'
                            : 'Subir PDF Betterware'}
                        </span>
                      </button>
                      <a
                        href="/api/admin/sql/full-setup"
                        download="Supabase_Completo_Shelo_Betterware_Promociones_2026.sql"
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        title="Descargar script SQL completo con la estructura y los 85 registros de Sheló NABEL, Betterware y Promociones"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-700" />
                        <span>Descargar SQL Completo</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleSupabaseLogoutClick}
                        disabled={
                          sbAuthLoading ||
                          uploadingCatalogPdf ||
                          syncingBetterware ||
                          syncingAllApartados
                        }
                        className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        {sbAuthLoading ? 'Cerrando...' : 'Cerrar sesión'}
                      </button>
                    </div>
                  </div>

                  {catalogPdfUploadResult && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          PDF del catálogo subido correctamente al bucket{' '}
                          <code className="font-mono-num">product-images</code>
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        <strong>Ruta en Storage:</strong>{' '}
                        <code className="font-mono-num">{catalogPdfUploadResult.storagePath}</code>
                      </p>
                      <p className="text-[11px] text-emerald-800 break-all">
                        <strong>URL pública:</strong>{' '}
                        <a
                          href={catalogPdfUploadResult.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-emerald-950 font-mono-num"
                        >
                          {catalogPdfUploadResult.publicUrl}
                        </a>
                      </p>
                    </div>
                  )}

                  {catalogPdfUploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Error al subir PDF a Supabase Storage: {catalogPdfUploadError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSupabaseLoginSubmit} className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600">
                    Inicia sesión con tu usuario de Supabase Auth para guardar nuevos productos, precios e imágenes directamente en la base de datos. Sin esta sesión, los cambios siguen usando el respaldo del servidor actual.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="email"
                      value={sbEmail}
                      onChange={(e) => setSbEmail(e.target.value)}
                      placeholder="Correo de administrador en Supabase"
                      autoComplete="username"
                      className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                    />
                    <input
                      type="password"
                      value={sbPassword}
                      onChange={(e) => setSbPassword(e.target.value)}
                      placeholder="Contraseña de Supabase"
                      autoComplete="current-password"
                      className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                    />
                    <button
                      type="submit"
                      disabled={sbAuthLoading || !isSupabaseConnected}
                      className="py-2 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-colors"
                    >
                      {sbAuthLoading ? 'Iniciando sesión...' : 'Iniciar sesión en Supabase'}
                    </button>
                  </div>
                  <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-500">
                      ¿Aún no ejecutas el SQL en Supabase? Descarga el archivo con la estructura y los 3 apartados completos:
                    </span>
                    <a
                      href="/api/admin/sql/full-setup"
                      download="Supabase_Completo_Shelo_Betterware_Promociones_2026.sql"
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-700" />
                      <span>Descargar SQL Completo (Sheló + Betterware + Promociones)</span>
                    </a>
                  </div>
                </form>
              )}

              {sbAuthError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{sbAuthError}</span>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit-product');
                  setStatusMessage('');
                  setOperationError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'edit-product'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-4 h-4 text-sky-700" />
                <span>Editar Precios e Imágenes de Productos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('new-product');
                  setStatusMessage('');
                  setOperationError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'new-product'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Agregar Nuevo Producto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit-category');
                  setStatusMessage('');
                  setOperationError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'edit-category'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Editar Menú Índice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit-promotion');
                  setStatusMessage('');
                  setOperationError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === 'edit-promotion'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Editar Promociones ({promotions.length})</span>
              </button>
            </div>

            {operationError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-sm text-rose-800 font-medium">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{operationError}</span>
              </div>
            )}

            {statusMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-sm text-emerald-900 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {activeTab === 'edit-promotion' ? (
              /* Edit Promotion Title & Large Image */
              <form onSubmit={handleSavePromotionSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Seleccionar Promoción del Apartado
                    </label>
                    <select
                      value={selectedPromoId}
                      onChange={(e) => {
                        setSelectedPromoId(e.target.value);
                        setStatusMessage('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                    >
                      {promotions.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.clave}] {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Título de la Promoción
                    </label>
                    <input
                      type="text"
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subtítulo
                      </label>
                      <input
                        type="text"
                        value={promoSubtitle}
                        onChange={(e) => setPromoSubtitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Etiqueta Destacada
                      </label>
                      <input
                        type="text"
                        value={promoBadgeText}
                        onChange={(e) => setPromoBadgeText(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono-num rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Inversión / Precio MXN
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={promoPrice}
                        onChange={(e) => setPromoPrice(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono-num font-bold rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción de la Promoción
                    </label>
                    <textarea
                      rows={2}
                      value={promoDescription}
                      onChange={(e) => setPromoDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>

                  {/* Image Source Selector for Promotion */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cambiar Imagen de la Promoción (Desde Computadora/Celular o URL)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={promoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleComputerFileUpload(e, 'promotion')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => promoFileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploadingImage ? 'Subiendo archivo...' : 'Subir Nueva Imagen desde mi Dispositivo'}
                        </span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        O pega la URL directa de la imagen:
                      </label>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={promoImageUrl}
                          onChange={(e) => setPromoImageUrl(e.target.value)}
                          placeholder="/assets/aistudio/... o https://..."
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios en Promoción'}</span>
                  </button>
                </div>

                {/* Live Large Preview of Promotion Card */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Vista Previa de la Promoción
                  </p>
                  <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-white">
                    <div className="relative h-72 bg-slate-100 p-2 flex items-center justify-center">
                      <img
                        src={promoImageUrl}
                        alt={promoTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-xl"
                      />
                      <div className="absolute top-3 left-3 bg-sky-800/95 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {promoBadgeText}
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <h4 className="font-bold text-slate-900 text-base">{promoTitle}</h4>
                      <p className="text-xs font-semibold text-sky-700">{promoSubtitle}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{promoDescription}</p>
                    </div>
                  </div>
                </div>
              </form>
            ) : activeTab === 'edit-category' ? (
              /* Edit Category in WA0027 Index Menu */
              <form onSubmit={handleSaveCategorySubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Seleccionar Categoría del Menú Índice
                    </label>
                    <select
                      value={selectedCatId}
                      onChange={(e) => {
                        setSelectedCatId(e.target.value);
                        setStatusMessage('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.id.startsWith('bw-') ? 'Betterware' : 'Sheló NABEL'}] Pág. {c.pageNumber} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre de la Categoría
                      </label>
                      <input
                        type="text"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Página en Índice
                      </label>
                      <input
                        type="text"
                        value={catPageNumber}
                        onChange={(e) => setCatPageNumber(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-sm font-mono-num rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      rows={2}
                      value={catDescription}
                      onChange={(e) => setCatDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>

                  {/* Image Source Selector for Category */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cambiar Imagen de la Categoría (Desde Computadora o URL)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={catFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleComputerFileUpload(e, 'category')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => catFileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploadingImage ? 'Subiendo archivo...' : 'Subir Imagen desde mi Computadora'}
                        </span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        O pega la URL directa de la imagen:
                      </label>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={catImageUrl}
                          onChange={(e) => setCatImageUrl(e.target.value)}
                          placeholder="https://ejemplo.com/imagen.jpg"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios en Categoría'}</span>
                  </button>
                </div>

                {/* Live Preview of WA0027 Category Card */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Vista Previa en el Menú Índice
                  </p>
                  <div className="rounded-[26px] overflow-hidden border border-slate-200 shadow-md bg-white">
                    <div className="relative h-48 bg-slate-100">
                      <img
                        src={catImageUrl}
                        alt={catName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute top-3 right-4 text-2xl font-bold text-white drop-shadow-md">
                        {catPageNumber}
                      </div>
                    </div>
                    <div
                      className="p-4 text-white font-semibold"
                      style={{
                        backgroundColor:
                          categories.find((c) => c.id === selectedCatId)?.color || '#0284C7',
                      }}
                    >
                      {catName}
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              /* Edit Product or Create New Product Form */
              <form onSubmit={handleSaveProductSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  {activeTab === 'edit-product' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Seleccionar Producto del Catálogo a Editar
                        </label>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 text-xs">
                          <button
                            type="button"
                            onClick={() => setAdminBrandFilter('all')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                              adminBrandFilter === 'all'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600'
                            }`}
                          >
                            Todos ({products.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminBrandFilter('shelo');
                              const firstShelo = products.find((p) => p.brand !== 'betterware');
                              if (firstShelo) setSelectedProductId(firstShelo.id);
                            }}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                              adminBrandFilter === 'shelo'
                                ? 'bg-sky-700 text-white shadow-2xs'
                                : 'text-slate-600'
                            }`}
                          >
                            Sheló ({products.filter((p) => p.brand !== 'betterware').length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminBrandFilter('betterware');
                              const firstBw = products.find((p) => p.brand === 'betterware');
                              if (firstBw) setSelectedProductId(firstBw.id);
                            }}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                              adminBrandFilter === 'betterware'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-slate-600'
                            }`}
                          >
                            Betterware ({products.filter((p) => p.brand === 'betterware').length})
                          </button>
                        </div>
                      </div>
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          setStatusMessage('');
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                      >
                        {products
                          .filter((p) =>
                            adminBrandFilter === 'all'
                              ? true
                              : adminBrandFilter === 'betterware'
                              ? p.brand === 'betterware'
                              : p.brand !== 'betterware'
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.brand === 'betterware' ? 'Betterware' : 'Sheló'} · {p.clave}] {p.name} — ${p.price} MXN
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Price, Clave, Brand & Presentation Highlight Box */}
                  <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-sky-900 mb-1">
                        Precio en Imagen ($ MXN)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm font-bold text-sky-700">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          required
                          className="w-full pl-7 pr-3 py-2 text-base font-bold font-mono-num rounded-xl border-2 border-sky-400 bg-white text-slate-900 focus:outline-none focus:border-sky-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Clave del Producto
                      </label>
                      <input
                        type="text"
                        value={prodClave}
                        onChange={(e) => setProdClave(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm font-mono-num rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Marca del Catálogo
                      </label>
                      <select
                        value={prodBrand}
                        onChange={(e) => {
                          const nextBrand = e.target.value as 'shelo' | 'betterware';
                          setProdBrand(nextBrand);
                          const brandCats = categories.filter((c) =>
                            nextBrand === 'betterware'
                              ? c.id.startsWith('bw-')
                              : !c.id.startsWith('bw-')
                          );
                          if (brandCats.length > 0 && !brandCats.some((c) => c.id === prodCategoryId)) {
                            setProdCategoryId(brandCats[0].id);
                          }
                          if (activeTab === 'new-product') {
                            if (nextBrand === 'betterware') {
                              setProdClave('26999');
                              setProdSubtitle('Soluciones Prácticas para tu Hogar');
                              setProdPresentation('1 pza');
                              setProdImageUrl('/assets/betterware/page_001.jpg');
                            } else {
                              setProdClave('S1750');
                              setProdSubtitle('Calidad Natural Sheló NABEL');
                              setProdPresentation('250 ml');
                              setProdImageUrl('/assets/catalog/page_003.jpg');
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-medium"
                      >
                        <option value="shelo">Sheló NABEL</option>
                        <option value="betterware">Betterware</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contenido / Presentación
                      </label>
                      <input
                        type="text"
                        value={prodPresentation}
                        onChange={(e) => setProdPresentation(e.target.value)}
                        placeholder="Ej. 250 ml o 1 pza"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Image Upload from Computer OR URL */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-sky-700" />
                        <span>Imagen del Producto (Subir desde PC o por URL)</span>
                      </span>
                      <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setImageMode('upload')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                            imageMode === 'upload'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Subir desde PC
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMode('url')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                            imageMode === 'url'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Desde URL
                        </button>
                      </div>
                    </div>

                    {imageMode === 'upload' ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleComputerFileUpload(e, 'product')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
                        >
                          <Upload className="w-4 h-4" />
                          <span>
                            {uploadingImage
                              ? 'Subiendo imagen...'
                              : 'Seleccionar Imagen desde mi Computadora'}
                          </span>
                        </button>
                        <span className="text-xs text-slate-500 truncate">
                          Formatos JPG, PNG o WebP. Se sincroniza para todos los usuarios.
                        </span>
                      </div>
                    ) : null}

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        URL de la Imagen (puedes pegar cualquier enlace de imagen web):
                      </label>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={prodImageUrl}
                          onChange={(e) => setProdImageUrl(e.target.value)}
                          placeholder="https://... o /assets/catalog/page_003.jpg"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre del Producto
                      </label>
                      <input
                        type="text"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Categoría en el Menú Índice ({prodBrand === 'betterware' ? 'Betterware' : 'Sheló NABEL'})
                      </label>
                      <select
                        value={prodCategoryId}
                        onChange={(e) => setProdCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white"
                      >
                        {categories
                          .filter((c) =>
                            prodBrand === 'betterware'
                              ? c.id.startsWith('bw-')
                              : !c.id.startsWith('bw-')
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              Pág. {c.pageNumber} · {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subtítulo / Beneficio Principal
                      </label>
                      <input
                        type="text"
                        value={prodSubtitle}
                        onChange={(e) => setProdSubtitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Página del Catálogo
                      </label>
                      <input
                        type="text"
                        value={prodCatalogPage}
                        onChange={(e) => setProdCatalogPage(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono-num rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción del Producto
                    </label>
                    <textarea
                      rows={2}
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {saving
                          ? 'Guardando cambios...'
                          : activeTab === 'new-product'
                          ? 'Publicar Nuevo Producto en el Catálogo'
                          : 'Guardar Precio e Imagen en el Catálogo'}
                      </span>
                    </button>

                    {activeTab === 'edit-product' && products.length > 1 && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={async () => {
                          if (!selectedProductId) return;
                          setSaving(true);
                          setStatusMessage('');
                          setOperationError('');
                          try {
                            await onDeleteProduct(selectedProductId);
                            const remaining = products.filter((p) => p.id !== selectedProductId);
                            setSelectedProductId(remaining[0]?.id || '');
                            setStatusMessage(
                              hasSupabaseSession
                                ? 'Producto eliminado automáticamente de Supabase (public.products).'
                                : 'Producto eliminado del catálogo.'
                            );
                          } catch (err) {
                            const message =
                              err instanceof Error
                                ? err.message
                                : 'Error al eliminar el producto.';
                            setOperationError(message);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Image + Overlaid Price Preview */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                      Vista Previa de Imagen con Precio Editable
                    </span>

                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                      <img
                        src={prodImageUrl}
                        alt={prodName || 'Vista previa'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src =
                            '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
                        }}
                      />

                      {/* Live Overlaid Price Badge */}
                      <div className="absolute bottom-3 right-3 bg-slate-900/95 text-white px-4 py-2 rounded-xl shadow-lg border border-sky-400">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-sky-400">$</span>
                          <span className="text-2xl font-bold font-mono-num">
                            {(Number(prodPrice) || 0).toLocaleString('es-MX')}
                          </span>
                          <span className="text-[10px] uppercase opacity-80">MXN</span>
                        </div>
                        <div className="text-[10px] font-mono-num text-slate-300">
                          Clave: {prodClave || 'S000'} · {prodPresentation}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <h4 className="text-base font-bold text-slate-900">
                        {prodName || 'Nombre del Producto'}
                      </h4>
                      <p className="text-xs font-medium text-sky-700">{prodSubtitle}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {prodDescription}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <p>
                      • Cualquier cambio de precio o imagen se refleja al instante para todos los usuarios conectados.
                    </p>
                    <p>
                      • Mientras estás en este panel, ningún otro usuario puede ver ni introducir la clave de administrador.
                    </p>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
