const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { runMlScript } = require('../utils/mlRunner');
const fs = require('fs');
const path = require('path');

const ARIMA_MODEL_PATH = path.resolve(__dirname, '../../ml/models/arima/model.pkl');
const ARIMA_REPORT_PATH = path.resolve(__dirname, '../../ml/models/arima/training_report.json');

const arimaTrainingState = {
  isRunning: false,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastError: null
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

const isEmployedOutcome = (status) => {
  return ['EMPLOYED', 'SELF_EMPLOYED', 'FREELANCER'].includes(String(status || '').toUpperCase());
};

const loadHistoricalEmploymentRates = async () => {
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
    return [];
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

  return Array.from(grouped.values())
    .sort((left, right) => left.year - right.year)
    .map((row) => ({
      year: String(row.year),
      value: row.total > 0 ? Number(((row.employed / row.total) * 100).toFixed(2)) : 0
    }));
};

const loadArimaTrainingReport = () => {
  if (!fs.existsSync(ARIMA_REPORT_PATH)) {
    return null;
  }

  const raw = fs.readFileSync(ARIMA_REPORT_PATH, 'utf8');
  return JSON.parse(raw);
};

const buildArimaResponse = ({ historicalData, report }) => {
  const forecast = Array.isArray(report?.forecast)
    ? report.forecast.map((item) => ({
      year: String(item.year),
      value: Number(item.forecast ?? 0),
      lower: Number(item.ci_lower ?? item.forecast ?? 0),
      upper: Number(item.ci_upper ?? item.forecast ?? 0)
    }))
    : [];

  return {
    historical: historicalData,
    forecast,
    metrics: {
      mae: Number(report?.metrics?.mae ?? 0),
      rmse: Number(report?.metrics?.rmse ?? 0)
    },
    metadata: {
      trainedAt: report?.trained_at || null,
      bestOrder: report?.best_order || null,
      isTraining: arimaTrainingState.isRunning,
      lastStartedAt: arimaTrainingState.lastStartedAt,
      lastCompletedAt: arimaTrainingState.lastCompletedAt,
      lastError: arimaTrainingState.lastError
    }
  };
};

const runArimaTraining = async ({ timeoutMs = 300000 } = {}) => {
  if (arimaTrainingState.isRunning) {
    return {
      started: false,
      alreadyRunning: true,
      message: 'ARIMA training is already running.'
    };
  }

  arimaTrainingState.isRunning = true;
  arimaTrainingState.lastStartedAt = new Date().toISOString();
  arimaTrainingState.lastError = null;

  try {
    const result = await runMlScript({
      scriptPath: 'training/arima/employability_rate.py',
      timeoutMs
    });

    if (result.code !== 0) {
      const details = (result.stderr && result.stderr.trim()) || (result.stdout && result.stdout.trim()) || 'Unknown ARIMA training failure';
      arimaTrainingState.lastError = details;
      throw new Error(details);
    }

    arimaTrainingState.lastCompletedAt = new Date().toISOString();

    return {
      started: true,
      success: true,
      stdout: result.stdout
    };
  } catch (error) {
    arimaTrainingState.lastCompletedAt = new Date().toISOString();
    arimaTrainingState.lastError = error.message || 'ARIMA training failed';
    throw error;
  } finally {
    arimaTrainingState.isRunning = false;
  }
};

const initializeArimaOnStartup = async () => {
  try {
    console.log('[ARIMA] Startup training triggered...');
    const result = await runArimaTraining({ timeoutMs: 300000 });
    if (result.alreadyRunning) {
      console.log('[ARIMA] Startup training skipped: already running.');
      return;
    }
    console.log('[ARIMA] Startup training completed.');
  } catch (error) {
    console.error('[ARIMA] Startup training failed:', error.message || error);
  }
};

const getArimaPrediction = async (req, res) => {
  try {
    const hasModel = fs.existsSync(ARIMA_MODEL_PATH);
    const report = loadArimaTrainingReport();

    if (!hasModel || !report) {
      return res.status(503).json({
        error: 'ARIMA model artifacts are not available yet. Training may still be running or has not completed.',
        metadata: {
          isTraining: arimaTrainingState.isRunning,
          lastStartedAt: arimaTrainingState.lastStartedAt,
          lastCompletedAt: arimaTrainingState.lastCompletedAt,
          lastError: arimaTrainingState.lastError
        }
      });
    }

    const historicalData = await loadHistoricalEmploymentRates();

    if (historicalData.length === 0) {
      return res.status(404).json({ error: 'No employment data found to generate historical trend.' });
    }

    return res.json(buildArimaResponse({ historicalData, report }));
  } catch (error) {
    console.error('Get ARIMA prediction error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Server error generating model predictions'
    });
  }
};

const rerunArimaTraining = async (req, res) => {
  try {
    const result = await runArimaTraining({ timeoutMs: 300000 });

    if (result.alreadyRunning) {
      return res.status(409).json({
        error: 'ARIMA training is already in progress.',
        metadata: {
          isTraining: arimaTrainingState.isRunning,
          lastStartedAt: arimaTrainingState.lastStartedAt,
          lastCompletedAt: arimaTrainingState.lastCompletedAt,
          lastError: arimaTrainingState.lastError
        }
      });
    }

    return res.json({
      message: 'ARIMA training completed successfully.',
      metadata: {
        isTraining: arimaTrainingState.isRunning,
        lastStartedAt: arimaTrainingState.lastStartedAt,
        lastCompletedAt: arimaTrainingState.lastCompletedAt,
        lastError: arimaTrainingState.lastError
      }
    });
  } catch (error) {
    console.error('Manual ARIMA training error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to train ARIMA model manually.',
      metadata: {
        isTraining: arimaTrainingState.isRunning,
        lastStartedAt: arimaTrainingState.lastStartedAt,
        lastCompletedAt: arimaTrainingState.lastCompletedAt,
        lastError: arimaTrainingState.lastError
      }
    });
  }
};

module.exports = {
  getArimaPrediction,
  rerunArimaTraining,
  initializeArimaOnStartup
};
