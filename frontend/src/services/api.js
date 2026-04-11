import api from './api';
import axios from 'axios';

const BASE_URL = 'http://192.168.31.8:8000';

export const authService = {
  // ✅ Fix: OAuth2 requires form-urlencoded, not JSON
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');

    const response = await axios.post(`${BASE_URL}/auth/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data; // { access_token, token_type }
  },

  // ✅ Fix: register returns user object directly, not { access_token, user }
  register: async (payload) => {
    const response = await api.post('/auth/register', payload);
    return response; // { user_id, username, email, ... }
  },
};