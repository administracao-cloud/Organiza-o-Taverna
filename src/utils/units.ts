import { UnitOfMeasure } from '../types';

/**
 * Utility for handling unit conversions in the Sabore application.
 * All mass units are normalized to grams (g).
 * All volume units are normalized to milliliters (ml).
 * All discrete units are normalized to units (un).
 * All length units are normalized to meters (m).
 */

const BASE_UNITS: Record<UnitOfMeasure, UnitOfMeasure> = {
  g: 'g',
  kg: 'g',
  ml: 'ml',
  l: 'ml',
  un: 'un',
  m: 'm',
  pct: 'un',
  cx: 'un'
};

const TO_BASE_FACTORS: Record<UnitOfMeasure, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  un: 1,
  m: 1,
  pct: 1,
  cx: 1
};

/**
 * Converts a value from a specific unit to its base unit (g, ml, un, m).
 */
export const convertToBaseUnit = (value: number, unit: UnitOfMeasure): number => {
  const factor = TO_BASE_FACTORS[unit] || 1;
  return value * factor;
};

/**
 * Converts a value from its base unit to a target unit.
 */
export const convertFromBaseUnit = (value: number, targetUnit: UnitOfMeasure): number => {
  const factor = TO_BASE_FACTORS[targetUnit] || 1;
  return value / factor;
};

/**
 * Gets the conversion factor between two units of the same type (mass, volume, etc).
 * Returns null if units are incompatible.
 */
export const getConversionFactor = (from: UnitOfMeasure, to: UnitOfMeasure): number | null => {
  if (BASE_UNITS[from] !== BASE_UNITS[to]) return null;
  return TO_BASE_FACTORS[from] / TO_BASE_FACTORS[to];
};

/**
 * Formats a quantity with its unit, picking the most readable unit.
 * e.g. 1500g -> 1.5kg
 */
export const formatQuantity = (value: number, unit: UnitOfMeasure): string => {
  if (unit === 'g' && value >= 1000) {
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, '')}kg`;
  }
  if (unit === 'ml' && value >= 1000) {
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, '')}l`;
  }
  if (unit === 'kg' && value < 1) {
    return `${(value * 1000).toFixed(0)}g`;
  }
  if (unit === 'l' && value < 1) {
    return `${(value * 1000).toFixed(0)}ml`;
  }
  
  return `${value.toFixed(2).replace(/\.?0+$/, '')}${unit}`;
};

/**
 * Standardizes a unit string to the UnitOfMeasure type.
 */
export const normalizeUnit = (unitStr: string): UnitOfMeasure => {
  const normalized = unitStr.toLowerCase().trim();
  if (normalized === 'kilogram' || normalized === 'kilogramo' || normalized === 'quilo') return 'kg';
  if (normalized === 'gram' || normalized === 'grama') return 'g';
  if (normalized === 'liter' || normalized === 'litro') return 'l';
  if (normalized === 'milliliter' || normalized === 'mililitro') return 'ml';
  if (normalized === 'unit' || normalized === 'unidade') return 'un';
  if (normalized === 'meter' || normalized === 'metro') return 'm';
  if (normalized === 'pct' || normalized === 'pacote' || normalized === 'pcte') return 'pct';
  if (normalized === 'cx' || normalized === 'caixa' || normalized === 'box') return 'cx';
  
  // Return as is if it matches or default to 'un'
  const validUnits: UnitOfMeasure[] = ['kg', 'g', 'l', 'ml', 'un', 'm', 'pct', 'cx'];
  return validUnits.includes(normalized as UnitOfMeasure) ? (normalized as UnitOfMeasure) : 'un';
};

/**
 * Utility for calculating stock deduction with unit conversion.
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();

  if (from === to) return quantity;

  // Conversões de Peso
  if (from === 'g' && to === 'kg') return quantity / 1000;
  if (from === 'kg' && to === 'g') return quantity * 1000;
  if (from === 'mg' && to === 'g') return quantity / 1000;

  // Conversões de Volume
  if (from === 'ml' && (to === 'l' || to === 'litro' || to === 'litros')) return quantity / 1000;
  if ((from === 'l' || from === 'litro') && to === 'ml') return quantity * 1000;

  return quantity; // Padrão 1:1 para 'un', 'cx', etc.
}
