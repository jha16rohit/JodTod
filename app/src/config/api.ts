import { Platform } from 'react-native';

// Replace with your computer's local IP address if testing on a physical phone via Expo Go
const LOCAL_IP = '192.168.1.100'; 

const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000';
    }
    if (Platform.OS === 'ios') {
      return 'http://localhost:5000';
    }
    // Fallback for physical devices on same Wi-Fi
    return `http://${LOCAL_IP}:5000`;
  }
  return 'https://api.yourproductiondomain.com';
};

export const API_URL = getBaseUrl();