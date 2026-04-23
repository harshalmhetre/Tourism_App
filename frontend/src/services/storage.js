/**
 * src/services/storage.js
 * Token and user persistence via AsyncStorage.
 *
 * Exports a `storage` object so AuthContext can call:
 *   storage.getToken()
 *   storage.saveToken(token)
 *   storage.getUser()
 *   storage.saveUser(user)
 *   storage.clearAll()
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const USER_KEY  = 'user';

export const storage = {
  saveToken: async (token) => {
    try { await AsyncStorage.setItem(TOKEN_KEY, token); } catch (e) { console.error('saveToken:', e); }
  },

  getToken: async () => {
    try { return await AsyncStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  },

  removeToken: async () => {
    try { await AsyncStorage.removeItem(TOKEN_KEY); } catch (e) { console.error('removeToken:', e); }
  },

  saveUser: async (user) => {
    try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { console.error('saveUser:', e); }
  },

  getUser: async () => {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  },

  removeUser: async () => {
    try { await AsyncStorage.removeItem(USER_KEY); } catch (e) { console.error('removeUser:', e); }
  },

  clearAll: async () => {
    try { await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]); } catch (e) { console.error('clearAll:', e); }
  },
};