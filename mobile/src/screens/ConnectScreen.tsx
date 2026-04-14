import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { Device } from 'react-native-ble-plx';

import { useAppStore } from '../app/store';
import { obdService } from '../services/obdService';
import { Badge, Card, H2, PrimaryButton, Screen, SecondaryButton, Subtext } from '../ui/components';

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
    <Screen>
      <Card style={{ gap: 10 }}>
        <H2>Connection</H2>
        <Badge
          label={connectionStatus.toUpperCase()}
          tone={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'neutral'}
        />
        <Subtext>
          Tip: start your car (ignition on) and plug in the OBDLink CX before connecting.
        </Subtext>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PrimaryButton
            title={connectionStatus === 'scanning' ? 'Scanning…' : 'Scan for Adapters'}
            onPress={startScan}
            disabled={connectionStatus === 'scanning' || connectionStatus === 'connecting'}
          />
          <SecondaryButton title="Disconnect" onPress={() => void disconnect()} disabled={connectionStatus !== 'connected'} />
        </View>
      </Card>

      <Card style={{ marginTop: 12, gap: 10, flex: 1 }}>
        <H2>Adapters Found</H2>
        <FlatList
          data={devices}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{item.name ?? item.localName ?? 'Unnamed'}</Text>
                <Subtext>{item.id}</Subtext>
              </View>
              <SecondaryButton
                title="Connect"
                onPress={() => void connect(item)}
                disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
              />
            </View>
          )}
          ListEmptyComponent={<Subtext>No adapters yet. Tap “Scan for Adapters”.</Subtext>}
        />
      </Card>

      <Card style={{ marginTop: 12, gap: 8 }}>
        <H2>Log</H2>
        <Text style={{ fontSize: 12 }}>{log || '…'}</Text>
      </Card>
    </Screen>
  );
}
