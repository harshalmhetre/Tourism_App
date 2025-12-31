import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { verifyGoogleToken } from '../config/oauth.js';
import { generateAndSendOTP, verifyUserOTP } from '../services/otpService.js';
import { sendWelcomeEmail } from '../services/emailService.js';

// @desc    Register user with email/password (Step 1: Send OTP)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, interests } = req.body;

    console.log('📝 Register request received:', { name, email, interests });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    console.log('✅ Creating user...');

    // Create user (not verified yet)
    const user = await User.create({
      name,
      email,
      password,
      interests: interests || [],
      isVerified: false,
    });

    console.log('✅ User created, generating OTP...');

    // Generate and send OTP
    await generateAndSendOTP(user);

    console.log('✅ OTP sent successfully');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      data: {
        email: user.email,
        otpExpiryMinutes: process.env.OTP_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Verify OTP after registration (Step 2: Complete Registration)
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Verify OTP
    const result = await verifyUserOTP(email, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        attemptsLeft: result.attemptsLeft,
      });
    }

    const user = result.user;

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.clearOTP();
    user.lastLogin = new Date();
    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Registration completed successfully! Welcome to Tourism App!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          interests: user.interests,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Register with Google OAuth
// @route   POST /api/auth/register/google
// @access  Public
export const registerWithGoogle = async (req, res) => {
  try {
    const { idToken, interests } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Google ID token',
      });
    }

    // Verify Google token
    const googleData = await verifyGoogleToken(idToken);

    // Check if user already exists
    let user = await User.findOne({ email: googleData.email });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists. Please login instead.',
      });
    }

    // Create new user with Google data
    user = await User.create({
      name: googleData.name,
      email: googleData.email,
      googleId: googleData.googleId,
      profilePicture: googleData.picture,
      interests: interests || [],
      isVerified: true, // Auto-verify Google users
      lastLogin: new Date(),
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration with Google completed successfully!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          interests: user.interests,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login with email/password (Step 1: Send OTP)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user has password (not Google OAuth user)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account was created with Google. Please login with Google.',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate and send OTP
    await generateAndSendOTP(user);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      data: {
        email: user.email,
        otpExpiryMinutes: process.env.OTP_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify OTP for login (Step 2: Complete Login)
// @route   POST /api/auth/login/verify-otp
// @access  Public
export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Verify OTP
    const result = await verifyUserOTP(email, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        attemptsLeft: result.attemptsLeft,
      });
    }

    const user = result.user;

    // Clear OTP and update last login
    user.clearOTP();
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          interests: user.interests,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login with Google OAuth
// @route   POST /api/auth/login/google
// @access  Public
export const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Google ID token',
      });
    }

    // Verify Google token
    const googleData = await verifyGoogleToken(idToken);

    // Find user by email or Google ID
    let user = await User.findOne({
      $or: [{ email: googleData.email }, { googleId: googleData.googleId }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this Google account. Please register first.',
      });
    }

    // Update Google ID if not set
    if (!user.googleId) {
      user.googleId = googleData.googleId;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login with Google successful!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          interests: user.interests,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate and send new OTP
    await generateAndSendOTP(user);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
      data: {
        email: user.email,
        otpExpiryMinutes: process.env.OTP_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};