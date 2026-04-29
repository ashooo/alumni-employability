const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { getJobMatchingRuntimeStatus } = require('./jobMatchingDataService');

const DEFAULT_SURVEY_VERSION = 1;
const DEFAULT_TEMPLATE_KEY = 'default_tracer_survey_v1';
const EMPLOYABILITY_TEMPLATE_KEY = 'employability_assessment';
const ACTIVE_FOLLOWUP_STATUSES = ['PENDING', 'SENT', 'OVERDUE'];
const COMPETENCY_KINDS = [
  'SOFT_SKILL',
  'HARD_SKILL',
  'KNOWLEDGE',
  'ABILITY',
  'INTEREST',
  'TECHNOLOGY'
];

const DEFAULT_SURVEY_SECTIONS = [
  {
    id: 1,
    key: 'employment_details',
    name: 'Employment Gateway',
    description: 'This first section determines which survey path applies to the alumni.',
    questions: [
      {
        key: 'current_employment_status',
        text: 'Are you currently employed?',
        type: 'SINGLE_SELECT',
        options: ['Employed', 'Unemployed', 'Self-Employed', 'Freelancer']
      },
      {
        key: 'current_job_title',
        text: 'What is your current job title?',
        type: 'TEXT'
      }
    ]
  },
  {
    id: 2,
    key: 'personal_information',
    name: 'Personal Information',
    description: 'Basic contact and personal details',
    questions: [
      {
        key: 'current_address',
        text: 'What is your current permanent address?',
        type: 'TEXT'
      },
      {
        key: 'mobile_number',
        text: 'What is your current mobile number?',
        type: 'TEXT'
      }
    ]
  },
  {
    id: 3,
    key: 'educational_assessment',
    name: 'Educational Assessment',
    description: 'Feedback on the academic program',
    questions: [
      {
        key: 'degree_relevance',
        text: 'How relevant is your degree to your current profession?',
        type: 'SCALE',
        scale_min: 1,
        scale_max: 5
      }
    ]
  }
];

const DEFAULT_QUESTION_METADATA = new Map(
  DEFAULT_SURVEY_SECTIONS.flatMap((section) =>
    section.questions.map((question, index) => [
      question.key,
      {
        section,
        display_order: index + 1,
        ...question
      }
    ])
  )
);

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
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

const buildEmptyCompetencyCounts = () =>
  COMPETENCY_KINDS.reduce((accumulator, kind) => {
    accumulator[kind] = 0;
    return accumulator;
  }, {});

const normalizeEmploymentStatusAnswer = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

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

const isEmployedLikeStatus = (status) =>
  ['EMPLOYED', 'SELF_EMPLOYED', 'FREELANCER'].includes(String(status || '').toUpperCase());

const getActiveCompetencyCounts = async (refactorPrisma) => {
  const rows = await refactorPrisma.competency.groupBy({
    by: ['kind'],
    where: {
      is_active: true
    },
    _count: {
      _all: true
    }
  });

  const counts = buildEmptyCompetencyCounts();
  for (const row of rows) {
    counts[row.kind] = row._count._all;
  }

  return counts;
};

const mapRefactorQuestionType = (questionType) => {
  switch (questionType) {
    case 'NUMBER':
      return 'number';
    case 'SINGLE_SELECT':
      return 'select';
    case 'MULTI_SELECT':
      return 'checkbox';
    case 'SCALE':
      return 'scale';
    case 'BOOLEAN':
      return 'radio';
    default:
      return 'text';
  }
};

const mapAnswerValue = (answer) => {
  if (Array.isArray(answer.answer_json)) {
    return {
      answer_text: null,
      answer_options: answer.answer_json,
      answer_number: null
    };
  }

  if (answer.answer_number !== null && answer.answer_number !== undefined) {
    return {
      answer_text: answer.answer_text,
      answer_options: null,
      answer_number: Number(answer.answer_number)
    };
  }

  if (answer.answer_boolean !== null && answer.answer_boolean !== undefined) {
    return {
      answer_text: answer.answer_boolean ? 'Yes' : 'No',
      answer_options: null,
      answer_number: null
    };
  }

  if (answer.answer_date) {
    return {
      answer_text: answer.answer_date.toISOString().slice(0, 10),
      answer_options: null,
      answer_number: null
    };
  }

  return {
    answer_text: answer.answer_text,
    answer_options: null,
    answer_number: null
  };
};

const ensureDefaultSurveyTemplate = async () => {
  const refactorPrisma = requireRefactorPrisma();
  const template = await refactorPrisma.surveyTemplate.upsert({
    where: { template_key: DEFAULT_TEMPLATE_KEY },
    update: {
      name: 'Default Tracer Survey',
      description: 'Initial tracer survey presented to alumni.',
      kind: 'INITIAL',
      path_key: 'INITIAL',
      is_followup: false,
      is_active: true
    },
    create: {
      template_key: DEFAULT_TEMPLATE_KEY,
      name: 'Default Tracer Survey',
      description: 'Initial tracer survey presented to alumni.',
      kind: 'INITIAL',
      path_key: 'INITIAL',
      is_followup: false,
      is_active: true
    }
  });

  for (const section of DEFAULT_SURVEY_SECTIONS) {
    for (const [index, questionConfig] of section.questions.entries()) {
      const question = await refactorPrisma.surveyQuestion.upsert({
        where: { question_key: questionConfig.key },
        update: {
          question_text: questionConfig.text,
          question_type: questionConfig.type,
          is_active: true
        },
        create: {
          question_key: questionConfig.key,
          question_text: questionConfig.text,
          question_type: questionConfig.type,
          is_active: true
        }
      });

      await refactorPrisma.templateQuestion.upsert({
        where: {
          template_id_question_id: {
            template_id: template.id,
            question_id: question.id
          }
        },
        update: {
          display_order: index + 1,
          is_required: true,
          section_key: section.key
        },
        create: {
          template_id: template.id,
          question_id: question.id,
          display_order: index + 1,
          is_required: true,
          section_key: section.key
        }
      });

      if (questionConfig.options) {
        await refactorPrisma.surveyOption.deleteMany({
          where: { question_id: question.id }
        });

        await refactorPrisma.surveyOption.createMany({
          data: questionConfig.options.map((option, optionIndex) => ({
            question_id: question.id,
            option_value: option,
            option_label: option,
            display_order: optionIndex
          }))
        });
      }
    }
  }

  return template;
};

const findEmploymentGatewayAnswer = (submissions) => {
  for (const submission of submissions) {
    const answer = submission.survey_answers.find(
      (surveyAnswer) => surveyAnswer.question?.question_key === 'current_employment_status'
    );

    if (!answer) {
      continue;
    }

    const answerText =
      answer.answer_text ||
      (Array.isArray(answer.answer_json) ? answer.answer_json[0] : null) ||
      null;
    const employmentStatus = normalizeEmploymentStatusAnswer(answerText);

    if (!employmentStatus) {
      continue;
    }

    return {
      submission,
      employmentStatus,
      answerText
    };
  }

  return null;
};

const getSurveyDefinition = async () => {
  const refactorPrisma = requireRefactorPrisma();
  const template = await ensureDefaultSurveyTemplate();

  const templateWithQuestions = await refactorPrisma.surveyTemplate.findUnique({
    where: { id: template.id },
    include: {
      template_questions: {
        orderBy: [
          { section_key: 'asc' },
          { display_order: 'asc' }
        ],
        include: {
          question: {
            include: {
              options: {
                orderBy: { display_order: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  const categoryMap = new Map();

  for (const section of DEFAULT_SURVEY_SECTIONS) {
    categoryMap.set(section.key, {
      id: section.id,
      name: section.name,
      description: section.description,
      order_index: section.id,
      questions: []
    });
  }

  for (const templateQuestion of templateWithQuestions.template_questions) {
    const question = templateQuestion.question;
    const metadata = DEFAULT_QUESTION_METADATA.get(question.question_key);
    const sectionKey = templateQuestion.section_key || metadata?.section.key || 'general';

    if (!categoryMap.has(sectionKey)) {
      categoryMap.set(sectionKey, {
        id: categoryMap.size + 1,
        name: sectionKey.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        description: null,
        order_index: categoryMap.size + 1,
        questions: []
      });
    }

    categoryMap.get(sectionKey).questions.push({
      id: question.id,
      question_key: question.question_key,
      category_id: categoryMap.get(sectionKey).id,
      text: question.question_text,
      type: mapRefactorQuestionType(question.question_type),
      required: Boolean(templateQuestion.is_required),
      options: question.question_type === 'BOOLEAN'
        ? ['Yes', 'No']
        : question.options.map((option) => option.option_label),
      scale_min: metadata?.scale_min || 1,
      scale_max: metadata?.scale_max || 5,
      order_index: templateQuestion.display_order,
      version: DEFAULT_SURVEY_VERSION
    });
  }

  return {
    template: templateWithQuestions,
    categories: Array.from(categoryMap.values()).sort((left, right) => left.order_index - right.order_index),
    version: DEFAULT_SURVEY_VERSION,
    published_at: templateWithQuestions.updated_at || templateWithQuestions.created_at,
    template_key: templateWithQuestions.template_key,
    kind: templateWithQuestions.kind,
    path_key: templateWithQuestions.path_key,
    branching: {
      decision_question_key: 'current_employment_status',
      employed_values: ['Employed', 'Self-Employed', 'Freelancer'],
      unemployed_values: ['Unemployed']
    }
  };
};

const ensureAnswerQuestions = async (refactorPrisma, templateId, answers) => {
  const questionIds = answers
    .map((answer) => parseOptionalInt(answer.question_id))
    .filter((questionId) => questionId !== null);

  const questions = await refactorPrisma.surveyQuestion.findMany({
    where: {
      id: {
        in: questionIds
      }
    }
  });

  for (const question of questions) {
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
  }

  return new Map(questions.map((question) => [question.id, question]));
};

const ensureSubmissionProfile = async (refactorPrisma, user, studentId) => {
  const existingProfile = await refactorPrisma.alumniProfile.findUnique({
    where: { user_id: user.id }
  });

  if (existingProfile) {
    if (existingProfile.student_id !== studentId) {
      return refactorPrisma.alumniProfile.update({
        where: { id: existingProfile.id },
        data: { student_id: studentId }
      });
    }

    return existingProfile;
  }

  return refactorPrisma.alumniProfile.create({
    data: {
      user_id: user.id,
      student_id: studentId,
      batch_year: new Date().getFullYear(),
      lifecycle_status: 'ACTIVE'
    }
  });
};

const submitSurveyResponse = async ({ studentId, answers, version }) => {
  const refactorPrisma = requireRefactorPrisma();
  const { template } = await getSurveyDefinition();

  const user = await refactorPrisma.user.findUnique({
    where: { username: String(studentId) }
  });

  if (!user) {
    const error = new Error('User not found in refactor schema');
    error.statusCode = 404;
    throw error;
  }

  const alumniProfile = await ensureSubmissionProfile(refactorPrisma, user, String(studentId));
  const surveySubmission = await refactorPrisma.surveySubmission.create({
    data: {
      alumni_profile_id: alumniProfile.id,
      template_id: template.id,
      branch_path: 'INITIAL',
      started_at: new Date(),
      submitted_at: new Date(),
      status: 'COMPLETED',
      additional_data: {
        survey_version: version || DEFAULT_SURVEY_VERSION
      }
    }
  });

  const questionMap = await ensureAnswerQuestions(refactorPrisma, template.id, answers);

  for (const answer of answers) {
    const questionId = parseOptionalInt(answer.question_id);
    const question = questionMap.get(questionId);
    if (!question) {
      continue;
    }

    await refactorPrisma.surveyAnswer.create({
      data: {
        submission_id: surveySubmission.id,
        question_id: question.id,
        answer_text: answer.answer_text || null,
        answer_number: answer.answer_number ?? null,
        answer_json: Array.isArray(answer.answer_options) ? answer.answer_options : null
      }
    });
  }

  return surveySubmission;
};

const getSurveyResponses = async (studentId) => {
  const refactorPrisma = requireRefactorPrisma();
  const profile = await refactorPrisma.alumniProfile.findUnique({
    where: { student_id: String(studentId) },
    include: {
      survey_submissions: {
        orderBy: [
          { submitted_at: 'desc' },
          { created_at: 'desc' }
        ],
        include: {
          template: true,
          survey_answers: {
            orderBy: { question_id: 'asc' },
            include: {
              question: true
            }
          }
        }
      }
    }
  });

  if (!profile) {
    return [];
  }

  return profile.survey_submissions
    .filter((submission) => submission.template?.template_key !== 'profile_employment_update')
    .map((submission) => ({
    id: submission.id,
    student_id: profile.student_id,
    survey_version: DEFAULT_SURVEY_VERSION,
    template_key: submission.template?.template_key || null,
    template_kind: submission.template?.kind || null,
    branch_path: submission.branch_path || null,
    completed_at: submission.submitted_at || submission.created_at,
    status: String(submission.status || '').toLowerCase(),
    answers: submission.survey_answers.map((answer) => ({
      question_id: answer.question_id,
      question_key: answer.question.question_key,
      question_text: answer.question.question_text,
      question_type: mapRefactorQuestionType(answer.question.question_type),
      ...mapAnswerValue(answer)
    }))
  }));
};

const getSurveyFlowStatus = async (studentId, options = {}) => {
  const { isFirstLogin = false, includeCatalogSummary = true } = options;
  const refactorPrisma = requireRefactorPrisma();
  const normalizedStudentId = String(studentId);

  const user = await refactorPrisma.user.findUnique({
    where: { username: normalizedStudentId },
    select: {
      id: true,
      username: true,
      role: true,
      last_login: true,
      alumni_profile: {
        select: {
          id: true,
          student_id: true,
          batch_year: true,
          current_program: {
            select: {
              id: true,
              name: true,
              code: true,
              college: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    const error = new Error('User not found in refactor schema');
    error.statusCode = 404;
    throw error;
  }

  if (String(user.role || '').toUpperCase() !== 'ALUMNI') {
    return {
      applicable: false,
      isFirstLogin: Boolean(isFirstLogin),
      shouldPromptSurvey: false,
      completed: true,
      requiresSurvey: false,
      status: 'not_applicable',
      nextPath: null,
      nextStep: null
    };
  }

  const jobMatchingRuntime = getJobMatchingRuntimeStatus();
  const alumniProfile = user.alumni_profile;
  if (!alumniProfile) {
    return {
      applicable: true,
      isFirstLogin: Boolean(isFirstLogin),
      shouldPromptSurvey: true,
      completed: false,
      requiresSurvey: true,
      status: 'profile_missing',
      hasInitialSurvey: false,
      hasEmployabilityAssessment: false,
      hasEmployabilityPrediction: false,
      hasJobMatchingPrediction: false,
      employmentStatus: null,
      resolvedPath: null,
      nextPath: 'INITIAL',
      nextStep: 'take_initial_survey',
      surveyVersion: DEFAULT_SURVEY_VERSION,
      collegeId: null,
      collegeName: null,
      programId: null,
      programName: null,
      routeHints: {
        surveyStatus: `/api/alumni/survey/status/${normalizedStudentId}`,
        initialSurvey: null,
        employabilitySubmit: '/api/prediction/employability/submit',
        latestPrediction: `/api/prediction/employability/latest/${normalizedStudentId}`,
        jobMatchingGenerate: null,
        latestJobMatching: null
      },
      readiness: {
        initialSurvey: true,
        unemployedAssessment: true,
        employedAssessment: false,
        arimaForecast: true,
        jobMatching: jobMatchingRuntime.ready,
        jobMatchingEligible: false
      },
      jobMatchingRuntime: {
        ready: jobMatchingRuntime.ready,
        missingPaths: jobMatchingRuntime.missingPaths
      }
    };
  }

  const submissions = await refactorPrisma.surveySubmission.findMany({
    where: {
      alumni_profile_id: alumniProfile.id,
      status: 'COMPLETED'
    },
    orderBy: [
      { submitted_at: 'desc' },
      { created_at: 'desc' }
    ],
    include: {
      template: true,
      survey_answers: {
        include: {
          question: true
        }
      }
    }
  });

  const initialSubmission =
    submissions.find(
      (submission) =>
        submission.template?.template_key === DEFAULT_TEMPLATE_KEY ||
        submission.template?.path_key === 'INITIAL' ||
        submission.branch_path === 'INITIAL'
    ) || null;

  const employabilitySubmission =
    submissions.find(
      (submission) =>
        submission.template?.template_key === EMPLOYABILITY_TEMPLATE_KEY ||
        submission.template?.path_key === 'UNEMPLOYED' ||
        submission.branch_path === 'UNEMPLOYED'
    ) || null;

  const employmentGateway = findEmploymentGatewayAnswer(submissions);
  const employmentStatus = employmentGateway?.employmentStatus || null;
  const hasInitialSurvey = Boolean(initialSubmission || employmentGateway);
  const hasEmployabilityAssessment = Boolean(employabilitySubmission);

  const latestPrediction = await refactorPrisma.mlPrediction.findFirst({
    where: {
      alumni_profile_id: alumniProfile.id,
      prediction_type: 'EMPLOYABILITY'
    },
    orderBy: {
      created_at: 'desc'
    },
    select: {
      id: true,
      created_at: true,
      submission_id: true
    }
  });

  const latestJobMatchingPrediction = await refactorPrisma.mlPrediction.findFirst({
    where: {
      alumni_profile_id: alumniProfile.id,
      prediction_type: 'JOB_MATCHING'
    },
    orderBy: {
      created_at: 'desc'
    },
    select: {
      id: true,
      created_at: true,
      submission_id: true
    }
  });

  const pendingFollowup = await refactorPrisma.followupSchedule.findFirst({
    where: {
      alumni_profile_id: alumniProfile.id,
      status: {
        in: ACTIVE_FOLLOWUP_STATUSES
      }
    },
    orderBy: {
      due_at: 'asc'
    },
    include: {
      target_template: {
        select: {
          id: true,
          template_key: true,
          name: true,
          path_key: true
        }
      }
    }
  });

  let status = 'pending_initial_survey';
  let resolvedPath = null;
  let nextPath = 'INITIAL';
  let nextStep = 'take_initial_survey';
  let requiresSurvey = true;

  if (!hasInitialSurvey) {
    status = 'pending_initial_survey';
  } else if (!employmentStatus) {
    status = 'pending_initial_path_answer';
  } else if (employmentStatus === 'UNEMPLOYED') {
    resolvedPath = 'UNEMPLOYED';

    if (!hasEmployabilityAssessment) {
      status = 'pending_unemployed_assessment';
      nextPath = 'UNEMPLOYED';
      nextStep = 'take_unemployed_assessment';
    } else if (!latestPrediction) {
      status = 'assessment_submitted_prediction_missing';
      nextPath = 'UNEMPLOYED';
      nextStep = 'prediction_pending';
      requiresSurvey = false;
    } else if (pendingFollowup) {
      status = 'completed_awaiting_followup';
      nextPath = 'FOLLOWUP';
      nextStep = 'await_followup';
      requiresSurvey = false;
    } else {
      status = 'completed';
      nextPath = null;
      nextStep = 'view_results';
      requiresSurvey = false;
    }
  } else {
    resolvedPath = 'EMPLOYED';
    status = 'pending_employed_survey';
    nextPath = 'EMPLOYED';
    nextStep = 'employed_survey_pending_implementation';
  }

  const competencyCounts = includeCatalogSummary
    ? await getActiveCompetencyCounts(refactorPrisma)
    : null;
  const jobMatchingEligible = Boolean(employabilitySubmission);

  return {
    applicable: true,
    isFirstLogin: Boolean(isFirstLogin),
    shouldPromptSurvey: Boolean(isFirstLogin) || requiresSurvey,
    completed:
      !requiresSurvey &&
      status !== 'assessment_submitted_prediction_missing',
    requiresSurvey,
    status,
    hasInitialSurvey,
    hasEmployabilityAssessment,
    hasEmployabilityPrediction: Boolean(latestPrediction),
    hasJobMatchingPrediction: Boolean(latestJobMatchingPrediction),
    employmentStatus,
    resolvedPath,
    nextPath,
    nextStep,
    surveyVersion: DEFAULT_SURVEY_VERSION,
    collegeId: alumniProfile.current_program?.college?.id || null,
    collegeName: alumniProfile.current_program?.college?.name || null,
    collegeCode: alumniProfile.current_program?.college?.code || null,
    programId: alumniProfile.current_program?.id || null,
    programName: alumniProfile.current_program?.name || null,
    programCode: alumniProfile.current_program?.code || null,
    routeHints: {
      surveyStatus: `/api/alumni/survey/status/${normalizedStudentId}`,
      initialSurvey: alumniProfile.current_program?.college?.id
        ? `/api/alumni/survey/college/${alumniProfile.current_program.college.id}`
        : null,
      employabilitySubmit: '/api/prediction/employability/submit',
      latestPrediction: `/api/prediction/employability/latest/${normalizedStudentId}`,
      jobMatchingGenerate: `/api/prediction/job-matching/generate/${normalizedStudentId}`,
      latestJobMatching: `/api/prediction/job-matching/latest/${normalizedStudentId}`
    },
    readiness: {
      initialSurvey: true,
      unemployedAssessment: true,
      employedAssessment: false,
      arimaForecast: true,
      jobMatching: jobMatchingRuntime.ready,
      jobMatchingEligible,
      extendedCompetenciesCatalog: competencyCounts
        ? competencyCounts.KNOWLEDGE +
            competencyCounts.ABILITY +
            competencyCounts.INTEREST +
            competencyCounts.TECHNOLOGY >
          0
        : null
    },
    jobMatchingRuntime: {
      ready: jobMatchingRuntime.ready,
      missingPaths: jobMatchingRuntime.missingPaths
    },
    competencyCatalog: competencyCounts
      ? {
          counts: competencyCounts,
          hasEmployabilitySkills:
            competencyCounts.HARD_SKILL + competencyCounts.SOFT_SKILL > 0,
          hasExtendedProfileCatalog:
            competencyCounts.KNOWLEDGE +
              competencyCounts.ABILITY +
              competencyCounts.INTEREST +
              competencyCounts.TECHNOLOGY >
            0
        }
      : null,
    submissions: {
      initialSurveyId: initialSubmission?.id || null,
      employabilitySubmissionId: employabilitySubmission?.id || null,
      latestPredictionId: latestPrediction?.id || null,
      latestJobMatchingPredictionId: latestJobMatchingPrediction?.id || null,
      pendingFollowupId: pendingFollowup?.id || null
    },
    pendingFollowup: pendingFollowup
      ? {
          id: pendingFollowup.id,
          due_at: pendingFollowup.due_at,
          status: pendingFollowup.status,
          target_template: pendingFollowup.target_template
        }
      : null
  };
};

const getSurveyStatus = async (studentId, options = {}) => {
  return getSurveyFlowStatus(studentId, options);
};

module.exports = {
  getSurveyDefinition,
  getSurveyResponses,
  getSurveyFlowStatus,
  getSurveyStatus,
  submitSurveyResponse
};
