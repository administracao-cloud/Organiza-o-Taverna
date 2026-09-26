import React, { useState, useEffect } from 'react';
import { BakeryProvider, useBakery } from './context/BakeryContext';
import { supabase } from './lib/supabase';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';

// Views
import { OverviewView } from './components/views/OverviewView';
import { OrdersView } from './components/views/OrdersView';
import { TechnicalSheetsView } from './components/views/TechnicalSheetsView';
import { ProductionView } from './components/views/ProductionView';
import { PurchasesView } from './components/views/PurchasesView';
import { InventoryView } from './components/views/InventoryView';
import { PricingView } from './components/views/PricingView';
import { CustomersView } from './components/views/CustomersView';
import { FinanceView } from './components/views/FinanceView';
import { MarketingView } from './components/views/MarketingView';
import { AdminSettingsView } from './components/views/AdminSettingsView';
import { LoginView } from './components/views/LoginView';

// Modals
import { OrderModal } from './components/modals/OrderModal';
import { PurchaseModal } from './components/modals/PurchaseModal';
import { TechnicalSheetModal } from './components/modals/TechnicalSheetModal';
import { IntegrationsModal } from './components/modals/IntegrationsModal';
import { ToastContainer } from './components/common/ToastContainer';

import { Order, TechnicalSheet, PurchaseRecord } from './types';

function BakeryApp() {
  const { currentUser, isInitialLoading, orders, toasts, removeToast } = useBakery();
  const [activeTab, setActiveTab] = useLocalStorageState<ActiveTab>('sabore_active_tab', 'overview');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Auto-recovery for any corrupt, empty, or invalid stored tab values to prevent blank screens
  useEffect(() => {
    const validTabs: string[] = [
      'overview', 'orders', 'production', 'sheets', 'purchases', 
      'inventory', 'pricing', 'customers', 'finance', 'marketing', 'settings'
    ];
    if (!activeTab || !validTabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, setActiveTab]);

  // Modal States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseRecord | null>(null);

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<TechnicalSheet | null>(null);

  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [integrationsModalTab, setIntegrationsModalTab] = useState<'ifood' | '99food' | 'commissions' | 'simulation'>('ifood');

  // If user is not logged in or still on first access forced password change, show LoginView
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout ensuring the app never blocks on network/supabase delays
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsAuthLoading(false);
    }, 1500);

    supabase.auth.getSession()
      .then(() => {
        if (isMounted) setIsAuthLoading(false);
      })
      .catch((err) => {
        console.warn('[Supabase Auth Check]', err);
        if (isMounted) setIsAuthLoading(false);
      });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) setIsAuthLoading(false);
    });
    
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthLoading || isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#3D2C2E] dark:text-white font-sans-brand p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#B86B77] text-white flex items-center justify-center font-serif-brand font-bold text-2xl shadow-md animate-pulse mb-4">
          S
        </div>
        <h2 className="font-serif-brand text-xl font-bold text-[#352527] dark:text-[#F2F3F5] mb-1">
          Saborê
        </h2>
        <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1] animate-pulse">
          Carregando confeitaria artesanal...
        </p>
      </div>
    );
  }

  if (!currentUser || currentUser.isFirstAccess) {
    return <LoginView />;
  }

  // Handlers
  const handleOpenNewOrder = () => {
    setOrderToEdit(null);
    setIsOrderModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsOrderModalOpen(true);
  };

  const handleOpenNewSheet = () => {
    setSheetToEdit(null);
    setIsSheetModalOpen(true);
  };

  const handleEditSheet = (sheet: TechnicalSheet) => {
    setSheetToEdit(sheet);
    setIsSheetModalOpen(true);
  };

  const handleOpenIntegrations = (tab: 'ifood' | '99food' | 'commissions' | 'simulation' = 'ifood') => {
    setIntegrationsModalTab(tab);
    setIsIntegrationsModalOpen(true);
  };

  const handleViewOrderFromToast = (orderId: string) => {
    setActiveTab('orders');
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      handleEditOrder(targetOrder);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#313338] text-[#332224] dark:text-[#F2F3F5] flex flex-col font-sans-brand antialiased selection:bg-[#B86B77]/20 selection:text-white print:bg-white print:block print:min-h-0">
      
      {/* Top Header */}
      <div className="print:hidden">
        <Header
          onOpenNewOrder={handleOpenNewOrder}
          onOpenNewPurchase={() => setIsPurchaseModalOpen(true)}
          onOpenIntegrations={handleOpenIntegrations}
        />
      </div>

      {/* Main Container */}
      <div className={`flex-1 flex flex-col md:flex-row w-full mx-auto ${isFullScreen ? 'max-w-full px-0' : 'max-w-7xl'}`}>
        
        {/* Sidebar Navigation */}
        {!isFullScreen && (
          <div className="print:hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        )}

        {/* Dynamic View Content */}
        <main className={`flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto print:p-0 ${isFullScreen ? 'bg-white dark:bg-[#1E1F22] z-50 fixed inset-0 md:static' : ''}`}>
          {activeTab === 'overview' && (
            <OverviewView
              setActiveTab={setActiveTab}
              onOpenNewOrder={handleOpenNewOrder}
              onOpenNewPurchase={() => setIsPurchaseModalOpen(true)}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              onOpenNewOrder={handleOpenNewOrder}
              onEditOrder={handleEditOrder}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
            />
          )}

          {activeTab === 'sheets' && (
            <TechnicalSheetsView
              onOpenNewSheet={handleOpenNewSheet}
              onEditSheet={handleEditSheet}
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
            />
          )}

          {activeTab === 'production' && (
            <ProductionView 
              isFullScreen={isFullScreen}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              onOpenNewPurchase={() => {
                setPurchaseToEdit(null);
                setIsPurchaseModalOpen(true);
              }}
              onEditPurchase={(p) => {
                setPurchaseToEdit(p);
                setIsPurchaseModalOpen(true);
              }}
            />
          )}

          {activeTab === 'inventory' && <InventoryView />}

          {activeTab === 'pricing' && <PricingView />}

          {activeTab === 'customers' && <CustomersView />}

          {activeTab === 'finance' && <FinanceView />}

          {activeTab === 'marketing' && <MarketingView />}

          {activeTab === 'settings' && (
            currentUser.role === 'Administrador' ? (
              <AdminSettingsView />
            ) : (
              <div className="p-8 bg-white border border-[#E8DFD5] rounded-2xl text-center shadow-xs max-w-lg mx-auto my-12">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold">!</span>
                </div>
                <h3 className="font-serif-brand text-lg font-bold text-[#352527] dark:text-[#FFFFFF] mb-1.5">
                  Acesso Restrito
                </h3>
                <p className="text-xs text-[#7A6466] leading-relaxed mb-4">
                  A área de Configurações é totalmente restrita e acessível apenas por usuários que tenham o cargo de Administrador.
                </p>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 bg-[#B86B77] text-white text-xs font-semibold rounded-xl hover:bg-[#A35965] transition-colors cursor-pointer"
                >
                  Voltar para a Visão Geral
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Modals */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderToEdit(null);
        }}
        orderToEdit={orderToEdit}
      />

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setPurchaseToEdit(null);
        }}
        editingPurchase={purchaseToEdit || undefined}
      />

      <TechnicalSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => {
          setIsSheetModalOpen(false);
          setSheetToEdit(null);
        }}
        sheetToEdit={sheetToEdit}
      />

      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        initialTab={integrationsModalTab}
      />

      {/* Floating Toast Feedback Notifications Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
        onViewOrder={handleViewOrderFromToast}
      />

    </div>
  );
}

export default function App() {
  return (
    <BakeryProvider>
      <BakeryApp />
    </BakeryProvider>
  );
}
