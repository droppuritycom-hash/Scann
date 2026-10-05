import QRCode from 'qrcode';
import { EntityType } from '@/types';

export const QR_CONFIG = {
  errorCorrectionLevel: 'M' as const,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

export const QR_RESOLUTIONS: Record<EntityType, number> = {
  serial: 300,
  batch: 400,
  kit: 400,
};

/**
 * Generates data URL (base64 image) for a raw QR code identifier.
 * strictly encodes ONLY the raw identifier string.
 */
export async function generateQRDataURL(code: string, type: EntityType = 'serial'): Promise<string> {
  const width = QR_RESOLUTIONS[type] || 300;
  return QRCode.toDataURL(code, {
    ...QR_CONFIG,
    width,
  });
}

/**
 * Generates an SVG string for crisp vector rendering/printing
 */
export async function generateQRSVG(code: string, type: EntityType = 'serial'): Promise<string> {
  const width = QR_RESOLUTIONS[type] || 300;
  return QRCode.toString(code, {
    type: 'svg',
    ...QR_CONFIG,
    width,
  });
}
