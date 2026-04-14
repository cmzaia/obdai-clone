import React from 'react';
import { FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppStore } from '../app/store';
import type { RootStackParamList } from '../app/Nav';
import { Card, H2, Screen, SecondaryButton, Subtext } from '../ui/components';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const scans = useAppStore((s) => s.scans);
  return (
    <Screen>
      <Card style={{ marginBottom: 12, gap: 6 }}>
        <H2>History</H2>
        <Subtext>Most recent scans are saved on-device (no account).</Subtext>
      </Card>
      <Card style={{ flex: 1 }}>
        <FlatList
          data={scans}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 4 }}>
              <Text style={{ fontWeight: '700' }}>{new Date(item.createdAt).toLocaleString()}</Text>
              <Subtext>Stored: {item.stored.length ? item.stored.join(', ') : '(none)'}</Subtext>
              <Subtext>Pending: {item.pending.length ? item.pending.join(', ') : '(none)'}</Subtext>
              <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                <SecondaryButton title="View" onPress={() => navigation.navigate('ScanDetail', { id: item.id })} />
              </View>
            </View>
          )}
          ListEmptyComponent={<Subtext>No scans yet.</Subtext>}
        />
      </Card>
    </Screen>
  );
}
