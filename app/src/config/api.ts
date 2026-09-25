import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Fallback PC LAN IP for Expo Go on a physical phone (used only when the
// Metro host cannot be determined automatically). Current Metro is
// exp://10.201.36.80:8081, so this must be the PC's LAN IP.
const LOCAL_IP = '10.201.36.80';

/**
 * Derive the PC's LAN IP from the Metro host this app was served from
 * (e.g. "10.201.36.80:8081" -> "10.201.36.80"), so a DHCP IP change
 * does not require editing this file again.
 */
function devServerIp(): string | null {
  try {
    const hostUri: unknown =
      Constants.expoConfig?.hostUri ??
      (
        Constants as unknown as {
          manifest2?: { extra?: { expoClient?: { hostUri?: unknown } } };
        }
      ).manifest2?.extra?.expoClient?.hostUri;
    if (typeof hostUri !== 'string' || !hostUri) return null;
    const host = hostUri.split(':')[0]?.trim();
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
}

const getBaseUrl = () => {
  if (__DEV__) {
    // Physical phones cannot reach emulator/simulator loopbacks
    // (10.0.2.2 / localhost) — they must use the PC's LAN IP.
    // Emulators/simulators keep their loopback addresses.
    const lanIp = devServerIp() ?? LOCAL_IP;
    const isPhysicalDevice = Device.isDevice === true;
    if (Platform.OS === 'android') {
      if (isPhysicalDevice) {
        return `http://${lanIp}:5000`;
      }
      return 'http://10.0.2.2:5000';
    }
    if (Platform.OS === 'ios') {
      if (isPhysicalDevice) {
        return `http://${lanIp}:5000`;
      }
      return 'http://localhost:5000';
    }
    // Fallback for physical devices on same Wi-Fi
    return `http://${lanIp}:5000`;
  }
  return 'https://api.yourproductiondomain.com';
};

export const API_URL = getBaseUrl();