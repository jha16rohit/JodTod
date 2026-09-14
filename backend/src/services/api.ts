// app/src/services/api.ts
import { API_URL } from '../config/api';

export const fetchHealthCheck = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Connection Error:', error);
    throw error;
  }
};