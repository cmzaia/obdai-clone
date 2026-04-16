import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { ConnectScreen } from '../screens/ConnectScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ScanDetailScreen } from '../screens/ScanDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { LiveScreen } from '../screens/LiveScreen';

import { loadScans } from './storage';
import { useAppStore } from './store';

export type RootStackParamList = {
  Home: undefined;
  Connect: undefined;
  Scan: undefined;
  ScanDetail: { id: string };
  History: undefined;
  Live: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Nav() {
  const setScans = useAppStore((s) => s.setScans);

  useEffect(() => {
    void (async () => {
      setScans(await loadScans());
    })();
  }, [setScans]);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PitlaneHub' }} />
        <Stack.Screen name="Connect" component={ConnectScreen} options={{ title: 'Connect' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
        <Stack.Screen name="ScanDetail" component={ScanDetailScreen} options={{ title: 'Scan Detail' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="Live" component={LiveScreen} options={{ title: 'Live PIDs' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

