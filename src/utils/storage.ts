/**
 * Unified Safe Storage Helper for Saborê
 * 
 * Provides robust try/catch logic for reading and writing localStorage keys,
 * including automatic JSON parsing and graceful fallback on malformed data,
 * quota exceptions, or restricted environments.
 */

export const SABORE_STORAGE_KEYS = {
  ORDERS: 'sabore_orders_v2',
  MATERIALS: 'sabore_materials_v2',
  PURCHASES: 'sabore_purchases_v2',
  SHEETS: 'sabore_sheets_v2',
  PRICING: 'sabore_pricing_v2',
  CUSTOMERS: 'sabore_customers_v2',
  TRANSACTIONS: 'sabore_transactions_v2',
  CAMPAIGNS: 'sabore_campaigns_v2',
  POSTS: 'sabore_social_posts_v2',
  MOVEMENTS: 'sabore_movements_v2',
  BATCHES: 'sabore_stock_batches_v2',
  INTEGRATIONS: 'sabore_integrations_v2',
  DELIVERY_SETTINGS: 'sabore_delivery_settings_v2',
  USERS: 'sabore_user_accounts_v2',
  CURRENT_USER: 'sabore_current_user_v2',
  DAILY_PRODUCTION: 'sabore_daily_production_v2',
  PRODUCTION_LOGS: 'sabore_production_logs_v2',
  LAST_ACTIVE: 'sabore_last_active',
  SIDEBAR_COLLAPSED: 'sabore_sidebar_collapsed',
  IFOOD_STORE_OPEN: 'sabore_ifood_store_open',
  IFOOD_CONNECTED: 'sabore_ifood_connected',
  NINE_NINE_FOOD_CONNECTED: 'sabore_99food_connected',
  LOGS: 'sabore_logs',
  IFOOD_LOGS: 'sabore_logs',
  IFOOD_POLLING_STATE: 'sabore_ifood_polling_state',
  CUSTOM_WEBHOOK_DOMAIN: 'sabore_custom_webhook_domain',
  THEME: 'sabore_theme',
} as const;

export type SaboreStorageKey = typeof SABORE_STORAGE_KEYS[keyof typeof SABORE_STORAGE_KEYS] | string;

/**
 * Safely retrieve an item from localStorage with automatic JSON parsing and fallback.
 * Encapsulates all access in try/catch to ensure the application never crashes
 * due to malformed JSON or restricted browser storage.
 */
export function safeGet<T = any>(key: string, defaultValue: T | null = null): T {
  if (typeof window === 'undefined') {
    return defaultValue as T;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === 'null' || raw === 'undefined') {
      return defaultValue as T;
    }

    // Handle boolean primitives if default value is boolean
    if (typeof defaultValue === 'boolean') {
      if (raw === 'true') return true as unknown as T;
      if (raw === 'false') return false as unknown as T;
    }

    // Try parsing as JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) {
        return defaultValue as T;
      }
      // If default is an array, ensure parsed result is an array
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
        return defaultValue as T;
      }
      return parsed as T;
    } catch {
      // If parsing fails but default is a string or fallback, return raw or defaultValue
      if (typeof defaultValue === 'string') {
        return raw as unknown as T;
      }
      return defaultValue as T;
    }
  } catch (err) {
    console.warn(`[safeGet] Falha ao ler chave "${key}" do localStorage:`, err);
    return defaultValue as T;
  }
}

/**
 * Safely persist an item to localStorage with automatic JSON serialization and try/catch.
 */
export function safeSet<T = any>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.warn(`[safeSet] Falha ao salvar chave "${key}" no localStorage:`, err);
    return false;
  }
}

/**
 * Safely remove an item from localStorage.
 */
export function safeRemove(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[safeRemove] Falha ao remover chave "${key}":`, err);
    return false;
  }
}

/**
 * Safely clear all localStorage entries.
 */
export function safeClear(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch (err) {
    console.warn('[safeClear] Falha ao limpar localStorage:', err);
    return false;
  }
}

// Aliases for compatibility
export const safeGetItem = safeGet;
export const safeSetItem = safeSet;
export const safeRemoveItem = safeRemove;

export const safeStorage = {
  get: safeGet,
  set: safeSet,
  remove: safeRemove,
  clear: safeClear,
  keys: SABORE_STORAGE_KEYS
};

export default safeStorage;
