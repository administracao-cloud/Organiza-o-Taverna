import React, { useState, useEffect } from 'react';
import { SocialPost } from '../../types';
import { useBakery } from '../../context/BakeryContext';
import { X, Calendar, Clock, Share2, Tag, FileText, CheckCircle2 } from 'lucide-react';

interface SocialPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: SocialPost | null;
  initialData?: Partial<SocialPost> | null;
}

export const SocialPostModal: React.FC<SocialPostModalProps> = ({
  isOpen,
  onClose,
  postToEdit,
  initialData
}) => {
  const { addSocialPost, updateSocialPost } = useBakery();

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<('instagram' | 'facebook' | 'tiktok' | 'whatsapp')[]>(['instagram']);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('15:00');
  const [status, setStatus] = useState<'ideia' | 'agendado' | 'publicado'>('agendado');
  const [mediaNotes, setMediaNotes] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [promotionalCoupon, setPromotionalCoupon] = useState('');

  useEffect(() => {
    if (postToEdit) {
      setTitle(postToEdit.title || '');
      setCaption(postToEdit.caption || '');
      setPlatforms(postToEdit.platforms || ['instagram']);
      setScheduledDate(postToEdit.scheduledDate || new Date().toISOString().split('T')[0]);
      setScheduledTime(postToEdit.scheduledTime || '15:00');
      setStatus(postToEdit.status || 'agendado');
      setMediaNotes(postToEdit.mediaNotes || '');
      setHashtagsText((postToEdit.suggestedHashtags || []).join(' '));
      setPromotionalCoupon(postToEdit.promotionalCoupon || '');
    } else if (initialData) {
      setTitle(initialData.title || '');
      setCaption(initialData.caption || '');
      setPlatforms(initialData.platforms || ['instagram']);
      setScheduledDate(initialData.scheduledDate || new Date().toISOString().split('T')[0]);
      setScheduledTime(initialData.scheduledTime || '15:00');
      setStatus(initialData.status || 'agendado');
      setMediaNotes(initialData.mediaNotes || '');
      setHashtagsText((initialData.suggestedHashtags || []).join(' '));
      setPromotionalCoupon(initialData.promotionalCoupon || '');
    } else {
      setTitle('');
      setCaption('');
      setPlatforms(['instagram']);
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setScheduledTime('15:00');
      setStatus('agendado');
      setMediaNotes('');
      setHashtagsText('#confeitariaartesanal #boloartesanal #paoartesanal');
      setPromotionalCoupon('');
    }
  }, [postToEdit, initialData, isOpen]);

  if (!isOpen) return null;

  const togglePlatform = (p: 'instagram' | 'facebook' | 'tiktok' | 'whatsapp') => {
    if (platforms.includes(p)) {
      if (platforms.length > 1) {
        setPlatforms(platforms.filter(x => x !== p));
      }
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !caption.trim()) {
      alert('Por favor preencha o título e a legenda do post.');
      return;
    }

    const tagsArray = hashtagsText
      .split(' ')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => t.startsWith('#') ? t : `#${t}`);

    const postPayload: SocialPost = {
      id: postToEdit ? postToEdit.id : `post-${Date.now()}`,
      title,
      caption,
      platforms,
      scheduledDate,
      scheduledTime,
      status,
      mediaNotes,
      suggestedHashtags: tagsArray,
      promotionalCoupon: promotionalCoupon.toUpperCase()
    };

    if (postToEdit) {
      updateSocialPost(postToEdit.id, postPayload);
    } else {
      addSocialPost(postPayload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#2B2D31] rounded-2xl max-w-xl w-full border border-[#E8DFD5] dark:border-[#3F4147] shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#B86B77]" />
            <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
              {postToEdit ? 'Editar Post de Redes Sociais' : 'Agendar / Anotar Post de Rede Social'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Title */}
          <div>
            <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Título do Post / Tema *</label>
            <input
              type="text"
              required
              placeholder="Ex: Reels do Corte do Bolo Red Velvet com Vulcão Ninho"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF] focus:ring-2 focus:ring-[#B86B77]/30 focus:outline-hidden font-medium"
            />
          </div>

          {/* Platforms Selector */}
          <div>
            <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Redes Sociais Alvo</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'instagram', label: '📷 Instagram' },
                { id: 'tiktok', label: '🎵 TikTok' },
                { id: 'whatsapp', label: '💬 WhatsApp Status' },
                { id: 'facebook', label: '👥 Facebook' }
              ].map(p => {
                const isSelected = platforms.includes(p.id as any);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#B86B77] text-white border-[#9E5460]'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduled Date, Time & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Data Programada</label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF]"
              />
            </div>

            <div>
              <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Horário Sugerido</label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF]"
              />
            </div>

            <div>
              <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF] font-semibold"
              >
                <option value="ideia">💡 Rascunho / Ideia</option>
                <option value="agendado">🗓️ Agendado</option>
                <option value="publicado">✅ Publicado</option>
              </select>
            </div>
          </div>

          {/* Caption Textarea */}
          <div>
            <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Legenda do Post *</label>
            <textarea
              rows={4}
              required
              placeholder="Digite a legenda que será copiada para a rede social..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF] font-sans leading-relaxed focus:ring-2 focus:ring-[#B86B77]/30 focus:outline-hidden"
            />
          </div>

          {/* Media Notes & Video Ideas */}
          <div>
            <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Instruções Visuais / Ideia de Vídeo ou Foto</label>
            <input
              type="text"
              placeholder="Ex: Gravar em câmera lenta a calda caindo sobre o bolo artesanal com luz natural"
              value={mediaNotes}
              onChange={e => setMediaNotes(e.target.value)}
              className="w-full p-2 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF]"
            />
          </div>

          {/* Hashtags & Coupon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Hashtags Estratégicas</label>
              <input
                type="text"
                placeholder="#confeitaria #bolodeaniversario #delivery"
                value={hashtagsText}
                onChange={e => setHashtagsText(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF]"
              />
            </div>

            <div>
              <label className="font-bold text-[#352527] dark:text-[#FFFFFF] block mb-1">Cupom Promocional no Post (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: INSTA10"
                value={promotionalCoupon}
                onChange={e => setPromotionalCoupon(e.target.value)}
                className="w-full p-2 rounded-xl border border-[#DACDC0] bg-white text-[#352527] dark:text-[#FFFFFF] font-mono uppercase font-bold text-amber-800"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#E8DFD5] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#DACDC0] bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{postToEdit ? 'Salvar Alterações' : 'Agendar Post'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
