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
  private disconnectSub: Subscription | null = null;
  private writeChar: Characteristic | null = null;
  private notifyChar: Characteristic | null = null;
  private rxBuffer = '';
  private nextPendingId = 0;
  private pending: Map<number, { resolve: (s: string) => void; reject: (e: Error) => void; timeout: ReturnType<typeof setTimeout> }> = new Map();
  private queue: Array<{
    cmd: string;
    timeoutMs: number;
    resolve: (s: string) => void;
    reject: (e: Error) => void;
  }> = [];
  private inFlight = false;

  /** Called when the device disconnects unexpectedly (e.g. cable pulled). */
  onExternalDisconnect: (() => void) | null = null;

  constructor(manager: BleManager) {
    this.manager = manager;
  }

  destroy() {
    try {
      this.notifySub?.remove();
    } catch {}
    try {
      this.disconnectSub?.remove();
    } catch {}
    this.notifySub = null;
    this.disconnectSub = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.device = null;
    this.rxBuffer = '';
    this._drainQueues(new Error('Transport destroyed'));
    try {
      this.manager.destroy();
    } catch {}
  }

  async connect(device: Device) {
    const connected = await device.connect({ timeout: 20000 });
    this.device = connected;
    await connected.discoverAllServicesAndCharacteristics();

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

    // Subscribe to unexpected disconnection events so the app can update its UI
    // and in-flight commands are not left hanging indefinitely.
    this.disconnectSub = connected.onDisconnected((_error) => {
      this._handleExternalDisconnect();
    });
  }

  async disconnect() {
    if (!this.device) return;
    try {
      this.notifySub?.remove();
    } catch {}
    try {
      this.disconnectSub?.remove();
    } catch {}
    this.notifySub = null;
    this.disconnectSub = null;
    this.writeChar = null;
    this.notifyChar = null;
    const id = this.device.id;
    this.device = null;

    // Drain any in-flight / queued commands so callers don't hang.
    this._drainQueues(new Error('Disconnected'));

    try {
      await this.manager.cancelDeviceConnection(id);
    } catch {}
  }

  /** Drain all pending and queued commands with the given error. */
  private _drainQueues(err: Error) {
    const inflight = this.pending;
    this.pending = new Map();
    for (const item of inflight.values()) {
      clearTimeout(item.timeout);
      item.reject(err);
    }
    const queued = this.queue;
    this.queue = [];
    for (const item of queued) {
      item.reject(err);
    }
    this.inFlight = false;
  }

  /** Handles an unexpected (external) disconnection from the device. */
  private _handleExternalDisconnect() {
    try {
      this.notifySub?.remove();
    } catch {}
    try {
      this.disconnectSub?.remove();
    } catch {}
    this.notifySub = null;
    this.disconnectSub = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.device = null;
    this.rxBuffer = '';

    this._drainQueues(new Error('Device disconnected unexpectedly'));

    this.onExternalDisconnect?.();
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
      // Resolve the oldest pending command (FIFO)
      const firstKey = this.pending.keys().next().value;
      if (firstKey !== undefined) {
        const next = this.pending.get(firstKey)!;
        this.pending.delete(firstKey);
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
    return new Promise<string>((resolve, reject) => {
      this.queue.push({ cmd, timeoutMs, resolve, reject });
      void this.pump();
    });
  }

  private async pump() {
    if (this.inFlight) return;
    const next = this.queue.shift();
    if (!next) return;
    this.inFlight = true;
    try {
      const r = await this.sendNow(next.cmd, next.timeoutMs);
      next.resolve(r);
    } catch (e) {
      next.reject(e as Error);
    } finally {
      this.inFlight = false;
      void this.pump();
    }
  }

  private async sendNow(cmd: string, timeoutMs: number): Promise<string> {
    if (!this.device || !this.writeChar) throw new Error('Not connected');
    const payload = Buffer.from(cmd.trim() + '\r', 'utf8');
    const b64 = payload.toString('base64');

    const resp = new Promise<string>((resolve, reject) => {
      const id = this.nextPendingId++;
      const timeout = setTimeout(() => {
        // O(1) removal by known key
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for response to: ${cmd}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
    });

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
    const resetResp = await this.send('ATZ', 12000);
    if (!resetResp || /error/i.test(resetResp)) {
      throw new Error(`ELM ATZ failed: "${resetResp}"`);
    }

    const atCmds = ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0'];
    for (const cmd of atCmds) {
      const resp = (await this.send(cmd)).trim().toUpperCase();
      if (resp !== 'OK') {
        throw new Error(`ELM ${cmd} failed: "${resp}"`);
      }
    }
  }
}
