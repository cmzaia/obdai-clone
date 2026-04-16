import { parseDtcsFromModeResponse } from '../src/features/obd/protocol/dtc';

describe('parseDtcsFromModeResponse', () => {
  describe('Mode 03 — stored DTCs', () => {
    it('parses a spaced response with one DTC', () => {
      // 43 = service response, 01 03 = P0103
      expect(parseDtcsFromModeResponse('03', '43 01 03')).toEqual(['P0103']);
    });

    it('parses a spaced response with multiple DTCs', () => {
      // 43 03 01 = P0301, 03 02 = P0302
      expect(parseDtcsFromModeResponse('03', '43 03 01 03 02')).toEqual(['P0301', 'P0302']);
    });

    it('parses an unspaced (concatenated) response', () => {
      // Same bytes but no whitespace between them
      expect(parseDtcsFromModeResponse('03', '430301')).toEqual(['P0301']);
    });

    it('ignores null DTC pairs (00 00)', () => {
      expect(parseDtcsFromModeResponse('03', '43 00 00 03 01')).toEqual(['P0301']);
    });

    it('returns empty array when no service byte is found', () => {
      expect(parseDtcsFromModeResponse('03', 'NO DATA')).toEqual([]);
    });

    it('returns empty array for empty / whitespace response', () => {
      expect(parseDtcsFromModeResponse('03', '')).toEqual([]);
      expect(parseDtcsFromModeResponse('03', '   ')).toEqual([]);
    });

    it('returns empty array when only one byte present after service byte', () => {
      expect(parseDtcsFromModeResponse('03', '43 01')).toEqual([]);
    });
  });

  describe('Mode 07 — pending DTCs', () => {
    it('parses pending DTCs with correct service byte (47)', () => {
      // 47 = 0x40 + 0x07
      expect(parseDtcsFromModeResponse('07', '47 04 05')).toEqual(['P0405']);
    });

    it('does not match stored service byte (43) for mode 07', () => {
      expect(parseDtcsFromModeResponse('07', '43 03 01')).toEqual([]);
    });
  });

  describe('DTC first-letter decoding', () => {
    it('decodes P codes (top 2 bits = 00)', () => {
      // 0x03 = 0000_0011 → P, digit1=0, digit2=3; 0x01 → digit3=0, digit4=1 → P0301
      expect(parseDtcsFromModeResponse('03', '43 03 01')).toEqual(['P0301']);
    });

    it('decodes C codes (top 2 bits = 01)', () => {
      // 0x43 = 0100_0011 → C, d1=0, d2=3; 0x01 → d3=0, d4=1 → C0301
      expect(parseDtcsFromModeResponse('03', '43 43 01')).toEqual(['C0301']);
    });

    it('decodes B codes (top 2 bits = 10)', () => {
      // 0x83 = 1000_0011 → B, d1=0, d2=3; 0x01 → d3=0, d4=1 → B0301
      expect(parseDtcsFromModeResponse('03', '43 83 01')).toEqual(['B0301']);
    });

    it('decodes U codes (top 2 bits = 11)', () => {
      // 0xC3 = 1100_0011 → U, d1=0, d2=3; 0x01 → d3=0, d4=1 → U0301
      expect(parseDtcsFromModeResponse('03', '43 C3 01')).toEqual(['U0301']);
    });
  });

  describe('multi-line ELM responses', () => {
    it('strips ISO-TP line-number prefixes', () => {
      const multiLine = '0: 43 03 01\n1: 03 02';
      expect(parseDtcsFromModeResponse('03', multiLine)).toEqual(['P0301', 'P0302']);
    });
  });
});
