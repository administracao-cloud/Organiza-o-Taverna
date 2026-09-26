import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { UnitOfMeasure } from '../../types';
import { X, Boxes, AlertOctagon } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterialId?: string;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  preselectedMaterialId
}) => {
  const { materials, addStockMovement } = useBakery();

  const [selectedMatId, setSelectedMatId] = useState(preselectedMaterialId || '');
  const [type, setType] = useState<'entrada' | 'saida_producao' | 'ajuste' | 'perda_avaria'>('saida_producao');
  const [quantity, setQuantity] = useState<number>(1);
  const [inputUnit, setInputUnit] = useState<'base' | 'un'>('base');
  const [reason, setReason] = useState('');
  const [responsible, setResponsible] = useState('Chef Padeiro Marcelo Ramos');

  if (!isOpen) return null;

  const currentMat = materials.find(m => m.id === selectedMatId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || !currentMat) {
      alert('Selecione um insumo para registrar movimentação.');
      return;
    }
    if (!reason.trim()) {
      alert('Informe a justificativa ou motivo da movimentação de estoque.');
      return;
    }

    addStockMovement({
      materialId: currentMat.id,
      materialName: currentMat.name,
      type,
      quantity: Number(quantity),
      unit: inputUnit === 'un' ? 'un' : currentMat.unit,
      date: new Date().toLocaleString('pt-BR'),
      reason,
      responsible
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-lg overflow-hidden">
        
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
          <div>
            <h2 className="font-serif-brand text-xl font-bold text-[#382628] dark:text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#B86B77]" />
              <span>Movimentação Manual de Estoque</span>
            </h2>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              Registro de saídas para produção, inventário ou perdas com rastreabilidade
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Insumo *</label>
            <select
              required
              value={selectedMatId}
              onChange={e => setSelectedMatId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
            >
              <option value="">Selecione o insumo...</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} (Atual: {m.currentStock} {m.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Tipo de Movimento</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-medium"
              >
                <option value="saida_producao">🥣 Saída p/ Produção / Forno</option>
                <option value="perda_avaria">⚠️ Perda / Avaria / Descarte</option>
                <option value="entrada">📥 Entrada Manual (Sem NF)</option>
                <option value="ajuste">🔄 Ajuste de Inventário Físico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">
                Quantidade *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                  className="flex-1 text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
                />
                <select
                  value={inputUnit}
                  onChange={e => setInputUnit(e.target.value as 'base' | 'un')}
                  className="w-24 text-xs px-2 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white font-medium"
                >
                  <option value="base">{currentMat ? currentMat.unit : 'un'}</option>
                  {currentMat && currentMat.packageSize && currentMat.packageSize > 1 && (
                    <option value="un">Tamanho ({currentMat.size || currentMat.packageSize}{currentMat.sizeUnit || currentMat.unit})</option>
                  )}
                </select>
              </div>
              {inputUnit === 'un' && currentMat && currentMat.packageSize && (
                <p className="text-[10px] text-[#7A6466] mt-1">
                  Total: {(quantity * currentMat.packageSize).toFixed(2)} {currentMat.unit}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Justificativa / Motivo Detalhado *</label>
            <input
              type="text"
              required
              placeholder="Ex: Utilizado na fornada de croissants do dia; ou Embalagem rasgada no transporte"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Responsável pelo Lançamento *</label>
            <input
              type="text"
              required
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
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
              Confirmar Movimentação
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
