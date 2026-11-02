import React from 'react';
import { Category } from '../types';
import { BookOpen, Edit3, Sparkles, Check } from 'lucide-react';

interface CatalogIndexMenuProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  productCounts: Record<string, number>;
  isAdmin: boolean;
  onEditCategory: (category: Category) => void;
  onOpenPdfViewer: (pageNumber?: number) => void;
}

export const CatalogIndexMenu: React.FC<CatalogIndexMenuProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  productCounts,
  isAdmin,
  onEditCategory,
  onOpenPdfViewer,
}) => {
  return (
    <section id="indice-catalogo" className="py-12 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto">
      {/* Header styled after WA0027 "Índice" */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-100">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-sky-700 mb-2">
              Estructura Oficial del Catálogo Sheló NABEL 2026
            </p>
            <h2
              className="text-4xl sm:text-6xl font-normal tracking-tight text-slate-700"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Índice
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
              Selecciona cualquier categoría del menú interactivo para explorar sus productos, precios actualizados y agregarlos a tu carrito de compras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                selectedCategoryId === null
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {selectedCategoryId === null && <Check className="w-4 h-4" />}
              <span>Ver Todo el Catálogo ({Object.values(productCounts).reduce((a, b) => a + b, 0)})</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPdfViewer(1)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Catálogo PDF Completo</span>
            </button>
          </div>
        </div>

        {/* WA0027 3-Column Visual Index Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = productCounts[cat.id] || 0;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  onSelectCategory(isSelected ? null : cat.id);
                  const prodSection = document.getElementById('productos-catalogo');
                  if (prodSection) {
                    prodSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCategory(isSelected ? null : cat.id);
                  }
                }}
                className={`group relative rounded-[26px] overflow-hidden cursor-pointer transition-all duration-200 select-none bg-slate-100 ${
                  isSelected
                    ? 'ring-4 ring-sky-600 shadow-lg -translate-y-1'
                    : 'hover:-translate-y-1 hover:shadow-md border border-slate-200/80'
                }`}
              >
                {/* Category Image Container matching WA0027 card proportions */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
                    }}
                  />

                  {/* Subtle top gradient for page number legibility */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10 pointer-events-none" />

                  {/* Page Number in Top Right exactly like WA0027 (01, 08, 42, 64, 68, 84, 94, 114, 126, 128, 132, 138, 142) */}
                  <div
                    className="absolute top-3 right-4 text-2xl sm:text-3xl font-semibold tracking-tight drop-shadow-md font-mono-num"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: '#FFFFFF',
                      textShadow: '0 1px 6px rgba(0,0,0,0.45)',
                    }}
                  >
                    {cat.pageNumber}
                  </div>

                  {/* Product Count Indicator */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 shadow-xs">
                    {count} {count === 1 ? 'producto' : 'productos'}
                  </div>

                  {/* Admin Quick Edit Category Image Button */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCategory(cat);
                      }}
                      className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
                      title="Cambiar imagen o título de esta categoría"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Imagen</span>
                    </button>
                  )}
                </div>

                {/* Curved Bottom Color Ribbon matching WA0027 */}
                <div
                  className="relative px-5 py-4 flex items-center justify-between transition-colors"
                  style={{
                    backgroundColor: cat.color,
                    color: cat.textColor || '#FFFFFF',
                  }}
                >
                  {/* Decorative top curve lip like WA0027 */}
                  <div
                    className=" -top-3 left-0 right-0 h-3 rounded-b-[18px] bg-transparent pointer-events-none"
                    aria-hidden="true"
                  />
                  <div className="pr-2">
                    <h3 className="text-base sm:text-lg font-semibold leading-snug tracking-tight">
                      {cat.name}
                    </h3>
                    <p
                      className="text-xs opacity-90 line-clamp-1 mt-0.5"
                      style={{ color: cat.textColor || '#FFFFFF' }}
                    >
                      Pág. {cat.pageNumber} · {cat.description}
                    </p>
                  </div>

                  <span
                    className="text-xs font-semibold underline underline-offset-4 opacity-95 group-hover:opacity-100 whitespace-nowrap shrink-0"
                    style={{ color: cat.textColor || '#FFFFFF' }}
                  >
                    {isSelected ? 'Activo' : 'Explorar →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reference strip to view original WA0027 index image if desired */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              Menú interactivo estructurado sobre el Índice Oficial Sheló NABEL 2026 (Páginas 01 a 142).
            </span>
          </div>
          {selectedCategoryId && (
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="text-sky-700 font-semibold hover:underline whitespace-nowrap shrink-0"
            >
              Mostrar todas las categorías del catálogo
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
