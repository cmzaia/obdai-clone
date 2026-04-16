import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Request Android runtime BLE permissions before scanning.
 * - Android 12+ (API 31+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT
 * - Android 6–11:          ACCESS_FINE_LOCATION
 * On iOS this is a no-op (permissions are handled by the OS CoreBluetooth dialog).
 * Returns true if all required permissions are granted.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}
