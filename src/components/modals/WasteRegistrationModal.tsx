import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { UnitOfMeasure } from '../../types';
import { X, Trash2, AlertTriangle, History } from 'lucide-react';
import { motion } from 'motion/react';

interface WasteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterialId?: string;
}

export const WasteRegistrationModal: React.FC<WasteRegistrationModalProps> = ({
  isOpen,
  onClose,
  preselectedMaterialId
}) => {
  const { materials, addStockMovement, currentUser, unitConversions, stockMovements } = useBakery();

  const [selectedMatId, setSelectedMatId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<UnitOfMeasure>('kg');
  const [reason, setReason] = useState<string>('vencimento');
  const [customReason, setCustomReason] = useState('');
  const [responsible, setResponsible] = useState(currentUser?.name || 'Administrador');

  // Last 10 waste movements
  const wasteHistory = [...stockMovements]
    .filter(m => m.type === 'perda_avaria')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Sync with preselected material
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMatId(preselectedMaterialId || '');
      setResponsible(currentUser?.name || 'Administrador');
      const mat = materials.find(m => m.id === (preselectedMaterialId || ''));
      if (mat) setUnit(mat.unit);
    }
  }, [isOpen, preselectedMaterialId, currentUser, materials]);

  if (!isOpen) return null;

  const currentMat = materials.find(m => m.id === selectedMatId);
  
  const getConvertedQuantity = () => {
    if (!currentMat) return quantity;
    
    // Handle specific unit "un" (units/bottles) if it's not the base unit
    if (unit === 'un' && currentMat.unit !== 'un') {
      const pkgSize = currentMat.packageSize || 1;
      return quantity * pkgSize;
    }

    if (unit === currentMat.unit) return quantity;
    const conversion = unitConversions.find(c => c.from === unit && c.to === currentMat.unit);
    if (conversion) return quantity * conversion.factor;
    return quantity;
  };

  const convertedQuantity = getConvertedQuantity();
  const exceedsStock = currentMat ? convertedQuantity > currentMat.currentStock : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || !currentMat) {
      alert('Selecione um insumo para registrar a perda.');
      return;
    }
    if (quantity <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    if (exceedsStock) {
      alert('A quantidade descartada não pode ser superior ao saldo em estoque.');
      return;
    }

    const finalReason = reason === 'outro' ? customReason : 
      reason === 'vencimento' ? 'Data de validade expirada' :
      reason === 'avaria' ? 'Embalagem danificada / Avaria' :
      reason === 'erro_producao' ? 'Erro no processo de produção' : reason;

    addStockMovement({
      materialId: currentMat.id,
      materialName: currentMat.name,
      type: 'perda_avaria',
      quantity: Number(quantity),
      unit: unit,
      date: new Date().toISOString().split('T')[0],
      reason: finalReason,
      responsible
    });

    // Reset and close
    setQuantity(0);
    setCustomReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-lg overflow-hidden">
        
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#2B2D31]">
          <div>
            <h2 className="font-serif-brand text-xl font-bold text-[#382628] dark:text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Registro de Perdas / Descarte</span>
            </h2>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              Informe desperdícios para baixa automática no estoque e apuração financeira
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase tracking-wider">Insumo / Material *</label>
              {currentMat && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md">
                  Saldo: {currentMat.currentStock} {currentMat.unit}
                </span>
              )}
            </div>
            <select
              required
              value={selectedMatId}
              onChange={e => setSelectedMatId(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            >
              <option value="">Selecione o item...</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.currentStock} {m.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase tracking-wider mb-1.5">Quantidade Perdida *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={quantity || ''}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                  className={`w-full text-xs pl-3 pr-10 py-2.5 bg-white dark:bg-[#1E1F22] rounded-xl border ${exceedsStock ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#DACDC0] dark:border-[#3F4147]'} text-[#3D2C2E] dark:text-white font-bold focus:ring-2 focus:ring-rose-500 outline-none transition-all`}
                  placeholder="0.000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#7A6466] uppercase">
                  {unit}
                </span>
              </div>
              {exceedsStock && (
                <p className="text-[10px] text-rose-600 font-bold mt-1 animate-pulse">
                  ⚠️ Quantidade maior que o estoque atual!
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase tracking-wider mb-1.5">Unidade *</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as UnitOfMeasure)}
                className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              >
                <option value="kg">kg (Quilograma)</option>
                <option value="g">g (Grama)</option>
                <option value="l">l (Litro)</option>
                <option value="ml">ml (Mililitro)</option>
                <option value="un">{currentMat && currentMat.packageSize && currentMat.packageSize > 1 ? `un (Tamanho: ${currentMat.size || currentMat.packageSize}${currentMat.sizeUnit || currentMat.unit})` : 'un (Unidade)'}</option>
                <option value="pct">pct (Pacote)</option>
                <option value="cx">cx (Caixa)</option>
                <option value="m">m (Metro)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase tracking-wider mb-1.5">Motivo da Perda *</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            >
              <option value="vencimento">📅 Vencimento / Validade</option>
              <option value="avaria">📦 Avaria / Danificado</option>
              <option value="erro_producao">👨‍🍳 Erro de Produção</option>
              <option value="ajuste">🔄 Ajuste de Inventário</option>
              <option value="outro">📝 Outro Motivo</option>
            </select>
          </div>

          {reason === 'outro' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="overflow-hidden"
            >
              <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase tracking-wider mb-1.5">Especifique o Motivo *</label>
              <textarea
                required
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                rows={2}
                placeholder="Descreva detalhadamente o motivo do descarte..."
                className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none"
              />
            </motion.div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#543E40] dark:text-[#B5BAC1] uppercase tracking-wider mb-1.5">Responsável pelo Descarte *</label>
            <input
              type="text"
              required
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-white dark:bg-[#1E1F22] rounded-xl border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            />
          </div>

          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 p-4 rounded-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
              <strong>Atenção:</strong> Ao confirmar, a quantidade informada será <strong>subtraída</strong> do estoque atual e o valor correspondente será registrado como <strong>prejuízo financeiro</strong> no relatório mensal.
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41] hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={exceedsStock}
              className={`px-6 py-2.5 text-xs font-black rounded-xl ${exceedsStock ? 'bg-stone-300 cursor-not-allowed opacity-50' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 dark:shadow-none'} text-white transition-all uppercase tracking-tighter`}
            >
              Confirmar Descarte
            </button>
          </div>
        </form>

        {/* Waste History Section */}
        <div className="px-6 pb-6 pt-2 border-t border-[#EBE1D7] dark:border-[#3F4147] bg-[#F9F5F0] dark:bg-[#1A1B1E]">
          <div className="flex items-center gap-2 mb-3 mt-4">
            <History className="w-4 h-4 text-[#7A6466] dark:text-[#B5BAC1]" />
            <h3 className="text-xs font-bold text-[#382628] dark:text-white uppercase tracking-tighter">Últimos 10 Descartes</h3>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-[#E5DACF] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22]">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] dark:bg-[#2B2D31] border-b border-[#E5DACF] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-bold">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#382B2E]">
                {wasteHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-stone-400 italic">
                      Nenhum registro de perda recente.
                    </td>
                  </tr>
                ) : (
                  wasteHistory.map(m => (
                    <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-[#2B2D31] transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-[#7A6466] dark:text-[#B5BAC1]">
                        {new Date(m.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 font-bold text-[#382628] dark:text-white">{m.materialName}</td>
                      <td className="px-3 py-2 text-rose-600 font-bold whitespace-nowrap">-{m.quantity} {m.unit}</td>
                      <td className="px-3 py-2 text-[#7A6466] dark:text-[#B5BAC1] truncate max-w-[120px]" title={m.reason}>
                        {m.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
