const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTPEmail } = require('../config/email');
const dns = require('node:dns').promises;
const { lastDayOfDecade } = require('date-fns');

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();
// OTPs for password change (keyed by username)
const passwordChangeOtpStore = new Map();

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const DNS_LOOKUP_TIMEOUT_MS = Number(process.env.EMAIL_DNS_TIMEOUT_MS || 8000);
const TRUSTED_EMAIL_DOMAINS = new Set([
  'plpasig.edu.ph',
  'gmail.com'
]);
const TYPO_MAP = {
  'gmail.co': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'icloud.co': 'icloud.com'
};

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const resolveMxWithTimeout = async (domain, timeoutMs = DNS_LOOKUP_TIMEOUT_MS) => {
  return Promise.race([
    dns.resolveMx(domain),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('MX lookup timeout')), timeoutMs)
    )
  ]);
};

const resolveAWithTimeout = async (domain, timeoutMs = DNS_LOOKUP_TIMEOUT_MS) => {
  return Promise.race([
    dns.resolve4(domain),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('A lookup timeout')), timeoutMs)
    )
  ]);
};

const resolveMailDomain = async (domain) => {
  // Retry once to reduce false negatives from transient DNS delays.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const mx = await resolveMxWithTimeout(domain);
      if (mx?.length) return true;
    } catch (error) {}

    try {
      const a = await resolveAWithTimeout(domain);
      if (a?.length) return true;
    } catch (error) {}
  }

  return false;
};

const validateDeliverableEmail = async (rawEmail) => {
  const email = normalizeEmail(rawEmail);

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, email, error: 'Please enter a valid email format.' };
  }

  const [, domain = ''] = email.split('@');

  if (TYPO_MAP[domain]) {
    return {
      valid: false,
      email,
      suggestion: email.replace(domain, TYPO_MAP[domain]),
      error: `Did you mean ${TYPO_MAP[domain]}?`
    };
  }

  // Avoid false negatives from DNS issues for primary supported domains.
  if (TRUSTED_EMAIL_DOMAINS.has(domain)) {
    return { valid: true, email };
  }

  const isValidDomain = await resolveMailDomain(domain);
  if (!isValidDomain) {
    return { valid: false, email, error: 'Unable to verify email domain right now. Please try again in a few seconds.' };
  }

  return { valid: true, email };
};

// Clean up expired OTPs every hour
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
  for (const [username, data] of passwordChangeOtpStore.entries()) {
    if (now > data.expiresAt) {
      passwordChangeOtpStore.delete(username);
    }
  }
}, 60 * 60 * 1000);

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await db.query(
      'SELECT * FROM user WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await db.query(
      'UPDATE user SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        middleName: user.middle_name,
        suffix: user.suffix,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const checkStudentRecord = async (req, res) => {
  try {
    const { studentId, firstName, lastName } = req.body;

    // Validate inputs
    if (!studentId || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Student ID and First Name, and Last Name are required' 
      });
    }

    // First, check if user already has an account
    const [existingUser] = await db.query(
      'SELECT * FROM user WHERE username = ?',
      [studentId]
    );

    if (existingUser.length > 0) {
      return res.json({ 
        status: 'already',
        message: 'This student ID already has an account. Please login instead.'
      });
    }

    // Check if student exists in alumni_records
    const [records] = await db.query(
      `SELECT * FROM alumni_records
      WHERE student_id = ?
      AND LOWER(TRIM(first_name)) = LOWER(TRIM(?))
      AND LOWER(TRIM(last_name)) = LOWER(TRIM(?))`,
      [studentId, firstName.trim(), lastName.trim()]
    );

    // If student ID not found in alumni_records
    if (records.length === 0) {
      return res.json({ 
        status: 'not_found',
        message: 'No alumni record found with this Student ID.'
      });
    }

    const alumni = records[0];
    const alumniEmail = normalizeEmail(alumni.email || '');
    const hasSchoolEmail = alumniEmail.endsWith('@plpasig.edu.ph');
    const preferredEmailDomain = hasSchoolEmail ? 'plpasig.edu.ph' : 'gmail.com';

    res.json({ 
      status: 'found',
      message: 'Alumni record verified successfully.',
      record: {
        studentId: alumni.student_id,
        firstName: alumni.first_name,
        lastName: alumni.last_name,
        middleName: alumni.middle_name,
        suffix: alumni.suffix,
        fullName: `${alumni.first_name} ${alumni.last_name}`,
        hasSchoolEmail,
        preferredEmailDomain
      }
    });

  } catch (error) {
    console.error('Check student error:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again later.' 
    });
  }

};

const register = async (req, res) => {
  try {
    const { studentId, fullName, email, password } = req.body;
    const emailValidation = await validateDeliverableEmail(email);

    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error,
        suggestion: emailValidation.suggestion
      });
    }

    const normalizedEmail = emailValidation.email;

    const [existing] = await db.query(
      'SELECT * FROM user WHERE username = ? OR email = ?',
      [studentId, normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const [alumniRecords] = await db.query(
      `SELECT first_name, last_name, middle_name, suffix 
       FROM alumni_records 
       WHERE student_id = ?`,
      [studentId]
    );

    let firstName, lastName, middleName, suffix;

    if (alumniRecords.length > 0) {
      const alumni = alumniRecords[0];
      firstName = alumni.first_name;
      lastName = alumni.last_name;
      middleName = alumni.middle_name;
      suffix = alumni.suffix;
    } else {
      const nameParts = fullName.trim().split(/\s+/);
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];
      middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;
      suffix = null;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await db.query('START TRANSACTION');

    try {
      await db.query(
        `INSERT INTO user 
         (username, email, password_hash, role, first_name, last_name, middle_name, suffix) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, normalizedEmail, passwordHash, 'alumni', firstName, lastName, middleName, suffix]
      );

      await db.query(
        `UPDATE alumni_records SET status = 'active' WHERE student_id = ?`,
        [studentId]
      );

      await db.query('COMMIT');

      res.status(201).json({ 
        success: true, 
        message: 'Account created successfully' 
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailValidation = await validateDeliverableEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error,
        suggestion: emailValidation.suggestion
      });
    }

    const normalizedEmail = emailValidation.email;
    const otp = generateOTP();
    
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    await sendOTPEmail(normalizedEmail, otp);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP. Please try again.' 
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ error: 'OTP and email are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const storedData = otpStore.get(normalizedEmail);

    if (!storedData) {
      return res.status(400).json({ 
        error: 'OTP expired or not found. Please request a new one.' 
      });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ 
        error: 'OTP expired. Please request a new one.' 
      });
    }

    const enteredOtp = Array.isArray(otp) ? otp.join('') : otp;
    
    if (storedData.otp !== enteredOtp) {
      return res.status(400).json({ 
        error: 'Invalid OTP. Please try again.' 
      });
    }

    otpStore.delete(normalizedEmail);

    res.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

const requestChangePasswordOtp = async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query('SELECT email FROM user WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const email = normalizeEmail(rows[0].email || '');
    if (!email) return res.status(400).json({ error: 'No email found for this account' });

    const now = Date.now();
    const prev = passwordChangeOtpStore.get(String(username));
    // Basic resend throttling (30s)
    if (prev?.lastSentAt && now - prev.lastSentAt < 30 * 1000) {
      return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
    }

    const otp = generateOTP();
    passwordChangeOtpStore.set(String(username), {
      otp,
      expiresAt: now + 10 * 60 * 1000,
      lastSentAt: now,
      attemptsLeft: 5
    });

    await sendOTPEmail(email, otp, {
      subject: 'Password change verification (OTP)',
      title: 'Verify Password Change',
      message: 'Use this One-Time Password (OTP) to confirm changing your password:',
      expiresInMinutes: 10
    });

    return res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (error) {
    console.error('Request change password OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword, otp } = req.body || {};
    if (!currentPassword || !newPassword || !otp) {
      return res.status(400).json({ error: 'currentPassword, newPassword, and otp are required' });
    }

    if (String(newPassword).length < 4) {
      return res.status(400).json({ error: 'Password too short' });
    }

    const stored = passwordChangeOtpStore.get(String(username));
    if (!stored) {
      return res.status(400).json({ error: 'OTP expired or not found. Please request a new OTP.' });
    }
    if (Date.now() > stored.expiresAt) {
      passwordChangeOtpStore.delete(String(username));
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    if (stored.attemptsLeft <= 0) {
      passwordChangeOtpStore.delete(String(username));
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }
    const enteredOtp = Array.isArray(otp) ? otp.join('') : String(otp).trim();
    if (stored.otp !== enteredOtp) {
      stored.attemptsLeft -= 1;
      passwordChangeOtpStore.set(String(username), stored);
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    const [users] = await db.query('SELECT password_hash FROM user WHERE username = ? LIMIT 1', [username]);
    if (users.length === 0) {
      passwordChangeOtpStore.delete(String(username));
      return res.status(404).json({ error: 'User not found' });
    }

    const ok = await bcrypt.compare(String(currentPassword), users[0].password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Prevent "change" to same password (optional but helpful)
    const same = await bcrypt.compare(String(newPassword), users[0].password_hash);
    if (same) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(String(newPassword), saltRounds);
    await db.query('UPDATE user SET password_hash = ? WHERE username = ?', [passwordHash, username]);

    passwordChangeOtpStore.delete(String(username));
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = {
  login,
  checkStudentRecord,
  register,
  sendOTP,
  verifyOTP,
  requestChangePasswordOtp,
  changePassword
};