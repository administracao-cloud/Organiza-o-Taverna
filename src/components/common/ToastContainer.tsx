import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastNotification } from '../../types';
import { 
  ShoppingBag, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Info, 
  XCircle, 
  Zap,
  ArrowRight
} from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onViewOrder?: (orderId: string) => void;
}

/**
 * Função utilitária para tocar alertas sonoros curtos e agradáveis via Web Audio API.
 */
export function playNotificationChime(type: 'ifood_order' | 'error' | 'warning' | 'success') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'ifood_order') {
      // Tom do iFood: Duplo bipe alegre (C5 -> G5)
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.18); // G5
      gain2.gain.setValueAtTime(0.25, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.45);
    } else if (type === 'error') {
      // Tom de Erro: Tom grave duplo (220Hz -> 160Hz)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'warning') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Autoplay bloqueado até primeira interação do usuário
  }
}

export function ToastContainer({ toasts, onDismiss, onViewOrder }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full px-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onDismiss={onDismiss} 
            onViewOrder={onViewOrder} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ 
  toast, 
  onDismiss, 
  onViewOrder 
}: { 
  toast: ToastNotification; 
  onDismiss: (id: string) => void; 
  onViewOrder?: (orderId: string) => void;
}) {
  const duration = toast.duration || (toast.type === 'ifood_order' ? 8000 : 5000);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const isIfood = toast.type === 'ifood_order';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isSuccess = toast.type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl shadow-xl border backdrop-blur-md p-4 transition-all ${
        isIfood
          ? 'bg-[#180A0B]/95 text-white border-[#EA1D2C]/60 shadow-red-950/30'
          : isError
          ? 'bg-[#2A1015]/95 text-white border-rose-500/60 shadow-rose-950/30'
          : isWarning
          ? 'bg-[#28180A]/95 text-white border-amber-500/60 shadow-amber-950/30'
          : isSuccess
          ? 'bg-[#0B2117]/95 text-white border-emerald-500/60 shadow-emerald-950/30'
          : 'bg-[#1E1F22]/95 text-white border-stone-600/60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone Indicador */}
        <div className={`p-2 rounded-xl shrink-0 ${
          isIfood 
            ? 'bg-[#EA1D2C] text-white shadow-md shadow-red-600/30 animate-pulse' 
            : isError 
            ? 'bg-rose-600 text-white' 
            : isWarning 
            ? 'bg-amber-500 text-stone-950 font-bold' 
            : isSuccess 
            ? 'bg-emerald-500 text-white' 
            : 'bg-stone-700 text-stone-200'
        }`}>
          {isIfood ? (
            <ShoppingBag className="w-5 h-5" />
          ) : isError ? (
            <XCircle className="w-5 h-5" />
          ) : isWarning ? (
            <AlertTriangle className="w-5 h-5" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-1">
            <h4 className="font-serif-brand font-bold text-sm tracking-wide leading-tight">
              {toast.title}
            </h4>
            {isIfood && (
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono font-bold tracking-wider">
                iFOOD
              </span>
            )}
          </div>

          <p className="text-xs text-stone-200/90 leading-relaxed font-sans mb-1.5">
            {toast.message}
          </p>

          <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
            <span>{toast.timestamp || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            {isIfood && toast.orderId && onViewOrder && (
              <button
                type="button"
                onClick={() => {
                  onViewOrder(toast.orderId!);
                  onDismiss(toast.id);
                }}
                className="text-[#FF5252] hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer underline"
              >
                <span>Ver Pedido</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Botão Fechar */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          title="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de Progresso de Descarte */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${
          isIfood
            ? 'bg-[#EA1D2C]'
            : isError
            ? 'bg-rose-500'
            : isWarning
            ? 'bg-amber-500'
            : isSuccess
            ? 'bg-emerald-500'
            : 'bg-stone-500'
        }`}
      />
    </motion.div>
  );
}
