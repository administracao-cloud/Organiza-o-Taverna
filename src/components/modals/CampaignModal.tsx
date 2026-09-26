import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { MarketingCampaign } from '../../types';
import { X, Megaphone, Tag } from 'lucide-react';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: MarketingCampaign | null;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  campaignToEdit
}) => {
  const { addCampaign, updateCampaign } = useBakery();

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<MarketingCampaign['channel']>('Instagram');
  const [status, setStatus] = useState<MarketingCampaign['status']>('ativa');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [budget, setBudget] = useState<number>(300);
  const [revenueGenerated, setRevenueGenerated] = useState<number>(0);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [discountCoupon, setDiscountCoupon] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (campaignToEdit) {
      setTitle(campaignToEdit.title);
      setChannel(campaignToEdit.channel);
      setStatus(campaignToEdit.status);
      setStartDate(campaignToEdit.startDate);
      setEndDate(campaignToEdit.endDate);
      setBudget(campaignToEdit.budget);
      setRevenueGenerated(campaignToEdit.revenueGenerated);
      setOrdersCount(campaignToEdit.ordersCount);
      setDiscountCoupon(campaignToEdit.discountCoupon || '');
      setNotes(campaignToEdit.notes || '');
    } else {
      setTitle('');
      setChannel('Instagram');
      setStatus('ativa');
      setStartDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setEndDate(d.toISOString().split('T')[0]);
      setBudget(300);
      setRevenueGenerated(0);
      setOrdersCount(0);
      setDiscountCoupon('');
      setNotes('');
    }
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Preencha o título da campanha.');
      return;
    }

    const campData = {
      title,
      channel,
      status,
      startDate,
      endDate,
      budget: Number(budget),
      revenueGenerated: Number(revenueGenerated),
      ordersCount: Number(ordersCount),
      discountCoupon: discountCoupon.trim().toUpperCase() || undefined,
      notes
    };

    if (campaignToEdit) {
      updateCampaign(campaignToEdit.id, campData);
    } else {
      addCampaign(campData);
    }

    onClose();
  };

  const estimatedRoi = budget > 0 
    ? (((revenueGenerated - budget) / budget) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-lg overflow-hidden">
        
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
          <div>
            <h2 className="font-serif-brand text-xl font-bold text-[#382628] dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#B86B77]" />
              <span>{campaignToEdit ? 'Editar Campanha de Marketing' : 'Nova Campanha de Marketing'}</span>
            </h2>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              Acompanhe investimentos, cupons, canais de atração e retorno financeiro
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Título da Campanha *</label>
            <input
              type="text"
              required
              placeholder="Ex: Festival de Macarons com Cupom iFood"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Canal de Divulgação</label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              >
                <option value="Instagram">Instagram Ads & Reels</option>
                <option value="iFood Promoções">iFood Destaques / Cupons</option>
                <option value="99Food Promoções">99Food Promoções</option>
                <option value="WhatsApp VIP">WhatsApp Lista VIP</option>
                <option value="Parcerias & Eventos">Parcerias & Eventos Locais</option>
                <option value="Google">Google Meu Negócio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Status da Campanha</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              >
                <option value="ativa">🟢 Ativa no Ar</option>
                <option value="planejada">📅 Planejada / Agendada</option>
                <option value="pausada">⏸️ Pausada Temporariamente</option>
                <option value="concluida">🏁 Concluída</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Data de Início</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Data de Término</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Orçamento (R$)</label>
              <input
                type="number"
                step="10"
                min="0"
                value={budget}
                onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Receita Gerada (R$)</label>
              <input
                type="number"
                step="10"
                min="0"
                value={revenueGenerated}
                onChange={e => setRevenueGenerated(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Pedidos Gerados</label>
              <input
                type="number"
                min="0"
                value={ordersCount}
                onChange={e => setOrdersCount(parseInt(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-[#F2E8DE] rounded-xl border border-[#DFD1C4] flex items-center justify-between text-xs">
            <span className="text-[#6B5557]">Retorno Estimado sobre Investimento (ROI):</span>
            <strong className={`font-serif-brand text-base ${Number(estimatedRoi) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {estimatedRoi}%
            </strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Cupom de Desconto / Código Promocional</label>
            <input
              type="text"
              placeholder="Ex: SABORE10 ou DOCE15"
              value={discountCoupon}
              onChange={e => setDiscountCoupon(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Estratégia & Notas</label>
            <textarea
              rows={2}
              placeholder="Descreva o público-alvo, criativos utilizados, copy e métricas de engajamento..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-xs"
            >
              Salvar Campanha
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
