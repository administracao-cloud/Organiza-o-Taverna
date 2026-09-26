import { supabase } from '../lib/supabase';
import { 
  Order, 
  Material, 
  PurchaseRecord, 
  StockBatch, 
  TechnicalSheet, 
  PricingConfig, 
  Customer, 
  FinancialTransaction, 
  MarketingCampaign, 
  SocialPost, 
  StockMovement, 
  UserAccount,
  DailyProduction,
  Supplier
} from '../types';

export interface SupabaseSyncStatus {
  isConnected: boolean;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export async function testSupabaseConnection(): Promise<{ isConnected: boolean; message: string }> {
  try {
    // Ping Supabase REST endpoint
    const { error } = await supabase.from('user_accounts').select('id').limit(1);
    if (error) {
      const errorMsg = error.message || '';
      if (
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('TypeError')
      ) {
        throw new TypeError('Failed to fetch');
      }
      if (error.code !== 'PGRST116' && !errorMsg.includes('relation "public.user_accounts" does not exist') && !errorMsg.includes('does not exist')) {
        return { isConnected: false, message: `Erro ao conectar: ${error.message}` };
      }
      return { isConnected: true, message: 'Conectado ao Supabase (Tabelas pendentes de criação inicial)' };
    }
    return { isConnected: true, message: 'Conexão com o Supabase ativa e respondendo' };
  } catch (err: any) {
    if (
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      String(err).includes('Failed to fetch')
    ) {
      throw new TypeError('Failed to fetch');
    }
    return { isConnected: false, message: `Falha na conexão: ${err?.message || 'Servidor indisponível'}` };
  }
}

// Universal Generic Sync Helpers
export async function fetchRemoteTable<T>(tableName: string): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      // Se for erro de rede/inacessibilidade, repassa para capturar na verificação
      if (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('TypeError')
      ) {
        throw new TypeError('Failed to fetch');
      }
      // Retorna array vazio silenciosamente sem poluir console
      return [];
    }
    return (data as T[]) || [];
  } catch (err: any) {
    if (
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      String(err).includes('Failed to fetch')
    ) {
      throw err;
    }
    // Retorna array vazio em caso de erro sem gerar exceções
    return [];
  }
}

export async function upsertRemoteRecord<T extends { id?: string; productId?: string }>(tableName: string, record: T): Promise<boolean> {
  try {
    let finalRecord = { ...record };
    let upsertOptions = {};

    // Specific logic for pricing_configs as requested
    if (tableName === 'pricing_configs') {
      finalRecord = {
        ...finalRecord,
        id: (record as any).id || crypto.randomUUID()
      };
      upsertOptions = { onConflict: 'key' };
    }

    const { error } = await supabase.from(tableName).upsert(finalRecord as any, upsertOptions);
    if (error) {
      if (
        !error.message.includes('does not exist') &&
        !error.message.includes('Failed to fetch') &&
        error.code !== 'PGRST204' &&
        !error.message.includes('PGRST204')
      ) {
        console.warn(`[Supabase] Falha no upsert em ${tableName}:`, error.message);
      }
      return false;
    }
    return true;
  } catch (err: any) {
    if (!String(err).includes('Failed to fetch')) {
      console.error(`[Supabase] Erro ao salvar em ${tableName}:`, err);
    }
    return false;
  }
}

export async function upsertRemoteRecordWithResult<T extends { id?: string; productId?: string }>(tableName: string, record: T): Promise<{ success: boolean; error?: string }> {
  try {
    let finalRecord = { ...record };
    let upsertOptions = {};

    if (tableName === 'pricing_configs') {
      finalRecord = {
        ...finalRecord,
        id: (record as any).id || crypto.randomUUID()
      };
      upsertOptions = { onConflict: 'key' };
    }

    const { error } = await supabase.from(tableName).upsert(finalRecord as any, upsertOptions);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function deleteRemoteRecord(tableName: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      if (!error.message.includes('does not exist') && !error.message.includes('Failed to fetch')) {
        console.warn(`[Supabase] Falha ao deletar em ${tableName}:`, error.message);
      }
      return false;
    }
    return true;
  } catch (err: any) {
    if (!String(err).includes('Failed to fetch')) {
      console.error(`[Supabase] Erro ao deletar em ${tableName}:`, err);
    }
    return false;
  }
}

/**
 * Bulk deletion of test and operational data in Supabase Postgres database.
 * Deletes: orders, purchases, stock_movements, daily_productions, stock_batches, financial_transactions
 * Updates: materials (sets currentStock = 0)
 * Preserves: materials catalog metadata, technical_sheets, user_accounts, pricing_configs, customers, suppliers
 */
export async function bulkDeleteTestDataInSupabase(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const tables = [
    'orders',
    'purchases',
    'stock_movements',
    'daily_productions',
    'stock_batches',
    'financial_transactions'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '___none___');
      if (error && !error.message.includes('does not exist')) {
        errors.push(`${table}: ${error.message}`);
      }
    } catch (err: any) {
      errors.push(`${table}: ${err?.message || String(err)}`);
    }
  }

  // Update materials table: set currentStock = 0
  try {
    const { error: matError } = await supabase
      .from('materials')
      .update({ currentStock: 0, current_stock: 0 })
      .neq('id', '___none___');
    if (matError && !matError.message.includes('does not exist')) {
      errors.push(`materials: ${matError.message}`);
    }
  } catch (err: any) {
    errors.push(`materials: ${err?.message || String(err)}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Factory reset in Supabase Postgres database.
 * Deletes ALL records from tables:
 * orders, materials, purchases, stock_batches, technical_sheets, pricing_configs, customers,
 * financial_transactions, marketing_campaigns, social_posts, stock_movements,
 * daily_productions, suppliers, material_categories, audit_logs
 */
export async function factoryResetAllDataInSupabase(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const tables = [
    'orders',
    'stock_movements',
    'daily_productions',
    'stock_batches',
    'purchases',
    'financial_transactions',
    'marketing_campaigns',
    'social_posts',
    'pricing_configs',
    'technical_sheets',
    'materials',
    'material_categories',
    'customers',
    'suppliers',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().not('id', 'is', null);
      if (error && !error.message.includes('does not exist')) {
        errors.push(`${table}: ${error.message}`);
      }
    } catch (err: any) {
      errors.push(`${table}: ${err?.message || String(err)}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

export interface RealtimeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: string;
  record?: T;
  oldRecord?: Partial<T>;
  timestamp: string;
}

// Global reference to Supabase Realtime Channel
let globalRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const realtimeListeners: Set<(event: RealtimeEvent) => void> = new Set();

export function initGlobalRealtimeChannel(onStatusChange?: (status: string) => void) {
  if (globalRealtimeChannel) {
    return globalRealtimeChannel;
  }

  try {
    globalRealtimeChannel = supabase
      .channel('sabore_global_live', {
        config: {
          broadcast: { self: false, ack: false }
        }
      })
      // 1. Listen to Supabase Postgres database changes on ALL public tables
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public'
        },
        (payload: any) => {
          try {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            const tableName = payload.table;
            
            const event: RealtimeEvent = {
              eventType,
              tableName,
              record: payload.new,
              oldRecord: payload.old,
              timestamp: new Date().toISOString()
            };

            // Post-process specific tables if needed (like parsing JSON)
            if (tableName === 'orders' && event.record) {
              let parsedItems = event.record.items;
              if (typeof parsedItems === 'string') {
                try {
                  parsedItems = JSON.parse(parsedItems);
                } catch {
                  parsedItems = [];
                }
              }
              event.record.items = Array.isArray(parsedItems) ? parsedItems : [];
            }

            notifyRealtimeListeners(event);
          } catch (err) {
            console.error('[Supabase Realtime Postgres Changes Handler Error]', err);
          }
        }
      )
      // 2. Listen to Supabase Realtime Broadcast channel for ultra-low-latency peer updates
      .on(
        'broadcast',
        { event: 'app_update' },
        (payload: any) => {
          try {
            const eventData = payload.payload as RealtimeEvent;
            if (eventData) {
              notifyRealtimeListeners(eventData);
            }
          } catch (err) {
            console.error('[Supabase Realtime Broadcast Handler Error]', err);
          }
        }
      )
      .subscribe((status: string) => {
        if (onStatusChange) {
          onStatusChange(status);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Canal global de sincronização conectado!');
        }
      });
  } catch (err) {
    console.error('[Supabase Realtime Init Error]', err);
  }

  return globalRealtimeChannel;
}

function notifyRealtimeListeners(event: RealtimeEvent) {
  realtimeListeners.forEach(listener => {
    try {
      listener(event);
    } catch (err) {
      console.error('[Realtime Listener Error]', err);
    }
  });
}

/**
 * Subscribe a component or context to Supabase Realtime events
 */
export function subscribeToRealtime(
  onEvent: (event: RealtimeEvent) => void,
  onStatusChange?: (status: string) => void
): () => void {
  realtimeListeners.add(onEvent);
  initGlobalRealtimeChannel(onStatusChange);

  return () => {
    realtimeListeners.delete(onEvent);
  };
}

/**
 * Broadcast a change instantly to all connected team members via Supabase Realtime WebSocket
 */
export async function broadcastRealtimeChange(event: Omit<RealtimeEvent, 'timestamp'>): Promise<boolean> {
  try {
    const channel = initGlobalRealtimeChannel();
    if (!channel) return false;

    const payload: RealtimeEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    const res = await channel.send({
      type: 'broadcast',
      event: 'app_update',
      payload
    });

    return res === 'ok';
  } catch (err) {
    console.warn('[Supabase Realtime Broadcast Error]', err);
    return false;
  }
}

// Legacy helpers for compatibility (can be removed later if all calls are updated)
export function initOrdersRealtimeChannel(onStatusChange?: (status: string) => void) {
  return initGlobalRealtimeChannel(onStatusChange);
}

export function subscribeToOrdersRealtime(
  onEvent: (event: any) => void,
  onStatusChange?: (status: string) => void
): () => void {
  return subscribeToRealtime(onEvent, onStatusChange);
}

export async function broadcastRealtimeOrderChange(event: any): Promise<boolean> {
  return broadcastRealtimeChange({ ...event, tableName: 'orders' });
}

export async function syncAllLocalToSupabase(allData: {
  orders: Order[];
  materials: Material[];
  purchases: PurchaseRecord[];
  stockBatches: StockBatch[];
  technicalSheets: TechnicalSheet[];
  pricingConfigs: PricingConfig[];
  customers: Customer[];
  transactions: FinancialTransaction[];
  campaigns: MarketingCampaign[];
  socialPosts: SocialPost[];
  stockMovements: StockMovement[];
  userAccounts: UserAccount[];
  dailyProductions?: DailyProduction[];
  suppliers?: Supplier[];
  materialCategories?: string[];
}): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  const syncCategory = async (tableName: string, items: any[]) => {
    for (const item of items) {
      const ok = await upsertRemoteRecord(tableName, item);
      if (ok) successCount++;
      else errors.push(`Tabela ${tableName}: id ${item.id}`);
    }
  };

  await syncCategory('orders', allData.orders);
  await syncCategory('materials', allData.materials);
  await syncCategory('purchases', allData.purchases);
  await syncCategory('stock_batches', allData.stockBatches);
  await syncCategory('technical_sheets', allData.technicalSheets);
  await syncCategory('pricing_configs', allData.pricingConfigs);
  await syncCategory('customers', allData.customers);
  await syncCategory('financial_transactions', allData.transactions);
  await syncCategory('marketing_campaigns', allData.campaigns);
  await syncCategory('social_posts', allData.socialPosts);
  await syncCategory('stock_movements', allData.stockMovements);
  await syncCategory('user_accounts', allData.userAccounts);
  if (allData.dailyProductions) {
    await syncCategory('daily_productions', allData.dailyProductions);
  }
  if (allData.suppliers) {
    await syncCategory('suppliers', allData.suppliers);
  }
  if (allData.materialCategories) {
    await syncCategory('material_categories', allData.materialCategories.map(c => ({ id: c, name: c })));
  }

  return { successCount, errors };
}

// --- SUPABASE AUTHENTICATION HELPERS ---

export async function supabaseSignUp(
  name: string,
  email: string,
  pass: string,
  role: string = 'Pendente',
  status: string = 'Pendente'
): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Supabase Auth Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: { name, role, status }
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      // If auth error is serious (e.g. invalid email / weak pass)
      console.warn('[Supabase Auth] Notice on signUp:', authError.message);
    }

    return { 
      success: true, 
      message: 'Conta criada com sucesso!',
      user: authData?.user 
    };
  } catch (err: any) {
    console.error('[Supabase Auth] Error on signUp:', err);
    return { success: false, message: err.message || 'Erro ao registrar usuário' };
  }
}

export async function supabaseSignIn(
  email: string,
  pass: string
): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Autenticado com sucesso!', user: data.user };
  } catch (err: any) {
    return { success: false, message: err.message || 'Falha na autenticação Supabase' };
  }
}

export async function supabaseResetPassword(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { 
      success: true, 
      message: `Enviamos um e-mail de redefinição de senha para ${cleanEmail}. Verifique sua caixa de entrada e spam.` 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao solicitar redefinição de senha' };
  }
}

/**
 * Salva credenciais de API criptografadas no Supabase via RPC (pgcrypto AES-256)
 */
export async function saveEncryptedCredentials(
  provider: string,
  clientId: string,
  clientSecret: string,
  merchantId: string,
  passphrase: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.rpc('save_api_credentials', {
      p_provider: provider,
      p_client_id: clientId,
      p_client_secret: clientSecret,
      p_merchant_id: merchantId,
      p_passphrase: passphrase
    });

    if (error) {
      console.warn('[Supabase Crypto] RPC error:', error);
      if (error.message.includes('function public.save_api_credentials') || error.message.includes('does not exist')) {
        return { 
          success: false, 
          message: 'Tabela ou Função RPC de criptografia não criada no Supabase. É necessário rodar o script SQL gerado primeiro!' 
        };
      }
      return { success: false, message: `Erro ao salvar criptografado: ${error.message}` };
    }

    return { success: true, message: `Credenciais de API do ${provider.toUpperCase()} salvas de forma altamente criptografada no Supabase!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro de comunicação ao criptografar credenciais' };
  }
}

/**
 * Recupera e decifra credenciais de API do Supabase via RPC (pgcrypto AES-256)
 */
export async function getDecryptedCredentials(
  provider: string,
  passphrase: string
): Promise<{ success: boolean; message: string; credentials?: { clientId: string; clientSecret: string; merchantId: string } }> {
  try {
    const { data, error } = await supabase.rpc('get_decrypted_api_credentials', {
      p_provider: provider,
      p_passphrase: passphrase
    });

    if (error) {
      console.warn('[Supabase Crypto] RPC Decrypt error:', error);
      if (error.message.includes('function public.get_decrypted_api_credentials') || error.message.includes('does not exist')) {
        return { 
          success: false, 
          message: 'Tabela ou Função RPC de descriptografia não encontrada. Certifique-se de que o script SQL foi executado no Supabase.' 
        };
      }
      return { success: false, message: `Erro ao decifrar credenciais: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'Nenhuma credencial ativa encontrada para este provedor.' };
    }

    const cred = data[0];
    return {
      success: true,
      message: 'Credenciais decifradas com sucesso do Supabase!',
      credentials: {
        clientId: cred.client_id || '',
        clientSecret: cred.client_secret || '',
        merchantId: cred.merchant_id || ''
      }
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro de conexão ao descriptografar credenciais' };
  }
}

