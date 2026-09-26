export type OrderChannel = 'ifood' | '99food' | 'whatsapp' | 'balcao';

export type OrderType = 'pronta_entrega' | 'encomenda';

export type OrderStatus = 
  | 'pendente' 
  | 'em_producao' 
  | 'pronto' 
  | 'saiu_entrega' 
  | 'entregue' 
  | 'cancelado';

export interface OrderItemOption {
  id?: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  totalPrice?: number;
  externalCode?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  notes?: string;
  options?: OrderItemOption[];
  subItems?: OrderItemOption[];
}

export interface OrderAddition {
  id: string;
  name: string;
  price: number;
  unitPrice?: number;
  quantity: number;
}

export interface OrderDeliveryAddressDetails {
  streetName?: string;
  streetNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  reference?: string;
  formattedAddress?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface OrderPaymentDetails {
  method?: string; // CREDIT, DEBIT, CASH, PIX, VOUCHER, etc.
  brand?: string; // MASTERCARD, VISA, ELO, etc.
  type?: 'ONLINE' | 'OFFLINE';
  value?: number;
  changeFor?: number;
  prepaid?: boolean;
  currency?: string;
}

export interface Order {
  id: string;
  code: string; // e.g. #SAB-2041
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerDocument?: string; // CPF or CNPJ for invoicing
  customerOrdersCount?: number; // Total previous orders by this customer
  channel: OrderChannel;
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  deliveryDate: string; // Date and time for delivery/pickup
  items: OrderItem[];
  additions?: OrderAddition[];
  isBudget?: boolean;
  subtotal: number;
  additionsTotal?: number;
  deliveryFee: number;
  discount: number;
  total: number;
  platformFeePercent: number; // e.g. 23% for ifood, 20% for 99food
  platformFeeAmount: number; // deducted
  netAmount: number; // what Sabore actually receives
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'faturado' | 'plataforma';
  paymentDescription?: string;
  paymentDetails?: OrderPaymentDetails[];
  notes?: string;
  stockDeducted?: boolean;

  // iFood Integration Lifecycle, Logistics & Dispatch Verification fields
  rawIfoodId?: string;
  deliveryType?: 'DELIVERY' | 'TAKEOUT' | 'INDOOR';
  deliveryAddressDetails?: OrderDeliveryAddressDetails;
  pickupCode?: string; // Delivery pickup verification PIN
  orderTiming?: 'IMMEDIATE' | 'SCHEDULED';
  deliveredBy?: 'MERCHANT' | 'IFOOD';
  scheduleStart?: string;
  scheduleEnd?: string;
  preparationStartDateTime?: string;
  ifoodIntegrationStatus?: 
    | 'pending_ack' 
    | 'pending_confirmation'
    | 'confirming' 
    | 'confirmed' 
    | 'in_preparation' 
    | 'ready' 
    | 'dispatching' 
    | 'dispatched' 
    | 'scheduled' 
    | 'cancelling' 
    | 'cancelled' 
    | 'concluded'
    | 'sync_error';
  ifoodSyncError?: string;
  cancellationReason?: string;
  cancellationCode?: string;
  rawIfoodOrder?: any; // Preserves complete 100% untouched raw payload from iFood
}

export interface IfoodLogEntry {
  id: string;
  timestamp: string;
  action: string;
  event: string;
  endpoint?: string;
  orderId?: string;
  orderTiming?: 'IMMEDIATE' | 'SCHEDULED';
  httpStatus?: number;
  direction: 'INCOMING' | 'OUTGOING' | 'INTERNAL';
  payload?: any;
  response?: any;
  status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  durationMs?: number;
}

export interface IfoodPollingState {
  isActive: boolean;
  isPolling: boolean;
  failureCount: number;
  currentBackoffSeconds: number;
  nextRetryTimestamp?: number | string;
  lastSuccessTimestamp?: string;
  lastErrorTimestamp?: string;
  lastErrorMessage?: string;
}

export type IfoodAuthHealthStatus = 'green' | 'yellow' | 'red';

export interface IfoodAuthDiagnostic {
  status: IfoodAuthHealthStatus;
  label: string;
  title: string;
  message: string;
  lastAttemptTimestamp?: string;
  tokenExpiresAt?: string;
  tokenExpiresInSeconds?: number;
  isExpired: boolean;
  isAuthFail: boolean;
  merchantName?: string;
  merchantStatus?: string;
  suggestedAction?: string;
}

export type UnitOfMeasure = 'kg' | 'g' | 'l' | 'ml' | 'un' | 'm' | 'pct' | 'cx';

export interface UnitConversion {
  id: string;
  from: UnitOfMeasure;
  to: UnitOfMeasure;
  factor: number; // e.g. from 'g' to 'kg', factor is 0.001
}

export type MaterialCategory = string;

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  notes?: string;
  created_at?: string;
}

export interface Material {
  id: string;
  code: string; // SKU or internal code e.g. INS-001
  name: string;
  category: MaterialCategory;
  unit: UnitOfMeasure;
  defaultSupplier: string;
  supplier?: string; // alias
  supplierContact?: string;
  packageSize?: number;
  lastPackagePrice?: number;
  size?: number;
  sizeUnit?: UnitOfMeasure;
  currentCostPerUnit: number; // e.g. R$ 18.50 per kg or R$ 1.80 per unit
  costPerUnit?: number; // alias
  costPerGram: number; // computed: R$ per gram or ml or unit
  currentStock: number;
  minStock: number;
  lastUpdated: string;
  hasExpiration?: boolean;
}

export interface PurchaseItem {
  id: string;
  materialId?: string;
  materialName: string;
  materialCode: string;
  category: MaterialCategory;
  quantityPurchased: number;
  quantity?: number;
  unit: UnitOfMeasure;
  unitCost: number;
  packagePrice?: number;
  packageQuantity?: number;
  totalCost: number;
  expirationDate?: string; // Data de validade
  hasExpiration?: boolean; // Item com validade
  integrateStock?: boolean; // Se o item vai integrar o estoque
  batchCode?: string; // Lote
}

export interface PurchaseRecord {
  id: string;
  materialId?: string;
  materialName?: string;
  materialCode?: string;
  supplier: string;
  date: string;
  purchaseDate?: string;
  quantity?: number;
  quantityPurchased?: number;
  unit?: UnitOfMeasure;
  packagePrice?: number;
  packageQuantity?: number;
  totalCost: number;
  totalAmount?: number;
  integrateStock?: boolean; // Se a compra vai integrar o estoque por padrão

  unitCostCalculated?: number;
  unitCost?: number;
  invoiceNumber?: string;
  paymentMethod?: string;
  notes?: string;
  status?: string;
  items?: PurchaseItem[];
}

export interface StockBatch {
  id: string;
  materialId: string;
  materialName: string;
  materialCode?: string;
  invoiceNumber?: string;
  supplier?: string;
  purchaseDate: string;
  expirationDate: string; // YYYY-MM-DD
  quantityOriginal: number;
  quantityRemaining: number;
  unit: UnitOfMeasure;
  unitCost: number;
  status: 'valido' | 'proximo_vencimento' | 'vencido' | 'esgotado';
}

export interface ShelfLifeStorage {
  ambient?: string;      // Ex: "3 dias (Local fresco e seco)"
  refrigerated?: string; // Ex: "7 dias (Sob refrigeração de 2°C a 6°C)"
  frozen?: string;       // Ex: "90 dias (Congelador a -18°C)"
  notes?: string;        // Observações de armazenamento e conservação
}

export interface TechnicalSheetIngredient {
  materialId: string;
  materialName: string;
  unit: UnitOfMeasure;
  quantityUsed: number; // exact net quantity in recipe (Peso Líquido)
  grossQuantity?: number; // raw quantity purchased/needed before trimming/peeling (Peso Bruto)
  correctionFactor?: number; // Fator de Correção (FC = Peso Bruto / Peso Líquido, padrão 1.0)
  wastePercent?: number; // Aparas e perdas (%)
  costPerGram: number; // snapshot or synced cost per gram/unit
  subtotalCost: number; // grossQuantity * costPerGram (or appropriate unit calculation accounting for trimmings)
}

export interface TechnicalSheet {
  id: string;
  sku: string; // Código ou SKU
  name: string; // Nome do produto
  category: 'Panificação Artesanal' | 'Confeitaria Fina' | 'Sobremesas & Tortas' | 'Viennoiserie' | 'Salgados Artesanais';
  version: string; // e.g. "v1.2"
  date: string; // Data da ficha
  responsible: string; // Nome do responsável/Chef
  description: string; // Descrição exata do item
  yieldAmount: number; // Rendimento numérico
  yieldUnit: string; // Unidade de rendimento (ex: "unidades", "kg", "fatias")
  cookingLossPercent?: number; // Perda no Forno / Cocção (%) ex: 10% a 15%
  bakedWeight?: number; // Peso líquido assado total do lote
  cookingIndex?: number; // Índice de Cocção (IC = Peso Assado / Peso Cru)
  rawBatchWeight?: number; // Peso cru total dos ingredientes da massa
  estimatedTime: {
    prepMinutes: number; // Preparo / Batimento
    fermentationMinutes: number; // Fermentação
    bakingMinutes: number; // Forno / Cozimento
    finishingMinutes: number; // Montagem / Embalagem
    totalMinutes: number;
  };
  requiredEquipment: string[]; // Equipamentos necessários (Forno de Lastro, Batedeira planetária...)
  ingredients: TechnicalSheetIngredient[];
  productionSteps: {
    stepNumber: number;
    title: string;
    description: string;
  }[];
  shelfLife?: ShelfLifeStorage; // Validade conforme a forma de armazenamento
  packagingMaterialCost: number; // Custo de embalagem
  totalIngredientsCost: number; // Custo total de insumos (CMV Insumos)
  costPerYieldUnit: number; // Custo por unidade produzida
  suggestedMarkup: number; // e.g. 2.5x ou margem 40%
  basePrice: number; // Preço base Balcão
}

export interface PricingConfig {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  cmvInsumos: number; // Custo dos insumos atualizado
  costOfGoodsSold?: number; // alias
  packagingCost: number;
  fixedCostPercent: number; // % rate for fixed costs / overhead (e.g. 18%)
  targetMarginPercent: number; // Margem de lucro desejada (e.g. 35%)
  targetProfitMarginPercent?: number; // alias
  
  // Platform fees
  directCardFeePercent: number; // e.g. 2.5%
  ifoodFeePercent: number; // e.g. 23%
  nineNineFoodFeePercent: number; // e.g. 20%
  
  // Current selling prices
  currentPriceDirect: number;
  currentPriceBalcao?: number; // alias
  currentPriceIfood: number;
  currentPrice99Food: number;
  
  // Calculated suggested prices to preserve margin
  suggestedPriceDirect: number;
  suggestedPriceBalcao?: number; // alias
  suggestedPriceIfood: number;
  suggestedPrice99Food: number;
  
  // Real margins at current prices
  currentMarginDirect: number;
  currentMarginIfood: number;
  currentMargin99Food: number;
  
  lastCostRecalculation: string;
}

export interface IfoodDeliveryConfig {
  enabled: boolean;
  commissionPercent: number; // e.g. 23%
  paymentFeePercent: number; // e.g. 3.2%
  anticipationFeePercent: number; // e.g. 1.8% or 2.0%
  logisticsType?: 'parceira' | 'propria';
  merchantId: string;
  clientId: string;
  clientSecret: string;
  webhookSecret?: string;
  userCode?: string;
  authorizationCode?: string;
  autoAcceptOrders: boolean;
  autoDispatchImmediate?: boolean;
  homologationMode?: boolean;
  isConnected: boolean;
  lastSyncAt?: string;
  storeStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'PAUSED';
}

export interface Food99DeliveryConfig {
  enabled: boolean;
  commissionPercent: number; // e.g. 20% or 18%
  paymentFeePercent: number; // e.g. 2.5%
  storeId: string;
  apiKey?: string;
  isConnected: boolean;
  lastSyncAt?: string;
}

export interface DirectSalesConfig {
  cardFeePercent: number; // e.g. 2.5%
  fixedCostPercent: number; // e.g. 18%
  targetMarginPercent: number; // e.g. 35%
  defaultDeliveryFee: number; // e.g. R$ 10.00
}

export interface DeliverySettings {
  ifood: IfoodDeliveryConfig;
  food99: Food99DeliveryConfig;
  direct: DirectSalesConfig;
  databaseDisabled?: boolean;
}

export interface IfoodConnectionResult {
  success: boolean;
  message: string;
  authenticated: boolean;
  merchantName?: string;
  merchantStatus?: string;
  merchantId?: string;
  expiresIn?: number;
  tokenExpiresIn?: number;
  catalogItemsCount?: number;
  responseTimeMs?: number;
  isMockDemo?: boolean;
  accessToken?: string;
  environment?: string;
  errorDetail?: string;
  isAuthFail?: boolean;
  guidance?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  neighborhood: string;
  totalOrders: number;
  totalSpent: number;
  favoriteProducts: string[];
  notes?: string;
  birthDate?: string;
  createdDate: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  category: 'Venda Balcão' | 'Venda WhatsApp' | 'Venda iFood' | 'Venda 99Food' | 'Compra Insumos' | 'Embalagens' | 'Equipamentos & Manutenção' | 'Custos Fixos (Água/Luz/Aluguel)' | 'Marketing & Promoções' | 'Taxas Plataformas' | string;
  description: string;
  amount: number;
  status: 'confirmado' | 'pendente' | 'pago';
  paymentMethod: string;
  relatedOrderId?: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  channel: 'Instagram' | 'iFood Promoções' | '99Food Promoções' | 'WhatsApp VIP' | 'Parcerias & Eventos' | 'Google';
  status: 'ativa' | 'planejada' | 'concluida' | 'pausada';
  startDate: string;
  endDate: string;
  budget: number;
  revenueGenerated: number;
  ordersCount: number;
  roi: number; // (revenue - budget) / budget * 100
  notes: string;
  discountCoupon?: string;
}

export interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  type: 'entrada' | 'saida_producao' | 'ajuste' | 'perda_avaria';
  quantity: number;
  unit: UnitOfMeasure;
  date: string;
  reason: string;
  responsible: string;
}

export interface UserPermissions {
  overviewView: boolean;
  ordersView: boolean;
  ordersEdit: boolean;
  productionView?: boolean;
  productionEdit?: boolean;
  inventoryView: boolean;
  inventoryEdit: boolean;
  purchasesView: boolean;
  purchasesEdit: boolean;
  technicalSheetsView: boolean;
  technicalSheetsEdit: boolean;
  pricingView: boolean;
  pricingEdit: boolean;
  financialsView: boolean;
  financialsEdit: boolean;
  marketingView: boolean;
  marketingEdit: boolean;
  adminConfigView: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Mestre Padeiro' | 'Atendimento' | 'Gerente' | string;
  status?: 'Ativo' | 'Pendente' | 'pendente' | 'Bloqueado';
  isFirstAccess: boolean;
  password?: string; // Stored securely in client local state
  avatarUrl?: string;
  lastLoginAt?: string; // Data do último login
  createdAt?: string;
  permissions?: UserPermissions;
}

export interface SocialPost {
  id: string;
  title: string;
  caption: string;
  platforms: ('instagram' | 'facebook' | 'tiktok' | 'whatsapp')[];
  scheduledDate: string;
  scheduledTime: string;
  status: 'ideia' | 'agendado' | 'publicado';
  mediaNotes?: string;
  suggestedHashtags?: string[];
  promotionalCoupon?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface DailyProduction {
  id: string;
  date: string; // YYYY-MM-DD
  productId: string; // TechnicalSheet ID or SKU or custom ID
  productName: string;
  sku: string;
  category?: string;
  quantityProduced: number; // Quantidade produzida no lote/fornada
  quantityDispatched: number; // Quantidade que já saiu por pedidos
  quantityRemaining: number; // Quantidade disponível em estoque pronta entrega
  unitPrice?: number;
  bakerName: string; // Mestre Padeiro ou Padeiro Responsável
  productionTime: string; // Horário da fornada (ex: "07:30")
  batchNumber?: string; // Lote da Produção
  expirationDate?: string; // Data de Vencimento do Lote (YYYY-MM-DD)
  status: 'disponivel' | 'estoque_baixo' | 'esgotado' | 'concluida' | 'concluída' | 'produzida' | 'finalizada' | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionDeductionLog {
  id: string;
  productionId: string;
  orderId: string;
  orderCode: string;
  customerName?: string;
  productName: string;
  quantityDeducted: number;
  timestamp: string;
  channel?: OrderChannel;
}

export interface ToastNotification {
  id: string;
  type: 'ifood_order' | 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp?: string;
  orderId?: string;
  orderCode?: string;
  customerName?: string;
  amount?: number;
  duration?: number;
}

