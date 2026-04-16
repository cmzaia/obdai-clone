import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { Device } from 'react-native-ble-plx';

import { useAppStore } from '../app/store';
import { obdService } from '../services/obdService';
import { requestBlePermissions } from '../lib/useBlePermissions';
import { Badge, Card, H2, PrimaryButton, Screen, SecondaryButton, Subtext } from '../ui/components';

export function ConnectScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [log, setLog] = useState('');
  const stopScanRef = useRef<(() => void) | null>(null);

  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const setConnectedDevice = useAppStore((s) => s.setConnectedDevice);

  // Clean up any running scan when the screen unmounts.
  useEffect(() => {
    return () => {
      stopScanRef.current?.();
      stopScanRef.current = null;
    };
  }, []);

  const appendLog = (line: string) => setLog((prev) => (prev ? prev + '\n' + line : line));

  const startScan = async () => {
    const granted = await requestBlePermissions();
    if (!granted) {
      appendLog('Bluetooth permission denied. Please grant permissions in Settings.');
      return;
    }

    setDevices([]);
    setConnectionStatus('scanning');
    appendLog('Scanning for BLE devices…');
    const seen = new Map<string, Device>();

    const stop = obdService.scan(
      (device) => {
        const name = device.name ?? device.localName ?? '';
        if (!name) return;
        // Accept common OBD adapter brands; remove to show ALL named devices.
        if (!/(obd|stn|vgate|plx|elm|carista)/i.test(name)) return;
        if (seen.has(device.id)) return;
        seen.set(device.id, device);
        setDevices(Array.from(seen.values()));
      },
      (message) => {
        appendLog(`Scan error: ${message}`);
        setConnectionStatus('disconnected');
        stopScanRef.current = null;
      },
      10000,
    );

    stopScanRef.current = () => {
      stop();
      setConnectionStatus('disconnected');
      appendLog('Scan stopped.');
      stopScanRef.current = null;
    };

    // Auto-stop after 10 s and update UI.
    setTimeout(() => {
      stopScanRef.current?.();
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
            onPress={() => void startScan()}
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
          ListEmptyComponent={<Subtext>No adapters yet. Tap "Scan for Adapters".</Subtext>}
        />
      </Card>

      <Card style={{ marginTop: 12, gap: 8 }}>
        <H2>Log</H2>
        <Text style={{ fontSize: 12 }}>{log || '…'}</Text>
      </Card>
    </Screen>
  );
}
