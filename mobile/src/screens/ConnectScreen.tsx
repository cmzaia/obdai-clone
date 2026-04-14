import React, { useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import type { Device } from 'react-native-ble-plx';

import { useAppStore } from '../app/store';
import { obdService } from '../services/obdService';

export function ConnectScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [log, setLog] = useState('');

  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const setConnectedDevice = useAppStore((s) => s.setConnectedDevice);

  const appendLog = (line: string) => setLog((prev) => (prev ? prev + '\n' + line : line));

  const startScan = () => {
    setDevices([]);
    setConnectionStatus('scanning');
    appendLog('Scanning for BLE devices…');
    const seen = new Map<string, Device>();
    obdService.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        appendLog(`Scan error: ${error.message}`);
        setConnectionStatus('disconnected');
        return;
      }
      if (!device) return;
      const name = device.name ?? device.localName ?? '';
      if (!name) return;
      if (!/obd/i.test(name)) return;
      if (seen.has(device.id)) return;
      seen.set(device.id, device);
      setDevices(Array.from(seen.values()));
    });
    setTimeout(() => {
      try {
        obdService.manager.stopDeviceScan();
      } catch {}
      setConnectionStatus('disconnected');
      appendLog('Scan stopped.');
    }, 10000);
  };

  const connect = async (device: Device) => {
    try {
      setConnectionStatus('connecting');
      appendLog(`Connecting to ${device.name ?? device.id}…`);
      await obdService.connect(device);
      setConnectedDevice(device.id, device.name ?? device.localName ?? device.id);
      setConnectionStatus('connected');
      appendLog('Connected + initialized.');
    } catch (e) {
      appendLog(`Connect failed: ${(e as Error).message}`);
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = async () => {
    await obdService.disconnect();
    setConnectedDevice(undefined, undefined);
    setConnectionStatus('disconnected');
    appendLog('Disconnected.');
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={connectionStatus === 'scanning' ? 'Scanning…' : 'Scan'} onPress={startScan} disabled={connectionStatus === 'scanning' || connectionStatus === 'connecting'} />
        <Button title="Disconnect" onPress={disconnect} disabled={connectionStatus !== 'connected'} />
      </View>

      <Text style={{ fontWeight: '600' }}>Devices</Text>
      <FlatList
        style={{ maxHeight: 220, borderWidth: 1, borderColor: '#eee', borderRadius: 8 }}
        data={devices}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '500' }}>{item.name ?? item.localName ?? 'Unnamed'}</Text>
              <Text style={{ fontSize: 11, color: '#666' }}>{item.id}</Text>
            </View>
            <Button title="Connect" onPress={() => void connect(item)} disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'} />
          </View>
        )}
      />

      <Text style={{ fontWeight: '600' }}>Log</Text>
      <View style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 }}>
        <Text style={{ fontSize: 12 }}>{log || '…'}</Text>
      </View>
    </View>
  );
}
