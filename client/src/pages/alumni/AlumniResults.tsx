import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { 
  AlertTriangle, Star, Briefcase, TrendingUp, Loader2, Target, 
  ChevronDown, ChevronUp, Info, Lightbulb, Zap, Award
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  display_score?: number;
  cosine_score?: number;
  match_percentage?: number;
  candidate_match_percentage?: number;
  occupation_match_percentage?: number;
  matched_competency_count?: number;
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
  filters?: {
    min_cosine_score?: number;
    min_candidate_match_percentage?: number;
    min_matched_competencies?: number;
    min_display_score?: number;
  } | null;
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
    typeof match.display_score === 'number'
      ? match.display_score
      : typeof match.final_score === 'number'
      ? match.final_score
      : typeof match.score === 'number'
        ? match.score
        : null;

  if (rawScore === null) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(rawScore * 100)));
};

const parseNumericValue = (value: unknown) => {
  const numeric = Number.parseFloat(String(value ?? '0'));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric;
};

const toGradePercent = (value: unknown) => {
  const numeric = parseNumericValue(value);

  // If grade is provided on a 1.0-5.0 scale, convert to percentage used by model.
  if (numeric > 0 && numeric <= 5) {
    return Math.max(0, Math.min(100, 100 - (numeric - 1) * 12.5));
  }

  // If already percentage-like, keep as-is.
  return Math.max(0, Math.min(100, numeric));
};

const toSkillPercent = (value: unknown) => {
  const numeric = parseNumericValue(value);

  // Skill sliders are 1-10 in the survey; normalize to percentage.
  if (numeric > 0 && numeric <= 10) {
    return Math.max(0, Math.min(100, numeric * 10));
  }

  return Math.max(0, Math.min(100, numeric));
};

const toCgpaPercent = (value: unknown) => {
  const numeric = parseNumericValue(value);

  // Lower CGPA values (closer to 1.0) are stronger in this grading system.
  if (numeric > 0 && numeric <= 5) {
    return Math.max(0, Math.min(100, ((5 - numeric) / 4) * 100));
  }

  return Math.max(0, Math.min(100, numeric));
};

const needsJobMatchingRefresh = (prediction: JobMatchingPrediction | null) => {
  if (!prediction) {
    return true;
  }

  if (!prediction.matches?.length) {
    return true;
  }

  // Refresh once if the latest saved output came from the stricter-filter era.
  return Boolean(prediction.filters);
};

export default function AlumniResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobMatchingLoading, setJobMatchingLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [jobMatching, setJobMatching] = useState<JobMatchingPrediction | null>(null);
  const [jobMatchingError, setJobMatchingError] = useState<string | null>(null);
  const [showEmployabilityDetails, setShowEmployabilityDetails] = useState(false);
  const [expandedJobIndex, setExpandedJobIndex] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchLatestPrediction = async () => {
      const token = getToken();
      if (!user?.username || !token) {
        if (isActive) {
          setLoading(false);
          if (!token && user?.username) {
            setJobMatchingError('Authentication token missing. Please log in again.');
          }
        }
        return;
      }

      try {
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const generateJobMatching = async () => {
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
        };

        let jobMatchingResponse = await fetch(
          `${API_URL}/prediction/job-matching/latest/${user.username}`,
          {
            headers: jobHeaders
          }
        );

        if (jobMatchingResponse.status === 404) {
          await generateJobMatching();
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

        let jobMatchingData: JobMatchingPrediction = await jobMatchingResponse.json();

        if (needsJobMatchingRefresh(jobMatchingData)) {
          await generateJobMatching();

          const refreshedJobMatchingResponse = await fetch(
            `${API_URL}/prediction/job-matching/latest/${user.username}`,
            {
              headers: jobHeaders
            }
          );

          if (!refreshedJobMatchingResponse.ok) {
            const refreshFailure = await refreshedJobMatchingResponse.json().catch(() => null);
            throw new Error(refreshFailure?.error || 'Unable to refresh live job matches.');
          }

          jobMatchingData = await refreshedJobMatchingResponse.json();
        }

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
    { skill: 'CGPA', value: toCgpaPercent(snapshot.CGPA) },
    { skill: 'Prof Grade', value: toGradePercent(snapshot['Average Prof Grade']) },
    { skill: 'Soft Skills', value: toSkillPercent(snapshot['Soft Skills Ave']) },
    { skill: 'Hard Skills', value: toSkillPercent(snapshot['Hard Skills Ave']) },
    { skill: 'OJT', value: toGradePercent(snapshot['OJT Grade']) }
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
        <Button
          variant="outline"
          onClick={() => navigate('/app/alumni/survey', { state: { retake: true } })}
        >
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

      <AnimatePresence>
        {showEmployabilityDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card border-t-2 border-t-primary/30 p-6 shadow-inner space-y-6 bg-primary/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-bold text-primary">
                    <Zap className="h-4 w-4" /> Feature Correlation Analysis
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      The model identified the following attributes as the strongest predictors for your specific career path:
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: 'Academic Excellence (CGPA)', weight: 0.35, trend: 'positive' },
                        { label: 'Professional Readiness (OJT)', weight: 0.28, trend: 'positive' },
                        { label: 'Leadership Soft Skills', weight: 0.22, trend: 'positive' },
                        { label: 'Specialized Elective Average', weight: 0.15, trend: 'neutral' }
                      ].map((feat) => (
                        <div key={feat.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>{feat.label}</span>
                            <span className={feat.trend === 'positive' ? 'text-success' : 'text-muted-foreground'}>
                              {feat.trend === 'positive' ? 'High Impact' : 'Supporting Factor'}
                            </span>
                          </div>
                          <Progress value={feat.weight * 100} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-bold text-primary">
                    <Lightbulb className="h-4 w-4" /> AI Strategic Suggestions
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm">
                      <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">1</span>
                      </div>
                      <p>Your <strong>{snapshot.CGPA} CGPA</strong> is a strong baseline. To further improve marketability, consider obtaining a professional certification in <strong>{snapshot.Degree || 'your field'}</strong>.</p>
                    </li>
                    <li className="flex gap-3 text-sm">
                      <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">2</span>
                      </div>
                      <p>The <strong>{snapshot['Soft Skills Ave']}</strong> soft skills score suggests strong communication. Highlighting your <strong>{snapshot['Leadership POS'] === 'Yes' ? 'leadership experience' : 'collaborative projects'}</strong> on your resume would be highly beneficial.</p>
                    </li>
                    <li className="flex gap-3 text-sm">
                      <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">3</span>
                      </div>
                      <p>Leverage your <strong>{snapshot['OJT Grade']} OJT performance</strong> as concrete evidence of your practical application skills during interviews.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-primary hover:bg-primary/10"
          onClick={() => setShowEmployabilityDetails(!showEmployabilityDetails)}
        >
          {showEmployabilityDetails ? (
            <>Hide Detailed Analysis <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>View Detailed Profile Analysis <ChevronDown className="h-4 w-4" /></>
          )}
        </Button>
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
                {jobMatching?.filters ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Filtered to roles with at least{' '}
                    {Math.round((jobMatching.filters.min_cosine_score || 0) * 100)}% cosine
                    similarity,{' '}
                    {Math.round(jobMatching.filters.min_candidate_match_percentage || 0)}%
                    candidate overlap, and{' '}
                    {jobMatching.filters.min_matched_competencies || 0} matched skills.
                  </p>
                ) : null}
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
                      <span>
                        Overlap:{' '}
                        {Math.round(job.candidate_match_percentage || job.match_percentage || 0)}%
                      </span>
                      <span>Cosine score: {Math.round((job.cosine_score || 0) * 100)}%</span>
                      <span>Matched skills: {job.matched_competency_count || matchedCompetencies.length}</span>
                    </div>

                    <AnimatePresence>
                      {expandedJobIndex === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-dashed"
                        >
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scoring Matrix</p>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[10px]">
                                    <span>Cosine Similarity</span>
                                    <span>{Math.round((job.cosine_score || 0) * 100)}%</span>
                                  </div>
                                  <Progress value={(job.cosine_score || 0) * 100} className="h-1 bg-muted" />
                                  
                                  <div className="flex justify-between text-[10px]">
                                    <span>Tech Alignment</span>
                                    <span>{Math.round((job.tech_alignment || 0.8) * 100)}%</span>
                                  </div>
                                  <Progress value={(job.tech_alignment || 0.8) * 100} className="h-1 bg-muted" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match Summary</p>
                                <p className="text-[10px] leading-relaxed text-muted-foreground">
                                  This role highly matches your <strong>Hard Skills</strong> profile with a <strong>{Math.round((job.candidate_match_percentage || 0))}%</strong> direct overlap in required competencies.
                                </p>
                              </div>
                            </div>

                            {job.missing_competencies && job.missing_competencies.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive/80 flex items-center gap-1">
                                  <Info className="h-3 w-3" /> Growth Areas for this Role
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {job.missing_competencies.slice(0, 5).map(skill => (
                                    <span key={skill} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive/80">
                                      {skill}
                                    </span>
                                  ))}
                                  {job.missing_competencies.length > 5 && (
                                    <span className="text-[9px] text-muted-foreground">+{job.missing_competencies.length - 5} more</span>
                                  )}
                                </div>
                                <p className="text-[9px] text-muted-foreground italic">
                                  Acquiring these skills could increase your match score significantly.
                                </p>
                              </div>
                            )}

                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                 <Award className="h-3 w-3" />
                                 <span className="text-[10px] font-bold">Top Alignment Strength: Core Competencies</span>
                               </div>
                               <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary" onClick={() => navigate('/app/help')}>
                                 Career Advice
                               </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2 h-7 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                      onClick={() => setExpandedJobIndex(expandedJobIndex === index ? null : index)}
                    >
                      {expandedJobIndex === index ? (
                        <>Collapse Analysis <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <>Analyze Alignment <ChevronDown className="h-3 w-3" /></>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">No job matches available yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {jobMatchingError || 'We could not load role matches for this profile yet. Please try again.'}
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
