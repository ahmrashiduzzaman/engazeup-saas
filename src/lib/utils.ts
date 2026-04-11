import { Dispatch, SetStateAction } from 'react';

export const courierColors: Record<string, string> = {
  'Pathao': '#EF4444',
  'Steadfast': '#3B82F6',
  'RedX': '#EF4444',
  'Paperfly': '#8B5CF6'
};

export const engToBdNum = (num: number | string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\\d/g, (d) => bengaliDigits[parseInt(d)]);
};

export function readSteadfastEnv(name: 'VITE_STEADFAST_API_KEY' | 'VITE_STEADFAST_SECRET_KEY' | 'VITE_STEADFAST_API_BASE') {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === null) return '';
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function steadfastStatusSummary(data: unknown): { statusLabel: string; codLabel: string } {
  if (typeof data !== 'object' || data === null) {
    return { statusLabel: 'Unknown', codLabel: '—' };
  }
  const o = data as Record<string, unknown>;
  const cons = o.consignment && typeof o.consignment === 'object' ? (o.consignment as Record<string, unknown>) : null;

  const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : '';

  let raw = str(o.delivery_status) || (cons ? str(cons.delivery_status) || str(cons.status) : '');
  if (!raw && typeof o.status === 'string' && o.status.trim() && !/^\\d{3}$/.test(o.status.trim())) {
    raw = o.status.trim();
  }

  const statusLabel = raw ? raw.replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase()) : 'Unknown';

  const codRaw = o.cod_amount ?? o.codAmount ?? o.cod ?? (cons && (cons.cod_amount ?? cons.codAmount ?? cons.cod));
  let codLabel = '—';
  if (codRaw !== undefined && codRaw !== null && codRaw !== '') {
    const n = typeof codRaw === 'number' ? codRaw : Number(codRaw);
    codLabel = Number.isFinite(n) ? `৳ ${n.toLocaleString('en-BD')}` : String(codRaw);
  }

  return { statusLabel, codLabel };
}

export function statusBadgeTone(statusLabel: string): string {
  if (!statusLabel) return 'bg-gray-100 text-gray-800';
  const s = statusLabel.toLowerCase();
  if (s.includes('deliver') || s.includes('in stock') || s.includes('active')) return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90 shadow-sm shadow-emerald-900/5';
  if (s.includes('cancel') || s.includes('return') || s.includes('out of stock')) return 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/90 shadow-sm shadow-rose-900/5';
  if (s.includes('transit') || s.includes('pending') || s.includes('hold')) return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/90 shadow-sm shadow-sky-900/5';
  if (s.includes('low stock')) return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200/90 shadow-sm shadow-amber-900/5';
  return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200/90 shadow-sm shadow-amber-900/5';
}

export async function checkSteadfastStatus(
  trackingId: string,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  setParcelData: Dispatch<SetStateAction<any>>
) {
  setIsLoading(true);
  try {
    const apiKey = readSteadfastEnv('VITE_STEADFAST_API_KEY');
    const secretKey = readSteadfastEnv('VITE_STEADFAST_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Set VITE_STEADFAST_API_KEY and VITE_STEADFAST_SECRET_KEY in .env');
    }
    const url = `https://portal.packzy.com/api/v1/status_by_cid/${trackingId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
      },
    });

    const rawText = await res.text();
    let parsedJson: unknown;
    try { parsedJson = rawText ? JSON.parse(rawText) : null; } catch { parsedJson = undefined; }

    if (!res.ok) {
       throw new Error(`Failed to fetch status: ${res.status}`);
    }

    const data = parsedJson !== undefined ? parsedJson : rawText;
    setParcelData(data);
    return data;
  } finally {
    setIsLoading(false);
  }
}
