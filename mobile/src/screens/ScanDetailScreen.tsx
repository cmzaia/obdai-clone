import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/Nav';
import { useAppStore } from '../app/store';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanDetail'>;

/** URL of the server-side AI proxy. Set EXPO_PUBLIC_API_URL in your .env file. */
const AI_PROXY_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api/explain-dtcs`
  : null;

export function ScanDetailScreen({ route }: Props) {
  const scans = useAppStore((s) => s.scans);
  const scan = useMemo(() => scans.find((s) => s.id === route.params.id), [scans, route.params.id]);

  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState('');

  if (!scan) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>Scan not found.</Text>
      </View>
    );
  }

  const allDtcs = [...scan.stored, ...scan.pending];

  const explainWithAi = async () => {
    if (allDtcs.length === 0) return;
    if (!AI_PROXY_URL) {
      setExplainError('AI service not configured. Set EXPO_PUBLIC_API_URL in your .env file.');
      return;
    }
    setExplaining(true);
    setExplanation('');
    setExplainError('');
    try {
      const res = await fetch(AI_PROXY_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtcs: allDtcs }),
      });
      const json = (await res.json()) as { explanation?: string; error?: string };
      if (!res.ok || json.error) {
        setExplainError(json.error ?? 'Unknown error');
      } else {
        setExplanation(json.explanation ?? '');
      }
    } catch (e) {
      setExplainError((e as Error).message);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontWeight: '600', fontSize: 16 }}>{new Date(scan.createdAt).toLocaleString()}</Text>
      <Text style={{ fontWeight: '600' }}>Stored</Text>
      <Text>{scan.stored.length ? scan.stored.join(', ') : '(none)'}</Text>
      <Text style={{ fontWeight: '600' }}>Pending</Text>
      <Text>{scan.pending.length ? scan.pending.join(', ') : '(none)'}</Text>

      {allDtcs.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text
            onPress={() => void explainWithAi()}
            style={{
              color: 'white',
              backgroundColor: '#2563EB',
              padding: 12,
              borderRadius: 6,
              fontWeight: '700',
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            {explaining ? 'Explaining…' : 'Explain with AI'}
          </Text>
          {explaining && <ActivityIndicator style={{ marginTop: 8 }} />}
          {explainError ? (
            <Text style={{ color: '#DC2626', marginTop: 8 }}>{explainError}</Text>
          ) : explanation ? (
            <Text style={{ marginTop: 8, lineHeight: 22 }}>{explanation}</Text>
          ) : null}
        </View>
      )}

      <Text style={{ fontWeight: '600', marginTop: 10 }}>Raw (debug)</Text>
      <Text selectable style={{ fontFamily: 'Courier', fontSize: 12 }}>{scan.raw?.stored ?? ''}</Text>
      <Text selectable style={{ fontFamily: 'Courier', fontSize: 12 }}>{scan.raw?.pending ?? ''}</Text>
    </ScrollView>
  );
}

