import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'table' | 'kanban' | 'card' | 'text' | 'order-detail';
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  rows = 5,
  columns = 4,
  className = '',
}) => {
  const getShimmerClass = () => 'animate-pulse bg-stone-200 dark:bg-stone-700/60 rounded-sm';

  if (variant === 'table') {
    return (
      <div id="skeleton-table" className={`overflow-x-auto w-full ${className}`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] dark:bg-[#1E1F22] border-b border-[#E8DFD5] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] font-semibold text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3.5 w-1/6">Código / Canal</th>
              <th className="p-3.5 w-1/4">Cliente & Endereço</th>
              <th className="p-3.5 w-1/4">Itens do Pedido</th>
              <th className="p-3.5 text-center w-1/12">Data / Horário</th>
              <th className="p-3.5 text-center w-1/12">Status</th>
              <th className="p-3.5 text-right w-1/12">Total</th>
              <th className="p-3.5 text-center w-1/12">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0E8DF] dark:divide-[#382B2E]">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="bg-white dark:bg-[#2B2D31]">
                <td className="p-3.5">
                  <div className={`h-4 w-20 ${getShimmerClass()}`}></div>
                  <div className={`h-3 w-12 mt-1.5 ${getShimmerClass()}`}></div>
                </td>
                <td className="p-3.5">
                  <div className={`h-4 w-32 ${getShimmerClass()}`}></div>
                  <div className={`h-3 w-24 mt-1.5 ${getShimmerClass()}`}></div>
                </td>
                <td className="p-3.5">
                  <div className={`h-4 w-44 ${getShimmerClass()}`}></div>
                  <div className={`h-3 w-36 mt-1.5 ${getShimmerClass()}`}></div>
                </td>
                <td className="p-3.5 text-center">
                  <div className={`h-4 w-12 mx-auto ${getShimmerClass()}`}></div>
                  <div className={`h-3 w-10 mx-auto mt-1.5 ${getShimmerClass()}`}></div>
                </td>
                <td className="p-3.5">
                  <div className={`h-5 w-20 mx-auto rounded-full ${getShimmerClass()}`}></div>
                </td>
                <td className="p-3.5 text-right">
                  <div className={`h-4 w-16 ml-auto ${getShimmerClass()}`}></div>
                </td>
                <td className="p-3.5 text-center">
                  <div className={`h-7 w-20 mx-auto rounded-lg ${getShimmerClass()}`}></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (variant === 'kanban') {
    return (
      <div id="skeleton-kanban" className={`grid grid-cols-1 md:grid-cols-4 gap-4 w-full ${className}`}>
        {['Pendente', 'Em Produção', 'Pronto', 'Saiu para Entrega'].map((title, cIdx) => (
          <div key={cIdx} className="bg-[#FAF7F2] dark:bg-[#1E1F22] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-4 flex flex-col h-[750px] min-w-[280px]">
            <div className="flex justify-between items-center pb-3 border-b border-[#F0E8DF] dark:border-[#332527] mb-4">
              <span className="font-semibold text-xs text-[#5C4D4F] dark:text-[#E3E5E8] uppercase tracking-wider">{title}</span>
              <div className={`h-5 w-6 rounded-full ${getShimmerClass()}`}></div>
            </div>
            <div className="space-y-3 overflow-hidden flex-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div key={cardIdx} className="bg-white dark:bg-[#2B2D31] rounded-xl p-3 border border-[#E5DACF] dark:border-[#3F4147] space-y-3 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div className={`h-4 w-16 ${getShimmerClass()}`}></div>
                    <div className={`h-4 w-10 rounded-full ${getShimmerClass()}`}></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className={`h-4 w-full ${getShimmerClass()}`}></div>
                    <div className={`h-3 w-2/3 ${getShimmerClass()}`}></div>
                  </div>
                  <div className="pt-2 border-t border-[#F5EDE3] dark:border-[#3F4147] flex justify-between items-center">
                    <div className={`h-3 w-16 ${getShimmerClass()}`}></div>
                    <div className={`h-4 w-12 ${getShimmerClass()}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'order-detail') {
    return (
      <div id="skeleton-order-detail" className={`space-y-4 p-4 ${className}`}>
        <div className="flex justify-between">
          <div className={`h-6 w-32 ${getShimmerClass()}`}></div>
          <div className={`h-6 w-20 rounded-full ${getShimmerClass()}`}></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[#F0E8DF] dark:border-[#3F4147] rounded-xl p-4 space-y-3 bg-white dark:bg-[#2B2D31]">
            <div className={`h-4 w-24 ${getShimmerClass()}`}></div>
            <div className={`h-4 w-full ${getShimmerClass()}`}></div>
            <div className={`h-4 w-2/3 ${getShimmerClass()}`}></div>
          </div>
          <div className="border border-[#F0E8DF] dark:border-[#3F4147] rounded-xl p-4 space-y-3 bg-white dark:bg-[#2B2D31]">
            <div className={`h-4 w-24 ${getShimmerClass()}`}></div>
            <div className={`h-4 w-full ${getShimmerClass()}`}></div>
            <div className={`h-4 w-2/3 ${getShimmerClass()}`}></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className={`h-4 w-16 ${getShimmerClass()}`}></div>
          <div className={`h-12 w-full ${getShimmerClass()}`}></div>
          <div className={`h-12 w-full ${getShimmerClass()}`}></div>
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div id="skeleton-text" className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className={`${getShimmerClass()} h-4`}
            style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div id="skeleton-card" className={`bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-5 shadow-xs ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className={`h-12 w-12 rounded-full ${getShimmerClass()}`}></div>
        <div className="space-y-2 flex-1">
          <div className={`h-4 w-1/3 ${getShimmerClass()}`}></div>
          <div className={`h-3 w-1/4 ${getShimmerClass()}`}></div>
        </div>
      </div>
      <div className="space-y-2.5">
        <div className={`h-4 w-full ${getShimmerClass()}`}></div>
        <div className={`h-4 w-5/6 ${getShimmerClass()}`}></div>
        <div className={`h-4 w-2/3 ${getShimmerClass()}`}></div>
      </div>
    </div>
  );
};
