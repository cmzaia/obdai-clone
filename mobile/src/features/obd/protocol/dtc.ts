export type DtcStatus = 'stored' | 'pending' | 'permanent';

export type Dtc = {
  code: string; // e.g. P0301
  status: DtcStatus;
};

// ELM327 commonly returns DTCs as hex pairs after a header like "43" (stored) or "47" (pending)
// This parser is intentionally conservative: it extracts hex bytes from the response and decodes per SAE J2012.

/**
 * ELM327 multi-line responses include ISO-TP line-number prefixes such as
 * "0: 49 02 01 ..." / "1: 57 44 42 ...". Strip these before byte extraction
 * so that multi-frame and multi-DTC responses are parsed correctly.
 */
function stripElmLineNumbers(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*[0-9A-F]\s*:\s*/i, ''))
    .join(' ');
}

/**
 * Extract all hex bytes from a response string.
 *
 * ELM327 adapters may omit spaces between bytes (e.g. "430301" instead of
 * "43 03 01"), so we cannot rely on word-boundary anchors (\b).  After
 * stripping whitespace we parse the hex string two characters at a time.
 */
function extractBytes(cleaned: string): number[] {
  // Remove all whitespace to normalise both spaced and unspaced formats.
  const hex = cleaned.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const chunk = hex.slice(i, i + 2);
    // Only consume valid hex pairs; stop at any non-hex character.
    if (!/^[0-9A-Fa-f]{2}$/.test(chunk)) break;
    bytes.push(parseInt(chunk, 16));
  }
  return bytes;
}

export function parseDtcsFromModeResponse(mode: '03' | '07', raw: string): string[] {
  const cleaned = stripElmLineNumbers(raw);
  const bytes = extractBytes(cleaned);
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

