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

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeString = (value) => String(value || '').trim();

const mapCollegeRecord = (college) => ({
  id: college.id,
  name: college.name,
  code: college.code,
  description: college.description,
  created_at: college.created_at,
  updated_at: college.updated_at
});

// Get all colleges with program counts
const getColleges = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const colleges = await refactorPrisma.college.findMany({
      include: {
        programs: {
          select: {
            id: true,
            _count: {
              select: {
                alumni_profiles: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const mapped = colleges.map((college) => ({
      ...mapCollegeRecord(college),
      program_count: college.programs.length,
      alumni_count: college.programs.reduce(
        (sum, program) => sum + (program._count?.alumni_profiles || 0),
        0
      )
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Get colleges error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch colleges' });
  }
};

// Get single college by ID with programs
const getCollegeById = async (req, res) => {
  try {
    const id = parseOptionalInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid college id' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const college = await refactorPrisma.college.findUnique({
      where: { id },
      include: {
        programs: {
          include: {
            _count: {
              select: {
                alumni_profiles: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    return res.json({
      ...mapCollegeRecord(college),
      programs: college.programs.map((program) => ({
        id: program.id,
        name: program.name,
        code: program.code,
        description: program.description,
        college_id: program.college_id,
        created_at: program.created_at,
        updated_at: program.updated_at,
        alumni_count: program._count?.alumni_profiles || 0
      }))
    });
  } catch (error) {
    console.error('Get college error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch college' });
  }
};

// Add new college
const addCollege = async (req, res) => {
  try {
    const name = normalizeString(req.body?.name);
    const code = normalizeString(req.body?.code) || null;
    const description = normalizeString(req.body?.description) || null;

    if (!name) {
      return res.status(400).json({ error: 'College name is required' });
    }

    const refactorPrisma = requireRefactorPrisma();

    if (code) {
      const existing = await refactorPrisma.college.findFirst({
        where: { code },
        select: { id: true }
      });

      if (existing) {
        return res.status(400).json({ error: 'College code already exists' });
      }
    }

    const created = await refactorPrisma.college.create({
      data: {
        name,
        code,
        description
      }
    });

    return res.status(201).json(mapCollegeRecord(created));
  } catch (error) {
    console.error('Add college error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to add college' });
  }
};

// Update college
const updateCollege = async (req, res) => {
  try {
    const id = parseOptionalInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid college id' });
    }

    const name = normalizeString(req.body?.name);
    const code = normalizeString(req.body?.code) || null;
    const description = normalizeString(req.body?.description) || null;

    if (!name) {
      return res.status(400).json({ error: 'College name is required' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const college = await refactorPrisma.college.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!college) {
      return res.status(404).json({ error: 'College not found' });
    }

    if (code) {
      const existing = await refactorPrisma.college.findFirst({
        where: {
          code,
          id: {
            not: id
          }
        },
        select: { id: true }
      });

      if (existing) {
        return res.status(400).json({ error: 'College code already exists' });
      }
    }

    await refactorPrisma.college.update({
      where: { id },
      data: {
        name,
        code,
        description
      }
    });

    return res.json({ success: true, message: 'College updated successfully' });
  } catch (error) {
    console.error('Update college error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update college' });
  }
};

// Delete college (only if no programs)
const deleteCollege = async (req, res) => {
  try {
    const id = parseOptionalInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid college id' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const programCount = await refactorPrisma.program.count({
      where: {
        college_id: id
      }
    });

    if (programCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete college because it has associated programs'
      });
    }

    const deleted = await refactorPrisma.college.deleteMany({
      where: { id }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    return res.json({ success: true, message: 'College deleted successfully' });
  } catch (error) {
    console.error('Delete college error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to delete college' });
  }
};

// Get college statistics
const getCollegeStats = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const colleges = await refactorPrisma.college.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    const stats = await Promise.all(
      colleges.map(async (college) => {
        const [totalPrograms, totalAlumni, surveysCompleted, activeAccounts] =
          await Promise.all([
            refactorPrisma.program.count({
              where: { college_id: college.id }
            }),
            refactorPrisma.alumniProfile.count({
              where: {
                current_program: {
                  college_id: college.id
                }
              }
            }),
            refactorPrisma.alumniProfile.count({
              where: {
                current_program: {
                  college_id: college.id
                },
                survey_submissions: {
                  some: {
                    status: 'COMPLETED'
                  }
                }
              }
            }),
            refactorPrisma.alumniProfile.count({
              where: {
                current_program: {
                  college_id: college.id
                },
                lifecycle_status: 'ACTIVE'
              }
            })
          ]);

        return {
          id: college.id,
          name: college.name,
          code: college.code,
          total_programs: totalPrograms,
          total_alumni: totalAlumni,
          surveys_completed: surveysCompleted,
          active_accounts: activeAccounts
        };
      })
    );

    return res.json(stats);
  } catch (error) {
    console.error('Get college stats error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch college statistics' });
  }
};

module.exports = {
  getColleges,
  getCollegeById,
  addCollege,
  updateCollege,
  deleteCollege,
  getCollegeStats
};
