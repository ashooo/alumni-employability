import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  AlertTriangle, Star, Briefcase, TrendingUp, Loader2, Target,
  ChevronDown, ChevronUp, Info, Lightbulb, Zap, Award, Linkedin
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const JOB_SITES = [
  {
    name: "Indeed",
    base_url: "https://www.indeed.com/jobs",
    query_param: "q",
    location_param: "l",
  },
  {
    name: "Glassdoor",
    base_url: "https://www.glassdoor.com/Job/jobs.htm",
    query_param: "sc.keyword",
    location_param: "locKeyword",
  },
  {
    name: "Monster",
    base_url: "https://www.monster.com/jobs/search/",
    query_param: "q",
    location_param: "where",
  },
  {
    name: "ZipRecruiter",
    base_url: "https://www.ziprecruiter.com/jobs-search",
    query_param: "search",
    location_param: "location",
  },
  {
    name: "LinkedIn",
    base_url: "https://www.linkedin.com/jobs/search/",
    query_param: "keywords",
    location_param: "location",
  }
];

const JOB_SITE_STYLES: Record<string, { bg: string; text: string; iconText: string }> = {
  Indeed: { bg: 'bg-[#2557A7]', text: 'text-white', iconText: 'in' },
  Glassdoor: { bg: 'bg-[#0CAA41]', text: 'text-white', iconText: 'gd' },
  Monster: { bg: 'bg-[#6E46AE]', text: 'text-white', iconText: 'm' },
  ZipRecruiter: { bg: 'bg-[#2A6DF5]', text: 'text-white', iconText: 'zr' },
  LinkedIn: { bg: 'bg-[#0A66C2]', text: 'text-white', iconText: 'in' }
};

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
  student_academic?: {
    gender?: string | null;
    age?: number | null;
    year_graduated?: number | null;
    degree_name?: string | null;
    cgpa?: number | string | null;
    prof_grade?: number | string | null;
    elec_grade?: number | string | null;
    ojt_grade?: number | string | null;
    board_exam?: number | string | null;
    leader_pos?: boolean | string | null;
    act_member_pos?: boolean | string | null;
  } | null;
  submission_summary?: {
    id: number;
    branch_path?: string | null;
    additional_data?: {
      academic_data?: Record<string, unknown>;
      additional_answers?: Record<string, unknown>;
    } | null;
    survey_answers: Array<{
      question_id: number;
      question_key?: string | null;
      question_text: string;
      value: string | number | boolean | Record<string, unknown> | null;
    }>;
    academic_snapshot_skills?: Array<{
      id: number;
      skill_name: string;
      skill_value?: number | null;
      source_column?: string | null;
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
  top_alternates?: string[];
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

const EXPERIENCE_LABEL_MAP: Array<{ key: string; label: string }> = [
  { key: 'internship_completed', label: 'Internship Completed' },
  { key: 'internship_length', label: 'Internship Length' },
  { key: 'internship_relatedness', label: 'Internship Relatedness' },
  { key: 'internship_responsibilities', label: 'Internship Responsibilities' },
  { key: 'internship_improvement', label: 'Internship Improvement' },
  { key: 'certifications_completed', label: 'Certifications Completed' },
  { key: 'certifications_type', label: 'Certification Type' },
  { key: 'certifications_count', label: 'Certification Count' },
  { key: 'certifications_relatedness', label: 'Certification Relatedness' },
  { key: 'board_taken', label: 'Board Exam Taken' },
  { key: 'board_result', label: 'Board Exam Result' }
];

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

const toFiveScalePercent = (value: unknown) => {
  const numeric = parseNumericValue(value);
  if (numeric > 0 && numeric <= 5) {
    return Math.max(0, Math.min(100, (numeric / 5) * 100));
  }
  return Math.max(0, Math.min(100, numeric));
};

const toBinaryPercent = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value ? 100 : 0;
  }
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'passed') {
    return 100;
  }
  const numeric = parseNumericValue(value);
  return numeric > 0 ? 100 : 0;
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
  const [showSubmissionSummary, setShowSubmissionSummary] = useState(false);
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

  const readinessScore = Math.round((prediction.probability || 0) * 100);
  const isEmployable = Boolean(prediction.employable);
  const snapshot = prediction.input_snapshot || {};
  const submissionSummary = prediction.submission_summary;
  const summaryAcademicData = (submissionSummary?.additional_data?.academic_data || {}) as Record<string, unknown>;
  const experienceItems = EXPERIENCE_LABEL_MAP
    .map(({ key, label }) => ({ label, value: summaryAcademicData[key] }))
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
  const snapshotCrucialSkills = (submissionSummary?.academic_snapshot_skills || [])
    .filter((skill) => skill.source_column === 'program_skill_rating' || !skill.source_column)
    .map((skill) => ({ name: skill.skill_name, value: skill.skill_value }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const payloadCrucialSkills = Array.isArray(summaryAcademicData.program_skill_ratings)
    ? summaryAcademicData.program_skill_ratings
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const name = String((entry as Record<string, unknown>).skill_name || (entry as Record<string, unknown>).skill || '').trim();
        const valueRaw = (entry as Record<string, unknown>).skill_value ?? (entry as Record<string, unknown>).score;
        const value = valueRaw === null || valueRaw === undefined || valueRaw === '' ? null : Number(valueRaw);
        if (!name) return null;
        return { name, value: Number.isFinite(value) ? value : null };
      })
      .filter((item): item is { name: string; value: number | null } => Boolean(item))
      .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const crucialSkills = snapshotCrucialSkills.length ? snapshotCrucialSkills : payloadCrucialSkills;
  const hasJobMatches = Boolean(jobMatching?.matches?.length);
  const cgpaRaw = prediction.student_academic?.cgpa ?? snapshot.CGPA;
  const profRaw = prediction.student_academic?.prof_grade ?? snapshot['Average Prof Grade'];
  const elecRaw = prediction.student_academic?.elec_grade ?? snapshot['Average Elec Grade'];
  const ojtRaw = prediction.student_academic?.ojt_grade ?? snapshot['OJT Grade'];
  const softRaw = snapshot['Soft Skills Ave'];
  const hardRaw = snapshot['Hard Skills Ave'];
  const internshipRaw = snapshot['Internship Experience'] ?? summaryAcademicData.internship_score;
  const certificationRaw = snapshot.Certifications ?? summaryAcademicData.certification_score;
  const boardRaw = snapshot['Board Exam'] ?? prediction.student_academic?.board_exam;

  const academicComposite = Math.round(
    (toCgpaPercent(cgpaRaw) + toGradePercent(profRaw) + toGradePercent(elecRaw) + toGradePercent(ojtRaw)) / 4
  );
  const skillsComposite = Math.round((toSkillPercent(softRaw) + toSkillPercent(hardRaw)) / 2);
  const internshipPercent = Math.round(toFiveScalePercent(internshipRaw));
  const certificationPercent = Math.round(toFiveScalePercent(certificationRaw));
  const boardPercent = Math.round(toBinaryPercent(boardRaw));
  const leadershipRaw = prediction.student_academic?.leader_pos ?? snapshot['Leadership POS'];
  const activeMemberRaw = prediction.student_academic?.act_member_pos ?? snapshot['Act Member POS'];
  const leadershipPercent = toBinaryPercent(leadershipRaw);
  const activeMemberPercent = toBinaryPercent(activeMemberRaw);

  const academicSummary = [
    { label: 'Program', value: snapshot.Program || prediction.student_academic?.degree_name || 'Not provided' },
    { label: 'Degree', value: prediction.student_academic?.degree_name || snapshot.Degree || 'Not provided' },
    { label: 'Year Graduated', value: prediction.student_academic?.year_graduated || snapshot['Year Graduated'] || 'Not provided' },
    { label: 'Internship Experience', value: snapshot['Internship Experience'] || summaryAcademicData.internship_score || 'Not provided' },
    { label: 'Certifications', value: snapshot.Certifications || summaryAcademicData.certification_score || 'Not provided' },
    { label: 'Board Exam', value: snapshot['Board Exam'] ?? 'Not provided' },
    { label: 'Soft Skills Average', value: snapshot['Soft Skills Ave'] || 'Not provided' },
    { label: 'Hard Skills Average', value: snapshot['Hard Skills Ave'] || 'Not provided' }
  ];

  const experienceAchievementComposite = Math.round(
    (internshipPercent + certificationPercent + boardPercent) / 3
  );

  const radarData = [
    { skill: 'Academic Features', value: academicComposite },
    { skill: 'Skill Features', value: skillsComposite },
    { skill: 'Experience and Achievement', value: experienceAchievementComposite },
    { skill: 'Board Exam', value: boardPercent },
    {
      skill: 'Involvement',
      value: Math.round((leadershipPercent + activeMemberPercent) / 2)
    }
  ];

  const barData = [
    { name: 'Academic Features', value: academicComposite, color: 'hsl(var(--primary))' },
    { name: 'Skill Features', value: skillsComposite, color: 'hsl(var(--secondary))' },
    { name: 'Internship Experience', value: internshipPercent, color: 'hsl(var(--accent))' },
    { name: 'Certifications', value: certificationPercent, color: 'hsl(var(--success))' },
    { name: 'Board Exam', value: boardPercent, color: 'hsl(var(--info))' }
  ];

  const strongestIndicators = [
    { label: 'Academic Features', value: `${academicComposite}%`, score: academicComposite },
    { label: 'Skill Features', value: `${skillsComposite}%`, score: skillsComposite },
    { label: 'Internship Experience', value: `${internshipPercent}%`, score: internshipPercent },
    { label: 'Certifications', value: `${certificationPercent}%`, score: certificationPercent },
    { label: 'Board Exam', value: boardPercent > 0 ? 'Passed' : 'Not passed/not taken', score: boardPercent }
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const openJobSite = (site: (typeof JOB_SITES)[number], roleTitle: string) => {
    const location = 'Manila';
    const url = new URL(site.base_url);
    url.searchParams.append(site.query_param, roleTitle);
    url.searchParams.append(site.location_param, location);
    window.open(url.toString(), '_blank');
  };

  const renderJobSiteIcon = (site: (typeof JOB_SITES)[number]) => {
    const style = JOB_SITE_STYLES[site.name] || {
      bg: 'bg-muted',
      text: 'text-foreground',
      iconText: site.name.slice(0, 2).toLowerCase()
    };

    if (site.name === 'LinkedIn') {
      return (
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${style.bg} ${style.text}`}>
          <Linkedin className="h-3 w-3" />
        </span>
      );
    }

    return (
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${style.bg} ${style.text} text-[9px] font-bold uppercase`}>
        {style.iconText}
      </span>
    );
  };

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
      <div className="glass-card border border-primary/20 bg-primary/5 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Looking for role matches?</p>
            <p className="text-sm text-muted-foreground">
              Click here for job recommendations based on your latest submission and skills profile.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/app/alumni/jobs')}>
            Click Here for Job Recommendations
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold">Prediction Results</h2>
            <p className="text-sm text-muted-foreground">
              Real-time outcomes generated from your latest assessment submission.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-t-4 border-t-primary p-8 text-center shadow-xl md:col-span-2"
        >
          <p className="mb-3 text-base font-semibold text-muted-foreground">Readiness Probability</p>
          <div className="relative mb-4 inline-flex h-32 w-32 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
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
                stroke={isEmployable ? 'hsl(var(--success))' : '#f59e0b'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${readinessScore * 2.51} 251`}
              />
            </svg>
            <span className="absolute text-4xl font-bold font-display">{readinessScore}%</span>
          </div>
          <p className={`text-sm font-bold ${isEmployable ? 'text-success' : 'text-amber-600 dark:text-amber-400'}`}>
            {isEmployable ? 'HIGH POTENTIAL' : 'DEVELOPING PROFILE'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 text-center shadow-lg md:col-span-1"
        >
          <p className="mb-2 text-sm text-muted-foreground">Primary Assessment</p>
          <p
            className={`mb-2 text-4xl font-bold font-display ${isEmployable ? 'text-success' : 'text-amber-600 dark:text-amber-400'
              }`}
          >
            {isEmployable ? 'Employable' : 'Developing Readiness'}
          </p>
          <p className="text-xs text-muted-foreground">
            Model confidence: {Math.round(prediction.confidence * 100)}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 shadow-lg md:col-span-1"
        >
          <p className="mb-3 text-sm text-muted-foreground">Strongest Indicators</p>
          <div className="space-y-2">
            {strongestIndicators.map((item) => (
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
      </section>

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
                        { label: 'Academic Features', weight: academicComposite / 100, trend: 'positive' },
                        { label: 'Skill Features', weight: skillsComposite / 100, trend: 'positive' },
                        { label: 'Experience and Achievement', weight: experienceAchievementComposite / 100, trend: 'positive' },
                        { label: 'Board Exam Signal', weight: boardPercent / 100, trend: 'neutral' }
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
                      <p>Your Academic Features score is <strong>{academicComposite}%</strong>. Keep grade consistency while building practical outputs related to <strong>{snapshot.Program || snapshot.Degree || 'your program'}</strong>.</p>
                    </li>
                    <li className="flex gap-3 text-sm">
                      <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">2</span>
                      </div>
                      <p>Your Skill Features score is <strong>{skillsComposite}%</strong>. Highlight your strongest crucial skills and concrete project outcomes to improve recruiter confidence.</p>
                    </li>
                    <li className="flex gap-3 text-sm">
                      <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">3</span>
                      </div>
                      <p>Your Experience and Achievement profile shows <strong>{internshipPercent}% internship</strong> and <strong>{certificationPercent}% certifications</strong>{boardPercent > 0 ? ', with a passed board exam.' : '.'} Strengthening this area can raise your readiness quickly.</p>
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

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold">Employability Model Evaluation</h2>
            <p className="text-sm text-muted-foreground">
              Graph-based interpretation of how your current profile aligns with model feature groups.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">EVALUATION</Badge>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="glass-card p-6 shadow-xl">
          <h3 className="mb-6 flex items-center gap-2 font-display font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" /> Relative Feature Strength
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
            Radar view using model documentation feature groups.
          </p>
        </div>

        <div className="glass-card p-6 shadow-xl">
          <h3 className="mb-6 flex items-center gap-2 font-display font-semibold">
            <Target className="h-5 w-5 text-primary" /> Skill Competency Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-center text-xs italic text-muted-foreground">
            Normalized percentages for model-v2 feature interpretation.
          </p>
        </div>
        </div>
      </section>

      <div className="glass-card p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-display font-bold">Detailed Academic Record</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
          {academicSummary.map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-display font-semibold">Full Submission Summary</h3>
            <p className="text-sm text-muted-foreground">
              This is the saved profile and the exact selections currently attached to this prediction.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-primary hover:bg-primary/10"
            onClick={() => setShowSubmissionSummary(!showSubmissionSummary)}
          >
            {showSubmissionSummary ? (
              <>Hide Full Submission <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Show Full Submission <ChevronDown className="h-4 w-4" /></>
            )}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showSubmissionSummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 space-y-6">
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
                  <h4 className="font-semibold">Submission Path</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Branch</p>
                      <p className="mt-1 font-medium">{submissionSummary?.branch_path || 'Not provided'}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Flow</p>
                      <p className="mt-1 font-medium">
                        {String(submissionSummary?.branch_path || '').toUpperCase() === 'EMPLOYED'
                          ? 'Save-only (employed path)'
                          : 'Save + predict (unemployed path)'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Experience and Achievement</h4>
                  {experienceItems.length ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {experienceItems.map((item) => (
                        <div key={item.label} className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                          <p className="mt-1 font-medium">{formatChoiceValue(item.value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No experience and achievement details were saved for this submission.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Crucial Skills Ratings</h4>
                  {crucialSkills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {crucialSkills.map((skill) => (
                        <Badge key={skill.name} variant="outline" className="bg-primary/5 text-foreground">
                          {skill.name} | {skill.value ?? 'N/A'}/10
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No crucial skills ratings are attached to this submission.
                    </div>
                  )}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
