import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ArimaTab from './prediction_tabs/ArimaTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface EvaluationPayload {
  employability: {
    total_predictions: number;
    latest_unique_profiles: number;
    positive_predictions: number;
    positive_rate: number;
    avg_probability: number;
    avg_confidence: number;
    last_prediction_at: string | null;
  };
  employability_training: {
    trained_at: string | null;
    dataset_size: number | null;
    train_size: number | null;
    test_size: number | null;
    model_type: string | null;
    final_metrics: {
      f1?: number;
      auc?: number;
      accuracy?: number;
    } | null;
    weighted_f1: number | null;
    macro_f1: number | null;
    employable_precision: number | null;
    employable_recall: number | null;
    not_employable_precision: number | null;
    not_employable_recall: number | null;
    confusion_matrix: number[][] | null;
    selection_rationale: string | null;
  } | null;
  job_matching: {
    total_predictions: number;
    latest_unique_profiles: number;
    avg_top_match_score: number;
    avg_matched_competencies: number;
    avg_candidate_match_percentage: number;
    last_prediction_at: string | null;
  };
  job_matching_training: {
    model_name: string | null;
    embedding_backend: string | null;
    embedding_dim: number | null;
    max_length_cap: number | null;
    has_training_metrics: boolean;
  } | null;
}

function MetricCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold font-display">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AdminPredictions() {
  const [evaluation, setEvaluation] = useState<EvaluationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/predictions/evaluations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to fetch model evaluations');
        }
        setEvaluation(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch model evaluations');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Prediction Model Evaluations</h1>
        <p className="text-muted-foreground text-sm">
          ARIMA trend forecasting plus live evaluation summaries for Employability and Job-Matching models
        </p>
      </div>

      <Tabs defaultValue="arima">
        <TabsList className="mb-4">
          <TabsTrigger value="arima">ARIMA</TabsTrigger>
          <TabsTrigger value="employability">Employability</TabsTrigger>
          <TabsTrigger value="job-matching">Job Matching</TabsTrigger>
        </TabsList>

        <TabsContent value="arima">
          <ArimaTab />
        </TabsContent>

        <TabsContent value="employability">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Employability Model Evaluation</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading evaluation metrics...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : evaluation ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="Latest Profiles"
                    value={evaluation.employability.latest_unique_profiles.toLocaleString()}
                    description="Unique alumni with latest employability predictions"
                  />
                  <MetricCard
                    label="Positive Predictions"
                    value={evaluation.employability.positive_predictions.toLocaleString()}
                    description="Latest predictions marked employable"
                  />
                  <MetricCard
                    label="Positive Rate"
                    value={`${evaluation.employability.positive_rate.toFixed(1)}%`}
                    description="Employable ratio among latest profile predictions"
                  />
                  <MetricCard
                    label="Avg Probability"
                    value={`${(evaluation.employability.avg_probability * 100).toFixed(1)}%`}
                    description="Average predicted employability probability"
                  />
                  <MetricCard
                    label="Avg Confidence"
                    value={`${(evaluation.employability.avg_confidence * 100).toFixed(1)}%`}
                    description="Average model confidence"
                  />
                  <MetricCard
                    label="Total Prediction Runs"
                    value={evaluation.employability.total_predictions.toLocaleString()}
                    description="All recorded employability prediction rows"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Last prediction: {evaluation.employability.last_prediction_at ? new Date(evaluation.employability.last_prediction_at).toLocaleString() : 'N/A'}
                </p>
                <div className="mt-2 rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Training Evaluation</p>
                  {evaluation.employability_training ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
                      <div>Accuracy: <strong>{((evaluation.employability_training.final_metrics?.accuracy ?? 0) * 100).toFixed(2)}%</strong></div>
                      <div>F1 (weighted): <strong>{(evaluation.employability_training.weighted_f1 ?? 0).toFixed(4)}</strong></div>
                      <div>AUC: <strong>{(evaluation.employability_training.final_metrics?.auc ?? 0).toFixed(4)}</strong></div>
                      <div>Precision (Employable): <strong>{(evaluation.employability_training.employable_precision ?? 0).toFixed(4)}</strong></div>
                      <div>Recall (Employable): <strong>{(evaluation.employability_training.employable_recall ?? 0).toFixed(4)}</strong></div>
                      <div>Dataset Size: <strong>{Number(evaluation.employability_training.dataset_size || 0).toLocaleString()}</strong></div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No employability training artifact found.</p>
                  )}
                </div>
              </>
            ) : null}
          </motion.div>
        </TabsContent>

        <TabsContent value="job-matching">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Job-Matching Model Evaluation</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading evaluation metrics...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : evaluation ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="Latest Profiles"
                    value={evaluation.job_matching.latest_unique_profiles.toLocaleString()}
                    description="Unique alumni with latest job-matching predictions"
                  />
                  <MetricCard
                    label="Avg Top Match Score"
                    value={`${evaluation.job_matching.avg_top_match_score.toFixed(1)}%`}
                    description="Average top recommendation score"
                  />
                  <MetricCard
                    label="Avg Candidate Match"
                    value={`${evaluation.job_matching.avg_candidate_match_percentage.toFixed(1)}%`}
                    description="Average candidate skill overlap percentage"
                  />
                  <MetricCard
                    label="Avg Matched Competencies"
                    value={evaluation.job_matching.avg_matched_competencies.toFixed(1)}
                    description="Average number of matched competencies in top result"
                  />
                  <MetricCard
                    label="Total Prediction Runs"
                    value={evaluation.job_matching.total_predictions.toLocaleString()}
                    description="All recorded job-matching prediction rows"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Last prediction: {evaluation.job_matching.last_prediction_at ? new Date(evaluation.job_matching.last_prediction_at).toLocaleString() : 'N/A'}
                </p>
                <div className="mt-2 rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Training Evaluation</p>
                  {evaluation.job_matching_training ? (
                    <div className="mt-2 text-sm space-y-1">
                      <p>Model: <strong>{evaluation.job_matching_training.model_name || 'N/A'}</strong></p>
                      <p>Embedding Backend: <strong>{evaluation.job_matching_training.embedding_backend || 'N/A'}</strong></p>
                      <p>Embedding Dim: <strong>{evaluation.job_matching_training.embedding_dim ?? 'N/A'}</strong></p>
                      <p>Max Length Cap: <strong>{evaluation.job_matching_training.max_length_cap ?? 'N/A'}</strong></p>
                      <p className="text-xs text-muted-foreground pt-1">
                        Detailed ranking training metrics (e.g., NDCG/MRR/Hit@K) are not yet exported to a report file.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No job-matching training artifact found.</p>
                  )}
                </div>
              </>
            ) : null}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
