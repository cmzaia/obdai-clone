import { BleManager, Device, Characteristic, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

// OBDLink CX BLE UUIDs (from OBDLink support docs)
// Service: 0000FFF0-0000-1000-8000-00805F9B34FB
// Notify char: 0000FFF1-0000-1000-8000-00805F9B34FB
// Write char:  0000FFF2-0000-1000-8000-00805F9B34FB
export const OBDLINK_CX_UART_SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
export const OBDLINK_CX_UART_NOTIFY_CHAR = '0000fff1-0000-1000-8000-00805f9b34fb';
export const OBDLINK_CX_UART_WRITE_CHAR = '0000fff2-0000-1000-8000-00805f9b34fb';

export type ObdlinkCxTransportState =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'connecting'; deviceId: string }
  | { kind: 'connected'; deviceId: string }
  | { kind: 'error'; message: string };

export class ObdlinkCxBleTransport {
  private manager: BleManager;
  private device: Device | null = null;
  private notifySub: Subscription | null = null;
  private writeChar: Characteristic | null = null;
  private notifyChar: Characteristic | null = null;
  private rxBuffer = '';
  private pending: Array<{ resolve: (s: string) => void; reject: (e: Error) => void; timeout: NodeJS.Timeout }> = [];

  constructor(manager?: BleManager) {
    this.manager = manager ?? new BleManager();
  }

  destroy() {
    try {
      this.notifySub?.remove();
    } catch {}
    try {
      this.manager.destroy();
    } catch {}
  }

  async connect(device: Device) {
    const connected = await device.connect({ timeout: 20000 });
    this.device = connected;
    await connected.discoverAllServicesAndCharacteristics();

    this.writeChar = await connected.writeCharacteristicWithResponseForService(
      OBDLINK_CX_UART_SERVICE,
      OBDLINK_CX_UART_WRITE_CHAR,
      Buffer.from('\r').toString('base64')
    );

    // Re-fetch characteristics properly (some stacks return a write result object)
    const services = await connected.services();
    const uart = services.find((s) => s.uuid.toLowerCase() === OBDLINK_CX_UART_SERVICE);
    if (!uart) throw new Error('OBDLink CX UART service not found');
    const chars = await uart.characteristics();
    this.writeChar = chars.find((c) => c.uuid.toLowerCase() === OBDLINK_CX_UART_WRITE_CHAR) ?? null;
    this.notifyChar = chars.find((c) => c.uuid.toLowerCase() === OBDLINK_CX_UART_NOTIFY_CHAR) ?? null;
    if (!this.writeChar || !this.notifyChar) throw new Error('OBDLink CX UART characteristics not found');

    this.notifySub = this.notifyChar.monitor((err, ch) => {
      if (err) return;
      const b64 = ch?.value;
      if (!b64) return;
      const chunk = Buffer.from(b64, 'base64').toString('utf8');
      this.onData(chunk);
    });
  }

  async disconnect() {
    if (!this.device) return;
    try {
      this.notifySub?.remove();
    } catch {}
    this.notifySub = null;
    this.writeChar = null;
    this.notifyChar = null;
    const id = this.device.id;
    this.device = null;
    try {
      await this.manager.cancelDeviceConnection(id);
    } catch {}
  }

  private onData(chunk: string) {
    this.rxBuffer += chunk;
    // ELM327 responses typically terminate with '>' prompt
    while (true) {
      const idx = this.rxBuffer.indexOf('>');
      if (idx === -1) break;
      const frame = this.rxBuffer.slice(0, idx);
      this.rxBuffer = this.rxBuffer.slice(idx + 1);
      const cleaned = frame.replace(/\r/g, '').trim();
      const next = this.pending.shift();
      if (next) {
        clearTimeout(next.timeout);
        next.resolve(cleaned);
      }
    }
  }

  /**
   * Send a command and wait for a single prompt-terminated response.
   * Note: For multi-message / streaming cases, we'll add a different API later.
   */
  async send(cmd: string, timeoutMs = 8000): Promise<string> {
    if (!this.device || !this.writeChar) throw new Error('Not connected');
    const payload = Buffer.from(cmd.trim() + '\r', 'utf8');
    const b64 = payload.toString('base64');

    const resp = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for response to: ${cmd}`));
      }, timeoutMs);
      this.pending.push({ resolve, reject, timeout });
    });

    // Most adapters accept write-without-response for throughput.
    await this.manager.writeCharacteristicWithoutResponseForDevice(
      this.device.id,
      OBDLINK_CX_UART_SERVICE,
      OBDLINK_CX_UART_WRITE_CHAR,
      b64
    );

    return resp;
  }

  async elmInit() {
    // Minimal sane ELM init sequence
    await this.send('ATZ', 12000);
    await this.send('ATE0');
    await this.send('ATL0');
    await this.send('ATS0');
    await this.send('ATH0');
    await this.send('ATSP0');
  }
}

