import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

import { ObdlinkCxBleTransport } from './src/lib/obdlinkCxBle';
import { OBD } from './src/features/obd/protocol/elmCommands';
import { parseDtcsFromModeResponse } from './src/features/obd/protocol/dtc';

// Polyfill for libraries that expect global Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Buffer = Buffer;

export default function App() {
  const manager = useMemo(() => new BleManager(), []);
  const transportRef = useRef<ObdlinkCxBleTransport | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');

  useEffect(() => {
    transportRef.current = new ObdlinkCxBleTransport(manager);
    return () => {
      transportRef.current?.destroy();
    };
  }, [manager]);

  const appendLog = (line: string) => setLog((prev) => (prev ? prev + '\n' + line : line));

  const startScan = async () => {
    setDevices([]);
    setIsScanning(true);
    appendLog('Scanning for BLE devices…');

    const seen = new Map<string, Device>();
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        appendLog(`Scan error: ${error.message}`);
        setIsScanning(false);
        return;
      }
      if (!device) return;
      const name = device.name ?? device.localName ?? '';
      // Heuristic: OBDLink CX typically advertises as "OBDLink CX".
      if (!name) return;
      if (!/obd/i.test(name)) return;
      if (seen.has(device.id)) return;
      seen.set(device.id, device);
      setDevices(Array.from(seen.values()));
    });

    // auto-stop after 10s
    setTimeout(() => {
      try {
        manager.stopDeviceScan();
      } catch {}
      setIsScanning(false);
      appendLog('Scan stopped.');
    }, 10000);
  };

  const connect = async (device: Device) => {
    try {
      appendLog(`Connecting to ${device.name ?? device.id}…`);
      await transportRef.current?.connect(device);
      setConnectedId(device.id);
      appendLog('Connected. Initializing ELM327…');
      await transportRef.current?.elmInit();
      appendLog('ELM init complete.');
    } catch (e) {
      appendLog(`Connect/init failed: ${(e as Error).message}`);
      setConnectedId(null);
      try {
        await transportRef.current?.disconnect();
      } catch {}
    }
  };

  const disconnect = async () => {
    await transportRef.current?.disconnect();
    setConnectedId(null);
    appendLog('Disconnected.');
  };

  const sendTest = async () => {
    try {
      appendLog('> ATI');
      const r = await transportRef.current?.send('ATI');
      appendLog(r ?? '(no response)');
    } catch (e) {
      appendLog(`Send failed: ${(e as Error).message}`);
    }
  };

  const scanDtcs = async () => {
    try {
      appendLog('> Mode 03 (stored DTCs)');
      const storedRaw = await transportRef.current?.send(OBD.dtcStored);
      appendLog(storedRaw ?? '(no response)');
      const stored = parseDtcsFromModeResponse('03', storedRaw ?? '');
      appendLog(`Stored: ${stored.length ? stored.join(', ') : '(none)'}`);

      appendLog('> Mode 07 (pending DTCs)');
      const pendingRaw = await transportRef.current?.send(OBD.dtcPending);
      appendLog(pendingRaw ?? '(no response)');
      const pending = parseDtcsFromModeResponse('07', pendingRaw ?? '');
      appendLog(`Pending: ${pending.length ? pending.join(', ') : '(none)'}`);
    } catch (e) {
      appendLog(`Scan failed: ${(e as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OBD (BLE) Prototype</Text>
        <Text style={styles.subtitle}>Target: OBDLink CX (FFF0/FFF1/FFF2)</Text>
      </View>

      <View style={styles.row}>
        <Button title={isScanning ? 'Scanning…' : 'Scan'} onPress={startScan} disabled={isScanning} />
        <View style={styles.spacer} />
        <Button title="Disconnect" onPress={disconnect} disabled={!connectedId} />
        <View style={styles.spacer} />
        <Button title="Test ATI" onPress={sendTest} disabled={!connectedId} />
        <View style={styles.spacer} />
        <Button title="Scan DTCs" onPress={scanDtcs} disabled={!connectedId} />
      </View>

      <Text style={styles.section}>Devices</Text>
      <FlatList
        style={styles.list}
        data={devices}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={styles.deviceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceName}>{item.name ?? item.localName ?? 'Unnamed'}</Text>
              <Text style={styles.deviceMeta}>{item.id}</Text>
            </View>
            <Button title="Connect" onPress={() => connect(item)} disabled={!!connectedId} />
          </View>
        )}
      />

      <Text style={styles.section}>Log</Text>
      <View style={styles.logBox}>
        <Text style={styles.logText}>{log || '…'}</Text>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { gap: 4, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 12, color: '#444' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  spacer: { width: 10 },
  section: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  list: { maxHeight: 220, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  deviceName: { fontSize: 14, fontWeight: '500' },
  deviceMeta: { fontSize: 11, color: '#666' },
  logBox: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 },
  logText: { fontSize: 12, color: '#111' },
});
