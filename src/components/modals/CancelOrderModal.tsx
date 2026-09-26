import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { AlertTriangle, X, Check, PackageX, ServerCrash, UserX, Bike, Building2, HelpCircle } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onConfirmCancel: (order: Order, reason: string, cancellationCode: string) => Promise<void>;
}

export const IFOOD_CANCELLATION_CODES = [
  { code: '502', title: '502 - Item / Produto Indisponível no Estoque', category: 'estoque', defaultText: 'Produto indisponível no estoque ou ingrediente esgotado.' },
  { code: '501', title: '501 - Problemas de Sistema / Integração Técnica', category: 'sistema', defaultText: 'Erro técnico no sistema de retaguarda ou integração PDV.' },
  { code: '506', title: '506 - Solicitado pelo Próprio Cliente', category: 'cliente', defaultText: 'Cliente solicitou o cancelamento do pedido por telefone ou mensagem.' },
  { code: '507', title: '507 - Dificuldade na Entrega / Entregador Indisponível', category: 'entrega', defaultText: 'Indisponibilidade de entregadores ou problemas logísticos na rota.' },
  { code: '504', title: '504 - Estabelecimento Fechado ou Sem Capacidade', category: 'operacao', defaultText: 'Estabelecimento fechado para balcão ou capacidade produtiva excedida.' },
  { code: '503', title: '503 - Área de Entrega Fora da Cobertura', category: 'entrega', defaultText: 'Endereço de entrega fora do raio de atendimento do restaurante.' },
  { code: '505', title: '505 - Endereço do Cliente Incompleto / Incorreto', category: 'cliente', defaultText: 'Endereço de entrega informado pelo cliente está incompleto ou com erro.' },
  { code: '508', title: '508 - Erro de Preço ou Valor de Item Cadastrado', category: 'sistema', defaultText: 'Divergência ou erro no valor cadastrado para os itens do pedido.' },
  { code: '509', title: '509 - Pedido Duplicado na Cozinha', category: 'operacao', defaultText: 'Pedido gerado em duplicidade na cozinha/integração.' },
  { code: '510', title: '510 - Outros Motivos Operacionais Internos', category: 'operacao', defaultText: 'Outro motivo operacional não especificado acima.' },
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmCancel
}) => {
  const [cancellationCode, setCancellationCode] = useState<string>('502');
  const [reason, setReason] = useState<string>('Produto indisponível no estoque ou ingrediente esgotado.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setCancellationCode('502');
      setReason('Produto indisponível no estoque ou ingrediente esgotado.');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const isIfood = order.channel === 'ifood';

  const handleSelectCode = (code: string) => {
    setCancellationCode(code);
    const found = IFOOD_CANCELLATION_CODES.find(c => c.code === code);
    if (found && (!reason || reason === 'Produto indisponível no estoque ou ingrediente esgotado.' || IFOOD_CANCELLATION_CODES.some(c => c.defaultText === reason))) {
      setReason(found.defaultText);
    }
  };

  const handleApplyPreset = (code: string, text: string) => {
    setCancellationCode(code);
    setReason(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Por favor, descreva o motivo do cancelamento.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirmCancel(order, reason.trim(), cancellationCode);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar cancelamento do pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-stone-200 dark:border-[#3F4147] shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8DFD5] dark:border-[#3F4147] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-[#EA1D2C]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF]">
                  Cancelar Pedido
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FAF0F2] dark:bg-stone-800 text-[#B86B77] border border-[#F2D7DA] dark:border-[#3F4147]">
                  {order.code}
                </span>
              </div>
              <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                Informe o motivo e o código de cancelamento para os registros {isIfood ? 'da API do iFood' : 'do sistema'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-[#8C7678] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Brief */}
        <div className="bg-[#FAF6F0] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#352527] dark:text-[#FFFFFF]">{order.customerName}</span>
            <span className="font-mono font-bold text-[#B86B77]">R$ {order.total.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] truncate">
            {order.items?.map(i => `${i.quantity}x ${i.productName}`).join(', ') || 'Sem itens'}
          </p>
        </div>

        {/* Preset Chips */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#543E40] dark:text-[#E0D3C5]">
            Atalhos de Motivos Frequentes:
          </label>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleApplyPreset('502', 'Falta de produto no estoque / ingrediente esgotado.')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                cancellationCode === '502'
                  ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-900 dark:text-rose-200 font-bold'
                  : 'bg-white dark:bg-[#1E1F22] border-stone-200 dark:border-[#3F4147] text-stone-700 dark:text-stone-300 hover:bg-rose-50'
              }`}
            >
              <PackageX className="w-3.5 h-3.5 text-rose-600" />
              <span>Falta de Produto (502)</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('501', 'Erro no sistema de retaguarda / integração de pedidos.')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                cancellationCode === '501'
                  ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200 font-bold'
                  : 'bg-white dark:bg-[#1E1F22] border-stone-200 dark:border-[#3F4147] text-stone-700 dark:text-stone-300 hover:bg-amber-50'
              }`}
            >
              <ServerCrash className="w-3.5 h-3.5 text-amber-600" />
              <span>Erro de Sistema (501)</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('506', 'Cliente solicitou o cancelamento por mensagem ou ligação.')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                cancellationCode === '506'
                  ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-400 text-blue-900 dark:text-blue-200 font-bold'
                  : 'bg-white dark:bg-[#1E1F22] border-stone-200 dark:border-[#3F4147] text-stone-700 dark:text-stone-300 hover:bg-blue-50'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-blue-600" />
              <span>Cliente Solicitou (506)</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('507', 'Indisponibilidade de entregadores ou problemas de transporte.')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                cancellationCode === '507'
                  ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-400 text-purple-900 dark:text-purple-200 font-bold'
                  : 'bg-white dark:bg-[#1E1F22] border-stone-200 dark:border-[#3F4147] text-stone-700 dark:text-stone-300 hover:bg-purple-50'
              }`}
            >
              <Bike className="w-3.5 h-3.5 text-purple-600" />
              <span>Sem Entregador (507)</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cancellation Code Dropdown */}
          <div>
            <label className="block text-xs font-bold text-[#543E40] dark:text-[#E0D3C5] mb-1">
              Código de Cancelamento Exigido pela API iFood:
            </label>
            <select
              value={cancellationCode}
              onChange={(e) => handleSelectCode(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#EA1D2C]/30"
            >
              {IFOOD_CANCELLATION_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Reason Textarea */}
          <div>
            <label className="block text-xs font-bold text-[#543E40] dark:text-[#E0D3C5] mb-1">
              Descrição / Detalhes do Motivo:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Descreva o motivo detalhado do cancelamento (ex: Falta de ingrediente para o bolo, forno em manutenção, etc)..."
              className="w-full p-3 text-xs rounded-xl border border-[#E8DFD5] dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#352527] dark:text-[#FFFFFF] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#EA1D2C]/30"
              required
            />
          </div>

          {/* Warning Banner */}
          {isIfood && (
            <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/40 text-[11px] text-rose-900 dark:text-rose-200 flex items-start gap-2">
              <Building2 className="w-4 h-4 text-[#EA1D2C] shrink-0 mt-0.5" />
              <span>
                <strong>Integração iFood:</strong> A solicitação de cancelamento com código <code className="font-mono bg-rose-100 dark:bg-rose-900/60 px-1 py-0.2 rounded font-bold">{cancellationCode}</code> e justificativa será enviada diretamente à API oficial do iFood.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 text-xs border border-red-300 dark:border-red-800">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFD5] dark:border-[#3F4147]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-[#3F4147] bg-white dark:bg-[#1E1F22] text-[#553E41] dark:text-[#FFFFFF] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#EA1D2C] hover:bg-[#c81725] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cancelando...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Confirmar Cancelamento</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
