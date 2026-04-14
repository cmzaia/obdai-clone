import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { Buffer } from 'buffer';

import { useAppStore } from '../app/store';
import { saveScans } from '../app/storage';
import { obdService } from '../services/obdService';
import { OBD } from '../features/obd/protocol/elmCommands';
import { parseDtcsFromModeResponse } from '../features/obd/protocol/dtc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Buffer = Buffer;

export function ScanScreen() {
  const [log, setLog] = useState('');

  const addScan = useAppStore((s) => s.addScan);
  const scans = useAppStore((s) => s.scans);

  const appendLog = (line: string) => setLog((prev) => (prev ? prev + '\n' + line : line));

  const runScan = async () => {
    try {
      if (!obdService.device) throw new Error('Not connected. Go to Connect first.');
      appendLog('> Mode 03 (stored DTCs)');
      const storedRaw = await obdService.transport.send(OBD.dtcStored);
      appendLog(storedRaw);
      const stored = parseDtcsFromModeResponse('03', storedRaw);

      appendLog('> Mode 07 (pending DTCs)');
      const pendingRaw = await obdService.transport.send(OBD.dtcPending);
      appendLog(pendingRaw);
      const pending = parseDtcsFromModeResponse('07', pendingRaw);

      const scan = {
        id: `scan_${Date.now()}`,
        createdAt: Date.now(),
        stored,
        pending,
        raw: { stored: storedRaw, pending: pendingRaw },
      };
      addScan(scan);
      await saveScans([scan, ...scans].slice(0, 50));
      appendLog(`Saved scan. Stored=${stored.length}, Pending=${pending.length}`);
    } catch (e) {
      appendLog(`Scan failed: ${(e as Error).message}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Button title="Run Scan (Mode 03/07)" onPress={() => void runScan()} />
      <Text style={{ fontWeight: '600' }}>Log</Text>
      <View style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 }}>
        <Text style={{ fontSize: 12 }}>{log || '…'}</Text>
      </View>
    </View>
  );
}
