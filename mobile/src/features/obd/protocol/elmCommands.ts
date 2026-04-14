export const ELM_INIT_COMMANDS = ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0'] as const;

// OBD-II service (mode) helpers
export const OBD = {
  // Mode 03: request stored DTCs
  dtcStored: '03',
  // Mode 07: request pending DTCs
  dtcPending: '07',
  // Mode 04: clear DTCs and stored values
  clear: '04',
  // Mode 01 PID 01: monitor status since DTCs cleared
  monitorStatus: '0101',
  // Mode 09 PID 02: VIN (best-effort)
  vin: '0902',
} as const;

