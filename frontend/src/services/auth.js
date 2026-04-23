/**
 * src/services/auth.js
 *
 * POST /auth/login   → { username, password } JSON body
 *                    ← { access_token, token_type, user: { user_id, username, … } }
 *
 * POST /auth/register → { username, email, password, … } JSON body
 *                     ← { access_token, token_type, user: { user_id, username, … } }
 */
import api from './api';

export const authService = {
  /**
   * Login — backend expects plain JSON { username, password }
   * Returns { access_token, token_type, user }
   */
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  /**
   * Register — returns { access_token, token_type, user } directly.
   * No need to call login separately after register.
   */
  register: (payload) =>
    api.post('/auth/register', payload),
};