import transporter from '../config/email.js';

// Send OTP Email
export const sendOTPEmail = async (email, otp, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your OTP for Tourism App',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; margin: 20px 0; border-radius: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌍 Tourism App</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            <p>Your One-Time Password (OTP) for verification is:</p>
            <div class="otp-box">${otp}</div>
            <p><strong>This OTP is valid for ${process.env.OTP_EXPIRY_MINUTES} minutes.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <p>Happy travels! ✈️</p>
          </div>
          <div class="footer">
            <p>© 2024 Tourism App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    console.error('Email error details:', error.message);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

// Send Welcome Email
export const sendWelcomeEmail = async (email, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Tourism App! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px; }
          .welcome-icon { font-size: 60px; margin-bottom: 20px; }
          .features { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .feature-item { margin: 10px 0; padding-left: 25px; position: relative; }
          .feature-item:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="welcome-icon">🎉</div>
            <h1>Welcome to Tourism App!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            <p>We're thrilled to have you join our community of travelers and explorers!</p>
            
            <div class="features">
              <h3>What you can do with Tourism App:</h3>
              <div class="feature-item">Discover amazing destinations around the world</div>
              <div class="feature-item">Get personalized travel recommendations</div>
              <div class="feature-item">Plan your perfect trip with our smart tools</div>
              <div class="feature-item">Connect with fellow travelers</div>
              <div class="feature-item">Save and share your favorite places</div>
            </div>

            <p>Your account has been successfully created and verified. You can now start exploring!</p>
            
            <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
            
            <p><strong>Happy travels! ✈️🌍</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 Tourism App. All rights reserved.</p>
            <p>You're receiving this email because you created an account with Tourism App.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return false;
  }
};