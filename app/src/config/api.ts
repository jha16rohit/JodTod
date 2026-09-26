import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const LOCAL_IP = '10.201.36.80';

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
    // Check explicitly if we are on a real physical device
    const isPhysicalDevice = Device.isDevice;

    if (Platform.OS === 'android') {
      // If it's explicitly an Android emulator, always use 10.0.2.2
      if (!isPhysicalDevice) {
        return 'http://10.0.2.2:5001';
      }
      return `http://${devServerIp() ?? LOCAL_IP}:5001`;
    }

    if (Platform.OS === 'ios') {
      if (!isPhysicalDevice) {
        return 'http://localhost:5001';
      }
      return `http://${devServerIp() ?? LOCAL_IP}:5001`;
    }

    return `http://${devServerIp() ?? LOCAL_IP}:5001`;
  }
  return 'https://api.yourproductiondomain.com';
};

export const API_URL = getBaseUrl();