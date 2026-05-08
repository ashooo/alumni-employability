const xlsx = require('xlsx');
const fs = require('fs');
const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const {
  createPlaceholderPasswordHash,
  isPlaceholderPasswordHash
} = require('../utils/refactorAuth');
const { writeAuditLogWithReq } = require('../utils/auditLog');

const VALID_IMPORT_STATUSES = new Set(['active', 'inactive', 'graduated']);
const EMPLOYED_STATUSES = ['EMPLOYED', 'SELF_EMPLOYED', 'FREELANCER'];
const UNKNOWN_COLLEGE_CACHE_KEY = '__unknown__';
const EXCLUDED_ANALYTICS_TEMPLATE_KEYS = ['historical_import'];

const analyticsSubmissionFilter = {
  template: {
    template_key: {
      notIn: EXCLUDED_ANALYTICS_TEMPLATE_KEYS
    }
  }
};

const analyticsEmploymentOutcomeFilter = {
  submission: analyticsSubmissionFilter
};

const normalizeGenderBucket = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'female' || normalized === 'f' || normalized.includes('female')) {
    return 'female';
  }

  if (normalized === 'male' || normalized === 'm' || normalized.includes('male')) {
    return 'male';
  }

  return null;
};

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const CONTENT_SETTINGS_KEY = 'site_content_settings_v1';

const getContentSettings = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const row = await refactorPrisma.systemSetting.findUnique({
      where: { key: CONTENT_SETTINGS_KEY }
    });

    if (!row) {
      return res.json({ value: null });
    }

    return res.json({ value: row.value });
  } catch (error) {
    console.error('Get content settings error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to load content settings' });
  }
};

const saveContentSettings = async (req, res) => {
  try {
    const value = req.body?.value;
    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }

    const serializedValue = JSON.stringify(value);
    const refactorPrisma = requireRefactorPrisma();

    await refactorPrisma.systemSetting.upsert({
      where: { key: CONTENT_SETTINGS_KEY },
      update: { value: serializedValue, updated_by: req.user?.id || null },
      create: { key: CONTENT_SETTINGS_KEY, value: serializedValue, updated_by: req.user?.id || null }
    });

    await writeAuditLogWithReq(refactorPrisma, req, {
      userId: req.user?.id,
      action: 'save_content_settings',
      entityType: 'system_setting',
      entityId: null,
      metadata: { key: CONTENT_SETTINGS_KEY }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Save content settings error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to save content settings' });
  }
};

const normalizeString = (value) => String(value || '').trim();
const normalizeEmail = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
};

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapLifecycleStatusToLegacy = (lifecycleStatus) => {
  switch (String(lifecycleStatus || '').toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'ARCHIVED':
      return 'graduated';
    case 'INACTIVE':
    case 'PENDING':
    default:
      return 'inactive';
  }
};

const mapImportStatusToLifecycle = (status, hasExistingUser) => {
  const normalized = String(status || '').trim().toLowerCase();

  if (VALID_IMPORT_STATUSES.has(normalized)) {
    if (normalized === 'active') return 'ACTIVE';
    if (normalized === 'graduated') return 'ARCHIVED';
    return 'INACTIVE';
  }

  // Default unknown/blank imports to ACTIVE so newly imported alumni are usable
  // unless the file explicitly marks them inactive/graduated.
  return 'ACTIVE';
};

const mapEmploymentStatusFilter = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  switch (normalized) {
    case 'employed':
      return 'EMPLOYED';
    case 'unemployed':
      return 'UNEMPLOYED';
    case 'self-employed':
    case 'self employed':
    case 'self_employed':
      return 'SELF_EMPLOYED';
    case 'freelancer':
      return 'FREELANCER';
    case 'further studies':
    case 'further studying':
      return 'FURTHER_STUDYING';
    case 'other':
      return 'OTHER';
    default:
      return null;
  }
};

const buildEmploymentFilter = (status) => {
  const normalized = mapEmploymentStatusFilter(status);
  if (!normalized) {
    return null;
  }

  // Tracer flow stores primary employed/unemployed path on survey submissions.
  if (normalized === 'EMPLOYED') {
    return buildEmployedAlumniClause();
  }

  if (normalized === 'UNEMPLOYED') {
    return {
      OR: [
        {
          survey_submissions: {
            some: {
              status: 'COMPLETED',
              branch_path: 'UNEMPLOYED',
              ...analyticsSubmissionFilter
            }
          }
        },
        {
          employment_outcomes: {
            some: {
              ...analyticsEmploymentOutcomeFilter,
              employment_status: 'UNEMPLOYED'
            }
          }
        }
      ]
    };
  }

  return {
    employment_outcomes: {
      some: {
        ...analyticsEmploymentOutcomeFilter,
        employment_status: normalized
      }
    }
  };
};

const buildEmployedAlumniClause = () => ({
  OR: [
    {
      survey_submissions: {
        some: {
          status: 'COMPLETED',
          branch_path: 'EMPLOYED',
          ...analyticsSubmissionFilter
        }
      }
    },
    {
      survey_submissions: {
        some: {
          status: 'COMPLETED',
          ...analyticsSubmissionFilter,
          survey_answers: {
            some: {
              question: {
                question_key: 'current_employment_status'
              },
              answer_text: 'Employed'
            }
          }
        }
      }
    },
    {
      employment_outcomes: {
        some: {
          ...analyticsEmploymentOutcomeFilter,
          employment_status: {
            in: EMPLOYED_STATUSES
          }
        }
      }
    }
  ]
});

const isPredictionEmployable = (outputJson) => {
  if (!outputJson || typeof outputJson !== 'object' || Array.isArray(outputJson)) {
    return false;
  }

  const employableValue = outputJson.employable;
  if (typeof employableValue === 'boolean') {
    return employableValue;
  }

  const normalized = String(employableValue || outputJson.label || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'employable';
};

const getLatestEmployableProfileIds = async (refactorPrisma, alumniWhere) => {
  const predictionRows = await refactorPrisma.mlPrediction.findMany({
    where: combineWhere(
      { prediction_type: 'EMPLOYABILITY' },
      alumniWhere ? { alumni_profile: alumniWhere } : undefined
    ),
    orderBy: [
      { alumni_profile_id: 'asc' },
      { created_at: 'desc' }
    ],
    select: {
      alumni_profile_id: true,
      output_json: true
    }
  });

  const seenProfiles = new Set();
  const employableProfiles = new Set();

  for (const row of predictionRows) {
    if (seenProfiles.has(row.alumni_profile_id)) {
      continue;
    }

    seenProfiles.add(row.alumni_profile_id);
    if (isPredictionEmployable(row.output_json)) {
      employableProfiles.add(row.alumni_profile_id);
    }
  }

  return employableProfiles;
};

const combineWhere = (...whereParts) => {
  const clauses = [];

  for (const wherePart of whereParts) {
    if (!wherePart || typeof wherePart !== 'object') {
      continue;
    }

    if (Array.isArray(wherePart.AND) && Object.keys(wherePart).length === 1) {
      clauses.push(...wherePart.AND);
      continue;
    }

    clauses.push(wherePart);
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return { AND: clauses };
};

const cleanupUploadedFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const buildFullName = (...parts) => parts.filter(Boolean).join(' ');

const csvEscape = (value) => `"${String(value || '').replace(/"/g, '""')}"`;

const makeCodeCandidate = (rawValue, maxLength, fallback) => {
  const normalized = String(rawValue || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    return fallback.slice(0, maxLength);
  }

  return normalized.slice(0, maxLength);
};

const withCodeSuffix = (baseCode, suffix, maxLength) => {
  const suffixText = `_${suffix}`;
  const prefix = baseCode.slice(0, Math.max(1, maxLength - suffixText.length));
  return `${prefix}${suffixText}`;
};

const buildUniqueCode = async (tx, modelName, baseCode, maxLength, fallback) => {
  const normalizedBase = makeCodeCandidate(baseCode, maxLength, fallback);
  let attempt = 0;

  while (attempt < 500) {
    const candidate =
      attempt === 0
        ? normalizedBase
        : withCodeSuffix(normalizedBase, attempt, maxLength);

    const existing = await tx[modelName].findFirst({
      where: { code: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
  }

  return null;
};

const resolveCollege = async (tx, collegeName, collegeCode, cache) => {
  const normalizedCollegeName = normalizeString(collegeName);
  if (!normalizedCollegeName) {
    return null;
  }

  const cacheKey = normalizedCollegeName.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const normalizedCollegeCode = normalizeString(collegeCode).toUpperCase();
  const existing = await tx.college.findFirst({
    where: {
      OR: [
        { name: normalizedCollegeName },
        ...(normalizedCollegeCode ? [{ code: normalizedCollegeCode }] : [])
      ]
    },
    select: { id: true }
  });

  if (existing) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const uniqueCode = await buildUniqueCode(
    tx,
    'college',
    normalizedCollegeCode || normalizedCollegeName,
    20,
    'COLLEGE'
  );

  const created = await tx.college.create({
    data: {
      name: normalizedCollegeName,
      code: uniqueCode,
      description: 'Imported from Excel'
    }
  });

  cache.set(cacheKey, created.id);
  return created.id;
};

const resolveProgram = async (tx, programName, collegeId, cache) => {
  const normalizedProgramName = normalizeString(programName);
  if (!normalizedProgramName) {
    return null;
  }

  const cacheKey = normalizedProgramName.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const existing = await tx.program.findFirst({
    where: { name: normalizedProgramName },
    select: { id: true, college_id: true }
  });

  if (existing) {
    if (collegeId && existing.college_id !== collegeId) {
      await tx.program.update({
        where: { id: existing.id },
        data: { college_id: collegeId }
      });
    }

    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  const uniqueCode = await buildUniqueCode(
    tx,
    'program',
    normalizedProgramName,
    20,
    'PROGRAM'
  );

  const created = await tx.program.create({
    data: {
      name: normalizedProgramName,
      code: uniqueCode,
      college_id: collegeId,
      description: 'Imported from Excel'
    }
  });

  cache.set(cacheKey, created.id);
  return created.id;
};

const resolveUnknownCollege = async (tx, cache) => {
  if (cache.has(UNKNOWN_COLLEGE_CACHE_KEY)) {
    return cache.get(UNKNOWN_COLLEGE_CACHE_KEY);
  }

  const existing = await tx.college.findFirst({
    where: { code: 'UNKNOWN' },
    select: { id: true }
  });

  if (existing) {
    cache.set(UNKNOWN_COLLEGE_CACHE_KEY, existing.id);
    return existing.id;
  }

  const uniqueCode = await buildUniqueCode(
    tx,
    'college',
    'UNKNOWN',
    20,
    'UNKNOWN'
  );

  const created = await tx.college.create({
    data: {
      name: 'Unknown',
      code: uniqueCode,
      description: 'Auto-created'
    }
  });

  cache.set(UNKNOWN_COLLEGE_CACHE_KEY, created.id);
  return created.id;
};

const buildAlumniWhere = (query = {}) => {
  const clauses = [];
  const searchValue = normalizeString(query.search);

  if (searchValue) {
    clauses.push({
      OR: [
        { student_id: { contains: searchValue } },
        { user: { username: { contains: searchValue } } },
        { user: { first_name: { contains: searchValue } } },
        { user: { last_name: { contains: searchValue } } },
        { user: { email: { contains: searchValue } } }
      ]
    });
  }

  const collegeValue = normalizeString(query.college);
  if (collegeValue && collegeValue !== 'all') {
    const collegeId = parseOptionalInt(collegeValue);
    if (collegeId !== null) {
      clauses.push({
        current_program: {
          college_id: collegeId
        }
      });
    }
  }

  const programValue = normalizeString(query.program);
  if (programValue && programValue !== 'all') {
    if (/^\d+$/.test(programValue)) {
      clauses.push({
        current_program_id: Number.parseInt(programValue, 10)
      });
    } else {
      clauses.push({
        OR: [
          {
            current_program: {
              name: programValue
            }
          },
          {
            current_program: {
              code: programValue
            }
          }
        ]
      });
    }
  }

  const selectedBatchRaw =
    query.batch && query.batch !== 'all'
      ? query.batch
      : query.batchYear && query.batchYear !== 'all'
        ? query.batchYear
        : null;

  const selectedBatch = parseOptionalInt(selectedBatchRaw);
  if (selectedBatch !== null) {
    clauses.push({
      batch_year: selectedBatch
    });
  }

  const employmentStatus = normalizeString(query.employmentStatus);
  if (employmentStatus && employmentStatus !== 'all') {
    const employmentClause = buildEmploymentFilter(employmentStatus);
    if (employmentClause) {
      clauses.push(employmentClause);
    }
  }

  return clauses.length > 0 ? { AND: clauses } : undefined;
};

const mapAlumniRecord = (profile) => ({
  id: profile.id,
  student_id: profile.student_id,
  name: buildFullName(
    profile.user?.first_name,
    profile.user?.middle_name,
    profile.user?.last_name,
    profile.user?.suffix
  ),
  program: profile.current_program?.name || '',
  program_id: profile.current_program?.id || null,
  college: profile.current_program?.college?.name || '',
  college_id: profile.current_program?.college?.id || null,
  batch: profile.batch_year,
  status: mapLifecycleStatusToLegacy(profile.lifecycle_status),
  survey_status: (profile.survey_submissions?.length || 0) > 0 ? 'completed' : 'pending',
  email: profile.user?.email || null
});

const syncAcademicData = async (tx, profileId, programId, data) => {
  const {
    gender, age, yearGraduated, cgpa, profGrade, elecGrade, ojtGrade,
    leaderPos, actMemberPos, softSkillsAve, hardSkillsAve, isEmployable
  } = data;

  // 1. Upsert AcademicSnapshot
  const snapshot = await tx.academicSnapshot.upsert({
    where: { 
      // We assume one primary snapshot per profile for simplicity in bulk import
      // or we can find the most recent one.
      id: (await tx.academicSnapshot.findFirst({ 
        where: { alumni_profile_id: profileId },
        select: { id: true }
      }))?.id || -1
    },
    update: {
      program_id: programId || undefined,
      gender, age, year_graduated: yearGraduated || 2020,
      cgpa, prof_grade: profGrade, elec_grade: elecGrade, ojt_grade: ojtGrade,
      leader_pos: leaderPos, act_member_pos: actMemberPos,
      soft_skills_ave: softSkillsAve, hard_skills_ave: hardSkillsAve,
      is_employable: isEmployable
    },
    create: {
      alumni_profile_id: profileId,
      program_id: programId || 1, // Fallback to first program if null
      gender, age, year_graduated: yearGraduated || 2020,
      cgpa, prof_grade: profGrade, elec_grade: elecGrade, ojt_grade: ojtGrade,
      leader_pos: leaderPos, act_member_pos: actMemberPos,
      soft_skills_ave: softSkillsAve, hard_skills_ave: hardSkillsAve,
      is_employable: isEmployable
    }
  });

  // 2. If historical employability is provided, create a historical submission and outcome
  // This is crucial for training the AI (ARIMA and Employability models)
  if (isEmployable !== undefined && isEmployable !== null) {
    const historicalTemplate = await tx.surveyTemplate.findUnique({
      where: { template_key: 'historical_import' }
    });

    if (historicalTemplate) {
      // Create a completed submission for this historical data
      const submission = await tx.surveySubmission.create({
        data: {
          alumni_profile_id: profileId,
          academic_snapshot_id: snapshot.id,
          template_id: historicalTemplate.id,
          branch_path: 'FOLLOWUP',
          status: 'COMPLETED',
          submitted_at: new Date(`${yearGraduated || 2020}-01-01`)
        }
      });

      // Create employment outcome
      await tx.employmentOutcome.create({
        data: {
          alumni_profile_id: profileId,
          submission_id: submission.id,
          employment_status: isEmployable ? 'EMPLOYED' : 'UNEMPLOYED',
          outcome_date: new Date(`${yearGraduated || 2020}-01-01`)
        }
      });
    }
  }
};

const createImportHistoryRecord = async (tx, { filename, uploadedBy, totalRecords }) => {
  return tx.importHistory.create({
    data: {
      filename: filename || 'import',
      uploaded_by: uploadedBy || null,
      total_records: totalRecords,
      success_count: 0,
      failed_count: 0,
      status: 'pending'
    }
  });
};

const createImportErrorRecord = async (tx, { importId, rowNumber, errorMessage, rowData }) => {
  return tx.importError.create({
    data: {
      import_id: importId,
      row_number: rowNumber,
      error: errorMessage,
      raw_data: JSON.stringify(rowData || null)
    }
  });
};

const processImportRow = async ({
  tx,
  row,
  rowNumber,
  collegeCache,
  programCache
}) => {
  const studentId = normalizeString(row.student_id);
  const firstName = normalizeString(row.first_name);
  const lastName = normalizeString(row.last_name);
  const middleName = normalizeString(row.middle_name) || null;
  const suffix = normalizeString(row.suffix) || null;
  const email = normalizeEmail(row.email);
  const batchYear = parseOptionalInt(row.batch_year);

  // New academic fields for AI training
  const gender = normalizeString(row.gender);
  const age = parseOptionalInt(row.age);
  const yearGraduated = parseOptionalInt(row.year_graduated) || batchYear;
  const cgpa = row.cgpa ? parseFloat(row.cgpa) : null;
  const profGrade = row.prof_grade ? parseFloat(row.prof_grade) : null;
  const elecGrade = row.elec_grade ? parseFloat(row.elec_grade) : null;
  const ojtGrade = row.ojt_grade ? parseFloat(row.ojt_grade) : null;
  const leaderPos = String(row.leader_pos || '').toLowerCase() === 'yes' || row.leader_pos === true;
  const actMemberPos = String(row.act_member_pos || '').toLowerCase() === 'yes' || row.act_member_pos === true;
  const softSkillsAve = row.soft_skills_ave ? parseFloat(row.soft_skills_ave) : null;
  const hardSkillsAve = row.hard_skills_ave ? parseFloat(row.hard_skills_ave) : null;
  const isEmployable = String(row.is_employable || '').toLowerCase() === 'yes' || 
                      String(row.is_employable || '').toLowerCase() === 'employable' || 
                      row.is_employable === true;

  if (!studentId) {
    throw new Error('student_id is required');
  }

  if (!firstName || !lastName) {
    throw new Error('first_name and last_name are required');
  }

  if (!batchYear) {
    throw new Error('batch_year is required');
  }

  const existingProfile = await tx.alumniProfile.findUnique({
    where: { student_id: studentId },
    select: { id: true }
  });

  if (existingProfile) {
    return { inserted: false, skipped: true };
  }

  if (email) {
    const emailOwner = await tx.user.findFirst({
      where: { email },
      select: { username: true }
    });

    if (emailOwner && emailOwner.username !== studentId) {
      return { inserted: false, skipped: true };
    }
  }

  let currentProgramId = null;
  const programName = normalizeString(row.program);

  if (programName) {
    const programCacheKey = programName.toLowerCase();

    if (programCache.has(programCacheKey)) {
      currentProgramId = programCache.get(programCacheKey);
    } else {
      const existingProgram = await tx.program.findFirst({
        where: {
          OR: [
            { name: programName },
            { code: programName.toUpperCase() }
          ]
        },
        select: { id: true }
      });

      if (existingProgram) {
        currentProgramId = existingProgram.id;
      } else {
        let collegeId = null;
        const collegeName = normalizeString(row.college_name);
        const collegeCode = normalizeString(row.college_code);

        if (collegeName) {
          collegeId = await resolveCollege(tx, collegeName, collegeCode, collegeCache);
        } else {
          collegeId = await resolveUnknownCollege(tx, collegeCache);
        }

        currentProgramId = await resolveProgram(
          tx,
          programName,
          collegeId,
          programCache
        );
      }

      programCache.set(programCacheKey, currentProgramId);
    }
  }

  const existingUser = await tx.user.findUnique({
    where: { username: studentId },
    include: {
      alumni_profile: true
    }
  });

  if (existingUser && existingUser.role !== 'ALUMNI') {
    throw new Error(`username ${studentId} already exists with non-alumni role`);
  }

  const lifecycleStatus = mapImportStatusToLifecycle(
    row.status,
    Boolean(existingUser)
  );

  let userId = existingUser?.id;
  if (!existingUser) {
    const passwordHash = await createPlaceholderPasswordHash(studentId);

    const createdUser = await tx.user.create({
      data: {
        username: studentId,
        email,
        password_hash: passwordHash,
        role: 'ALUMNI',
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        suffix
      }
    });

    userId = createdUser.id;
  } else {
    const updateData = {};

    if (email && !existingUser.email) {
      updateData.email = email;
    }

    if (!normalizeString(existingUser.first_name) && firstName) {
      updateData.first_name = firstName;
    }

    if (!normalizeString(existingUser.last_name) && lastName) {
      updateData.last_name = lastName;
    }

    if (!normalizeString(existingUser.middle_name) && middleName) {
      updateData.middle_name = middleName;
    }

    if (!normalizeString(existingUser.suffix) && suffix) {
      updateData.suffix = suffix;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: updateData
      });
    }

    if (
      existingUser.alumni_profile &&
      existingUser.alumni_profile.student_id !== studentId
    ) {
      throw new Error(
        `username ${studentId} already linked to student ID ${existingUser.alumni_profile.student_id}`
      );
    }
  }

  if (!userId) {
    throw new Error('unable to resolve user ID for import row');
  }

  if (existingUser?.alumni_profile) {
    const profile = await tx.alumniProfile.update({
      where: { id: existingUser.alumni_profile.id },
      data: {
        student_id: studentId,
        batch_year: batchYear,
        current_program_id: currentProgramId,
        lifecycle_status: lifecycleStatus
      }
    });
    await syncAcademicData(tx, profile.id, currentProgramId, {
      gender, age, yearGraduated, cgpa, profGrade, elecGrade, ojtGrade,
      leaderPos, actMemberPos, softSkillsAve, hardSkillsAve, isEmployable
    });
  } else {
    const profile = await tx.alumniProfile.create({
      data: {
        user_id: userId,
        student_id: studentId,
        batch_year: batchYear,
        current_program_id: currentProgramId,
        lifecycle_status: lifecycleStatus
      }
    });
    await syncAcademicData(tx, profile.id, currentProgramId, {
      gender, age, yearGraduated, cgpa, profGrade, elecGrade, ojtGrade,
      leaderPos, actMemberPos, softSkillsAve, hardSkillsAve, isEmployable
    });
  }

  return {
    inserted: true,
    skipped: false,
    rowNumber
  };
};

const persistImportRows = async ({
  tx,
  records,
  filename,
  uploadedBy
}) => {
  const collegeCache = new Map();
  const programCache = new Map();
  const errors = [];
  let inserted = 0;
  let skipped = 0;

  const importHistory = await createImportHistoryRecord(tx, {
    filename,
    uploadedBy,
    totalRecords: records.length
  });

  for (let index = 0; index < records.length; index += 1) {
    const row = records[index];
    const rowNumber = row.rowIndex ?? index + 2;

    try {
      const result = await processImportRow({
        tx,
        row,
        rowNumber,
        collegeCache,
        programCache
      });

      if (result.skipped) {
        skipped += 1;
      } else if (result.inserted) {
        inserted += 1;
      }
    } catch (error) {
      const message = error.message || 'Unknown import error';

      errors.push({
        row: rowNumber,
        error: message
      });

      await createImportErrorRecord(tx, {
        importId: importHistory.id,
        rowNumber,
        errorMessage: message,
        rowData: row
      });
    }
  }

  const status =
    errors.length === 0
      ? 'completed'
      : inserted > 0
        ? 'partial'
        : 'failed';

  await tx.importHistory.update({
    where: { id: importHistory.id },
    data: {
      success_count: inserted,
      failed_count: errors.length,
      status
    }
  });

  return {
    importId: importHistory.id,
    inserted,
    skipped,
    errors
  };
};

const getProgramAggregates = async (refactorPrisma, alumniWhere) => {
  const resolveProgramLabel = (profile) => {
    const current = profile.current_program;
    if (current) {
      return {
        id: current.id,
        label: current.code || current.name || 'UNASSIGNED'
      };
    }

    const latestSnapshotProgram = profile.academic_snapshots?.[0]?.program;
    if (latestSnapshotProgram) {
      return {
        id: latestSnapshotProgram.id,
        label: latestSnapshotProgram.code || latestSnapshotProgram.name || 'UNASSIGNED'
      };
    }

    return {
      id: null,
      label: 'UNASSIGNED'
    };
  };

  const allProfiles = await refactorPrisma.alumniProfile.findMany({
    where: alumniWhere,
    select: {
      id: true,
      current_program: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      academic_snapshots: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
          program: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      }
    }
  });

  const employableProfileIds = await getLatestEmployableProfileIds(refactorPrisma, alumniWhere);
  const aggregatesMap = new Map();

  for (const profile of allProfiles) {
    const resolved = resolveProgramLabel(profile);
    const key = resolved.id === null ? 'UNASSIGNED' : String(resolved.id);
    const existing = aggregatesMap.get(key) || {
      programId: resolved.id,
      programLabel: resolved.label,
      count: 0,
      employed: 0
    };
    existing.count += 1;
    aggregatesMap.set(key, existing);
  }

  for (const profile of allProfiles) {
    if (!employableProfileIds.has(profile.id)) {
      continue;
    }
    const resolved = resolveProgramLabel(profile);
    const key = resolved.id === null ? 'UNASSIGNED' : String(resolved.id);
    const existing = aggregatesMap.get(key);
    if (!existing) {
      continue;
    }
    existing.employed += 1;
  }

  const results = Array.from(aggregatesMap.values());

  results.sort((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count;
    }

    return String(left.programLabel).localeCompare(String(right.programLabel));
  });

  return results;
};

const getBatchTrendData = async (refactorPrisma, alumniWhere) => {
  const totalRowsDesc = await refactorPrisma.alumniProfile.groupBy({
    by: ['batch_year'],
    where: alumniWhere,
    _count: {
      _all: true
    },
    orderBy: {
      batch_year: 'desc'
    },
    take: 5
  });

  const employedWhere = combineWhere(alumniWhere, buildEmployedAlumniClause());

  const employedRows = await refactorPrisma.alumniProfile.groupBy({
    by: ['batch_year'],
    where: employedWhere,
    _count: {
      _all: true
    }
  });

  const employedMap = new Map(
    employedRows.map((row) => [row.batch_year, row._count._all || 0])
  );

  const trackedYears = totalRowsDesc.map((row) => row.batch_year);

  const profilesWithGender = trackedYears.length
    ? await refactorPrisma.alumniProfile.findMany({
        where: combineWhere(alumniWhere, {
          batch_year: {
            in: trackedYears
          }
        }),
        select: {
          batch_year: true,
          employment_outcomes: {
            where: {
              ...analyticsEmploymentOutcomeFilter,
              employment_status: {
                in: EMPLOYED_STATUSES
              }
            },
            select: {
              id: true
            },
            take: 1
          },
          academic_snapshots: {
            orderBy: {
              created_at: 'desc'
            },
            select: {
              gender: true
            },
            take: 1
          }
        }
      })
    : [];

  const genderBucketsByYear = new Map();
  for (const profile of profilesWithGender) {
    const year = profile.batch_year;
    if (!genderBucketsByYear.has(year)) {
      genderBucketsByYear.set(year, {
        maleTotal: 0,
        maleEmployed: 0,
        femaleTotal: 0,
        femaleEmployed: 0
      });
    }

    const bucket = genderBucketsByYear.get(year);
    const latestGender = profile.academic_snapshots?.[0]?.gender;
    const gender = normalizeGenderBucket(latestGender);
    if (!gender) {
      continue;
    }

    const isEmployed = profile.employment_outcomes.length > 0;

    if (gender === 'male') {
      bucket.maleTotal += 1;
      if (isEmployed) {
        bucket.maleEmployed += 1;
      }
    } else if (gender === 'female') {
      bucket.femaleTotal += 1;
      if (isEmployed) {
        bucket.femaleEmployed += 1;
      }
    }
  }

  return totalRowsDesc
    .slice()
    .sort((left, right) => left.batch_year - right.batch_year)
    .map((row) => {
      const total = row._count._all || 0;
      const employed = employedMap.get(row.batch_year) || 0;
      const rate =
        total === 0 ? 0 : Number(((employed / total) * 100).toFixed(1));
      const genderBucket = genderBucketsByYear.get(row.batch_year) || {
        maleTotal: 0,
        maleEmployed: 0,
        femaleTotal: 0,
        femaleEmployed: 0
      };
      const male =
        genderBucket.maleTotal === 0
          ? 0
          : Number(((genderBucket.maleEmployed / genderBucket.maleTotal) * 100).toFixed(1));
      const female =
        genderBucket.femaleTotal === 0
          ? 0
          : Number(((genderBucket.femaleEmployed / genderBucket.femaleTotal) * 100).toFixed(1));

      return {
        year: row.batch_year,
        total,
        employed,
        rate,
        male,
        female
      };
    });
};

const checkDuplicates = async (req, res) => {
  try {
    const { studentIds = [], emails = [] } = req.body || {};

    if (!Array.isArray(studentIds) || !Array.isArray(emails)) {
      return res
        .status(400)
        .json({ error: 'studentIds and emails must be arrays' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const normalizedStudentIds = Array.from(
      new Set(
        studentIds
          .map((studentId) => normalizeString(studentId))
          .filter(Boolean)
      )
    );
    const normalizedEmails = Array.from(
      new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean))
    );

    let existingStudentIds = [];
    if (normalizedStudentIds.length > 0) {
      const existingStudents = await refactorPrisma.alumniProfile.findMany({
        where: {
          student_id: {
            in: normalizedStudentIds
          }
        },
        select: {
          student_id: true
        }
      });

      existingStudentIds = existingStudents.map((record) => record.student_id);
    }

    let existingEmails = [];
    if (normalizedEmails.length > 0) {
      const existingUsers = await refactorPrisma.user.findMany({
        where: {
          email: {
            in: normalizedEmails
          }
        },
        select: {
          email: true
        }
      });

      existingEmails = existingUsers
        .map((record) => record.email)
        .filter(Boolean);
    }

    return res.json({
      existingStudentIds,
      existingEmails
    });
  } catch (error) {
    console.error('Check duplicates error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to check duplicates' });
  }
};

const importBatch = async (req, res) => {
  try {
    const { records = [], filename = 'import' } = req.body || {};

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No records provided' });
    }

    const refactorPrisma = requireRefactorPrisma();
    let summary = null;

    await refactorPrisma.$transaction(async (tx) => {
      summary = await persistImportRows({
        tx,
        records,
        filename,
        uploadedBy: req.user?.id || null
      });
    });

    await writeAuditLogWithReq(refactorPrisma, req, {
      userId: req.user?.id,
      action: 'import_alumni_batch',
      entityType: 'import_history',
      entityId: null,
      metadata: { filename, total_records: Array.isArray(records) ? records.length : 0 }
    });

    return res.json({
      inserted: summary.inserted,
      skipped: summary.skipped,
      errors: summary.errors
    });
  } catch (error) {
    console.error('Batch import error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to process batch import' });
  }
};

const importAlumni = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const allRows = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetRows = xlsx.utils.sheet_to_json(worksheet);
      allRows.push(
        ...sheetRows.map((row) => ({
          ...row,
          _sheet: sheetName
        }))
      );
    }

    if (allRows.length === 0) {
      return res.status(400).json({ error: 'Uploaded file has no rows' });
    }

    const parsedRows = allRows.map((row, index) => ({
      rowIndex: index + 2,
      student_id: normalizeString(
        row['Student ID'] ||
          row.student_id ||
          row.ID ||
          row.id
      ),
      first_name: normalizeString(
        row['First Name'] || row.first_name || row.FirstName
      ),
      last_name: normalizeString(
        row['Last Name'] || row.last_name || row.LastName
      ),
      middle_name: normalizeString(
        row['Middle Name'] || row.middle_name
      ),
      suffix: normalizeString(row.Suffix || row.suffix),
      email: normalizeString(row.Email || row.email),
      college_name: normalizeString(row.College || row.college),
      college_code: normalizeString(row.Code || row.code),
      program: normalizeString(
        row.Program || row.program || row.Course || row.course
      ),
      batch_year:
        row['Batch Year'] ||
        row.batch_year ||
        row.Year ||
        row.year ||
        null,
      status: normalizeString(row.Status || row.status)
    }));

    const refactorPrisma = requireRefactorPrisma();
    let summary = null;

    await refactorPrisma.$transaction(async (tx) => {
      summary = await persistImportRows({
        tx,
        records: parsedRows,
        filename: req.file.originalname || 'import',
        uploadedBy: req.user?.id || null
      });
    });

    await writeAuditLogWithReq(refactorPrisma, req, {
      userId: req.user?.id,
      action: 'import_alumni_file',
      entityType: 'import_history',
      entityId: null,
      metadata: { filename: req.file.originalname || 'import', total_records: parsedRows.length }
    });

    return res.json({
      success: true,
      results: {
        total: parsedRows.length,
        success: summary.inserted,
        failed: summary.errors.length,
        duplicatesSkipped: summary.skipped,
        errors: summary.errors
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to import alumni data' });
  } finally {
    cleanupUploadedFile(req.file && req.file.path);
  }
};

const deactivateAlumni = async (req, res) => {
  try {
    const { studentId } = req.params;
    const refactorPrisma = requireRefactorPrisma();

    const result = await refactorPrisma.alumniProfile.updateMany({
      where: {
        student_id: String(studentId)
      },
      data: {
        lifecycle_status: 'INACTIVE'
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Alumni record not found' });
    }

    await writeAuditLogWithReq(refactorPrisma, req, {
      userId: req.user?.id,
      action: 'deactivate_alumni',
      entityType: 'alumni_profile',
      entityId: null,
      metadata: { student_id: String(studentId) }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Deactivate alumni error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to deactivate alumni record' });
  }
};

const getAlumniRecords = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const alumniWhere = buildAlumniWhere(req.query);

    const profiles = await refactorPrisma.alumniProfile.findMany({
      where: alumniWhere,
      include: {
        user: true,
        current_program: {
          include: {
            college: true
          }
        },
        survey_submissions: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true
          },
          take: 1
        }
      },
      orderBy: [
        { batch_year: 'desc' },
        {
          user: {
            last_name: 'asc'
          }
        }
      ]
    });

    return res.json(profiles.map(mapAlumniRecord));
  } catch (error) {
    console.error('Get alumni error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch alumni records' });
  }
};

const checkAlumniRecord = async (req, res) => {
  try {
    const { studentId } = req.params;
    const refactorPrisma = requireRefactorPrisma();

    const profile = await refactorPrisma.alumniProfile.findUnique({
      where: { student_id: String(studentId) },
      include: {
        user: true,
        current_program: true
      }
    });

    if (!profile) {
      return res.json({ exists: false });
    }

    const hasAccount = !(await isPlaceholderPasswordHash(
      profile.user.username,
      profile.user.password_hash
    ));

    return res.json({
      exists: true,
      hasAccount,
      record: {
        student_id: profile.student_id,
        first_name: profile.user.first_name,
        last_name: profile.user.last_name,
        middle_name: profile.user.middle_name,
        suffix: profile.user.suffix,
        full_name: buildFullName(
          profile.user.first_name,
          profile.user.middle_name,
          profile.user.last_name,
          profile.user.suffix
        ),
        program: profile.current_program?.name || null,
        batch_year: profile.batch_year,
        status: mapLifecycleStatusToLegacy(profile.lifecycle_status)
      }
    });
  } catch (error) {
    console.error('Check alumni error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to check alumni record' });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { collegeId } = req.query;
    const refactorPrisma = requireRefactorPrisma();
    const parsedCollegeId =
      collegeId && collegeId !== 'all' ? parseOptionalInt(collegeId) : null;

    const programs = await refactorPrisma.program.findMany({
      where:
        parsedCollegeId !== null
          ? {
              college_id: parsedCollegeId
            }
          : undefined,
      include: {
        college: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.json(
      programs.map((program) => ({
        id: program.id,
        name: program.name,
        code: program.code,
        description: program.description,
        college_id: program.college_id,
        created_at: program.created_at,
        updated_at: program.updated_at,
        college_name: program.college?.name || null,
        college_code: program.college?.code || null
      }))
    );
  } catch (error) {
    console.error('Get programs error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch programs' });
  }
};

const getColleges = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const colleges = await refactorPrisma.college.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return res.json(colleges);
  } catch (error) {
    console.error('Get colleges error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch colleges' });
  }
};

const getBatchYears = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const rows = await refactorPrisma.alumniProfile.findMany({
      distinct: ['batch_year'],
      select: {
        batch_year: true
      },
      orderBy: {
        batch_year: 'desc'
      }
    });

    return res.json(rows.map((row) => row.batch_year));
  } catch (error) {
    console.error('Get batch years error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch batch years' });
  }
};

const getImportHistory = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const history = await refactorPrisma.importHistory.findMany({
      include: {
        uploaded_by_user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        uploaded_at: 'desc'
      },
      take: 50
    });

    return res.json(
      history.map((entry) => ({
        id: entry.id,
        filename: entry.filename,
        uploaded_at: entry.uploaded_at,
        uploaded_by: entry.uploaded_by_user?.username || 'System',
        total_records: entry.total_records,
        success_count: entry.success_count,
        failed_count: entry.failed_count,
        status: entry.status
      }))
    );
  } catch (error) {
    console.error('Get import history error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch import history' });
  }
};

const downloadErrorReport = async (req, res) => {
  try {
    const importId = parseOptionalInt(req.params.importId);
    if (!importId) {
      return res.status(400).json({ error: 'Invalid import ID' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const errors = await refactorPrisma.importError.findMany({
      where: {
        import_id: importId
      },
      orderBy: {
        row_number: 'asc'
      }
    });

    if (errors.length === 0) {
      return res.status(404).json({ error: 'No errors found' });
    }

    const csvRows = [
      ['Row Number', 'Error', 'Raw Data'].map(csvEscape).join(',')
    ];

    for (const errorRow of errors) {
      csvRows.push(
        [
          csvEscape(errorRow.row_number),
          csvEscape(errorRow.error),
          csvEscape(errorRow.raw_data || '')
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=import-errors-${importId}.csv`
    );
    await writeAuditLogWithReq(refactorPrisma, req, {
      userId: req.user?.id,
      action: 'export_import_error_csv',
      entityType: 'import_history',
      entityId: importId,
      metadata: { import_id: importId }
    });
    return res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Download error report error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to download error report' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const alumniWhere = buildAlumniWhere(req.query);

    const totalAlumni = await refactorPrisma.alumniProfile.count({
      where: alumniWhere
    });

    const completedSurveys = await refactorPrisma.alumniProfile.count({
      where: combineWhere(alumniWhere, {
        survey_submissions: {
          some: {
            status: 'COMPLETED',
            ...analyticsSubmissionFilter
          }
        }
      })
    });

    const employedAlumni = (await getLatestEmployableProfileIds(refactorPrisma, alumniWhere)).size;

    const outcomeWhere = combineWhere(
      alumniWhere ? { alumni_profile: alumniWhere } : undefined,
      analyticsEmploymentOutcomeFilter
    );

    const totalOutcomes = await refactorPrisma.employmentOutcome.count({
      where: outcomeWhere
    });

    const alignedOutcomes = await refactorPrisma.employmentOutcome.count({
      where: combineWhere(outcomeWhere, { degree_relevance: true })
    });

    const participationRate =
      totalAlumni === 0
        ? 0
        : Number(((completedSurveys / totalAlumni) * 100).toFixed(1));
    const employmentRate =
      totalAlumni === 0
        ? 0
        : Number(((employedAlumni / totalAlumni) * 100).toFixed(1));
    const degreeAlignment =
      totalOutcomes === 0
        ? 0
        : Number(((alignedOutcomes / totalOutcomes) * 100).toFixed(1));

    const programAggregates = await getProgramAggregates(refactorPrisma, alumniWhere);
    const trendRows = await getBatchTrendData(refactorPrisma, alumniWhere);
    const employmentTrend =
      trendRows.length >= 2
        ? Number((trendRows[trendRows.length - 1].rate - trendRows[trendRows.length - 2].rate).toFixed(1))
        : 0;

    return res.json({
      kpis: {
        totalAlumni,
        participationRate,
        employmentRate,
        employmentTrend,
        degreeAlignment
      },
      programData: programAggregates.map((row) => ({
        program: row.programLabel,
        count: row.count,
        employed: row.employed
      })),
      trendData: trendRows.map((row) => ({
        year: row.year,
        rate: row.rate,
        male: row.male,
        female: row.female
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch analytics data'
    });
  }
};

const getReports = async (req, res) => {
  const { type } = req.query;

  try {
    const refactorPrisma = requireRefactorPrisma();
    const alumniWhere = buildAlumniWhere(req.query);
    let reportData = [];

    if (type === 'Alumni per Program') {
      const programAggregates = await getProgramAggregates(refactorPrisma, alumniWhere);
      reportData = programAggregates.map((row) => {
        const rate =
          row.count === 0
            ? 0
            : Math.round((row.employed / row.count) * 100);

        return {
          'Program Name': row.programLabel,
          'Total Alumni': row.count,
          Employed: row.employed,
          'Employment Rate (%)': rate
        };
      });
    } else if (type === 'Participation Rate') {
      const totalRecords = await refactorPrisma.alumniProfile.count({
        where: alumniWhere
      });
      const completed = await refactorPrisma.alumniProfile.count({
        where: combineWhere(alumniWhere, {
          survey_submissions: {
            some: {
              status: 'COMPLETED',
              ...analyticsSubmissionFilter
            }
          }
        })
      });
      const pending = Math.max(totalRecords - completed, 0);

      const rows = [
        { surveyStatus: 'completed', count: completed },
        { surveyStatus: 'pending', count: pending }
      ];

      reportData = rows
        .filter((row) => row.count > 0 || totalRecords === 0)
        .map((row) => ({
          'Survey Status': row.surveyStatus,
          'Total Users': row.count,
          'Percentage (%)':
            totalRecords === 0
              ? 0
              : Math.round((row.count / totalRecords) * 100)
        }));
    } else if (type === 'Employment Trends') {
      const trends = await getBatchTrendData(refactorPrisma, alumniWhere);
      reportData = trends
        .slice()
        .sort((left, right) => right.year - left.year)
        .map((row) => ({
          Year: row.year,
          'Overall Rate (%)': row.rate,
          'Male Employment (%)': row.male,
          'Female Employment (%)': row.female
        }));
    } else if (type === 'Degree Alignment') {
      reportData = [
        { 'Alignment Level': 'Highly Relevant', 'Alumni Count': 450, 'Percentage (%)': 45 },
        { 'Alignment Level': 'Moderately Relevant', 'Alumni Count': 350, 'Percentage (%)': 35 },
        { 'Alignment Level': 'Slightly Relevant', 'Alumni Count': 150, 'Percentage (%)': 15 },
        { 'Alignment Level': 'Not Relevant', 'Alumni Count': 50, 'Percentage (%)': 5 }
      ];
    } else if (type === 'Skills Assessment Summary') {
      reportData = [
        { 'Skill Category': 'Technical Skills', 'Average Score (/100)': 85 },
        { 'Skill Category': 'Communication', 'Average Score (/100)': 78 },
        { 'Skill Category': 'Problem Solving', 'Average Score (/100)': 82 }
      ];
    }

    await writeAuditLogWithReq(refactorPrisma, req, {
      userId: req.user?.id,
      action: 'generate_report',
      entityType: 'report',
      entityId: null,
      metadata: { type: type || null }
    });

    return res.json(reportData);
  } catch (error) {
    console.error('Reports error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch reports data'
    });
  }
};

module.exports = {
  importAlumni,
  importBatch,
  checkDuplicates,
  deactivateAlumni,
  getAlumniRecords,
  checkAlumniRecord,
  getPrograms,
  getColleges,
  getBatchYears,
  getImportHistory,
  downloadErrorReport,
  getAnalytics,
  getReports,
  getContentSettings,
  saveContentSettings
};
