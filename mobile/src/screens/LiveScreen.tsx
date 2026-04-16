import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { obdService } from '../services/obdService';
import { Card, H2, Screen, Subtext } from '../ui/components';

type PidDef = {
  label: string;
  cmd: string;
  unit: string;
  parse: (raw: string) => string;
};

/**
 * Parse a Mode-01 response: strip the echo / header bytes and extract the
 * data bytes, then apply a simple formula.
 *
 * Raw response format (with headers off, echo off):
 *   "41 0C 1A F8"  (service 0x41, PID, then data bytes A B …)
 */
function extractDataBytes(raw: string): number[] {
  const hex = raw.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const chunk = hex.slice(i, i + 2);
    if (!/^[0-9A-Fa-f]{2}$/.test(chunk)) break;
    bytes.push(parseInt(chunk, 16));
  }
  // Drop service byte (0x41) and PID byte
  return bytes.slice(2);
}

const PIDS: PidDef[] = [
  {
    label: 'RPM',
    cmd: '010C',
    unit: 'rpm',
    parse: (raw) => {
      const [a, b] = extractDataBytes(raw);
      if (a === undefined || b === undefined) return '—';
      return (((a * 256) + b) / 4).toFixed(0);
    },
  },
  {
    label: 'Vehicle Speed',
    cmd: '010D',
    unit: 'km/h',
    parse: (raw) => {
      const [a] = extractDataBytes(raw);
      if (a === undefined) return '—';
      return a.toFixed(0);
    },
  },
  {
    label: 'Coolant Temp',
    cmd: '0105',
    unit: '°C',
    parse: (raw) => {
      const [a] = extractDataBytes(raw);
      if (a === undefined) return '—';
      return (a - 40).toFixed(0);
    },
  },
  {
    label: 'Engine Load',
    cmd: '0104',
    unit: '%',
    parse: (raw) => {
      const [a] = extractDataBytes(raw);
      if (a === undefined) return '—';
      return ((a / 255) * 100).toFixed(1);
    },
  },
  {
    label: 'Throttle Position',
    cmd: '0111',
    unit: '%',
    parse: (raw) => {
      const [a] = extractDataBytes(raw);
      if (a === undefined) return '—';
      return ((a / 255) * 100).toFixed(1);
    },
  },
];

type PidState = { value: string; error: string; enabled: boolean };

export function LiveScreen() {
  const [pidStates, setPidStates] = useState<Record<string, PidState>>(() =>
    Object.fromEntries(
      PIDS.map((p) => [p.cmd, { value: '—', error: '', enabled: false }]),
    ),
  );

  const stopFnsRef = useRef<Map<string, () => void>>(new Map());

  const togglePid = useCallback((pid: PidDef, enabled: boolean) => {
    setPidStates((prev) => ({
      ...prev,
      [pid.cmd]: { ...prev[pid.cmd], enabled, value: '—', error: '' },
    }));

    if (!enabled) {
      stopFnsRef.current.get(pid.cmd)?.();
      stopFnsRef.current.delete(pid.cmd);
      return;
    }

    if (!obdService.isConnected()) {
      setPidStates((prev) => ({
        ...prev,
        [pid.cmd]: { ...prev[pid.cmd], enabled: false, error: 'Not connected' },
      }));
      return;
    }

    const stop = obdService.startPolling(
      pid.cmd,
      (raw) => {
        setPidStates((prev) => ({
          ...prev,
          [pid.cmd]: { ...prev[pid.cmd], value: pid.parse(raw), error: '' },
        }));
      },
      (message) => {
        setPidStates((prev) => ({
          ...prev,
          [pid.cmd]: { ...prev[pid.cmd], enabled: false, error: message },
        }));
        stopFnsRef.current.delete(pid.cmd);
      },
    );
    stopFnsRef.current.set(pid.cmd, stop);
  }, []);

  // Stop all polls on unmount.
  useEffect(() => {
    const stops = stopFnsRef.current;
    return () => {
      for (const stop of stops.values()) stop();
      stops.clear();
    };
  }, []);

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <H2>Live PIDs</H2>
        <Subtext>Toggle a PID to start streaming its value from the adapter.</Subtext>
      </Card>

      <ScrollView>
        {PIDS.map((pid) => {
          const state = pidStates[pid.cmd];
          return (
            <Card key={pid.cmd} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15 }}>{pid.label}</Text>
                <Subtext>{pid.cmd}</Subtext>
                {state.error ? (
                  <Text style={{ color: '#DC2626', fontSize: 12 }}>{state.error}</Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 22, fontWeight: '700', minWidth: 70, textAlign: 'right' }}>
                {state.enabled ? `${state.value} ${pid.unit}` : '—'}
              </Text>
              <Switch value={state.enabled} onValueChange={(v) => togglePid(pid, v)} />
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
