const { getRefactorPrisma, getRefactorSetupStatus } = require('../config/db');

const requireRefactorPrisma = () => {
  const setupStatus = getRefactorSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getRefactorPrisma();
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
  alumni_count: program._count?.alumni_profiles || 0
});

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

    return res.json(programs.map(mapProgram));
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

    return res.json(programs.map((program) => ({
      id: program.id,
      name: program.name,
      code: program.code,
      college_name: program.college?.name || '',
      total_alumni: program._count.alumni_profiles,
      surveys_completed: 0,
      active_accounts: 0,
      employment_records: 0
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
