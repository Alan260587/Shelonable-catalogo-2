import React, { useState } from 'react';
import { CartItem } from '../types';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  whatsappNumber: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  whatsappNumber,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('Hermosillo, Sonora');
  const [customerNotes, setCustomerNotes] = useState('');
  const [orderSent, setOrderSent] = useState(false);

  if (!isOpen) return null;

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const buildWhatsAppUrl = () => {
    const hasShelo = items.some((i) => i.product.brand !== 'betterware');
    const hasBetterware = items.some((i) => i.product.brand === 'betterware');
    const headerTitle =
      hasShelo && hasBetterware
        ? '🛍️ *HOLA YESENIA - PEDIDO CATÁLOGO SHELÓ NABEL Y BETTERWARE 2026* 🛍️'
        : hasBetterware
        ? '🏠 *HOLA YESENIA - PEDIDO CATÁLOGO BETTERWARE NOVIEMBRE 2026* 🏠'
        : '🌿 *HOLA YESENIA - PEDIDO CATÁLOGO SHELÓ NABEL 2026* 🌿';

    const lines: string[] = [headerTitle, ''];

    if (customerName.trim()) {
      lines.push(`👤 *Cliente:* ${customerName.trim()}`);
    }
    if (customerCity.trim()) {
      lines.push(`📍 *Ciudad / Entrega:* ${customerCity.trim()}`);
    }
    lines.push('');
    lines.push('🛍️ *DETALLE DEL CARRITO DE COMPRAS:*');

    items.forEach((item, index) => {
      const subtotal = item.product.price * item.quantity;
      const brandTag = item.product.brand === 'betterware' ? '[Betterware]' : '[Sheló NABEL]';
      lines.push(
        `${index + 1}. ${brandTag} *${item.product.name}* (Clave: ${item.product.clave} · Pág. ${item.product.catalogPage})`
      );
      lines.push(
        `   • Cantidad: ${item.quantity} x $${item.product.price.toLocaleString('es-MX')} MXN = *$${subtotal.toLocaleString('es-MX')} MXN*`
      );
    });

    lines.push('');
    lines.push(`📦 *Total de piezas:* ${totalItems}`);
    lines.push(`💰 *TOTAL A PAGAR:* *$${totalAmount.toLocaleString('es-MX')} MXN*`);

    if (customerNotes.trim()) {
      lines.push(`📝 *Notas:* ${customerNotes.trim()}`);
    }

    lines.push('');
    lines.push(
      '💳 *Me gustaría recibir los datos bancarios / CLABE para realizar el pago mediante transferencia bancaria. ¡Gracias!*'
    );

    const encoded = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Tu Carrito de Compras
                </h2>
                <p className="text-xs text-slate-500 font-mono-num">
                  {totalItems} {totalItems === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Tu carrito está vacío
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  Explora los catálogos de Sheló NABEL y Betterware y agrega tus productos favoritos para enviar tu pedido por WhatsApp.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              <>
                {/* Itemized List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Productos en tu pedido
                    </span>
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Vaciar carrito
                    </button>
                  </div>

                  {items.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex gap-3.5 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-xl object-contain bg-white border border-slate-200/80 shrink-0"
                        onError={(e) => {
                          e.currentTarget.src =
                            '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                product.brand === 'betterware'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {product.brand === 'betterware' ? 'Betterware' : 'Sheló NABEL'}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                              {product.name}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                            title="Quitar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 font-mono-num mt-0.5">
                          Clave: {product.clave} · ${product.price.toLocaleString('es-MX')} c/u
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-lg"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-bold font-mono-num">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-lg"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-sm font-bold text-slate-900 font-mono-num">
                            ${(product.price * quantity).toLocaleString('es-MX')} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer & Transfer Details Form */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-sky-900 font-semibold text-sm">
                      <CreditCard className="w-4 h-4 text-sky-700 shrink-0" />
                      <span>Pago mediante Transferencia por WhatsApp</span>
                    </div>
                    <p className="text-xs text-sky-800 mt-1 leading-relaxed">
                      Al confirmar tu carrito se abrirá una conversación directa en WhatsApp con{' '}
                      <strong>Yesenia Jiménez (+52 632 103 7155)</strong> con el desglose exacto de tu pedido para enviarte los datos de transferencia bancaria y coordinar tu entrega.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tu Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej. María Guadalupe López"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ciudad o Colonia de Entrega
                      </label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="Ej. Hermosillo, Sonora"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Notas adicionales (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="Horario preferido, dudas de algún producto..."
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total de artículos ({totalItems} pzas)</span>
                  <span className="font-mono-num">${totalAmount.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200/80">
                  <span>Total a Transferir</span>
                  <span className="text-xl text-sky-700 font-mono-num">
                    ${totalAmount.toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>

              {orderSent && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ¡Pedido generado! Continúa en WhatsApp (+52 632 103 7155) para finalizar tu transferencia.
                  </span>
                </div>
              )}

              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOrderSent(true)}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span>Pedir por WhatsApp para Transferencia</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>

              <p className="text-[11px] text-center text-slate-500 font-mono-num">
                WhatsApp Directo: +52 632 103 7155 · Yesenia Jiménez
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
