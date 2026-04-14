export type DtcStatus = 'stored' | 'pending' | 'permanent';

export type Dtc = {
  code: string; // e.g. P0301
  status: DtcStatus;
};

// ELM327 commonly returns DTCs as hex pairs after a header like "43" (stored) or "47" (pending)
// This parser is intentionally conservative: it extracts hex bytes from the response and decodes per SAE J2012.

const HEX_BYTE = /\b[0-9A-F]{2}\b/gi;

export function parseDtcsFromModeResponse(mode: '03' | '07', raw: string): string[] {
  const bytes = (raw.match(HEX_BYTE) ?? []).map((b) => parseInt(b, 16));
  if (bytes.length < 2) return [];

  // Find the service response byte: 0x40 + mode
  const svc = 0x40 + parseInt(mode, 16);
  const start = bytes.indexOf(svc);
  if (start === -1) return [];

  // After svc byte, DTC payload is pairs of bytes.
  const payload = bytes.slice(start + 1);
  const out: string[] = [];
  for (let i = 0; i + 1 < payload.length; i += 2) {
    const a = payload[i];
    const b = payload[i + 1];
    if (a === 0 && b === 0) continue;
    out.push(decodeDtc(a, b));
  }
  return out;
}

function decodeDtc(a: number, b: number): string {
  // Top 2 bits of A determine the first letter
  const first = (a & 0xc0) >> 6;
  const letter = first === 0 ? 'P' : first === 1 ? 'C' : first === 2 ? 'B' : 'U';
  const d1 = ((a & 0x30) >> 4).toString(16).toUpperCase();
  const d2 = (a & 0x0f).toString(16).toUpperCase();
  const d3 = ((b & 0xf0) >> 4).toString(16).toUpperCase();
  const d4 = (b & 0x0f).toString(16).toUpperCase();
  return `${letter}${d1}${d2}${d3}${d4}`;
}

