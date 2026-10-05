import { EntityType } from '@/types';

export const BATCH_REGEX = /^BAT-[A-Z]+[0-9]{5}$/;
export const KIT_REGEX = /^KIT-[A-Z]+[0-9]{5}$/;
export const SERIAL_REGEX = /^[A-Z]+[0-9]{5}$/;

export interface ValidationResult {
  valid: boolean;
  type: EntityType | 'unknown';
  normalizedCode: string;
  error?: string;
}

/**
 * Normalizes a raw scanned string:
 * - trims whitespace
 * - converts to uppercase
 */
export function normalizeScanInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

/**
 * Validates the raw scan input against ERP specifications
 */
export function validateQRCode(raw: string, expectedType?: EntityType): ValidationResult {
  const code = normalizeScanInput(raw);

  if (!code) {
    return { valid: false, type: 'unknown', normalizedCode: '', error: 'Scan code cannot be empty' };
  }

  let detectedType: EntityType | 'unknown' = 'unknown';

  if (BATCH_REGEX.test(code)) {
    detectedType = 'batch';
  } else if (KIT_REGEX.test(code)) {
    detectedType = 'kit';
  } else if (SERIAL_REGEX.test(code)) {
    detectedType = 'serial';
  } else {
    return {
      valid: false,
      type: 'unknown',
      normalizedCode: code,
      error: 'Invalid QR code format. Expected serial (e.g. A00001), batch (e.g. BAT-A00001), or kit (e.g. KIT-A00001).',
    };
  }

  if (expectedType && detectedType !== expectedType) {
    const readable = {
      batch: 'Batch QR (starts with BAT-)',
      kit: 'Kit QR (starts with KIT-)',
      serial: 'Product/Serial QR (e.g. A00001)',
    };
    return {
      valid: false,
      type: detectedType,
      normalizedCode: code,
      error: `Scanned code is a ${detectedType.toUpperCase()} QR (${code}), but expected a ${readable[expectedType]}.`,
    };
  }

  return {
    valid: true,
    type: detectedType,
    normalizedCode: code,
  };
}
