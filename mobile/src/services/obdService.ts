import { AppState, AppStateStatus } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { ObdlinkCxBleTransport } from '../lib/obdlinkCxBle';
import { useAppStore } from '../app/store';

class ObdService {
  private manager = new BleManager();
  private transport = new ObdlinkCxBleTransport(this.manager);
  private device: Device | null = null;

  private _appStateSubscription = AppState.addEventListener(
    'change',
    (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        // Disconnect gracefully without destroying the BleManager singleton so
        // it can be reused when the app returns to the foreground.
        if (this.device) {
          void this.transport.disconnect();
          this.device = null;
          const store = useAppStore.getState();
          store.setConnectionStatus('disconnected');
          store.setConnectedDevice(undefined, undefined);
        }
      }
    },
  );

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

  /** Safely stop any in-progress BLE scan, ignoring errors. */
  private _stopDeviceScan() {
    try { this.manager.stopDeviceScan(); } catch {}
  }

  /** Scan for BLE devices, calling onDevice for each found, onError on errors. */
  scan(
    onDevice: (device: Device) => void,
    onError: (message: string) => void,
    durationMs = 10000,
  ): () => void {
    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        onError(error.message);
        return;
      }
      if (device) onDevice(device);
    });

    const timer = setTimeout(() => {
      this._stopDeviceScan();
    }, durationMs);

    return () => {
      clearTimeout(timer);
      this._stopDeviceScan();
    };
  }

  stopScan() {
    this._stopDeviceScan();
  }

  async sendCommand(cmd: string, timeoutMs?: number): Promise<string> {
    return this.transport.send(cmd, timeoutMs);
  }

  /**
   * Start polling a single OBD PID at the given interval.
   * Returns a stop function — call it to cancel the polling loop.
   *
   * @param cmd      OBD command string (e.g. '010C' for RPM)
   * @param onValue  Called with the raw response string on each poll
   * @param onError  Called if the command fails; polling stops automatically
   * @param intervalMs  Time between polls in milliseconds (default 500)
   */
  startPolling(
    cmd: string,
    onValue: (raw: string) => void,
    onError: (message: string) => void,
    intervalMs = 500,
  ): () => void {
    let active = true;

    const loop = async () => {
      while (active) {
        try {
          const raw = await this.transport.send(cmd, 4000);
          if (active) onValue(raw);
        } catch (e) {
          if (active) {
            active = false;
            onError((e as Error).message);
          }
          break;
        }
        await new Promise<void>((r) => setTimeout(r, intervalMs));
      }
    };

    void loop();
    return () => { active = false; };
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  getConnectedDeviceId(): string | null {
    return this.device?.id ?? null;
  }

  /** Fully tear down the service (call only on app shutdown). */
  dispose() {
    this._appStateSubscription.remove();
    this.transport.destroy();
  }
}

export const obdService = new ObdService();

