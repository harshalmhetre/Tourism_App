import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    interests: {
      type: [String],
      default: [],
      validate: {
        validator: function (interests) {
          return interests.length <= 10;
        },
        message: 'You can select up to 10 interests',
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('No password set for this user');
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 * 1000);
  this.otpAttempts = 0;
  return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function (candidateOTP) {
  if (!this.otp || !this.otpExpiry) {
    return { valid: false, error: 'No OTP generated for this user' };
  }
  
  if (this.otpAttempts >= parseInt(process.env.OTP_MAX_ATTEMPTS)) {
    return { valid: false, error: 'Maximum OTP attempts exceeded. Please request a new OTP' };
  }
  
  if (new Date() > this.otpExpiry) {
    return { valid: false, error: 'OTP has expired. Please request a new one' };
  }
  
  if (this.otp !== candidateOTP) {
    this.otpAttempts += 1;
    return { 
      valid: false, 
      error: 'Invalid OTP', 
      attemptsLeft: parseInt(process.env.OTP_MAX_ATTEMPTS) - this.otpAttempts 
    };
  }
  
  return { valid: true };
};

// Method to clear OTP
userSchema.methods.clearOTP = function () {
  this.otp = undefined;
  this.otpExpiry = undefined;
  this.otpAttempts = 0;
};

// Hide sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.otp;
  delete user.otpExpiry;
  delete user.otpAttempts;
  delete user.__v;
  return user;
};

export default mongoose.model('User', userSchema);