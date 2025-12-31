import express from 'express';
import {
  register,
  verifyOTP,
  registerWithGoogle,
  login,
  verifyLoginOTP,
  loginWithGoogle,
  resendOTP,
} from '../controllers/authController.js';

const router = express.Router();

// Registration routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/register/google', registerWithGoogle);

// Login routes
router.post('/login', login);
router.post('/login/verify-otp', verifyLoginOTP);
router.post('/login/google', loginWithGoogle);

// Utility routes
router.post('/resend-otp', resendOTP);

export default router;