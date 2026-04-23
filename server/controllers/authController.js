const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTPEmail } = require('../config/email');
const dns = require('node:dns').promises;
const { getRefactorPrisma, getRefactorSetupStatus } = require('../config/db');
const {
  normalizeUserRole,
  isPlaceholderPasswordHash
} = require('../utils/refactorAuth');

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();
const passwordChangeOtpStore = new Map();
const forgotPasswordOtpStore = new Map();

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
const normalizeName = (value = '') => String(value).trim().toLowerCase();
const maskEmail = (email = '') => {
  const normalizedEmail = normalizeEmail(email);
  const [localPart, domain = ''] = normalizedEmail.split('@');

  if (!localPart || !domain) {
    return normalizedEmail;
  }

  const visibleLocalPart =
    localPart.length <= 2 ? localPart.slice(0, 1) : localPart.slice(0, 2);

  return `${visibleLocalPart}***@${domain}`;
};

const requireRefactorPrisma = () => {
  const setupStatus = getRefactorSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getRefactorPrisma();
};

const isPlaceholderAccount = async (user) => {
  if (!user || normalizeUserRole(user.role) !== 'alumni') {
    return false;
  }

  return isPlaceholderPasswordHash(user.username, user.password_hash);
};

const buildUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: normalizeUserRole(user.role),
  firstName: user.first_name,
  lastName: user.last_name,
  middleName: user.middle_name,
  suffix: user.suffix,
  lastLogin: user.last_login
});

const parseRegistrationName = (body = {}) => {
  const providedFirstName = String(body.firstName || '').trim();
  const providedLastName = String(body.lastName || '').trim();
  const providedMiddleName = String(body.middleName || '').trim();
  const providedSuffix = String(body.suffix || '').trim();
  const fullName = String(body.fullName || '').trim();

  if (providedFirstName || providedLastName) {
    return {
      firstName: providedFirstName || null,
      lastName: providedLastName || null,
      middleName: providedMiddleName || null,
      suffix: providedSuffix || null
    };
  }

  if (!fullName) {
    return {
      firstName: null,
      lastName: null,
      middleName: null,
      suffix: null
    };
  }

  const nameParts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: nameParts[0] || null,
    lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
    middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null,
    suffix: null
  };
};

const joinFullName = (...parts) => parts.filter(Boolean).join(' ');

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
  for (const [username, data] of forgotPasswordOtpStore.entries()) {
    if (now > data.expiresAt) {
      forgotPasswordOtpStore.delete(username);
    }
  }
}, 60 * 60 * 1000);

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const identifier = String(username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const user = await refactorPrisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: normalizeEmail(identifier) }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (await isPlaceholderAccount(user)) {
      return res.status(403).json({
        error: 'Account not activated yet. Please complete account activation first.'
      });
    }

    const validPassword = await bcrypt.compare(String(password), user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await refactorPrisma.user.update({
      where: { id: user.id },
      data: {
        last_login: new Date()
      }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: normalizeUserRole(user.role) },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: buildUserResponse(user)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const checkStudentRecord = async (req, res) => {
  try {
    const { studentId, firstName, lastName } = req.body;
    const normalizedStudentId = String(studentId || '').trim();

    // Validate inputs
    if (!normalizedStudentId || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Student ID and First Name, and Last Name are required' 
      });
    }

    const refactorPrisma = requireRefactorPrisma();
    const user = await refactorPrisma.user.findUnique({
      where: { username: normalizedStudentId },
      include: {
        alumni_profile: true
      }
    });

    if (!user) {
      return res.json({ 
        status: 'not_found',
        message: 'No alumni record found with this Student ID.'
      });
    }

    const placeholderAccount = await isPlaceholderAccount(user);
    if (!placeholderAccount) {
      return res.json({ 
        status: 'already',
        message: 'This student ID already has an account. Please login instead.'
      });
    }

    const namesMatch =
      normalizeName(user.first_name) === normalizeName(firstName) &&
      normalizeName(user.last_name) === normalizeName(lastName);

    if (!namesMatch) {
      return res.json({ 
        status: 'not_found',
        message: 'No alumni record found with this Student ID.'
      });
    }

    const alumniEmail = normalizeEmail(user.email || '');
    const hasSchoolEmail = alumniEmail.endsWith('@plpasig.edu.ph');
    const preferredEmailDomain = hasSchoolEmail ? 'plpasig.edu.ph' : 'gmail.com';

    res.json({ 
      status: 'found',
      message: 'Alumni record verified successfully.',
      record: {
        studentId: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        middleName: user.middle_name,
        suffix: user.suffix,
        fullName: joinFullName(user.first_name, user.middle_name, user.last_name, user.suffix),
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
    const { studentId, email, password } = req.body;
    const normalizedStudentId = String(studentId || '').trim();

    if (!normalizedStudentId || !email || !password) {
      return res.status(400).json({ error: 'studentId, email, and password are required' });
    }

    const emailValidation = await validateDeliverableEmail(email);

    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error,
        suggestion: emailValidation.suggestion
      });
    }

    const normalizedEmail = emailValidation.email;
    const refactorPrisma = requireRefactorPrisma();

    const emailOwner = await refactorPrisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: {
          username: normalizedStudentId
        }
      },
      select: {
        id: true
      }
    });

    if (emailOwner) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const existingUser = await refactorPrisma.user.findUnique({
      where: { username: normalizedStudentId },
      include: {
        alumni_profile: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'No alumni record found with this Student ID.' });
    }

    if (!(await isPlaceholderAccount(existingUser))) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const parsedName = parseRegistrationName(req.body);
    const firstName = existingUser.first_name || parsedName.firstName;
    const lastName = existingUser.last_name || parsedName.lastName;
    const middleName = existingUser.middle_name || parsedName.middleName;
    const suffix = existingUser.suffix || parsedName.suffix;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Unable to resolve alumni name for this activation request' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await refactorPrisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'ALUMNI',
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName || null,
          suffix: suffix || null
        }
      });

      if (existingUser.alumni_profile) {
        await tx.alumniProfile.update({
          where: { id: existingUser.alumni_profile.id },
          data: {
            student_id: normalizedStudentId,
            lifecycle_status: 'ACTIVE'
          }
        });
      } else {
        await tx.alumniProfile.create({
          data: {
            user_id: existingUser.id,
            student_id: normalizedStudentId,
            batch_year: new Date().getFullYear(),
            lifecycle_status: 'ACTIVE'
          }
        });
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Account created successfully' 
    });

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

const requestForgotPasswordOtp = async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const user = await refactorPrisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        email: true,
        role: true,
        password_hash: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (await isPlaceholderAccount(user)) {
      return res.status(400).json({
        error: 'Account not activated yet. Please complete account activation first.'
      });
    }

    const email = normalizeEmail(user.email || '');
    if (!email) {
      return res.status(400).json({ error: 'No email found for this account' });
    }

    const now = Date.now();
    const previousOtp = forgotPasswordOtpStore.get(user.username);
    if (previousOtp?.lastSentAt && now - previousOtp.lastSentAt < 30 * 1000) {
      const retryAfterSeconds = Math.ceil(
        (30 * 1000 - (now - previousOtp.lastSentAt)) / 1000
      );
      return res.status(429).json({
        error: 'Please wait before requesting another OTP.',
        retryAfterSeconds
      });
    }

    const otp = generateOTP();
    forgotPasswordOtpStore.set(user.username, {
      otp,
      expiresAt: now + 10 * 60 * 1000,
      lastSentAt: now,
      attemptsLeft: 5
    });

    await sendOTPEmail(email, otp, {
      subject: 'Password reset verification (OTP)',
      title: 'Reset Your Password',
      message: 'Use this One-Time Password (OTP) to reset your password:',
      expiresInMinutes: 10
    });

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      email: maskEmail(email)
    });
  } catch (error) {
    console.error('Request forgot password OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const rawOtp = req.body?.otp;

    if (!username || !rawOtp) {
      return res.status(400).json({ error: 'username and otp are required' });
    }

    const storedOtp = forgotPasswordOtpStore.get(username);
    if (!storedOtp) {
      return res
        .status(400)
        .json({ error: 'OTP expired or not found. Please request a new OTP.' });
    }

    if (Date.now() > storedOtp.expiresAt) {
      forgotPasswordOtpStore.delete(username);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    if (storedOtp.attemptsLeft <= 0) {
      forgotPasswordOtpStore.delete(username);
      return res
        .status(429)
        .json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    const enteredOtp = Array.isArray(rawOtp) ? rawOtp.join('') : String(rawOtp).trim();
    if (storedOtp.otp !== enteredOtp) {
      storedOtp.attemptsLeft -= 1;
      forgotPasswordOtpStore.set(username, storedOtp);
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify forgot password OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const rawOtp = req.body?.otp;
    const newPassword = String(req.body?.newPassword || '');

    if (!username || !rawOtp || !newPassword) {
      return res.status(400).json({ error: 'username, otp, and newPassword are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password too short' });
    }

    const storedOtp = forgotPasswordOtpStore.get(username);
    if (!storedOtp) {
      return res
        .status(400)
        .json({ error: 'OTP expired or not found. Please request a new OTP.' });
    }

    if (Date.now() > storedOtp.expiresAt) {
      forgotPasswordOtpStore.delete(username);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    if (storedOtp.attemptsLeft <= 0) {
      forgotPasswordOtpStore.delete(username);
      return res
        .status(429)
        .json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    const enteredOtp = Array.isArray(rawOtp) ? rawOtp.join('') : String(rawOtp).trim();
    if (storedOtp.otp !== enteredOtp) {
      storedOtp.attemptsLeft -= 1;
      forgotPasswordOtpStore.set(username, storedOtp);
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const user = await refactorPrisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        role: true,
        password_hash: true
      }
    });

    if (!user) {
      forgotPasswordOtpStore.delete(username);
      return res.status(404).json({ error: 'User not found' });
    }

    if (await isPlaceholderAccount(user)) {
      forgotPasswordOtpStore.delete(username);
      return res.status(400).json({
        error: 'Account not activated yet. Please complete account activation first.'
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (samePassword) {
      return res
        .status(400)
        .json({ error: 'New password must be different from current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await refactorPrisma.user.update({
      where: { username },
      data: { password_hash: passwordHash }
    });

    forgotPasswordOtpStore.delete(username);
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password with OTP error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

const requestChangePasswordOtp = async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const refactorPrisma = requireRefactorPrisma();
    const user = await refactorPrisma.user.findUnique({
      where: { username: String(username) },
      select: {
        email: true,
        password_hash: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (await isPlaceholderPasswordHash(username, user.password_hash)) {
      return res.status(400).json({ error: 'Account not activated yet' });
    }

    const email = normalizeEmail(user.email || '');
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

    const refactorPrisma = requireRefactorPrisma();
    const user = await refactorPrisma.user.findUnique({
      where: { username: String(username) },
      select: {
        password_hash: true
      }
    });
    if (!user) {
      passwordChangeOtpStore.delete(String(username));
      return res.status(404).json({ error: 'User not found' });
    }
    if (await isPlaceholderPasswordHash(username, user.password_hash)) {
      passwordChangeOtpStore.delete(String(username));
      return res.status(400).json({ error: 'Account not activated yet' });
    }

    const ok = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Prevent "change" to same password (optional but helpful)
    const same = await bcrypt.compare(String(newPassword), user.password_hash);
    if (same) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(String(newPassword), saltRounds);
    await refactorPrisma.user.update({
      where: { username: String(username) },
      data: { password_hash: passwordHash }
    });

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
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  requestChangePasswordOtp,
  changePassword
};
