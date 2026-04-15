import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Nav } from './src/app/Nav';

export default function App() {
  return (
    <SafeAreaProvider>
      <Nav />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
