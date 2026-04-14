import React, { useState } from 'react';
import { Text } from 'react-native';
import { Buffer } from 'buffer';

import { useAppStore } from '../app/store';
import { saveScans } from '../app/storage';
import { obdService } from '../services/obdService';
import { OBD } from '../features/obd/protocol/elmCommands';
import { parseDtcsFromModeResponse } from '../features/obd/protocol/dtc';
import { Badge, Card, H2, PrimaryButton, Screen, Subtext } from '../ui/components';

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
    <Screen>
      <Card style={{ gap: 10 }}>
        <H2>Quick Scan</H2>
        <Subtext>Reads Stored (Mode 03) + Pending (Mode 07) trouble codes.</Subtext>
        <PrimaryButton title="Run Scan" onPress={() => void runScan()} />
      </Card>

      <Card style={{ marginTop: 12, gap: 10 }}>
        <H2>Latest Result</H2>
        <Subtext>Saved automatically to History.</Subtext>
        {scans[0] ? (
          <>
            <Badge label={`Stored: ${scans[0].stored.length}`} tone={scans[0].stored.length ? 'danger' : 'success'} />
            <Subtext>{scans[0].stored.length ? scans[0].stored.join(', ') : '(none)'}</Subtext>
            <Badge label={`Pending: ${scans[0].pending.length}`} tone={scans[0].pending.length ? 'warning' : 'success'} />
            <Subtext>{scans[0].pending.length ? scans[0].pending.join(', ') : '(none)'}</Subtext>
          </>
        ) : (
          <Subtext>No scans yet.</Subtext>
        )}
      </Card>

      <Card style={{ marginTop: 12, gap: 8, flex: 1 }}>
        <H2>Log</H2>
        <Text style={{ fontSize: 12 }}>{log || '…'}</Text>
      </Card>
    </Screen>
  );
}
