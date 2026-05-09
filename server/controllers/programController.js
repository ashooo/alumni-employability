const { getPrisma, getDatabaseSetupStatus } = require('../config/db');

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const notImplemented = (feature) => (req, res) => {
  return res.status(501).json({
    error: `${feature} is not implemented on the refactor schema yet`
  });
};

const mapProgram = (program) => ({
  id: program.id,
  name: program.name,
  code: program.code,
  description: program.description,
  college_id: program.college_id,
  college_name: program.college?.name || '',
  college_code: program.college?.code || '',
  alumni_count: program._count?.alumni_profiles || 0,
  active_accounts: program.active_accounts || 0,
  surveys_completed: program.surveys_completed || 0,
  employment_records: program.employment_records || 0
});

const buildProgramMetricMaps = async (refactorPrisma) => {
  const [activeRows, surveyedRows, employedRows] = await Promise.all([
    refactorPrisma.alumniProfile.groupBy({
      by: ['current_program_id'],
      where: {
        current_program_id: { not: null },
        lifecycle_status: 'ACTIVE'
      },
      _count: { _all: true }
    }),
    refactorPrisma.alumniProfile.groupBy({
      by: ['current_program_id'],
      where: {
        current_program_id: { not: null },
        survey_submissions: { some: { status: 'COMPLETED' } }
      },
      _count: { _all: true }
    }),
    refactorPrisma.alumniProfile.groupBy({
      by: ['current_program_id'],
      where: {
        current_program_id: { not: null },
        employment_outcomes: { some: {} }
      },
      _count: { _all: true }
    })
  ]);

  const toMap = (rows) =>
    new Map(
      rows
        .filter((row) => row.current_program_id !== null)
        .map((row) => [Number(row.current_program_id), Number(row._count?._all || 0)])
    );

  return {
    activeMap: toMap(activeRows),
    surveyedMap: toMap(surveyedRows),
    employedMap: toMap(employedRows)
  };
};

const getAllPrograms = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const { collegeId } = req.query;

    const programs = await refactorPrisma.program.findMany({
      where: collegeId && collegeId !== 'all'
        ? { college_id: Number(collegeId) }
        : undefined,
      include: {
        college: true,
        _count: {
          select: {
            alumni_profiles: true
          }
        }
      },
      orderBy: [
        { college: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    const { activeMap, surveyedMap, employedMap } = await buildProgramMetricMaps(refactorPrisma);
    const enriched = programs.map((program) => ({
      ...program,
      active_accounts: activeMap.get(program.id) || 0,
      surveys_completed: surveyedMap.get(program.id) || 0,
      employment_records: employedMap.get(program.id) || 0
    }));

    return res.json(enriched.map(mapProgram));
  } catch (error) {
    console.error('Get all programs error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch programs'
    });
  }
};

const getProgramsByCollege = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const { collegeId } = req.params;

    const programs = await refactorPrisma.program.findMany({
      where: { college_id: Number(collegeId) },
      include: {
        college: true,
        _count: {
          select: {
            alumni_profiles: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json(programs.map(mapProgram));
  } catch (error) {
    console.error('Get programs by college error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch programs'
    });
  }
};

const getProgramById = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const { id } = req.params;

    const program = await refactorPrisma.program.findUnique({
      where: { id: Number(id) },
      include: {
        college: true,
        _count: {
          select: {
            alumni_profiles: true
          }
        }
      }
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    return res.json(mapProgram(program));
  } catch (error) {
    console.error('Get program by id error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch program'
    });
  }
};

const getProgramStats = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const programs = await refactorPrisma.program.findMany({
      include: {
        college: true,
        _count: {
          select: {
            alumni_profiles: true,
            academic_snapshots: true
          }
        }
      },
      orderBy: [
        { college: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    const { activeMap, surveyedMap, employedMap } = await buildProgramMetricMaps(refactorPrisma);

    return res.json(programs.map((program) => ({
      id: program.id,
      name: program.name,
      code: program.code,
      college_name: program.college?.name || '',
      total_alumni: program._count.alumni_profiles,
      surveys_completed: surveyedMap.get(program.id) || 0,
      active_accounts: activeMap.get(program.id) || 0,
      employment_records: employedMap.get(program.id) || 0
    })));
  } catch (error) {
    console.error('Get program stats error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch program statistics'
    });
  }
};

module.exports = {
  getAllPrograms,
  getProgramsByCollege,
  getProgramById,
  createProgram: notImplemented('Program creation'),
  updateProgram: notImplemented('Program updates'),
  deleteProgram: notImplemented('Program deletion'),
  bulkCreatePrograms: notImplemented('Bulk program creation'),
  getProgramStats
};
