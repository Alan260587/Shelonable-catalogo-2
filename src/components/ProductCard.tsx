import React, { useState } from 'react';
import { Product, Category } from '../types';
import {
  ShoppingBag,
  Edit3,
  Check,
  Plus,
  Minus,
  Image as ImageIcon,
  DollarSign,
  Eye,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  category?: Category;
  isAdmin: boolean;
  onAddToCart: (product: Product, quantity: number) => void;
  onEditProduct: (product: Product) => void;
  onQuickPriceSave: (productId: string, newPrice: number) => Promise<void>;
  onPreviewImage: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  isAdmin,
  onAddToCart,
  onEditProduct,
  onQuickPriceSave,
  onPreviewImage,
}) => {
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [editingPriceInline, setEditingPriceInline] = useState(false);
  const [inlinePriceValue, setInlinePriceValue] = useState(String(product.price));
  const [savingInline, setSavingInline] = useState(false);

  const handleAdd = () => {
    onAddToCart(product, qty);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  const handleSaveInlinePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parsed = Number(inlinePriceValue);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setSavingInline(true);
    try {
      await onQuickPriceSave(product.id, parsed);
      setEditingPriceInline(false);
    } finally {
      setSavingInline(false);
    }
  };

  const bannerColor = category?.color || '#0284C7';

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        {/* Product Image with Interactive Overlaid Catalog Price Tag */}
        <div className="relative aspect-[4/3] w-full bg-slate-50 overflow-hidden border-b border-slate-100">
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            onClick={() => onPreviewImage(product)}
            className="w-full h-full object-contain bg-white cursor-zoom-in group-hover:scale-103 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
            }}
          />

          {/* Top Left: Category & Page Reference */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-xs border border-slate-200/80 text-xs font-medium text-slate-700">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: bannerColor }}
            />
            <span className="truncate max-w-[160px]">{category?.name || 'Catálogo'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-slate-500">Pág. {product.catalogPage}</span>
          </div>

          {/* Top Right: Zoom / View Full Catalog Image */}
          <button
            type="button"
            onClick={() => onPreviewImage(product)}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-xs border border-slate-200/80 transition-colors"
            title="Ver imagen de catálogo en grande"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Bottom-Right Overlaid Price Badge on Image (Editable in-image by Admin) */}
          <div className="absolute bottom-3 right-3 z-10">
            {isAdmin && editingPriceInline ? (
              <form
                onSubmit={handleSaveInlinePrice}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 text-white p-2 rounded-xl shadow-xl border border-sky-400 flex items-center gap-1.5"
              >
                <span className="text-xs font-bold text-sky-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inlinePriceValue}
                  onChange={(e) => setInlinePriceValue(e.target.value)}
                  className="w-20 px-2 py-1 text-sm font-mono-num font-bold bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:border-sky-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={savingInline}
                  className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded transition-colors"
                >
                  {savingInline ? '...' : 'OK'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInlinePriceValue(String(product.price));
                    setEditingPriceInline(false);
                  }}
                  className="px-1.5 py-1 text-xs text-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </form>
            ) : (
              <div
                onClick={(e) => {
                  if (isAdmin) {
                    e.stopPropagation();
                    setInlinePriceValue(String(product.price));
                    setEditingPriceInline(true);
                  }
                }}
                className={`rounded-xl px-3.5 py-2 shadow-lg backdrop-blur-md border transition-transform ${
                  isAdmin
                    ? 'cursor-pointer bg-slate-900/95 text-white border-sky-400 hover:scale-105'
                    : 'bg-white/95 text-slate-900 border-slate-200/90'
                }`}
                title={
                  isAdmin
                    ? 'Haz clic para editar el precio directamente sobre la imagen'
                    : `Precio oficial: $${product.price} MXN`
                }
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-sky-600">$</span>
                  <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono-num">
                    {product.price.toLocaleString('es-MX')}
                  </span>
                  <span className="text-[11px] font-semibold uppercase opacity-75">MXN</span>
                </div>
                <div className="text-[10px] font-mono-num opacity-80 flex items-center justify-between gap-2">
                  <span>Clave: {product.clave}</span>
                  {isAdmin && (
                    <span className="text-sky-400 font-semibold flex items-center gap-0.5">
                      <Edit3 className="w-2.5 h-2.5" /> Precio
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Quick Action Bar on Image Bottom-Left */}
          {isAdmin && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProduct(product);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Cambiar Imagen / Precio</span>
              </button>
            </div>
          )}
        </div>

        {/* Product Details Body */}
        <div className="p-5">
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-num mb-1.5">
            <span>Clave: {product.clave}</span>
            <span aria-hidden="true">·</span>
            <span>{product.presentation}</span>
            <span aria-hidden="true">·</span>
            <span>Catálogo Pág. {product.catalogPage}</span>
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
            {product.name}
          </h3>

          <p className="text-xs font-medium text-sky-800 mt-0.5">{product.subtitle}</p>

          <p className="mt-2.5 text-sm text-slate-600 line-clamp-3 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>

      {/* Contiguous Purchase Controls */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-semibold font-mono-num text-slate-900">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Primary CTA */}
          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              addedFeedback
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-sky-700 hover:bg-sky-800 text-white shadow-xs'
            }`}
          >
            {addedFeedback ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Agregado!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Agregar · ${(product.price * qty).toLocaleString('es-MX')}</span>
              </>
            )}
          </button>
        </div>

        {/* Admin Quick Trigger Row */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onEditProduct(product)}
            className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-sky-700" />
            <span>Editar Precio (${product.price}) o Subir Imagen (URL / PC)</span>
          </button>
        )}
      </div>
    </article>
  );
};
