const { getRefactorPrisma, getRefactorSetupStatus } = require('../config/refactorDb');

const REFACTOR_TEMPLATE_KEYS = {
  EMPLOYABILITY_ASSESSMENT: 'legacy_employability_assessment',
  FOLLOWUP: 'legacy_employment_followup'
};

const LEGACY_STATUS_TO_LIFECYCLE = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  archived: 'ARCHIVED'
};

const LEGACY_ROLE_TO_REFACTOR_ROLE = {
  admin: 'ADMIN',
  alumni: 'ALUMNI',
  superadmin: 'SUPERADMIN'
};

const LEGACY_SKILL_TYPE_TO_KIND = {
  hard: 'HARD_SKILL',
  soft: 'SOFT_SKILL'
};

const LEGACY_QUESTION_TYPE_TO_REFACTOR = {
  text: 'TEXT',
  textarea: 'TEXTAREA',
  number: 'NUMBER',
  checkbox: 'MULTI_SELECT',
  multi_select: 'MULTI_SELECT',
  select: 'SINGLE_SELECT',
  single_select: 'SINGLE_SELECT',
  dropdown: 'SINGLE_SELECT',
  radio: 'SINGLE_SELECT',
  scale: 'SCALE',
  boolean: 'BOOLEAN',
  date: 'DATE'
};

const normalizeLegacyRole = (role) =>
  LEGACY_ROLE_TO_REFACTOR_ROLE[String(role || '').trim().toLowerCase()] || 'ALUMNI';

const normalizeLifecycleStatus = (status) =>
  LEGACY_STATUS_TO_LIFECYCLE[String(status || '').trim().toLowerCase()] || 'ACTIVE';

const normalizeCompetencyKind = (type) =>
  LEGACY_SKILL_TYPE_TO_KIND[String(type || '').trim().toLowerCase()] || 'HARD_SKILL';

const normalizeQuestionType = (type) =>
  LEGACY_QUESTION_TYPE_TO_REFACTOR[String(type || '').trim().toLowerCase()] || 'TEXT';

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseOptionalFloat = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanFlag = (value) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value || '').trim().toLowerCase() === 'yes' ||
  String(value || '').trim().toLowerCase() === 'true';

const getQuestionKey = (legacyQuestionId) => `legacy_question_${legacyQuestionId}`;

const convertLegacyAnswer = (questionType, rawAnswer) => {
  const normalizedType = normalizeQuestionType(questionType);

  if (Array.isArray(rawAnswer)) {
    return {
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: rawAnswer
    };
  }

  if (normalizedType === 'BOOLEAN') {
    return {
      answer_text: null,
      answer_number: null,
      answer_boolean: parseBooleanFlag(rawAnswer),
      answer_date: null,
      answer_json: null
    };
  }

  if (normalizedType === 'DATE') {
    const parsedDate = new Date(String(rawAnswer));
    return {
      answer_text: Number.isNaN(parsedDate.getTime()) ? String(rawAnswer) : null,
      answer_number: null,
      answer_boolean: null,
      answer_date: Number.isNaN(parsedDate.getTime()) ? null : parsedDate,
      answer_json: null
    };
  }

  if (normalizedType === 'NUMBER' || normalizedType === 'SCALE') {
    const numericValue = parseOptionalFloat(rawAnswer);
    return {
      answer_text: numericValue === null ? String(rawAnswer) : null,
      answer_number: numericValue,
      answer_boolean: null,
      answer_date: null,
      answer_json: null
    };
  }

  return {
    answer_text: rawAnswer === undefined || rawAnswer === null ? null : String(rawAnswer),
    answer_number: null,
    answer_boolean: null,
    answer_date: null,
    answer_json: null
  };
};

const ensureRefactorUser = async (refactorPrisma, user) => {
  return refactorPrisma.user.upsert({
    where: { id: user.id },
    update: {
      username: user.username,
      email: user.email || null,
      password_hash: user.password_hash,
      role: normalizeLegacyRole(user.role),
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || null,
      suffix: user.suffix || null,
      last_login: user.last_login || null
    },
    create: {
      id: user.id,
      username: user.username,
      email: user.email || null,
      password_hash: user.password_hash,
      role: normalizeLegacyRole(user.role),
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || null,
      suffix: user.suffix || null,
      last_login: user.last_login || null
    }
  });
};

const ensureRefactorProgram = async (legacyPrisma, refactorPrisma, degreeId) => {
  const legacyDegree = await legacyPrisma.degree.findUnique({
    where: { id: degreeId },
    include: { college: true }
  });

  if (!legacyDegree) {
    throw new Error(`Legacy program ${degreeId} was not found`);
  }

  await refactorPrisma.college.upsert({
    where: { id: legacyDegree.college.id },
    update: {
      name: legacyDegree.college.name,
      code: legacyDegree.college.code || null,
      description: legacyDegree.college.description || null
    },
    create: {
      id: legacyDegree.college.id,
      name: legacyDegree.college.name,
      code: legacyDegree.college.code || null,
      description: legacyDegree.college.description || null
    }
  });

  return refactorPrisma.program.upsert({
    where: { id: legacyDegree.id },
    update: {
      name: legacyDegree.name,
      code: legacyDegree.code || null,
      description: legacyDegree.description || null,
      college_id: legacyDegree.college.id
    },
    create: {
      id: legacyDegree.id,
      name: legacyDegree.name,
      code: legacyDegree.code || null,
      description: legacyDegree.description || null,
      college_id: legacyDegree.college.id
    }
  });
};

const ensureAlumniProfile = async (legacyPrisma, refactorPrisma, user, studentId, currentProgramId, fallbackBatchYear) => {
  const alumniRecord = await legacyPrisma.alumniRecord.findFirst({
    where: { student_id: studentId }
  });

  return refactorPrisma.alumniProfile.upsert({
    where: { user_id: user.id },
    update: {
      student_id: studentId,
      batch_year: alumniRecord?.batch_year || fallbackBatchYear,
      current_program_id: currentProgramId,
      lifecycle_status: normalizeLifecycleStatus(alumniRecord?.status)
    },
    create: {
      user_id: user.id,
      student_id: studentId,
      batch_year: alumniRecord?.batch_year || fallbackBatchYear,
      current_program_id: currentProgramId,
      lifecycle_status: normalizeLifecycleStatus(alumniRecord?.status)
    }
  });
};

const ensureTemplates = async (refactorPrisma) => {
  const assessmentTemplate = await refactorPrisma.surveyTemplate.upsert({
    where: { template_key: REFACTOR_TEMPLATE_KEYS.EMPLOYABILITY_ASSESSMENT },
    update: {
      name: 'Legacy Employability Assessment',
      description: 'Prisma mirror of the current employability survey flow.',
      kind: 'UNEMPLOYED',
      path_key: 'UNEMPLOYED',
      is_followup: false,
      is_active: true
    },
    create: {
      template_key: REFACTOR_TEMPLATE_KEYS.EMPLOYABILITY_ASSESSMENT,
      name: 'Legacy Employability Assessment',
      description: 'Prisma mirror of the current employability survey flow.',
      kind: 'UNEMPLOYED',
      path_key: 'UNEMPLOYED',
      is_followup: false,
      is_active: true
    }
  });

  const followupTemplate = await refactorPrisma.surveyTemplate.upsert({
    where: { template_key: REFACTOR_TEMPLATE_KEYS.FOLLOWUP },
    update: {
      name: 'Legacy Employment Follow-up',
      description: 'Prisma mirror of the legacy employment follow-up schedule.',
      kind: 'FOLLOWUP',
      path_key: 'FOLLOWUP',
      is_followup: true,
      target_months: 2,
      is_active: true
    },
    create: {
      template_key: REFACTOR_TEMPLATE_KEYS.FOLLOWUP,
      name: 'Legacy Employment Follow-up',
      description: 'Prisma mirror of the legacy employment follow-up schedule.',
      kind: 'FOLLOWUP',
      path_key: 'FOLLOWUP',
      is_followup: true,
      target_months: 2,
      is_active: true
    }
  });

  return {
    assessmentTemplate,
    followupTemplate
  };
};

const ensureCompetencies = async (legacyPrisma, refactorPrisma, skillRatings) => {
  const skillIds = skillRatings
    .map((skill) => parseOptionalInt(skill.id))
    .filter((skillId) => skillId !== null);

  if (skillIds.length === 0) {
    return new Map();
  }

  const legacySkills = await legacyPrisma.skill.findMany({
    where: {
      id: {
        in: skillIds
      }
    }
  });

  const competencyMap = new Map();

  for (const legacySkill of legacySkills) {
    const competency = await refactorPrisma.competency.upsert({
      where: { id: legacySkill.id },
      update: {
        name: legacySkill.name,
        kind: normalizeCompetencyKind(legacySkill.type),
        description: legacySkill.description || null,
        source: 'legacy.skills',
        is_active: true
      },
      create: {
        id: legacySkill.id,
        name: legacySkill.name,
        kind: normalizeCompetencyKind(legacySkill.type),
        description: legacySkill.description || null,
        source: 'legacy.skills',
        is_active: true
      }
    });

    competencyMap.set(legacySkill.id, competency);
  }

  return competencyMap;
};

const ensureSubmissionQuestions = async (legacyPrisma, refactorPrisma, templateId, additionalAnswers) => {
  const legacyQuestionIds = Object.keys(additionalAnswers || {})
    .map((questionId) => parseOptionalInt(questionId))
    .filter((questionId) => questionId !== null);

  if (legacyQuestionIds.length === 0) {
    return new Map();
  }

  const legacyQuestions = await legacyPrisma.surveyQuestion.findMany({
    where: {
      id: {
        in: legacyQuestionIds
      }
    }
  });

  const questionMap = new Map();

  for (const legacyQuestion of legacyQuestions) {
    const question = await refactorPrisma.surveyQuestion.upsert({
      where: { question_key: getQuestionKey(legacyQuestion.id) },
      update: {
        question_text: legacyQuestion.text,
        question_type: normalizeQuestionType(legacyQuestion.type),
        is_active: true
      },
      create: {
        question_key: getQuestionKey(legacyQuestion.id),
        question_text: legacyQuestion.text,
        question_type: normalizeQuestionType(legacyQuestion.type),
        is_active: true
      }
    });

    await refactorPrisma.templateQuestion.upsert({
      where: {
        template_id_question_id: {
          template_id: templateId,
          question_id: question.id
        }
      },
      update: {
        display_order: legacyQuestion.order_index || 0,
        is_required: Boolean(legacyQuestion.required),
        section_key: legacyQuestion.category_id ? `legacy_category_${legacyQuestion.category_id}` : null
      },
      create: {
        template_id: templateId,
        question_id: question.id,
        display_order: legacyQuestion.order_index || 0,
        is_required: Boolean(legacyQuestion.required),
        section_key: legacyQuestion.category_id ? `legacy_category_${legacyQuestion.category_id}` : null
      }
    });

    const normalizedOptions = Array.isArray(legacyQuestion.options)
      ? legacyQuestion.options
      : [];

    if (normalizedOptions.length > 0) {
      const existingOptions = await refactorPrisma.surveyOption.count({
        where: { question_id: question.id }
      });

      if (existingOptions === 0) {
        await refactorPrisma.surveyOption.createMany({
          data: normalizedOptions.map((optionValue, index) => ({
            question_id: question.id,
            option_value: String(optionValue),
            option_label: String(optionValue),
            display_order: index
          }))
        });
      }
    }

    questionMap.set(legacyQuestion.id, question);
  }

  return questionMap;
};

const writeRefactorSurveyMirror = async ({
  legacyPrisma,
  user,
  studentId,
  academicData,
  skillRatings,
  additionalAnswers,
  legacyAcademicSnapshotId,
  legacySurveyResponseId,
  modelInput,
  predictionResult,
  followupDueDate
}) => {
  const setupStatus = getRefactorSetupStatus();
  if (!setupStatus.ready) {
    return {
      ready: false,
      reason: setupStatus.message
    };
  }

  const refactorPrisma = getRefactorPrisma();
  const now = new Date();

  const refactorUser = await ensureRefactorUser(refactorPrisma, user);
  const refactorProgram = await ensureRefactorProgram(
    legacyPrisma,
    refactorPrisma,
    parseOptionalInt(academicData.degree_id)
  );
  const alumniProfile = await ensureAlumniProfile(
    legacyPrisma,
    refactorPrisma,
    refactorUser,
    String(studentId),
    refactorProgram.id,
    parseOptionalInt(academicData.year_graduated) || now.getFullYear()
  );
  const templates = await ensureTemplates(refactorPrisma);
  const competencies = await ensureCompetencies(legacyPrisma, refactorPrisma, skillRatings);
  const questions = await ensureSubmissionQuestions(
    legacyPrisma,
    refactorPrisma,
    templates.assessmentTemplate.id,
    additionalAnswers
  );

  const academicSnapshot = await refactorPrisma.academicSnapshot.create({
    data: {
      alumni_profile_id: alumniProfile.id,
      program_id: refactorProgram.id,
      gender: academicData.gender || null,
      age: parseOptionalInt(academicData.age),
      year_graduated: parseOptionalInt(academicData.year_graduated) || now.getFullYear(),
      cgpa: parseOptionalFloat(academicData.cgpa),
      prof_grade: parseOptionalFloat(academicData.prof_grade),
      elec_grade: parseOptionalFloat(academicData.elec_grade),
      ojt_grade: parseOptionalFloat(academicData.ojt_grade),
      leader_pos: parseBooleanFlag(academicData.leader_pos),
      act_member_pos: parseBooleanFlag(academicData.act_member_pos)
    }
  });

  const surveySubmission = await refactorPrisma.surveySubmission.create({
    data: {
      alumni_profile_id: alumniProfile.id,
      academic_snapshot_id: academicSnapshot.id,
      template_id: templates.assessmentTemplate.id,
      branch_path: 'UNEMPLOYED',
      started_at: now,
      submitted_at: now,
      status: 'COMPLETED',
      additional_data: {
        legacy_student_academic_id: legacyAcademicSnapshotId,
        legacy_survey_response_id: legacySurveyResponseId,
        source: 'legacy_employability_controller',
        legacy_answers: additionalAnswers || {}
      }
    }
  });

  for (const [legacyQuestionId, rawAnswer] of Object.entries(additionalAnswers || {})) {
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
      continue;
    }

    const question = questions.get(parseOptionalInt(legacyQuestionId));
    if (!question) {
      continue;
    }

    const answerData = convertLegacyAnswer(question.question_type, rawAnswer);

    await refactorPrisma.surveyAnswer.upsert({
      where: {
        submission_id_question_id: {
          submission_id: surveySubmission.id,
          question_id: question.id
        }
      },
      update: answerData,
      create: {
        submission_id: surveySubmission.id,
        question_id: question.id,
        ...answerData
      }
    });
  }

  for (const skill of skillRatings) {
    const competency = competencies.get(parseOptionalInt(skill.id));
    if (!competency) {
      continue;
    }

    await refactorPrisma.submissionCompetency.upsert({
      where: {
        submission_id_competency_id: {
          submission_id: surveySubmission.id,
          competency_id: competency.id
        }
      },
      update: {
        selected: true,
        score: parseOptionalInt(skill.score),
        importance: parseOptionalInt(skill.score)
      },
      create: {
        submission_id: surveySubmission.id,
        competency_id: competency.id,
        selected: true,
        score: parseOptionalInt(skill.score),
        importance: parseOptionalInt(skill.score)
      }
    });
  }

  let mlPrediction = null;
  let followupSchedule = null;

  if (predictionResult) {
    mlPrediction = await refactorPrisma.mlPrediction.create({
      data: {
        prediction_type: 'EMPLOYABILITY',
        model_name: 'legacy_employability_model',
        model_version: predictionResult.model_type || '1.0.0',
        alumni_profile_id: alumniProfile.id,
        academic_snapshot_id: academicSnapshot.id,
        submission_id: surveySubmission.id,
        input_snapshot: modelInput || null,
        output_json: predictionResult,
        confidence: parseOptionalFloat(predictionResult.confidence)
      }
    });
  }

  if (followupDueDate) {
    followupSchedule = await refactorPrisma.followupSchedule.create({
      data: {
        alumni_profile_id: alumniProfile.id,
        trigger_submission_id: surveySubmission.id,
        target_template_id: templates.followupTemplate.id,
        due_at: followupDueDate,
        status: 'PENDING'
      }
    });
  }

  return {
    ready: true,
    academicSnapshotId: academicSnapshot.id,
    surveySubmissionId: surveySubmission.id,
    mlPredictionId: mlPrediction?.id || null,
    followupScheduleId: followupSchedule?.id || null
  };
};

const getLatestRefactorPrediction = async (studentId) => {
  const setupStatus = getRefactorSetupStatus();
  if (!setupStatus.ready) {
    return null;
  }

  const refactorPrisma = getRefactorPrisma();
  const prediction = await refactorPrisma.mlPrediction.findFirst({
    where: {
      prediction_type: 'EMPLOYABILITY',
      alumni_profile: {
        student_id: String(studentId)
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    include: {
      alumni_profile: true,
      academic_snapshot: true
    }
  });

  if (!prediction) {
    return null;
  }

  const output = prediction.output_json || {};

  return {
    id: prediction.id,
    student_academic_id: prediction.academic_snapshot_id,
    survey_response_id: prediction.submission_id,
    model_version: prediction.model_version || null,
    employable: output.employable ? 1 : 0,
    probability: output.probability ?? null,
    input_snapshot: prediction.input_snapshot,
    prediction_date: prediction.created_at,
    created_at: prediction.created_at,
    updated_at: prediction.updated_at,
    student_academic: prediction.academic_snapshot
      ? {
          id: prediction.academic_snapshot.id,
          student_id: prediction.alumni_profile.student_id,
          degree_id: prediction.academic_snapshot.program_id,
          gender: prediction.academic_snapshot.gender,
          age: prediction.academic_snapshot.age,
          year_graduated: prediction.academic_snapshot.year_graduated,
          cgpa: prediction.academic_snapshot.cgpa,
          prof_grade: prediction.academic_snapshot.prof_grade,
          elec_grade: prediction.academic_snapshot.elec_grade,
          ojt_grade: prediction.academic_snapshot.ojt_grade,
          leader_pos: prediction.academic_snapshot.leader_pos,
          act_member_pos: prediction.academic_snapshot.act_member_pos
        }
      : null
  };
};

module.exports = {
  getLatestRefactorPrediction,
  writeRefactorSurveyMirror
};
