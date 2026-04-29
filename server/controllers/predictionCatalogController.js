const { getPrisma, getDatabaseSetupStatus } = require('../config/db');

const COMPETENCY_KIND_ALIASES = {
  SKILL: ['SOFT_SKILL', 'HARD_SKILL'],
  SOFT_SKILL: ['SOFT_SKILL'],
  HARD_SKILL: ['HARD_SKILL'],
  KNOWLEDGE: ['KNOWLEDGE'],
  ABILITY: ['ABILITY'],
  INTEREST: ['INTEREST'],
  TECHNOLOGY: ['TECHNOLOGY']
};

const normalizeKindToken = (value) =>
  String(value || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const parseCompetencyKinds = (kindQuery) => {
  if (!kindQuery) {
    return { kinds: [], invalidKinds: [] };
  }

  const rawKinds = Array.isArray(kindQuery)
    ? kindQuery.flatMap((value) => String(value).split(','))
    : String(kindQuery).split(',');

  const kinds = new Set();
  const invalidKinds = [];

  for (const rawKind of rawKinds) {
    const normalizedKind = normalizeKindToken(rawKind);

    if (!normalizedKind) {
      continue;
    }

    const expandedKinds = COMPETENCY_KIND_ALIASES[normalizedKind];

    if (!expandedKinds) {
      invalidKinds.push(rawKind);
      continue;
    }

    for (const kind of expandedKinds) {
      kinds.add(kind);
    }
  }

  return {
    kinds: Array.from(kinds),
    invalidKinds
  };
};

const parseActiveFilter = (activeQuery) => {
  if (activeQuery === undefined) {
    return { value: true };
  }

  const normalized = String(activeQuery).trim().toLowerCase();

  if (normalized === 'all') {
    return { value: undefined };
  }

  if (['true', '1', 'yes'].includes(normalized)) {
    return { value: true };
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return { value: false };
  }

  return {
    error: 'Invalid active filter. Use true, false, or all.'
  };
};

const requireRefactorPrisma = (res) => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    res.status(503).json({
      error: 'Refactor Prisma setup is not ready',
      details: setupStatus.message
    });
    return null;
  }

  return getPrisma();
};

const getSkills = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma(res);
    if (!refactorPrisma) {
      return;
    }

    const competencies = await refactorPrisma.competency.findMany({
      where: {
        kind: { in: ['HARD_SKILL', 'SOFT_SKILL'] },
        is_active: true
      },
      orderBy: [
        { kind: 'asc' },
        { name: 'asc' }
      ]
    });

    const mapped = competencies.map((competency) => ({
      id: competency.id,
      name: competency.name,
      type: competency.kind === 'SOFT_SKILL' ? 'soft' : 'hard',
      description: competency.description
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
};

const getDegrees = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma(res);
    if (!refactorPrisma) {
      return;
    }

    const programs = await refactorPrisma.program.findMany({
      orderBy: [{ name: 'asc' }]
    });

    const mappedPrograms = programs.map((program) => ({
      id: program.id,
      name: program.name,
      code: program.code,
      college_id: program.college_id,
      description: program.description
    }));

    return res.json(mappedPrograms);
  } catch (error) {
    console.error('Get degrees error:', error);
    res.status(500).json({ error: 'Failed to fetch degrees' });
  }
};

const getCompetencies = async (req, res) => {
  const refactorPrisma = requireRefactorPrisma(res);
  if (!refactorPrisma) {
    return;
  }

  const { kinds, invalidKinds } = parseCompetencyKinds(req.query.kind);
  if (invalidKinds.length > 0) {
    return res.status(400).json({
      error: `Invalid competency kind: ${invalidKinds.join(', ')}`
    });
  }

  const activeFilter = parseActiveFilter(req.query.active);
  if (activeFilter.error) {
    return res.status(400).json({ error: activeFilter.error });
  }

  const search = String(req.query.search || '').trim();
  const where = {};

  if (kinds.length === 1) {
    where.kind = kinds[0];
  } else if (kinds.length > 1) {
    where.kind = { in: kinds };
  }

  if (activeFilter.value !== undefined) {
    where.is_active = activeFilter.value;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { category: { contains: search } },
      { description: { contains: search } }
    ];
  }

  try {
    const competencies = await refactorPrisma.competency.findMany({
      where,
      orderBy: [
        { kind: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(competencies);
  } catch (error) {
    console.error('Get competencies error:', error);
    res.status(500).json({ error: 'Failed to fetch competencies' });
  }
};

module.exports = {
  getCompetencies,
  getSkills,
  getDegrees
};
