const { generateOTP, sendOTPEmail } = require('../config/email');
const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const {
  getSurveyDefinition,
  getSurveyResponses,
  getSurveyStatus,
  submitSurveyResponse: persistSurveyResponse
} = require('../services/surveyDataService');

const emailChangeOtpStore = new Map();
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const assertSelf = (req, res, studentId) => {
  const tokenUsername = req.user?.username;
  const role = String(req.user?.role || '').toLowerCase();

  if (!tokenUsername) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (role === 'admin' || role === 'superadmin') {
    return true;
  }

  if (String(tokenUsername) !== String(studentId)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
};

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of emailChangeOtpStore.entries()) {
    if (now > data.expiresAt) {
      emailChangeOtpStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const normalizeEmploymentStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  switch (normalized) {
    case 'employed':
      return 'EMPLOYED';
    case 'unemployed':
      return 'UNEMPLOYED';
    case 'self-employed':
    case 'self employed':
      return 'SELF_EMPLOYED';
    case 'freelancer':
      return 'FREELANCER';
    case 'further studies':
    case 'further studying':
      return 'FURTHER_STUDYING';
    default:
      return 'OTHER';
  }
};

const mapEmploymentStatusToLegacy = (status) => {
  switch (status) {
    case 'EMPLOYED':
      return 'Employed';
    case 'UNEMPLOYED':
      return 'Unemployed';
    case 'SELF_EMPLOYED':
      return 'Self-Employed';
    case 'FREELANCER':
      return 'Freelancer';
    case 'FURTHER_STUDYING':
      return 'Further Studies';
    default:
      return 'Other';
  }
};

const ensureProfile = async (refactorPrisma, studentId) => {
  const profile = await refactorPrisma.alumniProfile.findUnique({
    where: { student_id: String(studentId) },
    include: {
      user: true,
      current_program: {
        include: {
          college: true
        }
      }
    }
  });

  if (!profile) {
    const user = await refactorPrisma.user.findUnique({
      where: { username: String(studentId) }
    });

    if (!user) {
      const error = new Error('Profile not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      user,
      student_id: String(studentId),
      batch_year: new Date().getFullYear(),
      current_program: null
    };
  }

  return profile;
};

const ensureEmploymentTemplate = async (refactorPrisma) => {
  return refactorPrisma.surveyTemplate.upsert({
    where: { template_key: 'profile_employment_update' },
    update: {
      name: 'Profile Employment Update',
      description: 'Employment updates submitted from the alumni profile screen.',
      kind: 'FOLLOWUP',
      path_key: 'FOLLOWUP',
      is_followup: false,
      is_active: true
    },
    create: {
      template_key: 'profile_employment_update',
      name: 'Profile Employment Update',
      description: 'Employment updates submitted from the alumni profile screen.',
      kind: 'FOLLOWUP',
      path_key: 'FOLLOWUP',
      is_followup: false,
      is_active: true
    }
  });
};

const mapEmploymentOutcomeRecord = (record) => {
  const monthlyIncome = record.additional_data?.monthly_income || record.salary_range || '';

  return {
    id: record.id,
    status: mapEmploymentStatusToLegacy(record.employment_status),
    company: record.company || '',
    position: record.job_title || '',
    industry: record.industry || '',
    start_date: record.outcome_date ? record.outcome_date.toISOString().slice(0, 10) : '',
    monthly_income: monthlyIncome
  };
};

const getProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!assertSelf(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();
    const profile = await ensureProfile(refactorPrisma, studentId);
    const surveyStatus = await getSurveyStatus(studentId);

    return res.json({
      student_id: profile.student_id,
      first_name: profile.user.first_name,
      last_name: profile.user.last_name,
      middle_name: profile.user.middle_name,
      suffix: profile.user.suffix,
      batch_year: profile.batch_year,
      status: profile.lifecycle_status || 'ACTIVE',
      survey_status: surveyStatus.completed ? 'completed' : 'pending',
      email: profile.user.email || '',
      phone: profile.user.phone || '',
      address: profile.user.address || '',
      program_id: profile.current_program?.id || 0,
      program_name: profile.current_program?.name || '',
      program_code: profile.current_program?.code || '',
      college_id: profile.current_program?.college?.id || 0,
      college_name: profile.current_program?.college?.name || '',
      college_code: profile.current_program?.college?.code || ''
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { email, phone, address } = req.body;

    if (!assertSelf(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();
    const profile = await ensureProfile(refactorPrisma, studentId);

    await refactorPrisma.user.update({
      where: { id: profile.user.id },
      data: {
        email: email || null,
        phone: phone || null,
        address: address || null
      }
    });

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update profile' });
  }
};

const requestEmailChangeOtp = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { newEmail } = req.body;

    if (!assertSelf(req, res, studentId)) {
      return;
    }

    if (!newEmail) {
      return res.status(400).json({ error: 'newEmail is required' });
    }

    const normalizedNewEmail = normalizeEmail(newEmail);
    if (!EMAIL_REGEX.test(normalizedNewEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email.' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const existingEmail = await refactorPrisma.user.findFirst({
      where: { email: normalizedNewEmail },
      select: { username: true }
    });

    if (existingEmail && String(existingEmail.username) !== String(studentId)) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    const key = `${studentId}:${normalizedNewEmail}`;
    const now = Date.now();
    const prev = emailChangeOtpStore.get(key);
    if (prev?.lastSentAt && now - prev.lastSentAt < 30 * 1000) {
      return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
    }

    const otp = generateOTP();
    emailChangeOtpStore.set(key, {
      otp,
      expiresAt: now + 10 * 60 * 1000,
      lastSentAt: now,
      attemptsLeft: 5
    });

    await sendOTPEmail(normalizedNewEmail, otp, {
      subject: 'Confirm your email change (OTP)',
      title: 'Confirm Email Change',
      message: 'Use this One-Time Password (OTP) to confirm your new email address:',
      expiresInMinutes: 10
    });

    return res.json({ success: true, message: 'OTP sent to new email.' });
  } catch (error) {
    console.error('Request email change OTP error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to send OTP. Please try again.'
    });
  }
};

const verifyEmailChangeOtp = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { newEmail, otp } = req.body;

    if (!assertSelf(req, res, studentId)) {
      return;
    }

    if (!newEmail || !otp) {
      return res.status(400).json({ error: 'newEmail and otp are required' });
    }

    const normalizedNewEmail = normalizeEmail(newEmail);
    if (!EMAIL_REGEX.test(normalizedNewEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email.' });
    }

    const key = `${studentId}:${normalizedNewEmail}`;
    const stored = emailChangeOtpStore.get(key);
    if (!stored) {
      return res.status(400).json({ error: 'OTP expired or not found. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      emailChangeOtpStore.delete(key);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    if (stored.attemptsLeft <= 0) {
      emailChangeOtpStore.delete(key);
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    const enteredOtp = Array.isArray(otp) ? otp.join('') : String(otp).trim();
    if (stored.otp !== enteredOtp) {
      stored.attemptsLeft -= 1;
      emailChangeOtpStore.set(key, stored);
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const existingEmail = await refactorPrisma.user.findFirst({
      where: { email: normalizedNewEmail },
      select: { username: true }
    });

    if (existingEmail && String(existingEmail.username) !== String(studentId)) {
      emailChangeOtpStore.delete(key);
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    const profile = await ensureProfile(refactorPrisma, studentId);
    await refactorPrisma.user.update({
      where: { id: profile.user.id },
      data: { email: normalizedNewEmail }
    });

    emailChangeOtpStore.delete(key);

    return res.json({
      success: true,
      message: 'Email updated successfully.',
      email: normalizedNewEmail
    });
  } catch (error) {
    console.error('Verify email change OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to verify OTP' });
  }
};

const getEmploymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!assertSelf(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();
    const profile = await refactorPrisma.alumniProfile.findUnique({
      where: { student_id: String(studentId) },
      include: {
        employment_outcomes: {
          orderBy: { outcome_date: 'desc' }
        }
      }
    });

    if (!profile) {
      return res.json([]);
    }

    return res.json(profile.employment_outcomes.map(mapEmploymentOutcomeRecord));
  } catch (error) {
    console.error('Get employment error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch employment history'
    });
  }
};

const addEmploymentRecord = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, company, position, industry, start_date, monthly_income } = req.body;

    if (!assertSelf(req, res, studentId)) {
      return;
    }

    const refactorPrisma = requireRefactorPrisma();
    const template = await ensureEmploymentTemplate(refactorPrisma);
    const profile = await refactorPrisma.alumniProfile.findUnique({
      where: { student_id: String(studentId) },
      include: { user: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const submission = await refactorPrisma.surveySubmission.create({
      data: {
        alumni_profile_id: profile.id,
        template_id: template.id,
        branch_path: 'FOLLOWUP',
        started_at: new Date(),
        submitted_at: new Date(),
        status: 'COMPLETED',
        additional_data: {
          source: 'profile_employment_update'
        }
      }
    });

    const outcome = await refactorPrisma.employmentOutcome.create({
      data: {
        alumni_profile_id: profile.id,
        submission_id: submission.id,
        employment_status: normalizeEmploymentStatus(status),
        outcome_date: start_date ? new Date(start_date) : new Date(),
        company: company || null,
        job_title: position || null,
        industry: industry || null,
        salary_range: monthly_income ? String(monthly_income) : null,
        additional_data: {
          monthly_income: monthly_income || null
        }
      }
    });

    res.status(201).json({
      success: true,
      id: outcome.id,
      message: 'Employment record added successfully'
    });
  } catch (error) {
    console.error('Add employment error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to add employment record' });
  }
};

const updateEmploymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, company, position, industry, start_date, monthly_income } = req.body;

    const refactorPrisma = requireRefactorPrisma();
    const existing = await refactorPrisma.employmentOutcome.findUnique({
      where: { id: Number(id) },
      include: {
        alumni_profile: true
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Employment record not found' });
    }

    if (!assertSelf(req, res, existing.alumni_profile.student_id)) {
      return;
    }

    await refactorPrisma.employmentOutcome.update({
      where: { id: Number(id) },
      data: {
        employment_status: normalizeEmploymentStatus(status),
        outcome_date: start_date ? new Date(start_date) : new Date(),
        company: company || null,
        job_title: position || null,
        industry: industry || null,
        salary_range: monthly_income ? String(monthly_income) : null,
        additional_data: {
          monthly_income: monthly_income || null
        }
      }
    });

    res.json({ success: true, message: 'Employment record updated successfully' });
  } catch (error) {
    console.error('Update employment error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update employment record' });
  }
};

const getCollegeSurvey = async (req, res) => {
  try {
    const { path } = req.query;
    const survey = await getSurveyDefinition(path);
    res.json({
      survey: survey.categories,
      version: survey.version,
      published_at: survey.published_at,
      template_key: survey.template_key,
      kind: survey.kind,
      path_key: survey.path_key,
      branching: survey.branching
    });
  } catch (error) {
    console.error('Get college survey error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch college survey' });
  }
};

const submitSurveyResponse = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { version, answers, pathKey } = req.body;

    if (!studentId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!assertSelf(req, res, studentId)) {
      return;
    }

    await persistSurveyResponse({
      studentId,
      version,
      answers,
      pathKey
    });

    res.json({
      success: true,
      message: 'Survey submitted successfully'
    });
  } catch (error) {
    console.error('Submit survey error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to submit survey' });
  }
};

const getSurveyResponsesHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!assertSelf(req, res, studentId)) {
      return;
    }

    const responses = await getSurveyResponses(studentId);
    res.json(responses);
  } catch (error) {
    console.error('Get survey responses error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch survey responses' });
  }
};

const checkSurveyStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!assertSelf(req, res, studentId)) {
      return;
    }

    const status = await getSurveyStatus(studentId);
    res.json(status);
  } catch (error) {
    console.error('Check survey status error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to check survey status' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getEmploymentHistory,
  addEmploymentRecord,
  updateEmploymentRecord,
  getCollegeSurvey,
  submitSurveyResponse,
  getSurveyResponses: getSurveyResponsesHandler,
  checkSurveyStatus,
  requestEmailChangeOtp,
  verifyEmailChangeOtp
};
