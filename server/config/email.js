const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Your Gmail app password
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('Email config error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (toEmail, otp, options = {}) => {
  try {
    const {
      subject = 'Your OTP Code',
      title = 'Verification Code',
      message = 'Your One-Time Password (OTP) is:',
      expiresInMinutes = 10
    } = options;

    const mailOptions = {
      from: `"Alumni Tracer" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">${title}</h2>
          <p style="font-size: 16px; color: #555;">Hello,</p>
          <p style="font-size: 16px; color: #555;">${message}</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="font-size: 36px; letter-spacing: 5px; color: #333; margin: 0;">${otp}</h1>
          </div>
          <p style="font-size: 14px; color: #777;">This OTP is valid for ${expiresInMinutes} minutes. Do not share this code with anyone.</p>
          <p style="font-size: 14px; color: #777;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Alumni Tracer. All rights reserved.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail
};