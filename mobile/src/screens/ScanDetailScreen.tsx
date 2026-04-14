import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/Nav';
import { useAppStore } from '../app/store';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanDetail'>;

export function ScanDetailScreen({ route }: Props) {
  const scans = useAppStore((s) => s.scans);
  const scan = useMemo(() => scans.find((s) => s.id === route.params.id), [scans, route.params.id]);

  if (!scan) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>Scan not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontWeight: '600', fontSize: 16 }}>{new Date(scan.createdAt).toLocaleString()}</Text>
      <Text style={{ fontWeight: '600' }}>Stored</Text>
      <Text>{scan.stored.length ? scan.stored.join(', ') : '(none)'}</Text>
      <Text style={{ fontWeight: '600' }}>Pending</Text>
      <Text>{scan.pending.length ? scan.pending.join(', ') : '(none)'}</Text>

      <Text style={{ fontWeight: '600', marginTop: 10 }}>Raw (debug)</Text>
      <Text selectable style={{ fontFamily: 'Courier', fontSize: 12 }}>{scan.raw?.stored ?? ''}</Text>
      <Text selectable style={{ fontFamily: 'Courier', fontSize: 12 }}>{scan.raw?.pending ?? ''}</Text>
    </ScrollView>
  );
}

