import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/Nav';
import { Card, H1, Subtext, PrimaryButton, SecondaryButton, Screen } from '../ui/components';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <Card style={{ gap: 8 }}>
        <H1>PitlaneHub</H1>
        <Subtext>OBD2 scan + plain-English guidance (MVP). Adapter: OBDLink CX (BLE).</Subtext>
      </Card>

      <Card style={{ marginTop: 12, gap: 10 }}>
        <PrimaryButton title="Connect to Adapter" onPress={() => navigation.navigate('Connect')} />
        <SecondaryButton title="Run Scan" onPress={() => navigation.navigate('Scan')} />
        <SecondaryButton title="Live PIDs" onPress={() => navigation.navigate('Live')} />
        <SecondaryButton title="History" onPress={() => navigation.navigate('History')} />
      </Card>
    </Screen>
  );
}
