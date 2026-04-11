import api from './api';

export const authService = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  register: (payload) =>
    api.post('/auth/register', payload),
};