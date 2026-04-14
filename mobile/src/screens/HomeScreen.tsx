import React from 'react';
import { Button, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/Nav';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16 }}>
        MVP: connect to OBDLink CX (BLE), scan DTCs, view history.
      </Text>
      <Button title="Connect" onPress={() => navigation.navigate('Connect')} />
      <Button title="Scan" onPress={() => navigation.navigate('Scan')} />
      <Button title="History" onPress={() => navigation.navigate('History')} />
    </View>
  );
}

