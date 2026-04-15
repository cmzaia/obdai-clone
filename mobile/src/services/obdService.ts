import { AppState, AppStateStatus } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { ObdlinkCxBleTransport } from '../lib/obdlinkCxBle';
import { useAppStore } from '../app/store';

class ObdService {
  manager = new BleManager();
  transport = new ObdlinkCxBleTransport(this.manager);
  device: Device | null = null;

  constructor() {
    // Destroy the BleManager when the app is backgrounded to release OS resources.
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        this.transport.destroy();
      }
    });
  }

  async connect(device: Device) {
    await this.transport.connect(device);

    // Notify the store if the device drops unexpectedly (e.g. cable pulled or BT lost).
    this.transport.onExternalDisconnect = () => {
      this.device = null;
      const store = useAppStore.getState();
      store.setConnectionStatus('disconnected');
      store.setConnectedDevice(undefined, undefined);
    };

    await this.transport.elmInit();
    this.device = device;
  }

  async disconnect() {
    this.transport.onExternalDisconnect = null;
    await this.transport.disconnect();
    this.device = null;
  }
}

export const obdService = new ObdService();

