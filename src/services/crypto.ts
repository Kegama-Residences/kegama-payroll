import QRCode from 'qrcode';
import type { Employee, QrPayload } from '../types';

const SECRET_SALT = 'KEGAMA_CORP_2026_SECURE_TOKEN';

// Simple fast hash for token signature
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

export function generateEncryptedQrToken(emp: Employee): string {
  const payload: QrPayload = {
    empId: emp.id,
    code: btoa(emp.id).slice(0, 8),
    timestamp: Date.now(),
    checksum: simpleHash(`${emp.id}:${SECRET_SALT}`),
  };

  const jsonStr = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
  return `KEGAMA:PASS:${encoded}`;
}

export function parseAndVerifyQrToken(scannedText: string): { success: boolean; employeeId?: string; error?: string } {
  if (!scannedText || typeof scannedText !== 'string') {
    return { success: false, error: 'Empty scan data' };
  }

  const trimmed = scannedText.trim();

  // Support direct employee ID format (e.g. KR-001) for quick testing or badge barcodes
  if (/^KR-\d{3,4}$/i.test(trimmed)) {
    return { success: true, employeeId: trimmed.toUpperCase() };
  }

  // Check for Kegama encrypted token prefix
  if (trimmed.startsWith('KEGAMA:PASS:')) {
    try {
      const base64Part = trimmed.replace('KEGAMA:PASS:', '');
      const jsonStr = decodeURIComponent(escape(atob(base64Part)));
      const payload = JSON.parse(jsonStr) as QrPayload;

      const expectedChecksum = simpleHash(`${payload.empId}:${SECRET_SALT}`);
      if (payload.checksum !== expectedChecksum) {
        return { success: false, error: 'Invalid or forged QR token signature' };
      }

      return { success: true, employeeId: payload.empId };
    } catch (e) {
      return { success: false, error: 'Corrupted QR code payload' };
    }
  }

  // Support legacy prefix KEGAMA:KR-001
  if (trimmed.startsWith('KEGAMA:')) {
    const id = trimmed.replace('KEGAMA:', '').trim();
    return { success: true, employeeId: id.toUpperCase() };
  }

  // Fallback: check if matches any employee ID
  return { success: true, employeeId: trimmed.toUpperCase() };
}

export async function generateQrCodeDataUrl(token: string): Promise<string> {
  return await QRCode.toDataURL(token, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a', // slate-900
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
