import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export type StoredScan = {
  id: string;
  createdAt: number;
  stored: string[];
  pending: string[];
  raw?: { stored?: string; pending?: string };
};

type AppState = {
  connectionStatus: ConnectionStatus;
  connectedDeviceName?: string;
  connectedDeviceId?: string;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setConnectedDevice: (id?: string, name?: string) => void;

  scans: StoredScan[];
  setScans: (scans: StoredScan[]) => void;
  addScan: (scan: StoredScan) => void;
};

export const useAppStore = create<AppState>((set) => ({
  connectionStatus: 'disconnected',
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setConnectedDevice: (id, name) => set({ connectedDeviceId: id, connectedDeviceName: name }),

  scans: [],
  setScans: (scans) => set({ scans }),
  addScan: (scan) => set((st) => ({ scans: [scan, ...st.scans].slice(0, 50) })),
}));

