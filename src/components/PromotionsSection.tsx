import React, { useState, useRef } from 'react';
import { PromotionItem } from '../types';
import {
  Sparkles,
  Edit3,
  Upload,
  Link as LinkIcon,
  Save,
  X,
  MessageCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

interface PromotionsSectionProps {
  promotions: PromotionItem[];
  isAdmin: boolean;
  whatsappNumber: string;
  onSavePromotion: (promoId: string, updates: Partial<PromotionItem>) => Promise<void>;
  onUploadFile: (file: File, key?: string) => Promise<string>;
  onOpenAdminPromotionsTab?: (promo?: PromotionItem) => void;
}

export const PromotionsSection: React.FC<PromotionsSectionProps> = ({
  promotions,
  isAdmin,
  whatsappNumber,
  onSavePromotion,
  onUploadFile,
  onOpenAdminPromotionsTab,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBadgeText, setEditBadgeText] = useState('');
  const [editPrice, setEditPrice] = useState('300');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [zoomedPromo, setZoomedPromo] = useState<PromotionItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEditing = (promo: PromotionItem) => {
    setEditingId(promo.id);
    setEditTitle(promo.title);
    setEditSubtitle(promo.subtitle);
    setEditBadgeText(promo.badgeText);
    setEditPrice(String(promo.price ?? 300));
    setEditDescription(promo.description);
    setEditImageUrl(promo.imageUrl);
    setFeedbackMsg('');
    setErrorMsg('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setErrorMsg('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, promoClave: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg('');
    setFeedbackMsg('');
    try {
      const uploadedUrl = await onUploadFile(file, promoClave || 'promo');
      setEditImageUrl(uploadedUrl);
      setFeedbackMsg('¡Imagen cargada! Haz clic en "Guardar Cambios" para aplicarla.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent, promoId: string) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setFeedbackMsg('');
    try {
      await onSavePromotion(promoId, {
        title: editTitle,
        subtitle: editSubtitle,
        badgeText: editBadgeText,
        price: Number(editPrice) || 0,
        description: editDescription,
        imageUrl: editImageUrl,
      });
      setEditingId(null);
      setFeedbackMsg('¡Promoción actualizada correctamente!');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar la promoción.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="apartado-promociones"
      className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto space-y-8"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/15 text-sky-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apartado Especial de Promociones y Afiliación</span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Promociones y Membresía Sheló NABEL
          </h2>
          <p className="text-sm sm:text-base text-sky-100 max-w-2xl">
            Conoce el Kit Básico de Afiliación con 40% de descuento y los requisitos para obtener tu membresía oficial con <strong>Yesenia Jiménez (632 103 7155)</strong>. Haz clic en cualquier imagen para verla en pantalla completa.
          </p>
        </div>

        {onOpenAdminPromotionsTab && (
          <button
            type="button"
            onClick={() => onOpenAdminPromotionsTab(promotions[0])}
            className="px-4 py-3 rounded-xl bg-white text-slate-900 hover:bg-sky-50 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-colors shrink-0 self-start md:self-center"
          >
            <Edit3 className="w-4 h-4 text-sky-700" />
            <span>
              {isAdmin
                ? 'Editar Promociones en Panel'
                : 'Editar Imagen / Título (Panel Admin ****)'}
            </span>
          </button>
        )}
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-sm text-emerald-900 font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 2-Column Extra-Large Promotional Flyers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {promotions.map((promo) => {
          const isEditingThis = isAdmin && editingId === promo.id;
          const waText = encodeURIComponent(
            `Hola Yesenia, vi en tu página la promoción "${promo.title}" (${promo.badgeText}) y me gustaría recibir más información.`
          );

          return (
            <article
              key={promo.id}
              className="bg-white rounded-3xl border-2 border-sky-200/90 shadow-md overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl"
            >
              {/* LARGE FULL-CLARITY IMAGE CONTAINER */}
              <div className="relative w-full bg-gradient-to-b from-sky-50/70 via-white to-slate-50 border-b border-slate-200 p-3 sm:p-5 flex items-center justify-center min-h-[420px] sm:min-h-[560px]">
                <img
                  src={isEditingThis ? editImageUrl : promo.imageUrl}
                  alt={promo.title}
                  onClick={() => !isEditingThis && setZoomedPromo(promo)}
                  className="w-full max-h-[700px] object-contain rounded-2xl shadow-sm cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/aistudio/IMG-20261020-WA0029_de2a322f.jpg';
                  }}
                />

                {/* Top Left Badge */}
                <div className="absolute top-5 left-5 bg-sky-800/95 text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-md backdrop-blur-xs">
                  {isEditingThis ? editBadgeText : promo.badgeText}
                </div>

                {/* Top Right Fullscreen Zoom Button */}
                {!isEditingThis && (
                  <button
                    type="button"
                    onClick={() => setZoomedPromo(promo)}
                    className="absolute top-5 right-5 px-3 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Ver imagen en pantalla completa"
                  >
                    <Eye className="w-4 h-4 text-sky-700" />
                    <span>Ver Grande</span>
                  </button>
                )}

                {/* Admin Quick Edit Trigger Overlay */}
                {isAdmin && !isEditingThis && (
                  <div className="absolute bottom-5 right-5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(promo)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-lg border border-sky-400 flex items-center gap-2 transition-transform hover:scale-105"
                    >
                      <Edit3 className="w-4 h-4 text-sky-400" />
                      <span>Editar Título / Cambiar Imagen</span>
                    </button>
                  </div>
                )}
              </div>

              {/* BODY: Either Inline Editor (for Admin) or Promotion Details + WhatsApp CTA */}
              {isEditingThis ? (
                <form
                  onSubmit={(e) => handleSaveSubmit(e, promo.id)}
                  className="p-6 sm:p-7 bg-sky-50/60 space-y-4 border-t border-sky-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-900">
                      Editando Promoción ({promo.clave})
                    </span>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título de la Promoción
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo
                      </label>
                      <input
                        type="text"
                        value={editSubtitle}
                        onChange={(e) => setEditSubtitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Etiqueta Superior
                      </label>
                      <input
                        type="text"
                        value={editBadgeText}
                        onChange={(e) => setEditBadgeText(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono-num rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Inversión / Precio MXN
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono-num font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  {/* Image Upload / URL Replacement Box */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cambiar Imagen (Desde tu Computadora/Celular o por URL)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, promo.clave)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploading
                            ? 'Subiendo imagen...'
                            : 'Subir Nueva Imagen desde Dispositivo'}
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
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          placeholder="/assets/aistudio/... o https://..."
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving || uploading}
                      className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Guardando...' : 'Guardar Cambios de Promoción'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 sm:p-8 space-y-4 bg-white">
                  <div>
                    <h3
                      className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {promo.title}
                    </h3>
                    <p className="text-sm sm:text-base font-semibold text-sky-700 mt-1">
                      {promo.subtitle}
                    </p>
                    <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                      {promo.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                    <a
                      href={`https://wa.me/${whatsappNumber}?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Solicitar Promoción / Afiliarme por WhatsApp</span>
                    </a>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => startEditing(promo)}
                        className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-sky-400" />
                        <span>Editar Imagen / Título</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Fullscreen Zoom Modal when clicking a Promotion Image */}
      {zoomedPromo && (
        <div
          onClick={() => setZoomedPromo(null)}
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[94vh]"
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold">{zoomedPromo.title}</h3>
                <p className="text-xs text-sky-300">{zoomedPromo.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setZoomedPromo(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
              <img
                src={zoomedPromo.imageUrl}
                alt={zoomedPromo.title}
                className="max-h-[82vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
