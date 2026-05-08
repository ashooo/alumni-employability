const { getPrisma, getDatabaseSetupStatus } = require('../config/db');

const REFACTOR_TEMPLATE_KEYS = {
  EMPLOYABILITY_ASSESSMENT: 'employability_assessment',
  EMPLOYED_ASSESSMENT: 'employed_assessment',
  FOLLOWUP: 'employment_followup'
};

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

const mapSubmissionAnswerValue = (answer) => {
  if (!answer) {
    return null;
  }

  if (Array.isArray(answer.answer_json)) {
    return answer.answer_json.join(', ');
  }

  if (answer.answer_json !== null && answer.answer_json !== undefined) {
    return answer.answer_json;
  }

  if (answer.answer_boolean !== null && answer.answer_boolean !== undefined) {
    return answer.answer_boolean ? 'Yes' : 'No';
  }

  if (answer.answer_number !== null && answer.answer_number !== undefined) {
    return Number(answer.answer_number);
  }

  if (answer.answer_date) {
    return answer.answer_date.toISOString().slice(0, 10);
  }

  return answer.answer_text ?? null;
};

const normalizeQuestionType = (rawAnswer) => {
  if (Array.isArray(rawAnswer)) {
    return 'MULTI_SELECT';
  }

  if (typeof rawAnswer === 'boolean') {
    return 'BOOLEAN';
  }

  if (typeof rawAnswer === 'number') {
    return 'NUMBER';
  }

  const normalized = String(rawAnswer || '').trim();
  if (normalized === '') {
    return 'TEXT';
  }

  if (['true', 'false', 'yes', 'no', '1', '0'].includes(normalized.toLowerCase())) {
    return 'BOOLEAN';
  }

  if (!Number.isNaN(Number(normalized))) {
    return 'NUMBER';
  }

  const parsedDate = new Date(normalized);
  if (!Number.isNaN(parsedDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return 'DATE';
  }

  return normalized.length > 120 ? 'TEXTAREA' : 'TEXT';
};

const convertAnswer = (questionType, rawAnswer) => {
  if (Array.isArray(rawAnswer)) {
    return {
      answer_text: null,
      answer_number: null,
      answer_boolean: null,
      answer_date: null,
      answer_json: rawAnswer
    };
  }

  if (questionType === 'BOOLEAN') {
    return {
      answer_text: null,
      answer_number: null,
      answer_boolean: parseBooleanFlag(rawAnswer),
      answer_date: null,
      answer_json: null
    };
  }

  if (questionType === 'DATE') {
    const parsedDate = new Date(String(rawAnswer));
    return {
      answer_text: Number.isNaN(parsedDate.getTime()) ? String(rawAnswer) : null,
      answer_number: null,
      answer_boolean: null,
      answer_date: Number.isNaN(parsedDate.getTime()) ? null : parsedDate,
      answer_json: null
    };
  }

  if (questionType === 'NUMBER' || questionType === 'SCALE') {
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

const getQuestionKey = (questionId) => `question_${questionId}`;

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const ensureTemplates = async (refactorPrisma) => {
  const assessmentTemplate = await refactorPrisma.surveyTemplate.upsert({
    where: { template_key: REFACTOR_TEMPLATE_KEYS.EMPLOYABILITY_ASSESSMENT },
    update: {
      name: 'Employability Assessment',
      description: 'Employability survey and prediction intake.',
      kind: 'UNEMPLOYED',
      path_key: 'UNEMPLOYED',
      is_followup: false,
      is_active: true
    },
    create: {
      template_key: REFACTOR_TEMPLATE_KEYS.EMPLOYABILITY_ASSESSMENT,
      name: 'Employability Assessment',
      description: 'Employability survey and prediction intake.',
      kind: 'UNEMPLOYED',
      path_key: 'UNEMPLOYED',
      is_followup: false,
      is_active: true
    }
  });

  const employedTemplate = await refactorPrisma.surveyTemplate.upsert({
    where: { template_key: REFACTOR_TEMPLATE_KEYS.EMPLOYED_ASSESSMENT },
    update: {
      name: 'Employed Assessment',
      description: 'Save-only employed path intake.',
      kind: 'EMPLOYED',
      path_key: 'EMPLOYED',
      is_followup: false,
      is_active: true
    },
    create: {
      template_key: REFACTOR_TEMPLATE_KEYS.EMPLOYED_ASSESSMENT,
      name: 'Employed Assessment',
      description: 'Save-only employed path intake.',
      kind: 'EMPLOYED',
      path_key: 'EMPLOYED',
      is_followup: false,
      is_active: true
    }
  });

  const followupTemplate = await refactorPrisma.surveyTemplate.upsert({
    where: { template_key: REFACTOR_TEMPLATE_KEYS.FOLLOWUP },
    update: {
      name: 'Employment Follow-up',
      description: 'Follow-up survey for later employment status verification.',
      kind: 'FOLLOWUP',
      path_key: 'FOLLOWUP',
      is_followup: true,
      target_months: 2,
      is_active: true
    },
    create: {
      template_key: REFACTOR_TEMPLATE_KEYS.FOLLOWUP,
      name: 'Employment Follow-up',
      description: 'Follow-up survey for later employment status verification.',
      kind: 'FOLLOWUP',
      path_key: 'FOLLOWUP',
      is_followup: true,
      target_months: 2,
      is_active: true
    }
  });

  return {
    assessmentTemplate,
    employedTemplate,
    followupTemplate
  };
};

const ensureAlumniProfile = async (refactorPrisma, user, studentId, currentProgramId, batchYear) => {
  return refactorPrisma.alumniProfile.upsert({
    where: { user_id: user.id },
    update: {
      student_id: studentId,
      batch_year: batchYear,
      current_program_id: currentProgramId,
      lifecycle_status: 'ACTIVE'
    },
    create: {
      user_id: user.id,
      student_id: studentId,
      batch_year: batchYear,
      current_program_id: currentProgramId,
      lifecycle_status: 'ACTIVE'
    }
  });
};

const ensureSubmissionQuestions = async (refactorPrisma, templateId, additionalAnswers) => {
  const questionEntries = Object.entries(additionalAnswers || {}).filter(([, answer]) => {
    return !(answer === undefined || answer === null || answer === '');
  });

  const requestedIds = questionEntries
    .map(([questionId]) => parseOptionalInt(questionId))
    .filter((questionId) => questionId !== null);

  const questionMap = new Map();

  if (requestedIds.length > 0) {
    const existingQuestions = await refactorPrisma.surveyQuestion.findMany({
      where: {
        id: {
          in: requestedIds
        }
      }
    });

    for (const question of existingQuestions) {
      await refactorPrisma.templateQuestion.upsert({
        where: {
          template_id_question_id: {
            template_id: templateId,
            question_id: question.id
          }
        },
        update: {},
        create: {
          template_id: templateId,
          question_id: question.id,
          display_order: question.id,
          is_required: false
        }
      });

      questionMap.set(question.id, question);
    }
  }

  for (const [questionId, rawAnswer] of questionEntries) {
    const parsedQuestionId = parseOptionalInt(questionId);
    if (parsedQuestionId === null) {
      continue;
    }

    if (questionMap.has(parsedQuestionId)) {
      continue;
    }

    const questionType = normalizeQuestionType(rawAnswer);
    const question = await refactorPrisma.surveyQuestion.upsert({
      where: { question_key: getQuestionKey(parsedQuestionId) },
      update: {
        question_text: `Question ${parsedQuestionId}`,
        question_type: questionType,
        is_active: true
      },
      create: {
        question_key: getQuestionKey(parsedQuestionId),
        question_text: `Question ${parsedQuestionId}`,
        question_type: questionType,
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
        display_order: parsedQuestionId,
        is_required: false
      },
      create: {
        template_id: templateId,
        question_id: question.id,
        display_order: parsedQuestionId,
        is_required: false
      }
    });

    questionMap.set(parsedQuestionId, question);
  }

  return questionMap;
};

const ensureCompetencies = async (refactorPrisma, skillRatings) => {
  const competencyIds = Array.from(
    new Set(
      skillRatings
        .map((skill) => parseOptionalInt(skill.id))
        .filter((id) => id !== null)
    )
  );

  if (competencyIds.length === 0) {
    return new Map();
  }

  const competencies = await refactorPrisma.competency.findMany({
    where: {
      id: { in: competencyIds },
      is_active: true
    }
  });

  if (competencies.length !== competencyIds.length) {
    const foundIds = new Set(competencies.map((competency) => competency.id));
    const missingIds = competencyIds.filter((id) => !foundIds.has(id));
    const error = new Error(`Missing competencies in refactor schema: ${missingIds.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return new Map(competencies.map((competency) => [competency.id, competency]));
};

const submitEmployabilitySurvey = async ({
  studentId,
  academicData,
  skillRatings,
  additionalAnswers,
  modelInput,
  predictionResult,
  assessmentPath = 'UNEMPLOYED'
}) => {
  const refactorPrisma = requireRefactorPrisma();
  const now = new Date();

  const user = await refactorPrisma.user.findUnique({
    where: { username: String(studentId) }
  });

  if (!user) {
    const error = new Error('User/Alumni record not found in refactor schema');
    error.statusCode = 404;
    throw error;
  }

  const programId = parseOptionalInt(academicData.degree_id);
  if (!programId) {
    const error = new Error('A valid degree/program is required');
    error.statusCode = 400;
    throw error;
  }

  const program = await refactorPrisma.program.findUnique({
    where: { id: programId }
  });

  if (!program) {
    const error = new Error(`Program ${programId} was not found in refactor schema`);
    error.statusCode = 400;
    throw error;
  }

  const batchYear = parseOptionalInt(academicData.year_graduated) || now.getFullYear();
  const alumniProfile = await ensureAlumniProfile(
    refactorPrisma,
    user,
    String(studentId),
    program.id,
    batchYear
  );

  const { assessmentTemplate, employedTemplate, followupTemplate } = await ensureTemplates(refactorPrisma);
  const resolvedPath = String(assessmentPath || 'UNEMPLOYED').toUpperCase() === 'EMPLOYED' ? 'EMPLOYED' : 'UNEMPLOYED';
  const selectedTemplate = resolvedPath === 'EMPLOYED' ? employedTemplate : assessmentTemplate;
  const competencies = await ensureCompetencies(refactorPrisma, skillRatings);
  const questions = await ensureSubmissionQuestions(
    refactorPrisma,
    selectedTemplate.id,
    additionalAnswers
  );

  const academicSnapshot = await refactorPrisma.academicSnapshot.create({
    data: {
      alumni_profile_id: alumniProfile.id,
      program_id: program.id,
      gender: academicData.gender || null,
      age: parseOptionalInt(academicData.age),
      year_graduated: batchYear,
      cgpa: parseOptionalFloat(academicData.cgpa),
      prof_grade: parseOptionalFloat(academicData.prof_grade),
      elec_grade: parseOptionalFloat(academicData.elec_grade),
      ojt_grade: parseOptionalFloat(academicData.ojt_grade),
      leader_pos: parseOptionalInt(academicData.leader_pos),
      act_member_pos: parseOptionalInt(academicData.act_member_pos),
      soft_skills_ave: parseOptionalFloat(academicData.soft_skills_ave),
      hard_skills_ave: parseOptionalFloat(academicData.hard_skills_ave),
      board_exam: parseOptionalInt(academicData.board_exam)
    }
  });

  const surveySubmission = await refactorPrisma.surveySubmission.create({
    data: {
      alumni_profile_id: alumniProfile.id,
      academic_snapshot_id: academicSnapshot.id,
      template_id: selectedTemplate.id,
      branch_path: resolvedPath,
      started_at: now,
      submitted_at: now,
      status: 'COMPLETED',
      additional_data: {
        academic_data: academicData,
        additional_answers: additionalAnswers || {}
      }
    }
  });

  for (const [questionId, rawAnswer] of Object.entries(additionalAnswers || {})) {
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
      continue;
    }

    const question = questions.get(parseOptionalInt(questionId));
    if (!question) {
      continue;
    }

    const answerData = convertAnswer(question.question_type, rawAnswer);
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
    const competencyId = parseOptionalInt(skill.id);
    const competency = competencies.get(competencyId);
    if (!competency) {
      continue;
    }

    const score = parseOptionalInt(skill.score);
    await refactorPrisma.submissionCompetency.upsert({
      where: {
        submission_id_competency_id: {
          submission_id: surveySubmission.id,
          competency_id: competency.id
        }
      },
      update: {
        selected: true,
        score,
        importance: score
      },
      create: {
        submission_id: surveySubmission.id,
        competency_id: competency.id,
        selected: true,
        score,
        importance: score
      }
    });
  }

  // Persist program-required skill ratings on the academic snapshot for model traceability.
  if (Array.isArray(academicData.program_skill_ratings) && academicData.program_skill_ratings.length > 0) {
    const rows = academicData.program_skill_ratings
      .map((entry) => {
        const skillName = String(entry?.skill_name || entry?.skill || '').trim();
        const value = parseOptionalFloat(
          entry?.skill_value !== undefined ? entry?.skill_value : entry?.score
        );
        if (!skillName || value === null) return null;
        return {
          academic_snapshot_id: academicSnapshot.id,
          skill_name: skillName.slice(0, 150),
          skill_value: value,
          source_column: 'program_skill_rating'
        };
      })
      .filter(Boolean);
    if (rows.length > 0) {
      await refactorPrisma.academicSnapshotSkill.createMany({
        data: rows,
        skipDuplicates: true
      });
    }
  }

  let mlPrediction = null;
  if (resolvedPath === 'UNEMPLOYED' && predictionResult) {
    mlPrediction = await refactorPrisma.mlPrediction.create({
      data: {
        prediction_type: 'EMPLOYABILITY',
        model_name: 'employability_model',
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

  let followupSchedule = null;
  if (mlPrediction) {
    const followupDueDate = new Date(now);
    followupDueDate.setMonth(followupDueDate.getMonth() + 2);

    followupSchedule = await refactorPrisma.followupSchedule.create({
      data: {
        alumni_profile_id: alumniProfile.id,
        trigger_submission_id: surveySubmission.id,
        target_template_id: followupTemplate.id,
        due_at: followupDueDate,
        status: 'PENDING'
      }
    });
  }

  return {
    academicSnapshotId: academicSnapshot.id,
    surveySubmissionId: surveySubmission.id,
    mlPredictionId: mlPrediction?.id || null,
    followupScheduleId: followupSchedule?.id || null
  };
};

const getLatestRefactorPrediction = async (studentId) => {
  const refactorPrisma = requireRefactorPrisma();
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
      academic_snapshot: {
        include: {
          program: true,
          skill_values: {
            orderBy: [{ skill_name: 'asc' }]
          }
        }
      },
      submission: {
        include: {
          survey_answers: {
            include: {
              question: true
            }
          },
          submission_competencies: {
            include: {
              competency: true
            }
          }
        }
      }
    }
  });

  if (!prediction) {
    return null;
  }

  const output = prediction.output_json || {};
  const submissionCompetencies = (prediction.submission?.submission_competencies || [])
    .filter((entry) => entry.competency)
    .map((entry) => ({
      id: entry.competency.id,
      name: entry.competency.name,
      kind: entry.competency.kind,
      score: entry.score === null || entry.score === undefined ? null : Number(entry.score),
      importance:
        entry.importance === null || entry.importance === undefined
          ? null
          : Number(entry.importance),
      selected: Boolean(entry.selected)
    }))
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return String(left.kind).localeCompare(String(right.kind));
      }

      return left.name.localeCompare(right.name);
    });

  const competenciesByKind = submissionCompetencies.reduce(
    (groups, competency) => {
      if (!groups[competency.kind]) {
        groups[competency.kind] = [];
      }

      groups[competency.kind].push(competency);
      return groups;
    },
    {
      SOFT_SKILL: [],
      HARD_SKILL: [],
      KNOWLEDGE: [],
      ABILITY: [],
      INTEREST: [],
      TECHNOLOGY: []
    }
  );

  const surveyAnswers = (prediction.submission?.survey_answers || [])
    .map((answer) => ({
      question_id: answer.question_id,
      question_key: answer.question?.question_key || null,
      question_text: answer.question?.question_text || `Question ${answer.question_id}`,
      value: mapSubmissionAnswerValue(answer)
    }))
    .filter((answer) => answer.value !== null && answer.value !== '');

  return {
    id: prediction.id,
    student_academic_id: prediction.academic_snapshot_id,
    survey_response_id: prediction.submission_id,
    model_version: prediction.model_version || null,
    employable: Boolean(output.employable),
    probability: output.probability ?? null,
    confidence: output.confidence ?? Number(prediction.confidence ?? 0),
    label: output.label || null,
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
          act_member_pos: prediction.academic_snapshot.act_member_pos,
          degree_name: prediction.academic_snapshot.program?.name || null
        }
      : null,
    submission_summary: prediction.submission
      ? {
          id: prediction.submission.id,
          branch_path: prediction.submission.branch_path,
          survey_answers: surveyAnswers,
          academic_snapshot_skills: (prediction.academic_snapshot?.skill_values || []).map((skill) => ({
            id: skill.id,
            skill_name: skill.skill_name,
            skill_value:
              skill.skill_value === null || skill.skill_value === undefined
                ? null
                : Number(skill.skill_value),
            source_column: skill.source_column || null
          })),
          competencies: submissionCompetencies,
          competencies_by_kind: competenciesByKind
        }
      : null
  };
};

module.exports = {
  getLatestRefactorPrediction,
  submitEmployabilitySurvey
};

