const { getPrisma, getDatabaseSetupStatus } = require('../config/db');

// ─── helpers ────────────────────────────────────────────────────────────────

const requirePrisma = () => {
  const status = getDatabaseSetupStatus();
  if (!status.ready) {
    const err = new Error(status.message);
    err.statusCode = 503;
    throw err;
  }
  return getPrisma();
};

const slugify = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

// ─── Templates ──────────────────────────────────────────────────────────────

const listTemplates = async (filters = {}) => {
  const prisma = requirePrisma();
  const where = {};

  if (filters.kind) where.kind = filters.kind;
  if (filters.is_active !== undefined) where.is_active = filters.is_active;
  if (filters.path_key) where.path_key = filters.path_key;

  const templates = await prisma.surveyTemplate.findMany({
    where,
    orderBy: [{ kind: 'asc' }, { created_at: 'desc' }],
    include: {
      program: {
        select: { id: true, code: true, name: true }
      },
      _count: {
        select: {
          template_questions: true,
          survey_submissions: true
        }
      }
    }
  });

  return templates.map((t) => ({
    id: t.id,
    template_key: t.template_key,
    name: t.name,
    description: t.description,
    kind: t.kind,
    path_key: t.path_key,
    program_id: t.program_id,
    program: t.program,
    is_followup: t.is_followup,
    target_months: t.target_months,
    trigger_condition: t.trigger_condition,
    is_active: t.is_active,
    created_at: t.created_at,
    updated_at: t.updated_at,
    question_count: t._count.template_questions,
    submission_count: t._count.survey_submissions
  }));
};

const getTemplateWithQuestions = async (templateId) => {
  const prisma = requirePrisma();

  const template = await prisma.surveyTemplate.findUnique({
    where: { id: Number(templateId) },
    include: {
      program: {
        select: { id: true, code: true, name: true }
      },
      template_questions: {
        orderBy: [{ section_key: 'asc' }, { display_order: 'asc' }],
        include: {
          question: {
            include: {
              options: { orderBy: { display_order: 'asc' } }
            }
          }
        }
      },
      _count: {
        select: { survey_submissions: true }
      }
    }
  });

  if (!template) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    id: template.id,
    template_key: template.template_key,
    name: template.name,
    description: template.description,
    kind: template.kind,
    path_key: template.path_key,
    program_id: template.program_id,
    program: template.program,
    is_followup: template.is_followup,
    target_months: template.target_months,
    trigger_condition: template.trigger_condition,
    is_active: template.is_active,
    created_at: template.created_at,
    updated_at: template.updated_at,
    submission_count: template._count.survey_submissions,
    questions: template.template_questions.map((tq) => ({
      link_id: tq.id,
      question_id: tq.question_id,
      display_order: tq.display_order,
      is_required: tq.is_required,
      is_model_critical: tq.is_model_critical,
      model_critical_key: tq.model_critical_key,
      section_key: tq.section_key,
      question_key: tq.question.question_key,
      question_text: tq.question.question_text,
      help_text: tq.question.help_text,
      question_type: tq.question.question_type,
      is_active: tq.question.is_active,
      options: tq.question.options.map((o) => ({
        id: o.id,
        option_value: o.option_value,
        option_label: o.option_label,
        display_order: o.display_order
      }))
    }))
  };
};

const createTemplate = async (data) => {
  const prisma = requirePrisma();

  const templateKey =
    data.template_key || slugify(data.name) + '_v1';

  const existing = await prisma.surveyTemplate.findUnique({
    where: { template_key: templateKey }
  });

  if (existing) {
    const err = new Error(`Template key "${templateKey}" already exists`);
    err.statusCode = 409;
    throw err;
  }

  return prisma.surveyTemplate.create({
    data: {
      template_key: templateKey,
      name: data.name,
      description: data.description || null,
      kind: data.kind || 'GENERAL',
      path_key: data.path_key || 'INITIAL',
      program_id: data.program_id ? Number(data.program_id) : null,
      is_followup: Boolean(data.is_followup),
      target_months: data.target_months ? Number(data.target_months) : null,
      trigger_condition: data.trigger_condition || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    }
  });
};

const updateTemplate = async (templateId, data) => {
  const prisma = requirePrisma();
  const id = Number(templateId);

  const existing = await prisma.surveyTemplate.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.kind !== undefined) updateData.kind = data.kind;
  if (data.path_key !== undefined) updateData.path_key = data.path_key;
  if (data.program_id !== undefined)
    updateData.program_id = data.program_id ? Number(data.program_id) : null;
  if (data.is_followup !== undefined) updateData.is_followup = Boolean(data.is_followup);
  if (data.target_months !== undefined)
    updateData.target_months = data.target_months ? Number(data.target_months) : null;
  if (data.trigger_condition !== undefined)
    updateData.trigger_condition = data.trigger_condition;
  if (data.is_active !== undefined) updateData.is_active = Boolean(data.is_active);

  return prisma.surveyTemplate.update({ where: { id }, data: updateData });
};

const toggleTemplateActive = async (templateId, isActive) => {
  const prisma = requirePrisma();
  const id = Number(templateId);

  const existing = await prisma.surveyTemplate.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }

  if (!Boolean(isActive)) {
    return prisma.surveyTemplate.update({
      where: { id },
      data: { is_active: false }
    });
  }

  return prisma.$transaction(async (tx) => {
    // Keep only one active template per path.
    await tx.surveyTemplate.updateMany({
      where: {
        path_key: existing.path_key,
        id: { not: id }
      },
      data: { is_active: false }
    });

    return tx.surveyTemplate.update({
      where: { id },
      data: { is_active: true }
    });
  });
};

const cloneTemplate = async (sourceTemplateId, newKey, newName) => {
  const prisma = requirePrisma();
  const sourceId = Number(sourceTemplateId);

  const source = await prisma.surveyTemplate.findUnique({
    where: { id: sourceId },
    include: {
      template_questions: {
        include: {
          question: {
            include: { options: true }
          }
        }
      }
    }
  });

  if (!source) {
    const err = new Error('Source template not found');
    err.statusCode = 404;
    throw err;
  }

  const resolvedKey = newKey || `${source.template_key}_copy_${Date.now()}`;
  const resolvedName = newName || `${source.name} (Copy)`;

  return prisma.$transaction(async (tx) => {
    const cloned = await tx.surveyTemplate.create({
      data: {
        template_key: resolvedKey,
        name: resolvedName,
        description: source.description,
        kind: source.kind,
        path_key: source.path_key,
        program_id: source.program_id,
        is_followup: source.is_followup,
        target_months: source.target_months,
        trigger_condition: source.trigger_condition,
        is_active: false // clones start inactive
      }
    });

    for (const tq of source.template_questions) {
      await tx.templateQuestion.create({
        data: {
          template_id: cloned.id,
          question_id: tq.question_id,
          display_order: tq.display_order,
          is_required: tq.is_required,
          is_model_critical: tq.is_model_critical,
          model_critical_key: tq.model_critical_key,
          section_key: tq.section_key
        }
      });
    }

    return cloned;
  });
};

const deleteTemplate = async (templateId) => {
  const prisma = requirePrisma();
  const id = Number(templateId);

  const template = await prisma.surveyTemplate.findUnique({
    where: { id },
    include: {
      _count: { select: { survey_submissions: true } }
    }
  });

  if (!template) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }

  if (template._count.survey_submissions > 0) {
    // Soft-delete: deactivate instead
    return prisma.surveyTemplate.update({
      where: { id },
      data: { is_active: false }
    });
  }

  // Hard-delete: remove links first, then template
  return prisma.$transaction(async (tx) => {
    await tx.templateQuestion.deleteMany({ where: { template_id: id } });
    return tx.surveyTemplate.delete({ where: { id } });
  });
};

// ─── Questions ──────────────────────────────────────────────────────────────

const listQuestions = async (filters = {}) => {
  const prisma = requirePrisma();
  const where = {};

  if (filters.question_type) where.question_type = filters.question_type;
  if (filters.is_active !== undefined) where.is_active = filters.is_active;
  if (filters.search) {
    where.OR = [
      { question_key: { contains: filters.search } },
      { question_text: { contains: filters.search } }
    ];
  }

  return prisma.surveyQuestion.findMany({
    where,
    orderBy: { question_key: 'asc' },
    include: {
      options: { orderBy: { display_order: 'asc' } },
      _count: { select: { template_questions: true } }
    }
  });
};

const createQuestion = async (data) => {
  const prisma = requirePrisma();

  const questionKey =
    data.question_key || slugify(data.question_text).slice(0, 100);

  const existing = await prisma.surveyQuestion.findUnique({
    where: { question_key: questionKey }
  });

  if (existing) {
    const err = new Error(`Question key "${questionKey}" already exists`);
    err.statusCode = 409;
    throw err;
  }

  const question = await prisma.surveyQuestion.create({
    data: {
      question_key: questionKey,
      question_text: data.question_text,
      help_text: data.help_text || null,
      question_type: data.question_type || 'TEXT',
      is_active: true
    }
  });

  // Create options if supplied
  if (Array.isArray(data.options) && data.options.length > 0) {
    await prisma.surveyOption.createMany({
      data: data.options.map((opt, i) => ({
        question_id: question.id,
        option_value: typeof opt === 'string' ? opt : opt.value || opt.option_value,
        option_label: typeof opt === 'string' ? opt : opt.label || opt.option_label || opt.value,
        display_order: i
      }))
    });
  }

  return prisma.surveyQuestion.findUnique({
    where: { id: question.id },
    include: { options: { orderBy: { display_order: 'asc' } } }
  });
};

const updateQuestion = async (questionId, data) => {
  const prisma = requirePrisma();
  const id = Number(questionId);

  const existing = await prisma.surveyQuestion.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Question not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.question_text !== undefined) updateData.question_text = data.question_text;
  if (data.help_text !== undefined) updateData.help_text = data.help_text;
  if (data.question_type !== undefined) updateData.question_type = data.question_type;
  if (data.is_active !== undefined) updateData.is_active = Boolean(data.is_active);

  await prisma.surveyQuestion.update({ where: { id }, data: updateData });

  // Replace options if supplied
  if (Array.isArray(data.options)) {
    await prisma.surveyOption.deleteMany({ where: { question_id: id } });

    if (data.options.length > 0) {
      await prisma.surveyOption.createMany({
        data: data.options.map((opt, i) => ({
          question_id: id,
          option_value: typeof opt === 'string' ? opt : opt.value || opt.option_value,
          option_label: typeof opt === 'string' ? opt : opt.label || opt.option_label || opt.value,
          display_order: i
        }))
      });
    }
  }

  return prisma.surveyQuestion.findUnique({
    where: { id },
    include: { options: { orderBy: { display_order: 'asc' } } }
  });
};

const deleteQuestion = async (questionId) => {
  const prisma = requirePrisma();
  const id = Number(questionId);

  const question = await prisma.surveyQuestion.findUnique({
    where: { id },
    include: {
      _count: { select: { survey_answers: true } }
    }
  });

  if (!question) {
    const err = new Error('Question not found');
    err.statusCode = 404;
    throw err;
  }

  if (question._count.survey_answers > 0) {
    // Soft-delete: deactivate
    return prisma.surveyQuestion.update({
      where: { id },
      data: { is_active: false }
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.surveyOption.deleteMany({ where: { question_id: id } });
    await tx.templateQuestion.deleteMany({ where: { question_id: id } });
    return tx.surveyQuestion.delete({ where: { id } });
  });
};

// ─── Template ↔ Question links ──────────────────────────────────────────────

const addQuestionToTemplate = async (templateId, questionId, linkData = {}) => {
  const prisma = requirePrisma();
  const tId = Number(templateId);
  const qId = Number(questionId);

  // Verify both exist
  const [template, question] = await Promise.all([
    prisma.surveyTemplate.findUnique({ where: { id: tId } }),
    prisma.surveyQuestion.findUnique({ where: { id: qId } })
  ]);

  if (!template) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  if (!question) {
    const err = new Error('Question not found');
    err.statusCode = 404;
    throw err;
  }

  // Get max display_order for this template
  const maxOrder = await prisma.templateQuestion.aggregate({
    where: { template_id: tId },
    _max: { display_order: true }
  });

  return prisma.templateQuestion.upsert({
    where: {
      template_id_question_id: { template_id: tId, question_id: qId }
    },
    update: {
      display_order:
        linkData.display_order !== undefined
          ? Number(linkData.display_order)
          : undefined,
      is_required:
        linkData.is_required !== undefined
          ? Boolean(linkData.is_required)
          : undefined,
      is_model_critical:
        linkData.is_model_critical !== undefined
          ? Boolean(linkData.is_model_critical)
          : undefined,
      model_critical_key:
        linkData.model_critical_key !== undefined
          ? linkData.model_critical_key
          : undefined,
      section_key: linkData.section_key !== undefined ? linkData.section_key : undefined
    },
    create: {
      template_id: tId,
      question_id: qId,
      display_order:
        linkData.display_order !== undefined
          ? Number(linkData.display_order)
          : (maxOrder._max.display_order || 0) + 1,
      is_required: linkData.is_required !== undefined ? Boolean(linkData.is_required) : true,
      is_model_critical:
        linkData.is_model_critical !== undefined ? Boolean(linkData.is_model_critical) : false,
      model_critical_key: linkData.model_critical_key || null,
      section_key: linkData.section_key || null
    }
  });
};

const removeQuestionFromTemplate = async (templateId, questionId) => {
  const prisma = requirePrisma();

  return prisma.templateQuestion.delete({
    where: {
      template_id_question_id: {
        template_id: Number(templateId),
        question_id: Number(questionId)
      }
    }
  });
};

const reorderTemplateQuestions = async (templateId, orderedItems) => {
  const prisma = requirePrisma();
  const tId = Number(templateId);

  return prisma.$transaction(
    orderedItems.map((item, index) =>
      prisma.templateQuestion.update({
        where: {
          template_id_question_id: {
            template_id: tId,
            question_id: Number(item.question_id)
          }
        },
        data: {
          display_order: index + 1,
          section_key: item.section_key !== undefined ? item.section_key : undefined
        }
      })
    )
  );
};

module.exports = {
  listTemplates,
  getTemplateWithQuestions,
  createTemplate,
  updateTemplate,
  toggleTemplateActive,
  cloneTemplate,
  deleteTemplate,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  addQuestionToTemplate,
  removeQuestionFromTemplate,
  reorderTemplateQuestions
};
