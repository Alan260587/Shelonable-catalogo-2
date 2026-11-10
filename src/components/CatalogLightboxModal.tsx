import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { DeviceInfo } from '../utils/deviceDetector';
import {
  X,
  ShoppingBag,
  Edit3,
  Download,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
} from 'lucide-react';

interface CatalogLightboxModalProps {
  product: Product | null;
  showFullPdfModal: boolean;
  initialPdfPage?: number;
  catalogBrand?: 'shelo' | 'betterware';
  categories?: Category[];
  deviceInfo?: DeviceInfo;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isAdmin: boolean;
  onEditProduct: (product: Product) => void;
  onOpenPdfAtPage?: (page: number) => void;
}

export const CatalogLightboxModal: React.FC<CatalogLightboxModalProps> = ({
  product,
  showFullPdfModal,
  initialPdfPage = 1,
  catalogBrand = 'shelo',
  categories = [],
  deviceInfo,
  onClose,
  onAddToCart,
  isAdmin,
  onEditProduct,
  onOpenPdfAtPage,
}) => {
  const isBetterware = (product?.brand === 'betterware') || catalogBrand === 'betterware';
  const totalPages = isBetterware ? 118 : 148;
  const catalogTitle = isBetterware ? 'Catálogo Betterware Noviembre 2026' : 'Catálogo Oficial Sheló NABEL 2026';
  const pdfDownloadEndpoint = isBetterware ? '/api/catalog/betterware/pdf' : '/api/catalog/pdf';
  const pdfDownloadFilename = isBetterware ? 'Catalogo_Betterware_Noviembre_2026.pdf' : 'Catalogo_Shelo_NABEL_2026.pdf';
  const pageImageEndpoint = (page: number) => isBetterware ? `/api/catalog/betterware/page/${page}` : `/api/catalog/page/${page}`;

  const [currentPage, setCurrentPage] = useState<number>(initialPdfPage || 1);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadMessage, setDownloadMessage] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');
  const [downloadingPageImg, setDownloadingPageImg] = useState<boolean>(false);

  useEffect(() => {
    if (showFullPdfModal && initialPdfPage) {
      setCurrentPage(initialPdfPage);
      setPageLoading(true);
    }
  }, [showFullPdfModal, initialPdfPage]);

  // Keyboard navigation on Laptop / Desktop (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!showFullPdfModal && !product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (showFullPdfModal && e.key === 'ArrowLeft') {
        setCurrentPage((p) => {
          const next = Math.max(1, p - 1);
          if (next !== p) setPageLoading(true);
          return next;
        });
      } else if (showFullPdfModal && e.key === 'ArrowRight') {
        setCurrentPage((p) => {
          const next = Math.min(totalPages, p + 1);
          if (next !== p) setPageLoading(true);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullPdfModal, product, onClose, totalPages]);

  if (!product && !showFullPdfModal) return null;

  // In-iframe authenticated Blob download for full PDF (prevents mobile cookie interstitial error)
  const handleDownloadFullPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setDownloadProgress(0);
    setDownloadError('');
    setDownloadMessage('');

    try {
      const response = await fetch(pdfDownloadEndpoint, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener el archivo PDF del servidor.');
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(
          'El navegador bloqueó la descarga directa. Usa "Guardar Pág. Actual" o intenta de nuevo.'
        );
      }

      const contentLength = Number(response.headers.get('content-length')) || (isBetterware ? 27262976 : 47577479);
      const reader = response.body?.getReader();

      let blob: Blob;
      if (reader) {
        const chunks: BlobPart[] = [];
        let receivedLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(new Uint8Array(value));
            receivedLength += value.byteLength;
            setDownloadProgress(Math.min(99, Math.round((receivedLength / contentLength) * 100)));
          }
        }
        blob = new Blob(chunks, { type: 'application/pdf' });
      } else {
        blob = await response.blob();
      }

      setDownloadProgress(100);
      const fileName = pdfDownloadFilename;

      // On iOS / Mobile supporting Web Share API for files, offer native share/save sheet if preferred
      if (
        deviceInfo?.os === 'iOS' &&
        typeof navigator.canShare === 'function' &&
        typeof File !== 'undefined'
      ) {
        const fileObj = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [fileObj] })) {
          try {
            await navigator.share({
              files: [fileObj],
              title: catalogTitle,
            });
            setDownloadMessage('¡Catálogo PDF compartido/guardado en tu iPhone/iPad!');
            return;
          } catch {
            // Fall through to standard anchor download if user cancels share sheet
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

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      setDownloadMessage(
        `¡${catalogTitle} descargado correctamente en tu ${deviceInfo?.machineLabel || 'dispositivo'} (${deviceInfo?.os || 'Web'})!`
      );
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setDownloadError(
        err instanceof Error ? err.message : 'Ocurrió un error al descargar el PDF.'
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download current page as high-resolution JPG image (instant on Android, iOS & Desktop)
  const handleDownloadCurrentPageImage = async () => {
    if (downloadingPageImg) return;
    setDownloadingPageImg(true);
    setDownloadError('');
    try {
      const res = await fetch(pageImageEndpoint(currentPage), {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('No se pudo descargar la imagen de la página.');
      const blob = await res.blob();
      const prefix = isBetterware ? 'Betterware_2026' : 'Shelo_NABEL_2026';
      const fileName = `${prefix}_Pagina_${String(currentPage).padStart(3, '0')}.jpg`;

      if (
        deviceInfo?.isMobileOrTablet &&
        typeof navigator.canShare === 'function' &&
        typeof File !== 'undefined'
      ) {
        const fileObj = new File([blob], fileName, { type: 'image/jpeg' });
        if (navigator.canShare({ files: [fileObj] })) {
          try {
            await navigator.share({
              files: [fileObj],
              title: `${catalogTitle} - Página ${currentPage}`,
            });
            setDownloadMessage(`¡Página ${currentPage} lista para guardar o compartir!`);
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
      setDownloadMessage(`¡Página ${currentPage} guardada en tu ${deviceInfo?.machineLabel || 'dispositivo'}!`);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'No se pudo guardar la imagen.'
      );
    } finally {
      setDownloadingPageImg(false);
    }
  };

  if (showFullPdfModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold leading-tight">
                  {catalogTitle}
                </h3>
                <p className="text-[11px] text-slate-300 font-mono-num">
                  Página {currentPage} de {totalPages}
                  {deviceInfo ? ` · Optimizado para ${deviceInfo.machineLabel} (${deviceInfo.os})` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Save Current Page as Image (Instant on Mobile) */}
              <button
                type="button"
                onClick={handleDownloadCurrentPageImage}
                disabled={downloadingPageImg}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {deviceInfo?.isMobileOrTablet ? (
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>
                  {downloadingPageImg ? 'Guardando...' : `Guardar Pág. ${currentPage}`}
                </span>
              </button>

              {/* Safe Authenticated Blob Download for Full PDF */}
              <button
                type="button"
                onClick={handleDownloadFullPdf}
                disabled={downloadingPdf}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Descargando PDF ({downloadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PDF Completo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Download Progress / Status Banner */}
          {(downloadingPdf || downloadMessage || downloadError) && (
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
              {downloadingPdf && (
                <div className="w-full space-y-1">
                  <div className="flex justify-between font-semibold text-sky-900">
                    <span>
                      Descargando PDF seguro para {deviceInfo?.machineLabel || 'tu dispositivo'} ({deviceInfo?.os || 'Web'})...
                    </span>
                    <span className="font-mono-num">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 transition-all duration-200"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {!downloadingPdf && downloadMessage && (
                <div className="flex items-center gap-2 text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{downloadMessage}</span>
                </div>
              )}

              {!downloadingPdf && downloadError && (
                <div className="flex items-center gap-2 text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{downloadError}</span>
                </div>
              )}
            </div>
          )}

          {/* Category Jump Bar */}
          {categories.length > 0 && (
            <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 shrink-0">
                Ir a sección:
              </span>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setPageLoading(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                  currentPage === 1
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Portada (1)
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCurrentPage(cat.pdfPage);
                    setPageLoading(true);
                  }}
                  style={
                    currentPage === cat.pdfPage
                      ? { backgroundColor: cat.color, color: cat.textColor || '#FFFFFF' }
                      : undefined
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    currentPage === cat.pdfPage
                      ? 'shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.name} (Pág. {cat.pageNumber})
                </button>
              ))}
            </div>
          )}

          {/* Main Interactive Page Canvas (Works natively on Android, iOS, Tablet, Laptop & Desktop) */}
          <div className="flex-1 relative bg-slate-100 flex items-center justify-center overflow-auto p-3 sm:p-6">
            {pageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 z-10 gap-2">
                <Loader2 className="w-8 h-8 text-sky-700 animate-spin" />
                <span className="text-xs font-semibold text-slate-600">
                  Cargando página {currentPage} de {totalPages}...
                </span>
              </div>
            )}

            <img
              key={`${catalogBrand}-${currentPage}`}
              src={pageImageEndpoint(currentPage)}
              alt={`${catalogTitle} - Página ${currentPage}`}
              onLoad={() => setPageLoading(false)}
              onError={(e) => {
                setPageLoading(false);
                e.currentTarget.src = isBetterware ? '/assets/betterware/page_001.jpg' : '/assets/catalog/page_001.jpg';
              }}
              className="max-h-full max-w-full object-contain rounded-xl shadow-lg bg-white"
            />
          </div>

          {/* Bottom Page Navigation Controls */}
          <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setPageLoading(true);
              }}
              disabled={currentPage <= 1}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
              <span>Página</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                    setPageLoading(true);
                  }
                }}
                className="w-16 px-2 py-1 text-center font-mono-num font-bold rounded-lg border border-slate-300 bg-slate-50"
              />
              <span className="text-slate-400 font-mono-num">de {totalPages}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                setPageLoading(true);
              }}
              disabled={currentPage >= totalPages}
              className="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const parsedProductPage = Math.max(1, parseInt(String(product.catalogPage).replace(/\D/g, ''), 10) || 1);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12"
      >
        {/* Left: Full Product / Catalog Image with Overlaid Price */}
        <div className="md:col-span-7 relative bg-slate-50 flex items-center justify-center p-4 min-h-[340px] sm:min-h-[460px]">
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="max-h-[72vh] w-auto object-contain rounded-xl"
            onError={(e) => {
              e.currentTarget.src = '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
            }}
          />

          {/* Price Tag on Image */}
          <div className="absolute bottom-4 right-4 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-sky-400">
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="text-[11px] font-mono-num text-rose-300 line-through">
                Regular: ${product.originalPrice.toLocaleString('es-MX')} MXN
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-sky-400">$</span>
              <span className="text-2xl font-bold font-mono-num">
                {product.price.toLocaleString('es-MX')}
              </span>
              <span className="text-xs uppercase opacity-80">MXN</span>
            </div>
            <div className="text-[11px] font-mono-num text-slate-300">
              Clave: {product.clave} · {product.presentation}
            </div>
          </div>
        </div>

        {/* Right: Contiguous Purchase Details */}
        <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-num text-slate-500">
                Clave: {product.clave} · Pág. {product.catalogPage}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="mt-3 text-2xl font-bold text-slate-900 leading-tight">
              {product.name}
            </h3>
            <p className="mt-1 text-sm font-semibold text-sky-700">
              {product.subtitle}
            </p>

            <div className="mt-4 py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-baseline justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Precio Oficial ({product.presentation})
              </span>
              <div className="text-right">
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="block text-xs font-mono-num text-slate-400 line-through">
                    ${product.originalPrice.toLocaleString('es-MX')} MXN
                  </span>
                )}
                <span className="text-2xl font-bold text-slate-900 font-mono-num">
                  ${product.price.toLocaleString('es-MX')} MXN
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onAddToCart(product, 1);
                onClose();
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Agregar al Carrito · ${product.price.toLocaleString('es-MX')} MXN</span>
            </button>

            {onOpenPdfAtPage && (
              <button
                type="button"
                onClick={() => onOpenPdfAtPage(parsedProductPage)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                <span>Ver Página {product.catalogPage} en el Visor del Catálogo</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Editar Precio e Imagen (Administrador)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
