const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { runMlScript } = require('../utils/mlRunner');
const fs = require('fs');
const path = require('path');

const ARIMA_MODEL_PATH = path.resolve(__dirname, '../../ml/models/arima/model.pkl');
const ARIMA_REPORT_PATH = path.resolve(__dirname, '../../ml/models/arima/training_report.json');
const ARIMA_DASHBOARD_DATA_PATH = path.resolve(__dirname, '../../ml/models/arima/arima_dashboard_data.json');
const EMPLOYABILITY_TRAINING_REPORT_PATH = path.resolve(
  __dirname,
  '../../ml/models/employability/training_report.json'
);
const EMPLOYABILITY_CLASSIFICATION_REPORT_PATH = path.resolve(
  __dirname,
  '../../ml/models/employability/evaluation/classification_report.json'
);
const JOB_MATCHING_CONFIG_PATH = path.resolve(__dirname, '../../ml/models/job_matcher_config.json');

const arimaTrainingState = {
  isRunning: false,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastError: null
};
let arimaStartupInitialized = false;

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

  const predictionsMap = new Map();
  if (Array.isArray(report?.historical_predictions)) {
    for (const p of report.historical_predictions) {
      predictionsMap.set(String(p.year), p.predicted);
    }
  }

  const mappedHistorical = historicalData.map(item => ({
    year: String(item.year),
    value: item.value,
    predicted: predictionsMap.get(String(item.year)) || null
  }));

  return {
    historical: mappedHistorical,
    forecast,
    metrics: {
      mae: Number(report?.metrics?.mae ?? 0),
      rmse: Number(report?.metrics?.rmse ?? 0)
    },
    insights: report?.insights || null,
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

    try {
      const report = loadArimaTrainingReport();
      const historicalData = await loadHistoricalEmploymentRates();
      if (report && historicalData.length > 0) {
        const dashboardData = buildArimaResponse({ historicalData, report });
        fs.writeFileSync(ARIMA_DASHBOARD_DATA_PATH, JSON.stringify(dashboardData));
      }
    } catch (e) {
      console.error('Failed to generate dashboard data after ARIMA training:', e);
    }

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
  if (arimaStartupInitialized) {
    return;
  }
  arimaStartupInitialized = true;

  try {
    const hasModel = fs.existsSync(ARIMA_MODEL_PATH);
    const hasReport = fs.existsSync(ARIMA_REPORT_PATH);

    if (hasModel && hasReport) {
      console.log('[ARIMA] Startup training skipped: existing model artifacts found.');
      return;
    }

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
    if (!fs.existsSync(ARIMA_DASHBOARD_DATA_PATH)) {
      return res.status(404).json({
        error: 'No available prediction data yet. Please click Predict on ARIMA tab in Prediction Models.',
        metadata: {
          isTraining: arimaTrainingState.isRunning,
          lastStartedAt: arimaTrainingState.lastStartedAt,
          lastCompletedAt: arimaTrainingState.lastCompletedAt,
          lastError: arimaTrainingState.lastError
        }
      });
    }

    const data = JSON.parse(fs.readFileSync(ARIMA_DASHBOARD_DATA_PATH, 'utf8'));
    return res.json(data);
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

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const toNumberOrNull = (value) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const getModelEvaluations = async (req, res) => {
  try {
    const refactorPrisma = requireRefactorPrisma();
    const employabilityTrainingReport = readJsonIfExists(EMPLOYABILITY_TRAINING_REPORT_PATH);
    const employabilityClassificationReport = readJsonIfExists(EMPLOYABILITY_CLASSIFICATION_REPORT_PATH);
    const jobMatchingConfig = readJsonIfExists(JOB_MATCHING_CONFIG_PATH);

    const [employabilityPredictions, jobMatchingPredictions] = await Promise.all([
      refactorPrisma.mlPrediction.findMany({
        where: { prediction_type: 'EMPLOYABILITY' },
        orderBy: { created_at: 'desc' },
        take: 5000,
        select: {
          id: true,
          alumni_profile_id: true,
          model_name: true,
          model_version: true,
          confidence: true,
          created_at: true,
          output_json: true
        }
      }),
      refactorPrisma.mlPrediction.findMany({
        where: { prediction_type: 'JOB_MATCHING' },
        orderBy: { created_at: 'desc' },
        take: 5000,
        select: {
          id: true,
          alumni_profile_id: true,
          model_name: true,
          model_version: true,
          confidence: true,
          created_at: true,
          output_json: true
        }
      })
    ]);

    const latestEmployabilityByProfile = new Map();
    for (const row of employabilityPredictions) {
      if (latestEmployabilityByProfile.has(row.alumni_profile_id)) continue;
      latestEmployabilityByProfile.set(row.alumni_profile_id, row);
    }
    const employabilityLatest = Array.from(latestEmployabilityByProfile.values());

    const employabilityPositive = employabilityLatest.filter((row) => {
      const output = row.output_json || {};
      if (typeof output?.employable === 'boolean') {
        return output.employable;
      }
      return String(output?.label || '').toLowerCase() === 'employable';
    });
    const avgEmployabilityProbability =
      employabilityLatest.length > 0
        ? employabilityLatest
            .map((row) => toNumberOrNull(row.output_json?.probability))
            .filter((v) => v !== null)
            .reduce((sum, v) => sum + v, 0) /
          Math.max(
            1,
            employabilityLatest.map((row) => toNumberOrNull(row.output_json?.probability)).filter((v) => v !== null)
              .length
          )
        : 0;
    const avgEmployabilityConfidence =
      employabilityLatest.length > 0
        ? employabilityLatest
            .map((row) => toNumberOrNull(row.output_json?.confidence) ?? toNumberOrNull(row.confidence))
            .filter((v) => v !== null)
            .reduce((sum, v) => sum + v, 0) /
          Math.max(
            1,
            employabilityLatest
              .map((row) => toNumberOrNull(row.output_json?.confidence) ?? toNumberOrNull(row.confidence))
              .filter((v) => v !== null).length
          )
        : 0;

    const latestJobByProfile = new Map();
    for (const row of jobMatchingPredictions) {
      if (latestJobByProfile.has(row.alumni_profile_id)) continue;
      latestJobByProfile.set(row.alumni_profile_id, row);
    }
    const jobLatest = Array.from(latestJobByProfile.values());
    const topMatches = jobLatest
      .map((row) => {
        const matches = Array.isArray(row.output_json?.matches) ? row.output_json.matches : [];
        return matches.length > 0 ? matches[0] : null;
      })
      .filter(Boolean);
    const avgTopMatchScore =
      topMatches.length > 0
        ? topMatches
            .map((match) => toNumberOrNull(match.display_score ?? match.final_score ?? match.score))
            .filter((v) => v !== null)
            .reduce((sum, v) => sum + v, 0) /
          Math.max(
            1,
            topMatches
              .map((match) => toNumberOrNull(match.display_score ?? match.final_score ?? match.score))
              .filter((v) => v !== null).length
          )
        : 0;
    const avgMatchedCompetencies =
      topMatches.length > 0
        ? topMatches
            .map((match) => toNumberOrNull(match.matched_competency_count))
            .filter((v) => v !== null)
            .reduce((sum, v) => sum + v, 0) /
          Math.max(
            1,
            topMatches.map((match) => toNumberOrNull(match.matched_competency_count)).filter((v) => v !== null).length
          )
        : 0;
    const avgCandidateMatchPct =
      topMatches.length > 0
        ? topMatches
            .map((match) => toNumberOrNull(match.candidate_match_percentage))
            .filter((v) => v !== null)
            .reduce((sum, v) => sum + v, 0) /
          Math.max(
            1,
            topMatches.map((match) => toNumberOrNull(match.candidate_match_percentage)).filter((v) => v !== null).length
          )
        : 0;

    return res.json({
      employability: {
        total_predictions: employabilityPredictions.length,
        latest_unique_profiles: employabilityLatest.length,
        positive_predictions: employabilityPositive.length,
        positive_rate: employabilityLatest.length > 0 ? (employabilityPositive.length / employabilityLatest.length) * 100 : 0,
        avg_probability: avgEmployabilityProbability,
        avg_confidence: avgEmployabilityConfidence,
        live_model_name: employabilityPredictions[0]?.model_name || 'employability_model',
        live_model_version: employabilityPredictions[0]?.model_version || null,
        last_prediction_at: employabilityPredictions[0]?.created_at || null
      },
      employability_training: employabilityTrainingReport
        ? {
            trained_at: employabilityTrainingReport.trained_at || null,
            dataset_size: employabilityTrainingReport.dataset_size ?? null,
            train_size: employabilityTrainingReport.train_size ?? null,
            test_size: employabilityTrainingReport.test_size ?? null,
            model_type: employabilityTrainingReport.model_type || null,
            final_metrics: employabilityTrainingReport.final_metrics || null,
            lr_metrics: employabilityTrainingReport.lr_metrics || null,
            rf_metrics: employabilityTrainingReport.rf_metrics || null,
            ensemble_metrics: employabilityTrainingReport.ensemble_metrics || null,
            weighted_f1: employabilityClassificationReport?.['weighted avg']?.['f1-score'] ?? null,
            macro_f1: employabilityClassificationReport?.['macro avg']?.['f1-score'] ?? null,
            employable_precision: employabilityClassificationReport?.Employable?.precision ?? null,
            employable_recall: employabilityClassificationReport?.Employable?.recall ?? null,
            not_employable_precision: employabilityClassificationReport?.['Not Employable']?.precision ?? null,
            not_employable_recall: employabilityClassificationReport?.['Not Employable']?.recall ?? null,
            confusion_matrix: employabilityTrainingReport.confusion_matrix || null,
            selection_rationale: employabilityTrainingReport.selection_rationale || null
          }
        : null,
      job_matching: {
        total_predictions: jobMatchingPredictions.length,
        latest_unique_profiles: jobLatest.length,
        avg_top_match_score: avgTopMatchScore * 100,
        avg_matched_competencies: avgMatchedCompetencies,
        avg_candidate_match_percentage: avgCandidateMatchPct,
        live_model_name: jobMatchingPredictions[0]?.model_name || null,
        live_model_version: jobMatchingPredictions[0]?.model_version || null,
        last_prediction_at: jobMatchingPredictions[0]?.created_at || null
      },
      job_matching_training: jobMatchingConfig
        ? {
            model_name: jobMatchingConfig.model_name || null,
            embedding_backend: jobMatchingConfig.embedding_backend || null,
            embedding_dim: jobMatchingConfig.embedding_dim ?? null,
            max_length_cap: jobMatchingConfig.max_length_cap ?? null,
            has_training_metrics: false
          }
        : null
    });
  } catch (error) {
    console.error('Get model evaluations error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch model evaluation metrics'
    });
  }
};

module.exports = {
  getArimaPrediction,
  rerunArimaTraining,
  getModelEvaluations,
  initializeArimaOnStartup
};
