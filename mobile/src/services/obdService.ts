import { BleManager, Device } from 'react-native-ble-plx';
import { ObdlinkCxBleTransport } from '../lib/obdlinkCxBle';

class ObdService {
  manager = new BleManager();
  transport = new ObdlinkCxBleTransport(this.manager);
  device: Device | null = null;

  async connect(device: Device) {
    await this.transport.connect(device);
    await this.transport.elmInit();
    this.device = device;
  }

  async disconnect() {
    await this.transport.disconnect();
    this.device = null;
  }
}

export const obdService = new ObdService();

