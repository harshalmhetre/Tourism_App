import User from '../models/User.js';
import { sendOTPEmail } from './emailService.js';

// Generate and send OTP
export const generateAndSendOTP = async (user) => {
  try {
    console.log('🔢 Generating OTP for user:', user.email);
    
    // Generate OTP
    const otp = user.generateOTP();
    
    console.log('💾 Saving user with OTP...');
    
    // Save user with OTP
    await user.save();
    
    console.log('📧 Sending OTP email...');
    
    // Send OTP via email
    await sendOTPEmail(user.email, otp, user.name);
    
    console.log('✅ OTP process completed');
    
    return otp;
  } catch (error) {
    console.error('❌ OTP Service Error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to generate and send OTP: ${error.message}`);
  }
};

// Verify OTP and return result
export const verifyUserOTP = async (email, otp) => {
  try {
    // Find user with OTP fields
    const user = await User.findOne({ email }).select('+otp +otpExpiry +otpAttempts');
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Verify OTP
    const verificationResult = user.verifyOTP(otp);
    
    if (!verificationResult.valid) {
      // Save updated attempts
      await user.save();
      return { 
        success: false, 
        message: verificationResult.error,
        attemptsLeft: verificationResult.attemptsLeft 
      };
    }
    
    return { success: true, user };
  } catch (error) {
    throw new Error('Failed to verify OTP');
  }
};