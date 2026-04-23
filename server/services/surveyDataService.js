const { getRefactorPrisma, getRefactorSetupStatus } = require('../config/db');

const DEFAULT_SURVEY_VERSION = 1;
const DEFAULT_TEMPLATE_KEY = 'default_tracer_survey_v1';

const DEFAULT_SURVEY_SECTIONS = [
  {
    id: 1,
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
    id: 2,
    key: 'employment_details',
    name: 'Employment Details',
    description: 'Current employment status and history',
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
  const setupStatus = getRefactorSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getRefactorPrisma();
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
    published_at: templateWithQuestions.updated_at || templateWithQuestions.created_at
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
    completed_at: submission.submitted_at || submission.created_at,
    status: String(submission.status || '').toLowerCase(),
    answers: submission.survey_answers.map((answer) => ({
      question_id: answer.question_id,
      question_text: answer.question.question_text,
      question_type: mapRefactorQuestionType(answer.question.question_type),
      ...mapAnswerValue(answer)
    }))
  }));
};

const getSurveyStatus = async (studentId) => {
  const submissions = await getSurveyResponses(studentId);
  return {
    completed: submissions.length > 0,
    status: submissions.length > 0 ? submissions[0].status : 'pending'
  };
};

module.exports = {
  getSurveyDefinition,
  getSurveyResponses,
  getSurveyStatus,
  submitSurveyResponse
};
