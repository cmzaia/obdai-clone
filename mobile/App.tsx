import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView } from 'react-native';

import { Nav } from './src/app/Nav';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Nav />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
