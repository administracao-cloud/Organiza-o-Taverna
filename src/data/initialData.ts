import { 
  Material, 
  PurchaseRecord, 
  TechnicalSheet, 
  PricingConfig, 
  Order, 
  Customer, 
  FinancialTransaction, 
  MarketingCampaign, 
  StockMovement,
  StockBatch,
  SocialPost,
  UserAccount,
  DailyProduction
} from '../types';

export const initialMaterials: Material[] = [];

export const initialPurchases: PurchaseRecord[] = [];

export const initialTechnicalSheets: TechnicalSheet[] = [];

export const initialPricingConfigs: PricingConfig[] = [];

export const initialOrders: Order[] = [];

export const initialCustomers: Customer[] = [];

export const initialTransactions: FinancialTransaction[] = [];

export const initialMarketingCampaigns: MarketingCampaign[] = [];

export const initialStockMovements: StockMovement[] = [];

const todayStr = new Date().toISOString().split('T')[0];
const calcDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const initialStockBatches: StockBatch[] = [];

export const initialSocialPosts: SocialPost[] = [];

export const initialDailyProductions: DailyProduction[] = [];

export const initialUserAccounts: UserAccount[] = [
  {
    id: 'usr-admin',
    name: 'Administração Saborê',
    email: 'administracao@sabore.pvh.br',
    role: 'Administrador',
    status: 'Ativo',
    isFirstAccess: false,
    password: 'Sabore2026!',
    lastLoginAt: 'Primeiro acesso',
    createdAt: new Date().toISOString().split('T')[0],
    permissions: {
      overviewView: true,
      ordersView: true,
      ordersEdit: true,
      inventoryView: true,
      inventoryEdit: true,
      purchasesView: true,
      purchasesEdit: true,
      technicalSheetsView: true,
      technicalSheetsEdit: true,
      pricingView: true,
      pricingEdit: true,
      financialsView: true,
      financialsEdit: true,
      marketingView: true,
      marketingEdit: true,
      adminConfigView: true
    }
  }
];
