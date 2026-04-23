/**
 * src/services/api.js
 * Central axios instance used by all screens.
 *
 * BASE_URL rules:
 *   Android emulator  → 10.0.2.2  (maps to host machine localhost)
 *   iOS simulator     → 127.0.0.1
 *   Physical device   → your PC's LAN IP e.g. 192.168.1.11
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'   // Android emulator → host machine
  : 'http://192.168.31.8:8000'; // Real Device

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT token automatically ──────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: unwrap data, extract FastAPI error messages ─────────
api.interceptors.response.use(
  (response) => response.data,           // return data directly — no response.data.data
  (error) => {
    const detail  = error?.response?.data?.detail;
    const message = Array.isArray(detail)
      ? detail[0]?.msg || 'Validation error'
      : detail || error?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  },
);

export default api;
export { BASE_URL };