import React from 'react';
import { safeStorage } from '../utils/storage';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ClipboardList, 
  Wheat, 
  Boxes, 
  Percent, 
  Users, 
  DollarSign, 
  Megaphone,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Flame,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Radio
} from 'lucide-react';
import { useBakery } from '../context/BakeryContext';

export type ActiveTab = 
  | 'overview' 
  | 'orders' 
  | 'production'
  | 'sheets' 
  | 'purchases' 
  | 'inventory' 
  | 'pricing' 
  | 'customers' 
  | 'finance' 
  | 'marketing'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { 
    orders, 
    materials, 
    dailyProductions = [], 
    currentUser, 
    hasUnreadIfoodOrders, 
    setHasUnreadIfoodOrders,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    ifoodConnected,
    setIfoodConnected,
    addToast
  } = useBakery();

  const handleToggleIfood = () => {
    const nextState = !ifoodConnected;
    setIfoodConnected(nextState);
    if (nextState) {
      addToast({
        title: 'iFood Polling Ativado',
        message: 'O serviço de sincronização do iFood foi reativado. O sistema está ONLINE no iFood.',
        type: 'success'
      });
    } else {
      addToast({
        title: 'iFood Polling Suspenso',
        message: 'O serviço de polling do iFood foi suspenso temporariamente. O sistema está OFFLINE no iFood.',
        type: 'warning'
      });
    }
  };

  // Theme State (Light / Dark)
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const saved = safeStorage.get<string>(safeStorage.keys.THEME, 'light');
    if (saved === 'dark') return 'dark';
    return 'light'; // Clean artisanal warm light theme by default
  });

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    safeStorage.set(safeStorage.keys.THEME, theme);
  }, [theme]);

  React.useEffect(() => {
    if (activeTab === 'orders' && hasUnreadIfoodOrders) {
      setHasUnreadIfoodOrders(false);
    }
  }, [activeTab, hasUnreadIfoodOrders, setHasUnreadIfoodOrders]);

  const pendingOrdersCount = (orders || []).filter(o => o && o.status === 'pendente').length;
  const inProductionOrdersCount = (orders || []).filter(o => o && o.status === 'em_producao').length;
  const lowStock = (materials || []).filter(m => m && m.currentStock <= m.minStock).length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const activeProductionsToday = (dailyProductions || []).filter(p => p && p.date === todayStr && p.quantityRemaining > 0).length;

  const isAdmin = currentUser?.role === 'Administrador';

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Visão Geral',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'orders' as ActiveTab,
      label: 'Pedidos & Encomendas',
      icon: ShoppingBag,
      badge: hasUnreadIfoodOrders 
        ? (pendingOrdersCount > 1 ? `${pendingOrdersCount} NOVOS` : 'NOVO') 
        : (pendingOrdersCount > 0 ? `${pendingOrdersCount} pendente${pendingOrdersCount > 1 ? 's' : ''}` : (inProductionOrdersCount > 0 ? `${inProductionOrdersCount} em prod.` : null)),
      badgeColor: hasUnreadIfoodOrders 
        ? 'bg-[#EA1D2C] text-white animate-pulse shadow-[0_0_12px_rgba(234,29,44,0.5)] ring-2 ring-red-400/50 font-extrabold' 
        : (pendingOrdersCount > 0 
            ? 'bg-amber-400 text-stone-950 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.45)] ring-2 ring-amber-300/60 font-extrabold' 
            : 'bg-blue-600 text-white font-bold')
    },
    {
      id: 'production' as ActiveTab,
      label: 'Produção do Dia',
      icon: Flame,
      badge: activeProductionsToday > 0 ? `${activeProductionsToday} itens` : null,
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'sheets' as ActiveTab,
      label: 'Fichas Técnicas',
      icon: ClipboardList,
      badge: null
    },
    {
      id: 'purchases' as ActiveTab,
      label: 'Compras de Insumos',
      icon: Wheat,
      badge: null
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Controle de Estoque',
      icon: Boxes,
      badge: lowStock > 0 ? lowStock : null,
      badgeColor: 'bg-amber-600 text-white'
    },
    {
      id: 'pricing' as ActiveTab,
      label: 'Precificação Dinâmica',
      icon: Percent,
      badge: null
    },
    {
      id: 'customers' as ActiveTab,
      label: 'Base de Clientes',
      icon: Users,
      badge: null
    },
    {
      id: 'finance' as ActiveTab,
      label: 'Controle Financeiro',
      icon: DollarSign,
      badge: null
    },
    {
      id: 'marketing' as ActiveTab,
      label: 'Controle de Marketing',
      icon: Megaphone,
      badge: null
    },
    ...(isAdmin ? [{
      id: 'settings' as ActiveTab,
      label: 'Configurações',
      icon: ShieldCheck,
      badge: null
    }] : [])
  ];

  return (
    <aside className={`w-full ${
      isSidebarCollapsed ? 'md:w-20 md:px-2' : 'md:w-64 md:p-4'
    } shrink-0 bg-[#F5EFE6] dark:bg-[#2B2D31] border-r border-[#E8DFD5] dark:border-[#3F4147] p-3 flex md:flex-col justify-between overflow-x-auto md:overflow-x-visible transition-all duration-300 ease-in-out`}>
      <div className="w-full flex md:flex-col gap-1 md:gap-1.5 min-w-max md:min-w-0">
        {/* Header with Title and Toggle Button */}
        <div className="hidden md:flex items-center justify-between px-2 py-1.5 mb-1">
          {!isSidebarCollapsed ? (
            <>
              <span className="text-[11px] font-bold text-[#8A7274] dark:text-[#B5BAC1] tracking-wider uppercase">
                Módulos
              </span>
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="p-1.5 rounded-lg text-[#8A7274] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-white hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
                title="Ocultar barra lateral (deixar somente os ícones)"
                aria-label="Recolher barra lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="p-2 rounded-xl text-[#8A7274] dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#B86B77] dark:text-white" />
              </button>
            </div>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`relative flex items-center ${
                isSidebarCollapsed 
                  ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2.5 justify-between gap-3' 
                  : 'justify-between gap-3 px-3 py-2.5'
              } rounded-xl text-xs transition-all text-left whitespace-nowrap md:whitespace-normal cursor-pointer group ${
                isActive
                  ? 'bg-[#B86B77] dark:bg-[#35373C] dark:border dark:border-[#4E5058] text-white shadow-xs font-bold'
                  : 'text-[#503E40] dark:text-[#B5BAC1] font-semibold hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] hover:text-[#2A1D1F] dark:hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'md:justify-center gap-2.5' : 'gap-2.5'}`}>
                <Icon className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isActive ? 'text-white' : 'text-[#8A6A6F] dark:text-[#949BA4]'}`} />
                <span className={`${isSidebarCollapsed ? 'md:hidden' : ''} ${isActive ? 'text-white font-bold' : ''}`}>
                  {item.label}
                </span>
              </div>

              {/* Floating Tooltip in Collapsed Desktop Mode */}
              {isSidebarCollapsed && (
                <div className="hidden md:group-hover:flex items-center gap-2 absolute left-full ml-3 px-3 py-1.5 bg-[#352527] dark:bg-[#1E1F22] text-white text-xs font-bold rounded-lg shadow-xl border border-[#E8DFD5]/20 dark:border-[#3F4147] pointer-events-none z-50 whitespace-nowrap">
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-extrabold">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {item.badge !== null && (
                <>
                  {isSidebarCollapsed ? (
                    <>
                      {/* Mobile view badge (horizontal bar) */}
                      <span className={`md:hidden text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor
                      }`}>
                        <span>{item.badge}</span>
                      </span>

                      {/* Desktop collapsed floating beacon / counter */}
                      <span className={`hidden md:flex absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center text-[9px] font-black shadow-sm ${
                        isActive 
                          ? (item.id === 'orders' && (hasUnreadIfoodOrders || pendingOrdersCount > 0)
                              ? 'bg-white text-[#B86B77] animate-pulse ring-2 ring-white/60'
                              : 'bg-white/30 text-white')
                          : item.badgeColor
                      }`}>
                        {item.id === 'orders' && (hasUnreadIfoodOrders || pendingOrdersCount > 0) && (
                          <span className="relative flex h-1.5 w-1.5 shrink-0 mr-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                          </span>
                        )}
                        <span>
                          {typeof item.badge === 'number' || (!isNaN(Number(item.badge)) && item.badge !== null && item.badge !== undefined)
                            ? item.badge
                            : (typeof item.badge === 'string' && item.badge.includes('NOVOS')
                               ? (pendingOrdersCount || '!')
                               : (item.badge === 'NOVO'
                                 ? '!'
                                 : (item.badge ? item.badge.split(' ')[0] : '')))
                          }
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-all duration-300 ${
                      isActive 
                        ? (item.id === 'orders' && (hasUnreadIfoodOrders || pendingOrdersCount > 0)
                            ? 'bg-white text-[#B86B77] animate-pulse shadow-sm ring-2 ring-white/60 font-extrabold'
                            : 'bg-white/20 text-white')
                        : item.badgeColor
                    }`}>
                      {item.id === 'orders' && (hasUnreadIfoodOrders || pendingOrdersCount > 0) && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                        </span>
                      )}
                      <span className="tracking-tight">{item.badge}</span>
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Theme Switcher, iFood Polling Toggle & Mini Artisan Motto Footer */}
      <div className={`pt-3 border-t border-[#E5DACF] dark:border-[#3F4147] mt-4 ${isSidebarCollapsed ? 'px-0 md:px-0' : 'px-2'} space-y-3 shrink-0`}>
        
        {/* iFood Polling Global Toggle */}
        {!isSidebarCollapsed ? (
          <div className="p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] transition-all">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {ifoodConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA1D2C] opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    ifoodConnected ? 'bg-[#EA1D2C]' : 'bg-stone-400 dark:bg-stone-500'
                  }`} />
                </span>
                <span className="text-xs font-bold text-[#352527] dark:text-white">
                  Polling iFood
                </span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                ifoodConnected 
                  ? 'bg-[#EA1D2C]/10 text-[#EA1D2C] border-[#EA1D2C]/30 dark:bg-[#EA1D2C]/20 dark:text-red-300' 
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
              }`}>
                {ifoodConnected ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#EFE8E0] dark:border-[#35373C]">
              <span className="text-[11px] text-[#7A6466] dark:text-[#B5BAC1] font-medium truncate">
                {ifoodConnected ? 'Sincronização ativa' : 'Serviço suspenso'}
              </span>
              <button
                type="button"
                onClick={handleToggleIfood}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  ifoodConnected ? 'bg-[#EA1D2C]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
                title={ifoodConnected ? "Clique para suspender o polling do iFood e ficar Offline" : "Clique para ativar o polling do iFood e ficar Online"}
                aria-label={ifoodConnected ? "Suspender polling do iFood" : "Ativar polling do iFood"}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    ifoodConnected ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed Desktop iFood Toggle Button */
          <div className="hidden md:flex flex-col items-center">
            <button
              type="button"
              onClick={handleToggleIfood}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer group relative border ${
                ifoodConnected
                  ? 'bg-[#EA1D2C]/10 dark:bg-[#EA1D2C]/20 border-[#EA1D2C]/40 text-[#EA1D2C] dark:text-red-400'
                  : 'bg-stone-100 dark:bg-[#1E1F22] border-[#E5DACF] dark:border-[#3F4147] text-stone-400 dark:text-stone-500'
              }`}
              title={ifoodConnected ? 'iFood Polling: ONLINE (Clique para suspender)' : 'iFood Polling: OFFLINE (Clique para ativar)'}
              aria-label={ifoodConnected ? "Suspender polling iFood" : "Ativar polling iFood"}
            >
              <div className="relative flex items-center justify-center">
                <Radio className={`w-4 h-4 ${ifoodConnected ? 'animate-pulse text-[#EA1D2C]' : 'text-stone-400'}`} />
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  ifoodConnected ? 'bg-[#EA1D2C] ring-2 ring-white dark:ring-[#1E1F22]' : 'bg-stone-400'
                }`} />
              </div>

              {/* Floating Tooltip in Collapsed Desktop Mode */}
              <div className="hidden group-hover:flex items-center gap-2 absolute left-full ml-3 px-3 py-1.5 bg-[#352527] dark:bg-[#1E1F22] text-white text-xs font-bold rounded-lg shadow-xl border border-[#E8DFD5]/20 dark:border-[#3F4147] pointer-events-none z-50 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${ifoodConnected ? 'bg-[#EA1D2C]' : 'bg-stone-400'}`} />
                <span>iFood Polling: {ifoodConnected ? 'ONLINE' : 'OFFLINE'}</span>
                <span className="text-[10px] text-stone-300">({ifoodConnected ? 'Pausar' : 'Ativar'})</span>
              </div>
            </button>
          </div>
        )}

        {/* Mobile iFood Toggle Pill */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={handleToggleIfood}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              ifoodConnected
                ? 'bg-[#EA1D2C]/10 text-[#EA1D2C] border-[#EA1D2C]/30'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${ifoodConnected ? 'animate-pulse' : ''}`} />
            <span>iFood: {ifoodConnected ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        {isSidebarCollapsed ? (
          /* Collapsed Desktop Theme Switcher */
          <div className="hidden md:flex flex-col items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FAF7F2] dark:bg-[#1E1F22] border border-[#E5DACF] dark:border-[#3F4147] text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-white transition-colors cursor-pointer group relative"
              title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
              <div className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-[#352527] dark:bg-[#1E1F22] text-white text-[11px] font-bold rounded-lg shadow-lg border border-[#E8DFD5]/20 dark:border-[#3F4147] pointer-events-none z-50 whitespace-nowrap">
                {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              </div>
            </button>
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="p-2 rounded-xl text-[#8A7274] dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-white hover:bg-[#EAE0D5] dark:hover:bg-[#35373C] transition-colors cursor-pointer"
              title="Expandir barra lateral"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#B86B77] dark:text-white" />
            </button>
          </div>
        ) : (
          /* Expanded Theme Switcher */
          <div>
            <div className="text-[10px] font-bold text-[#8A7274] dark:text-[#B5BAC1] uppercase tracking-wider mb-1.5 px-1 hidden md:block">
              Aparência / Tema
            </div>
            <div className="flex items-center bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-[#352527] dark:text-[#FFFFFF] shadow-xs font-bold'
                    : 'text-[#7A6466] hover:text-[#352527] dark:hover:text-[#FFFFFF] dark:text-[#B5BAC1] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C]'
                }`}
                title="Ativar Modo Claro"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Claro</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#313338] text-white shadow-xs font-bold border border-[#3F4147]'
                    : 'text-[#7A6466] dark:text-[#B5BAC1] hover:text-[#352527] dark:hover:text-[#FFFFFF] hover:bg-[#FAF7F2] dark:hover:bg-[#35373C]'
                }`}
                title="Ativar Modo Escuro"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Escuro</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile theme pills (fallback for small screens) */}
        {isSidebarCollapsed && (
          <div className="md:hidden flex items-center bg-[#FAF7F2] dark:bg-[#1E1F22] p-1 rounded-xl border border-[#E5DACF] dark:border-[#3F4147]">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-[#352527] dark:text-white shadow-xs font-bold'
                  : 'text-[#7A6466] dark:text-[#B5BAC1]'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#313338] text-white shadow-xs font-bold'
                  : 'text-[#7A6466] dark:text-[#B5BAC1]'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>
        )}

        {/* Mini Artisan Motto Footer */}
        {!isSidebarCollapsed && (
          <div className="hidden md:block pt-1">
            <div className="flex items-center gap-2 text-[#7C6668] dark:text-[#B5BAC1] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B86B77] dark:bg-[#E295A1]"></span>
              <span>Fornadas Frescas Diárias</span>
            </div>
            <p className="text-[10px] text-[#9E898B] dark:text-[#949BA4] mt-1 leading-relaxed">
              Tradição em fermentação natural, viennoiserie e confeitaria autoral.
            </p>
          </div>
        )}

      </div>
    </aside>
  );
};
