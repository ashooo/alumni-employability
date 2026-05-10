import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ArimaTab from './prediction_tabs/ArimaTab';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Info } from 'lucide-react';
import LoadingScreen from '@/components/ui/loading-screen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface EvaluationPayload {
  employability: {
    total_predictions: number;
    latest_unique_profiles: number;
    positive_predictions: number;
    positive_rate: number;
    avg_probability: number;
    avg_confidence: number;
    live_model_name?: string | null;
    live_model_version?: string | null;
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
    lr_metrics?: {
      f1?: number;
      auc?: number;
      accuracy?: number;
    } | null;
    rf_metrics?: {
      f1?: number;
      auc?: number;
      accuracy?: number;
    } | null;
    ensemble_metrics?: {
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
    live_model_name?: string | null;
    live_model_version?: string | null;
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

  const employabilityTrainingBars = evaluation?.employability_training
    ? [
        { name: 'Accuracy', value: (evaluation.employability_training.final_metrics?.accuracy ?? 0) * 100 },
        { name: 'Weighted F1', value: (evaluation.employability_training.weighted_f1 ?? 0) * 100 },
        { name: 'Macro F1', value: (evaluation.employability_training.macro_f1 ?? 0) * 100 },
        { name: 'AUC', value: (evaluation.employability_training.final_metrics?.auc ?? 0) * 100 },
        { name: 'Employable Recall', value: (evaluation.employability_training.employable_recall ?? 0) * 100 },
        { name: 'Not Employable Recall', value: (evaluation.employability_training.not_employable_recall ?? 0) * 100 }
      ]
    : [];

  const employabilityModelComparisonBars = evaluation?.employability_training
    ? [
        {
          name: 'Logistic Regression',
          accuracy: (evaluation.employability_training.lr_metrics?.accuracy ?? 0) * 100,
          f1: (evaluation.employability_training.lr_metrics?.f1 ?? 0) * 100
        },
        {
          name: 'Random Forest',
          accuracy: (evaluation.employability_training.rf_metrics?.accuracy ?? 0) * 100,
          f1: (evaluation.employability_training.rf_metrics?.f1 ?? 0) * 100
        },
        {
          name: 'Soft Voting',
          accuracy: (evaluation.employability_training.ensemble_metrics?.accuracy ?? 0) * 100,
          f1: (evaluation.employability_training.ensemble_metrics?.f1 ?? 0) * 100
        }
      ]
    : [];

  const jobMatchingLiveBars = evaluation
    ? [
        { name: 'Top Match Score', value: evaluation.job_matching.avg_top_match_score },
        { name: 'Candidate Match %', value: evaluation.job_matching.avg_candidate_match_percentage },
        { name: 'Matched Competencies', value: Math.min(100, evaluation.job_matching.avg_matched_competencies * 10) }
      ]
    : [];

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
          <div className="space-y-4">
            <h3 className="font-display font-semibold">Employability Performance &amp; Evaluation</h3>
            {loading ? (
              <LoadingScreen fullScreen={false} message="Loading evaluation metrics..." className="min-h-[300px]" />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : evaluation ? (
              <>
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Live Result</p>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard label="Latest Profiles" value={evaluation.employability.latest_unique_profiles.toLocaleString()} description="Unique alumni with latest employability predictions" />
                    <MetricCard label="Positive Predictions" value={evaluation.employability.positive_predictions.toLocaleString()} description="Latest predictions marked employable" />
                    <MetricCard label="Positive Rate" value={`${evaluation.employability.positive_rate.toFixed(1)}%`} description="Employable ratio among latest profile predictions" />
                    <MetricCard label="Avg Probability" value={`${(evaluation.employability.avg_probability * 100).toFixed(1)}%`} description="Average predicted employability probability" />
                    <MetricCard label="Avg Confidence" value={`${(evaluation.employability.avg_confidence * 100).toFixed(1)}%`} description="Average model confidence" />
                    <MetricCard label="Total Prediction Runs" value={evaluation.employability.total_predictions.toLocaleString()} description="All recorded employability prediction rows" />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 border-l-4 border-primary/60">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm mb-1">
                        What does this model do?{' '}
                        <span className="text-xs font-normal text-muted-foreground ml-1">(Employability <Info className="inline h-3 w-3" />)</span>
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This model predicts if an alumni profile is likely employable based on academic performance, competency signals, and experience-related indicators.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                  <p className="text-sm font-semibold">Evaluation</p>
                  <div className="mt-2 space-y-3 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">What it is:</strong> A supervised binary classifier that predicts whether an alumni profile is likely <em>Employable</em> or <em>Not Employable</em>.</p>
                    <p><strong className="text-foreground">Purpose:</strong> Provide an interpretable employability signal using academic, skills, internship, certification, board-exam, and program-based inputs.</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold">Training Evaluation</p>
                  <p className="mt-1 text-xs text-muted-foreground">Offline holdout metrics from the latest training artifact, used to monitor generalization quality.</p>
                  {evaluation.employability_training ? (
                    <div className="mt-3 space-y-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
                        <div>Accuracy: <strong>{((evaluation.employability_training.final_metrics?.accuracy ?? 0) * 100).toFixed(2)}%</strong></div>
                        <div>F1 (weighted): <strong>{(evaluation.employability_training.weighted_f1 ?? 0).toFixed(4)}</strong></div>
                        <div>AUC: <strong>{(evaluation.employability_training.final_metrics?.auc ?? 0).toFixed(4)}</strong></div>
                        <div>Precision (Employable): <strong>{(evaluation.employability_training.employable_precision ?? 0).toFixed(4)}</strong></div>
                        <div>Recall (Employable): <strong>{(evaluation.employability_training.employable_recall ?? 0).toFixed(4)}</strong></div>
                        <div>Dataset Size: <strong>{Number(evaluation.employability_training.dataset_size || 0).toLocaleString()}</strong></div>
                      </div>
                      <div className="rounded-xl border bg-background p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance Graph</p>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={employabilityTrainingBars}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: number) => `${Number(value).toFixed(2)}%`} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {employabilityTrainingBars.map((entry, index) => (
                                <Cell key={`emp-metric-${entry.name}-${index}`} fill={entry.value >= 80 ? 'hsl(var(--success))' : 'hsl(var(--primary))'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="rounded-xl border bg-background p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confusion Matrix</p>
                        {evaluation.employability_training.confusion_matrix?.length === 2 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr>
                                  <th className="border px-3 py-2 text-left">Actual \ Predicted</th>
                                  <th className="border px-3 py-2 text-left">Not Employable</th>
                                  <th className="border px-3 py-2 text-left">Employable</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border px-3 py-2 font-medium">Not Employable</td>
                                  <td className="border px-3 py-2">{evaluation.employability_training.confusion_matrix[0][0]}</td>
                                  <td className="border px-3 py-2">{evaluation.employability_training.confusion_matrix[0][1]}</td>
                                </tr>
                                <tr>
                                  <td className="border px-3 py-2 font-medium">Employable</td>
                                  <td className="border px-3 py-2">{evaluation.employability_training.confusion_matrix[1][0]}</td>
                                  <td className="border px-3 py-2">{evaluation.employability_training.confusion_matrix[1][1]}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Confusion matrix is unavailable in the training artifact.</p>
                        )}
                      </div>

                      <div className="rounded-xl border bg-background p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">LR vs RF vs Soft Voting</p>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="border px-3 py-2 text-left">Model</th>
                                <th className="border px-3 py-2 text-left">Accuracy</th>
                                <th className="border px-3 py-2 text-left">F1</th>
                                <th className="border px-3 py-2 text-left">AUC</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border px-3 py-2 font-medium">Logistic Regression</td>
                                <td className="border px-3 py-2">{((evaluation.employability_training.lr_metrics?.accuracy ?? 0) * 100).toFixed(2)}%</td>
                                <td className="border px-3 py-2">{(evaluation.employability_training.lr_metrics?.f1 ?? 0).toFixed(4)}</td>
                                <td className="border px-3 py-2">{(evaluation.employability_training.lr_metrics?.auc ?? 0).toFixed(4)}</td>
                              </tr>
                              <tr>
                                <td className="border px-3 py-2 font-medium">Random Forest</td>
                                <td className="border px-3 py-2">{((evaluation.employability_training.rf_metrics?.accuracy ?? 0) * 100).toFixed(2)}%</td>
                                <td className="border px-3 py-2">{(evaluation.employability_training.rf_metrics?.f1 ?? 0).toFixed(4)}</td>
                                <td className="border px-3 py-2">{(evaluation.employability_training.rf_metrics?.auc ?? 0).toFixed(4)}</td>
                              </tr>
                              <tr>
                                <td className="border px-3 py-2 font-medium">Soft Voting Ensemble</td>
                                <td className="border px-3 py-2">{((evaluation.employability_training.ensemble_metrics?.accuracy ?? 0) * 100).toFixed(2)}%</td>
                                <td className="border px-3 py-2">{(evaluation.employability_training.ensemble_metrics?.f1 ?? 0).toFixed(4)}</td>
                                <td className="border px-3 py-2">{(evaluation.employability_training.ensemble_metrics?.auc ?? 0).toFixed(4)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3">
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={employabilityModelComparisonBars}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(value: number) => `${Number(value).toFixed(2)}%`} />
                              <Bar dataKey="accuracy" fill="hsl(var(--primary))" name="Accuracy %" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="f1" fill="hsl(var(--success))" name="F1 %" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Selection rationale: {evaluation.employability_training.selection_rationale || 'N/A'}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No employability training artifact found.</p>
                  )}
                </motion.div>
              </>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="job-matching">
          <div className="space-y-4">
            <h3 className="font-display font-semibold">Job-Matching Performance &amp; Evaluation</h3>
            {loading ? (
              <LoadingScreen fullScreen={false} message="Loading evaluation metrics..." className="min-h-[300px]" />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : evaluation ? (
              <>
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Live Result</p>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard label="Latest Profiles" value={evaluation.job_matching.latest_unique_profiles.toLocaleString()} description="Unique alumni with latest job-matching predictions" />
                    <MetricCard label="Avg Top Match Score" value={`${evaluation.job_matching.avg_top_match_score.toFixed(1)}%`} description="Average top recommendation score" />
                    <MetricCard label="Avg Candidate Match" value={`${evaluation.job_matching.avg_candidate_match_percentage.toFixed(1)}%`} description="Average candidate skill overlap percentage" />
                    <MetricCard label="Avg Matched Competencies" value={evaluation.job_matching.avg_matched_competencies.toFixed(1)} description="Average number of matched competencies in top result" />
                    <MetricCard label="Total Prediction Runs" value={evaluation.job_matching.total_predictions.toLocaleString()} description="All recorded job-matching prediction rows" />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 border-l-4 border-primary/60">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm mb-1">
                        What does this model do?{' '}
                        <span className="text-xs font-normal text-muted-foreground ml-1">(Job Matching <Info className="inline h-3 w-3" />)</span>
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This model ranks job roles against alumni competencies and profile context to surface the strongest-fit opportunities from live predictions.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                  <p className="text-sm font-semibold">Evaluation</p>
                  <div className="mt-2 space-y-3 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">What it is:</strong> A retrieval/ranking model that compares alumni competencies against occupation requirements.</p>
                    <p><strong className="text-foreground">Purpose:</strong> Recommend best-fit job roles and quantify matching strength through overlap and ranking scores.</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold">Training Evaluation</p>
                  {evaluation.job_matching_training ? (
                    <div className="mt-2 space-y-4">
                      <div className="text-sm space-y-1">
                        <p>Model: <strong>{evaluation.job_matching_training.model_name || 'N/A'}</strong></p>
                        <p>Embedding Backend: <strong>{evaluation.job_matching_training.embedding_backend || 'N/A'}</strong></p>
                        <p>Embedding Dim: <strong>{evaluation.job_matching_training.embedding_dim ?? 'N/A'}</strong></p>
                        <p>Max Length Cap: <strong>{evaluation.job_matching_training.max_length_cap ?? 'N/A'}</strong></p>
                      </div>
                      <div className="rounded-xl border bg-background p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Performance Graph</p>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={jobMatchingLiveBars}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: number, name: string) => name === 'Matched Competencies' ? Number(value).toFixed(1) : `${Number(value).toFixed(2)}%`} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">Detailed ranking training metrics (e.g., NDCG/MRR/Hit@K) are not yet exported to a report file.</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No job-matching training artifact found.</p>
                  )}
                </motion.div>
              </>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
