const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { runMlScript } = require('../utils/mlRunner');

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const isEmployedOutcome = (status) => {
  return ['EMPLOYED', 'SELF_EMPLOYED', 'FREELANCER'].includes(String(status || '').toUpperCase());
};

const getArimaPrediction = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const outcomes = await refactorPrisma.employmentOutcome.findMany({
      where: {
        alumni_profile: {
          batch_year: {
            lte: new Date().getFullYear()
          }
        }
      },
      include: {
        alumni_profile: true
      },
      orderBy: {
        alumni_profile: {
          batch_year: 'asc'
        }
      }
    });

    if (outcomes.length === 0) {
      return res.status(404).json({ error: 'No employment data found to run ARIMA predictions.' });
    }

    const grouped = new Map();

    for (const outcome of outcomes) {
      const year = outcome.alumni_profile.batch_year;
      if (!grouped.has(year)) {
        grouped.set(year, { year, employed: 0, total: 0 });
      }

      const bucket = grouped.get(year);
      bucket.total += 1;
      if (isEmployedOutcome(outcome.employment_status)) {
        bucket.employed += 1;
      }
    }

    const historicalData = Array.from(grouped.values())
      .sort((left, right) => left.year - right.year)
      .map((row) => ({
        year: row.year,
        employment_rate: row.total > 0 ? (row.employed / row.total) * 100 : 0
      }));

    const result = await runMlScript({
      scriptPath: 'scripts/predict_employment_rate.py',
      input: historicalData
    });

    if (result.code !== 0) {
      console.error('Python script error output:', result.stderr);
      return res.status(500).json({
        error: 'Failed to generate prediction with model.',
        details: result.stderr
      });
    }

    try {
      return res.json(JSON.parse(result.stdout));
    } catch (error) {
      console.error('Error parsing Python script output:', result.stdout);
      return res.status(500).json({
        error: 'Failed to parse model output.',
        details: result.stdout
      });
    }
  } catch (error) {
    console.error('Get ARIMA prediction error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Server error generating model predictions'
    });
  }
};

module.exports = {
  getArimaPrediction
};
