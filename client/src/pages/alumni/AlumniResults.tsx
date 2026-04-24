import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { AlertTriangle, Star, Briefcase, TrendingUp, Loader2, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type CompetencyKind =
  | 'SOFT_SKILL'
  | 'HARD_SKILL'
  | 'KNOWLEDGE'
  | 'ABILITY'
  | 'INTEREST'
  | 'TECHNOLOGY';

interface Prediction {
  id: number;
  probability: number;
  employable: boolean;
  confidence: number;
  input_snapshot: any;
  created_at: string;
  label?: string | null;
  submission_summary?: {
    id: number;
    branch_path?: string | null;
    survey_answers: Array<{
      question_id: number;
      question_key?: string | null;
      question_text: string;
      value: string | number | boolean | Record<string, unknown> | null;
    }>;
    competencies: Array<{
      id: number;
      name: string;
      kind: CompetencyKind;
      score?: number | null;
      importance?: number | null;
      selected?: boolean;
    }>;
    competencies_by_kind: Record<
      CompetencyKind,
      Array<{
        id: number;
        name: string;
        kind: CompetencyKind;
        score?: number | null;
        importance?: number | null;
        selected?: boolean;
      }>
    >;
  } | null;
}

interface JobMatch {
  title: string;
  score?: number;
  final_score?: number;
  cosine_score?: number;
  match_percentage?: number;
  matched_competencies?: string[];
  missing_competencies?: string[];
  all_competencies?: string[];
  core_overlap?: number;
  token_overlap?: number;
  title_overlap?: number;
  tech_alignment?: number;
  domain_penalty?: number;
}

interface JobMatchingPrediction {
  id: number;
  studentId: string;
  predictionType: string;
  modelName: string;
  modelVersion: string;
  confidence: number | null;
  topN: number;
  totalMatches: number;
  candidateSkills: string[];
  matches: JobMatch[];
  sourceSubmissionId?: number | null;
  academicSnapshotId?: number | null;
  predictionDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const COMPETENCY_GROUP_LABELS = {
  HARD_SKILL: 'Hard Skills',
  SOFT_SKILL: 'Soft Skills',
  KNOWLEDGE: 'Knowledge',
  ABILITY: 'Abilities',
  INTEREST: 'Interests',
  TECHNOLOGY: 'Technology Skills'
} as const;

const formatChoiceValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
};

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const getJobMatchScorePercent = (match: JobMatch) => {
  const rawScore =
    typeof match.final_score === 'number'
      ? match.final_score
      : typeof match.score === 'number'
        ? match.score
        : null;

  if (rawScore === null) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(rawScore * 100)));
};

export default function AlumniResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobMatchingLoading, setJobMatchingLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [jobMatching, setJobMatching] = useState<JobMatchingPrediction | null>(null);
  const [jobMatchingError, setJobMatchingError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchLatestPrediction = async () => {
      if (!user?.username) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }

      try {
        const token = getToken();
        const predictionResponse = await fetch(
          `${API_URL}/prediction/employability/latest/${user.username}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!predictionResponse.ok) {
          return;
        }

        const predictionData = await predictionResponse.json();
        if (!isActive) {
          return;
        }

        setPrediction(predictionData);
        setJobMatchingLoading(true);
        setJobMatchingError(null);
        setLoading(false);

        const jobHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        let jobMatchingResponse = await fetch(
          `${API_URL}/prediction/job-matching/latest/${user.username}`,
          {
            headers: jobHeaders
          }
        );

        if (jobMatchingResponse.status === 404) {
          const generateResponse = await fetch(
            `${API_URL}/prediction/job-matching/generate/${user.username}`,
            {
              method: 'POST',
              headers: jobHeaders,
              body: JSON.stringify({ topN: 5 })
            }
          );

          if (!generateResponse.ok) {
            const generateError = await generateResponse.json().catch(() => null);
            throw new Error(generateError?.error || 'Unable to generate live job matches.');
          }

          jobMatchingResponse = await fetch(
            `${API_URL}/prediction/job-matching/latest/${user.username}`,
            {
              headers: jobHeaders
            }
          );
        }

        if (!jobMatchingResponse.ok) {
          const jobMatchingFailure = await jobMatchingResponse.json().catch(() => null);
          throw new Error(jobMatchingFailure?.error || 'Unable to load live job matches.');
        }

        const jobMatchingData = await jobMatchingResponse.json();
        if (isActive) {
          setJobMatching(jobMatchingData);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        if (isActive) {
          setJobMatchingError(
            error instanceof Error ? error.message : 'Unable to load live job-matching results.'
          );
        }
      } finally {
        if (isActive) {
          setJobMatchingLoading(false);
          setLoading(false);
        }
      }
    };

    fetchLatestPrediction();

    return () => {
      isActive = false;
    };
  }, [user?.username]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
        <h2 className="text-xl font-display font-bold">Assessment Required</h2>
        <p className="text-muted-foreground">
          Please complete the employability assessment first to view your AI-powered results.
        </p>
        <Button onClick={() => navigate('/app/alumni/survey')}>Take Assessment Now</Button>
      </div>
    );
  }

  const readinessScore = Math.round(prediction.probability * 100);
  const isEmployable = prediction.employable;
  const snapshot = prediction.input_snapshot || {};
  const submissionSummary = prediction.submission_summary;
  const hasJobMatches = Boolean(jobMatching?.matches?.length);
  const academicSummary = [
    { label: 'Degree', value: snapshot.Degree || 'Not provided' },
    { label: 'Gender', value: snapshot.Gender || 'Not provided' },
    { label: 'Age', value: snapshot.Age || 'Not provided' },
    { label: 'Year Graduated', value: snapshot['Year Graduated'] || 'Not provided' },
    { label: 'CGPA', value: snapshot.CGPA || 'Not provided' },
    { label: 'Average Prof Grade', value: snapshot['Average Prof Grade'] || 'Not provided' },
    { label: 'Average Elec Grade', value: snapshot['Average Elec Grade'] || 'Not provided' },
    { label: 'OJT Grade', value: snapshot['OJT Grade'] || 'Not provided' },
    { label: 'Leadership Position', value: snapshot['Leadership POS'] || 'Not provided' },
    { label: 'Active Membership', value: snapshot['Act Member POS'] || 'Not provided' },
    { label: 'Soft Skills Average', value: snapshot['Soft Skills Ave'] || 'Not provided' },
    { label: 'Hard Skills Average', value: snapshot['Hard Skills Ave'] || 'Not provided' }
  ];
  const radarData = [
    { skill: 'CGPA', value: (parseFloat(snapshot.CGPA) || 0) * 20 },
    { skill: 'Prof Grade', value: (parseFloat(snapshot['Average Prof Grade']) || 0) * 20 },
    { skill: 'Soft Skills', value: (snapshot['Soft Skills Ave'] || 0) * 20 },
    { skill: 'Hard Skills', value: (snapshot['Hard Skills Ave'] || 0) * 20 },
    { skill: 'OJT', value: (parseFloat(snapshot['OJT Grade']) || 0) * 20 }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Employability Insights</h1>
          <p className="text-sm text-muted-foreground">
            AI Prediction Model v1.0 | Last updated{' '}
            {new Date(prediction.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/alumni/survey')}>
          Retake Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-t-4 border-t-primary p-6 text-center shadow-lg"
        >
          <p className="mb-2 text-sm text-muted-foreground">Readiness Probability</p>
          <div className="relative mb-3 inline-flex h-24 w-24 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={isEmployable ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${readinessScore * 2.51} 251`}
              />
            </svg>
            <span className="absolute text-2xl font-bold font-display">{readinessScore}%</span>
          </div>
          <p className={`text-xs font-bold ${isEmployable ? 'text-success' : 'text-destructive'}`}>
            {isEmployable ? 'HIGH POTENTIAL' : 'DEVELOPING PROFILE'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 text-center shadow-lg"
        >
          <p className="mb-2 text-sm text-muted-foreground">Primary Prediction</p>
          <p
            className={`mb-2 text-4xl font-bold font-display ${
              isEmployable ? 'text-success' : 'text-destructive'
            }`}
          >
            {isEmployable ? 'Employable' : 'Building'}
          </p>
          <p className="text-xs text-muted-foreground">
            Model confidence: {Math.round(prediction.confidence * 100)}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 shadow-lg"
        >
          <p className="mb-3 text-sm text-muted-foreground">Strongest Indicators</p>
          <div className="space-y-2">
            {[
              { label: 'CGPA', value: snapshot.CGPA },
              { label: 'Leadership', value: snapshot['Leadership POS'] },
              { label: 'Hard Skills', value: snapshot['Hard Skills Ave'] }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-xs font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="glass-card border-l-4 border-l-primary p-4">
        <p className="text-sm text-muted-foreground">
          The <strong>employability prediction above is live model output</strong> generated from your
          saved academic and competency inputs.
          {jobMatchingLoading
            ? ' The job-matching model is now generating live market alignment from your saved competencies.'
            : hasJobMatches
              ? ' The market alignment cards below are now using the live job-matching model as well.'
              : jobMatchingError
                ? ` Job matching could not be loaded yet: ${jobMatchingError}`
                : ' Live job-matching results are not available for this prediction yet.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-6 shadow-xl">
          <h3 className="mb-6 flex items-center gap-2 font-display font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" /> Feature Contribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Your Profile"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
                strokeWidth={3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-center text-xs italic text-muted-foreground">
            Normalized snapshot of features used for this specific prediction.
          </p>
        </div>

        <div className="glass-card p-6 shadow-xl">
          <h3 className="mb-6 flex items-center gap-2 font-display font-semibold">
            <Briefcase className="h-5 w-5 text-primary" /> Market Alignment
          </h3>

          {jobMatchingLoading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Generating live job matches</p>
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                We are using your saved competencies to score the best-fit roles from the job-matching
                model.
              </p>
            </div>
          ) : hasJobMatches ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span>
                    {jobMatching?.totalMatches || jobMatching?.matches.length || 0} live role matches
                    from {jobMatching?.candidateSkills.length || 0} saved competencies.
                  </span>
                </div>
              </div>

              {jobMatching?.matches.map((job, index) => {
                const scorePercent = getJobMatchScorePercent(job);
                const matchedCompetencies = job.matched_competencies || [];

                return (
                  <motion.div
                    key={`${job.title}-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold">{job.title}</p>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Ranked by live job-matching model
                        </p>
                      </div>
                      <span className="text-sm font-black text-primary">{scorePercent}%</span>
                    </div>

                    <Progress value={scorePercent} className="mb-3 h-2" />

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {matchedCompetencies.length > 0 ? (
                        matchedCompetencies.slice(0, 8).map((skill) => (
                          <span
                            key={`${job.title}-${skill}`}
                            className="rounded-md border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary/80"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No matched competencies were returned for this role.
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Overlap: {Math.round(job.match_percentage || 0)}%</span>
                      <span>Cosine score: {Math.round((job.cosine_score || 0) * 100)}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">No live job matches available yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {jobMatchingError ||
                  'The job-matching route is ready, but this profile does not have a saved result yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card space-y-6 p-6 shadow-xl">
        <div className="space-y-2">
          <h3 className="text-xl font-display font-semibold">Full Submission Summary</h3>
          <p className="text-sm text-muted-foreground">
            This is the saved profile and the exact selections currently attached to this prediction.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Academic and Model Inputs</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {academicSummary.map((item) => (
              <div key={item.label} className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-medium">{formatChoiceValue(item.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Scoped Survey Answers</h4>
          {submissionSummary?.survey_answers?.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {submissionSummary.survey_answers.map((answer) => (
                <div
                  key={`${answer.question_id}-${answer.question_key || 'answer'}`}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {answer.question_text}
                  </p>
                  <p className="mt-1 font-medium">{formatChoiceValue(answer.value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No extra scoped survey answers were saved for this prediction.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Job Matching Scope</h4>
          {jobMatching?.candidateSkills?.length ? (
            <div className="flex flex-wrap gap-2">
              {jobMatching.candidateSkills.map((skill) => (
                <Badge key={skill} variant="outline" className="bg-primary/5 text-foreground">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              The saved competencies used by the job matcher will appear here after a live result is
              available.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Selected Competencies</h4>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {(
              Object.keys(COMPETENCY_GROUP_LABELS) as Array<keyof typeof COMPETENCY_GROUP_LABELS>
            ).map((kind) => {
              const items = submissionSummary?.competencies_by_kind?.[kind] || [];

              return (
                <div key={kind} className="space-y-3 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="font-medium">{COMPETENCY_GROUP_LABELS[kind]}</h5>
                    <Badge variant="outline">{items.length} selected</Badge>
                  </div>

                  {items.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <Badge key={item.id} variant="outline" className="bg-primary/5 text-foreground">
                          {item.name}
                          {item.score !== null && item.score !== undefined
                            ? ` | ${item.score}/10`
                            : ''}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No selections saved in this category.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
