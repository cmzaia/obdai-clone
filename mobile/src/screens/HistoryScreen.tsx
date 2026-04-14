import React from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppStore } from '../app/store';
import type { RootStackParamList } from '../app/Nav';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const scans = useAppStore((s) => s.scans);
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={scans}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <Text style={{ fontWeight: '600' }}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text>Stored: {item.stored.length ? item.stored.join(', ') : '(none)'}</Text>
            <Text>Pending: {item.pending.length ? item.pending.join(', ') : '(none)'}</Text>
            <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Button title="View" onPress={() => navigation.navigate('ScanDetail', { id: item.id })} />
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No scans yet.</Text>}
      />
    </View>
  );
}

