import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
      <div className="bg-[#FAF7F2] dark:bg-[#1E1F22] w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E8DFD5] dark:border-[#3F4147] flex items-center justify-between bg-white dark:bg-[#2B2D31]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-[#FAF0F2] dark:hover:bg-[#3F4147] rounded-lg transition-colors text-[#9E898B] dark:text-[#B5BAC1]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-[#7A6466] dark:text-[#DBDEE1] text-sm">
          {message}
        </div>

        {/* Footer */}
        <div className="p-5 bg-white dark:bg-[#2B2D31] border-t border-[#E8DFD5] dark:border-[#3F4147] flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#F2EAE1] dark:hover:bg-[#3F4147] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
