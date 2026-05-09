import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Bell, Briefcase, AlertTriangle, ClipboardList } from 'lucide-react';
import LoadingScreen from '@/components/ui/loading-screen';
import { useAuth, type SurveyFlowStatus } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Question {
  id: number;
  question_key?: string;
  category_id: number;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'dropdown' | 'checkbox' | 'scale' | 'number' | 'radio';
  required: boolean;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  order_index: number;
  version: number;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  order_index: number;
  questions: Question[];
}

interface SurveyDefinitionResponse {
  survey: Category[];
  version: number;
  branching?: {
    decision_question_key?: string;
  };
}

interface PreviousSubmission {
  id: number;
  survey_version: number;
  completed_at: string;
  template_key?: string | null;
  branch_path?: string | null;
  answers: {
    question_id: number;
    question_key?: string;
    question_text: string;
    question_type: string;
    answer_text?: string;
    answer_options?: string[];
    answer_number?: number;
  }[];
}

type CompetencyKind =
  | 'SOFT_SKILL'
  | 'HARD_SKILL'
  | 'KNOWLEDGE'
  | 'ABILITY'
  | 'INTEREST'
  | 'TECHNOLOGY';

type CompetencySelectionView = 'all' | 'selected';

interface Competency {
  id: number;
  name: string;
  kind: CompetencyKind;
  description?: string | null;
  source?: string | null;
  category?: string | null;
}

interface Degree {
  id: number;
  name: string;
  college_id: number;
}

interface Prediction {
  employable: boolean;
  probability: number;
  label: string;
  confidence: number;
  model_type?: string;
  input_snapshot?: Record<string, unknown>;
  submission_summary?: {
    competencies?: Array<{
      id: number;
      kind: CompetencyKind;
      score?: number | null;
      selected?: boolean;
    }>;
  } | null;
}

type SurveyStage =
  | 'initial'
  | 'wizard'
  | 'employedSurvey'
  | 'completed'
  | 'finished';

interface CompetencyStepConfig {
  step: number;
  kind: CompetencyKind;
  title: string;
  min: number;
  max?: number;
  description: string;
  searchPlaceholder: string;
  emptyMessage: string;
}

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const WIZARD_STEPS = [
  { step: 1, label: 'Academic Performance' },
  { step: 2, label: 'Internship Experience' },
  { step: 3, label: 'Certifications' },
  { step: 4, label: 'Board Exam' },
  { step: 5, label: 'Involvement' },
  { step: 6, label: 'Hard Skills' },
  { step: 7, label: 'Soft Skills' },
  { step: 8, label: 'Knowledge' },
  { step: 9, label: 'Abilities' },
  { step: 10, label: 'Interests' },
  { step: 11, label: 'Technology Skills' },
  { step: 12, label: 'Crucial Skills Rating' },
  { step: 13, label: 'Skill Proficiency' },
  { step: 14, label: 'Additional Questions' }
];

const TECHNOLOGY_VISIBLE_LIMIT = 120;
const TECHNOLOGY_SEARCH_LIMIT = 180;
const HARD_SKILL_MIN_SELECTIONS = 4;
const HARD_SKILL_MAX_SELECTIONS = 10;
const SOFT_SKILL_MIN_SELECTIONS = 3;
const SOFT_SKILL_MAX_SELECTIONS = 7;

const COMPETENCY_STEP_CONFIGS: Record<number, CompetencyStepConfig> = {
  6: {
    step: 6,
    kind: 'HARD_SKILL',
    title: `Select ${HARD_SKILL_MIN_SELECTIONS}-${HARD_SKILL_MAX_SELECTIONS} Hard Skills`,
    min: HARD_SKILL_MIN_SELECTIONS,
    max: HARD_SKILL_MAX_SELECTIONS,
    description:
      'Choose at least 4 and up to 10 hard skills. Broader coverage helps the model read your profile more reliably.',
    searchPlaceholder: 'Search hard skills',
    emptyMessage: 'No hard skills matched your current search or filter.'
  },
  7: {
    step: 7,
    kind: 'SOFT_SKILL',
    title: `Select ${SOFT_SKILL_MIN_SELECTIONS}-${SOFT_SKILL_MAX_SELECTIONS} Soft Skills`,
    min: SOFT_SKILL_MIN_SELECTIONS,
    max: SOFT_SKILL_MAX_SELECTIONS,
    description:
      'Choose at least 3 and up to 7 soft skills. Narrower selections are allowed, but they are weighted more conservatively.',
    searchPlaceholder: 'Search soft skills',
    emptyMessage: 'No soft skills matched your current search or filter.'
  },
  8: {
    step: 8,
    kind: 'KNOWLEDGE',
    title: 'Select Knowledge Areas',
    min: 1,
    description: 'Pick at least one knowledge area that matches what you are most familiar with academically or professionally.',
    searchPlaceholder: 'Search knowledge areas',
    emptyMessage: 'No knowledge areas matched your current search or filter.'
  },
  9: {
    step: 9,
    kind: 'ABILITY',
    title: 'Select Abilities',
    min: 1,
    description: 'Pick at least one ability that reflects how you naturally solve problems and perform tasks.',
    searchPlaceholder: 'Search abilities',
    emptyMessage: 'No abilities matched your current search or filter.'
  },
  10: {
    step: 10,
    kind: 'INTEREST',
    title: 'Select Interests',
    min: 1,
    description: 'Pick at least one interest that aligns with the type of work and environment you prefer.',
    searchPlaceholder: 'Search interests',
    emptyMessage: 'No interests matched your current search or filter.'
  },
  11: {
    step: 11,
    kind: 'TECHNOLOGY',
    title: 'Select Technology Skills',
    min: 1,
    description: 'Pick at least one technology skill. Use search or switch to Selected to manage the larger catalog faster.',
    searchPlaceholder: 'Search technology skills',
    emptyMessage: 'No technology skills matched your current search or filter.'
  }
};

const createInitialSelectionState = (): Record<CompetencyKind, number[]> => ({
  SOFT_SKILL: [],
  HARD_SKILL: [],
  KNOWLEDGE: [],
  ABILITY: [],
  INTEREST: [],
  TECHNOLOGY: []
});

const createInitialSearchState = (): Record<CompetencyKind, string> => ({
  SOFT_SKILL: '',
  HARD_SKILL: '',
  KNOWLEDGE: '',
  ABILITY: '',
  INTEREST: '',
  TECHNOLOGY: ''
});

const createInitialViewState = (): Record<CompetencyKind, CompetencySelectionView> => ({
  SOFT_SKILL: 'all',
  HARD_SKILL: 'all',
  KNOWLEDGE: 'all',
  ABILITY: 'all',
  INTEREST: 'all',
  TECHNOLOGY: 'all'
});

const createInitialAcademicData = (degreeId = '') => ({
  cgpa: '',
  prof_grade: '',
  elec_grade: '',
  ojt_grade: '',
  gender: '',
  age: '',
  year_graduated: new Date().getFullYear().toString(),
  leader_pos: false,
  act_member_pos: false,
  degree_id: degreeId
});

const BOARD_PROGRAMS = new Set(['BSA', 'BSECE', 'BSED_FILIPINO', 'BSED_ENGLISH', 'BSN']);

const PROGRAM_REQUIRED_SKILLS: Record<string, string[]> = {
  BSA: [
    'Auditing Skills',
    'Budgeting & Analysis Skills',
    'Financial Accounting Skills',
    'Taxation Skills',
    'Risk Management Skills'
  ],
  BSECE: [
    'Leadership & Decision-Making Skills',
    'Networking Skills',
    'Programming Logic Skills',
    'Python Programming Skills',
    'English Communication & Writing Skills',
    'Filipino Communication & Writing Skills',
    'Artificial Intelligence Skills',
    'Cybersecurity Skills',
    'Circuit Design Skills',
    'Communication Systems Skills',
    'Problem-Solving Skills'
  ],
  BSED_FILIPINO: [
    'Filipino Communication & Writing Skills',
    'Cloud Computing Skills',
    'Curriculum Development Skills',
    'Classroom Management Skills',
    'Educational Technology Skills',
    'Teaching Skills'
  ],
  BSED_ENGLISH: [
    'English Communication & Writing Skills',
    'Curriculum Development Skills',
    'Classroom Management Skills',
    'Educational Technology Skills',
    'Teaching Skills'
  ],
  BSN: [
    'Leadership & Decision-Making Skills',
    'English Communication & Writing Skills',
    'Filipino Communication & Writing Skills',
    'Problem-Solving Skills',
    'Clinical Skills',
    'Patient Care Skills',
    'Health Assessment Skills',
    'Emergency Response Skills'
  ],
  BSBA_ENTREP: [
    'Financial Management Skills',
    'Java Programming Skills',
    'Leadership & Decision-Making Skills',
    'Machine Learning Skills',
    'Marketing Skills',
    'Strategic Planning Skills',
    'Innovation & Business Planning Skills'
  ],
  BSBA_MARKETING: [
    'Financial Management Skills',
    'Leadership & Decision-Making Skills',
    'Marketing Skills',
    'Strategic Planning Skills',
    'Consumer Behavior Analysis',
    'Sales Management Skills'
  ],
  BSCS: [
    'Machine Learning Skills',
    'Programming Logic Skills',
    'Python Programming Skills',
    'Artificial Intelligence Skills',
    'Cloud Computing Skills',
    'Curriculum Development Skills',
    'Data Structures & Algorithms',
    'Software Engineering Skills'
  ],
  BSIT: [
    'Java Programming Skills',
    'Networking Skills',
    'Programming Logic Skills',
    'Python Programming Skills',
    'Cybersecurity Skills',
    'Database Management Skills',
    'System Design Skills',
    'Web Development Skills'
  ]
};

const normalizeProgramKey = (programCode: string) =>
  String(programCode || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const PROGRAM_CODE_ALIASES: Record<string, string> = {
  BSBA_ENTREPRENEURSHIP: 'BSBA_ENTREP',
  BSBA_ENTREP: 'BSBA_ENTREP',
  BSBA_MARKETING: 'BSBA_MARKETING',
  BSED_FILIPINO: 'BSED_FILIPINO',
  BSED_ENGLISH: 'BSED_ENGLISH',
  BS_ECE: 'BSECE',
  BSIT: 'BSIT',
  BSCS: 'BSCS',
  BSA: 'BSA',
  BSN: 'BSN',
  BSECE: 'BSECE'
};

const getRequiredSkillsForProgram = (programCode?: string | null) => {
  const normalized = normalizeProgramKey(String(programCode || ''));
  const key = PROGRAM_CODE_ALIASES[normalized] || normalized;
  return PROGRAM_REQUIRED_SKILLS[key] || [];
};

const buildProgramSkillRatingsPayload = (
  programCode: string | null | undefined,
  ratings: Record<string, number>
) =>
  getRequiredSkillsForProgram(programCode).map((skill) => ({
    skill_name: skill,
    skill_value: ratings[skill] || 5
  }));

const createInitialExperienceAnswers = () => ({
  internshipCompleted: '',
  internshipLength: '',
  internshipRelatedness: '',
  internshipResponsibilities: '',
  internshipImprovement: '',
  certificationsCompleted: '',
  certificationsType: '',
  certificationsCount: '',
  certificationsRelatedness: '',
  boardTaken: '',
  boardResult: '',
  leadershipHeld: '',
  activeMember: ''
});

const normalizeOneToFive = (score: number, maxScore: number) =>
  Math.min(5, Math.max(1, Number(((score / maxScore) * 5).toFixed(2))));

const internshipScoreFromAnswers = (a: ReturnType<typeof createInitialExperienceAnswers>) => {
  let score = 0;
  if (a.internshipCompleted === 'No') score += 1;
  if (a.internshipCompleted === 'Yes') {
    if (a.internshipLength === '1-2 months') score += 1;
    if (a.internshipLength === '3-4 months' || a.internshipLength === '5+ months') score += 2;
    if (a.internshipRelatedness === 'Highly related') score += 2;
    if (a.internshipResponsibilities === 'Worked on major responsibilities/projects') score += 2;
    if (a.internshipImprovement === 'Strongly Agree') score += 2;
  }
  return normalizeOneToFive(score, 10);
};

const certificationScoreFromAnswers = (a: ReturnType<typeof createInitialExperienceAnswers>) => {
  let score = 0;
  if (a.certificationsType === 'Online short courses') score += 1;
  if (a.certificationsType === 'Technical/professional certifications' || a.certificationsType === 'National/international certifications') score += 2;
  if (a.certificationsCount === '6+') score += 2;
  if (a.certificationsRelatedness === 'Highly related') score += 2;
  return normalizeOneToFive(score, 6);
};

const mapCompetencyKindToSubmissionType = (kind: CompetencyKind) => {
  switch (kind) {
    case 'HARD_SKILL':
      return 'hard';
    case 'SOFT_SKILL':
      return 'soft';
    case 'KNOWLEDGE':
      return 'knowledge';
    case 'ABILITY':
      return 'ability';
    case 'INTEREST':
      return 'interest';
    case 'TECHNOLOGY':
      return 'technology';
    default:
      return 'other';
  }
};

const mapEmploymentStatusToAnswer = (status?: string | null) => {
  switch (String(status || '').toUpperCase()) {
    case 'EMPLOYED':
      return 'Employed';
    case 'UNEMPLOYED':
      return 'Unemployed';
    default:
      return '';
  }
};

const getDecisionQuestion = (categories: Category[], decisionQuestionKey: string) => {
  for (const category of categories) {
    for (const question of category.questions) {
      if (question.question_key === decisionQuestionKey) {
        return question;
      }
    }
  }

  return categories[0]?.questions[0] || null;
};

const getGatewayCategories = (survey: Category[], decisionQuestionKey: string): Category[] => {
  const category = survey.find((cat) =>
    cat.questions.some((q) => q.question_key === decisionQuestionKey)
  );
  
  if (!category) return survey.slice(0, 1);

  // Return a virtual category that ONLY contains the decision question
  return [{
    ...category,
    questions: category.questions.filter((q) => q.question_key === decisionQuestionKey)
  }];
};

const countAnswerableQuestions = (survey: Category[], decisionQuestionKey: string) =>
  survey.reduce(
    (total, category) =>
      total + category.questions.filter((question) => question.question_key !== decisionQuestionKey).length,
    0
  );

const resolveSurveyStage = (
  surveyStatus: SurveyFlowStatus,
  hasPrediction: boolean
): SurveyStage => {
  // Unemployed path — full wizard (academic + skills + survey manager questions + prediction)
  if (surveyStatus.status === 'pending_unemployed_assessment') {
    return 'wizard';
  }

  // Employed path — survey manager questions only, no models
  if (surveyStatus.status === 'pending_employed_survey') {
    return 'wizard';
  }

  // Has prediction result — show it
  if (surveyStatus.completed && hasPrediction) {
    return 'finished';
  }

  // Completed or waiting
  if (
    surveyStatus.completed ||
    surveyStatus.status === 'completed' ||
    surveyStatus.status === 'assessment_submitted_prediction_missing' ||
    surveyStatus.status === 'completed_awaiting_followup'
  ) {
    return 'completed';
  }

  // Default — show employment gateway
  return 'initial';
};

const getCompletedMessage = (surveyStatus: SurveyFlowStatus | null) => {
  if (!surveyStatus) {
    return 'Your survey progress is recorded.';
  }

  switch (surveyStatus.status) {
    case 'assessment_submitted_prediction_missing':
      return 'Your assessment was submitted. The prediction result is still being finalized.';
    case 'completed_awaiting_followup':
      return 'Your assessment is complete and a follow-up survey is scheduled later.';
    case 'completed':
      return 'Your survey flow is complete.';
    default:
      return 'Your survey progress is recorded.';
  }
};

export default function AlumniSurvey() {
  const { user, completeSurvey, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { retake?: boolean } | null;
  const [retakeMode, setRetakeMode] = useState(Boolean(locationState?.retake));

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [surveyVersion, setSurveyVersion] = useState(1);
  const [decisionQuestionKey, setDecisionQuestionKey] = useState('current_employment_status');
  const [surveyStage, setSurveyStage] = useState<SurveyStage>('initial');
  const [surveyStatus, setSurveyStatus] = useState<SurveyFlowStatus | null>(user?.survey || null);
  const [latestSubmission, setLatestSubmission] = useState<PreviousSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [availableCompetencies, setAvailableCompetencies] = useState<Competency[]>([]);
  const [availableDegrees, setAvailableDegrees] = useState<Degree[]>([]);
  const [academicData, setAcademicData] = useState(createInitialAcademicData);
  const [selectedCompetencies, setSelectedCompetencies] = useState<Record<CompetencyKind, number[]>>(
    createInitialSelectionState
  );
  const [competencySearch, setCompetencySearch] = useState<Record<CompetencyKind, string>>(
    createInitialSearchState
  );
  const [competencyView, setCompetencyView] = useState<Record<CompetencyKind, CompetencySelectionView>>(
    createInitialViewState
  );
  const [skillRatings, setSkillRatings] = useState<Record<number, number>>({});
  const [programSkillRatings, setProgramSkillRatings] = useState<Record<string, number>>({});
  const [predictionResult, setPredictionResult] = useState<Prediction | null>(null);
  const [academicProfileLoaded, setAcademicProfileLoaded] = useState(false);
  const [experienceAnswers, setExperienceAnswers] = useState(createInitialExperienceAnswers);
  const completionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionNotifiedRef = useRef<{ employability: boolean; jobMatching: boolean }>({
    employability: false,
    jobMatching: false
  });

  useEffect(() => {
    if (locationState?.retake) {
      setRetakeMode(true);
    }
  }, [locationState?.retake]);

  useEffect(() => {
    return () => {
      if (completionPollRef.current) {
        clearInterval(completionPollRef.current);
        completionPollRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const required = getRequiredSkillsForProgram(surveyStatus?.programCode);
    if (required.length === 0) {
      return;
    }
    setProgramSkillRatings((prev) => {
      const next = { ...prev };
      for (const skill of required) {
        if (!next[skill]) next[skill] = 5;
      }
      return next;
    });
  }, [surveyStatus?.programCode]);

  const syncSurveyStatus = (nextSurveyStatus: SurveyFlowStatus) => {
    setSurveyStatus(nextSurveyStatus);
    updateUser({
      survey: nextSurveyStatus,
      surveyCompleted: Boolean(nextSurveyStatus.completed)
    });
  };

  const fetchSurveyStatus = async (token: string) => {
    if (!user?.username) {
      throw new Error('Missing user');
    }

    const response = await fetch(`${API_URL}/alumni/survey/status/${user.username}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch survey status');
    }

    const nextSurveyStatus: SurveyFlowStatus = await response.json();
    syncSurveyStatus(nextSurveyStatus);
    return nextSurveyStatus;
  };

  const fetchLatestSubmission = async (token: string) => {
    if (!user?.username) {
      return null;
    }

    const response = await fetch(`${API_URL}/alumni/survey/responses/${user.username}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const submissions: PreviousSubmission[] = await response.json();
    const latest = submissions[0] || null;
    setLatestSubmission(latest);
    return latest;
  };

  const fetchLatestPrediction = async (token: string) => {
    if (!user?.username) {
      return null;
    }

    const response = await fetch(`${API_URL}/prediction/employability/latest/${user.username}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const prediction: Prediction = await response.json();
    setPredictionResult(prediction);
    return prediction;
  };

  useEffect(() => {
    const loadPage = async () => {
      if (!user?.username) {
        return;
      }

      setLoading(true);
      try {
        const token = getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [profileResponse, statusResponse, competenciesResponse, degreesResponse] =
          await Promise.all([
            fetch(`${API_URL}/alumni/profile/${user.username}`, { headers }),
            fetch(`${API_URL}/alumni/survey/status/${user.username}`, { headers }),
            fetch(`${API_URL}/prediction/competencies`, { headers }),
            fetch(`${API_URL}/prediction/degrees`, { headers })
          ]);

        if (!statusResponse.ok) {
          throw new Error('Failed to fetch survey status');
        }

        const profileData = profileResponse.ok ? await profileResponse.json() : null;
        const nextSurveyStatus: SurveyFlowStatus = await statusResponse.json();
        syncSurveyStatus(nextSurveyStatus);

        const competenciesData: Competency[] = competenciesResponse.ok
          ? await competenciesResponse.json()
          : [];
        if (competenciesData.length > 0) {
          setAvailableCompetencies(competenciesData);
        }

        const degreesData: Degree[] = degreesResponse.ok ? await degreesResponse.json() : [];
        if (degreesData.length > 0) {
          setAvailableDegrees(degreesData);
        }

        if (nextSurveyStatus.programId) {
          setAcademicData((prev) => ({
            ...prev,
            degree_id: prev.degree_id || String(nextSurveyStatus.programId)
          }));
        }

        // Fetch academic profile from DB (auto-fill grades)
        if (user?.username) {
          try {
            const academicResponse = await fetch(
              `${API_URL}/prediction/employability/academic-profile/${user.username}`,
              { headers }
            );
            if (academicResponse.ok) {
              const profile = await academicResponse.json();
              setAcademicData((prev) => ({
                ...prev,
                cgpa: String(profile.cgpa || ''),
                prof_grade: String(profile.prof_grade || ''),
                elec_grade: String(profile.elec_grade || ''),
                ojt_grade: String(profile.ojt_grade || ''),
                gender: profile.gender || prev.gender,
                age: String(profile.age || ''),
                year_graduated: String(profile.year_graduated || prev.year_graduated),
                degree_id: String(profile.degree_id || prev.degree_id),
                leader_pos: profile.leader_pos ?? prev.leader_pos,
                act_member_pos: profile.act_member_pos ?? prev.act_member_pos
              }));
              setAcademicProfileLoaded(true);
            }
          } catch (err) {
            console.error('Failed to fetch academic profile:', err);
          }
        }

        await fetchLatestSubmission(token);

        const resolvedCollegeId = nextSurveyStatus.collegeId || profileData?.college_id || null;
        if (resolvedCollegeId) {
          const fetchPath = nextSurveyStatus.nextPath || 'INITIAL';
          const surveyResponse = await fetch(`${API_URL}/alumni/survey/college/${resolvedCollegeId}?path=${fetchPath}`, {
            headers
          });

          if (surveyResponse.ok) {
            let surveyData: SurveyDefinitionResponse = await surveyResponse.json();
            let fullSurveyCategories = surveyData.survey || [];
            const hasQuestions = fullSurveyCategories.some((category) => category.questions.length > 0);
            if (!hasQuestions && fetchPath !== 'INITIAL') {
              const fallbackResponse = await fetch(
                `${API_URL}/alumni/survey/college/${resolvedCollegeId}?path=INITIAL`,
                { headers }
              );
              if (fallbackResponse.ok) {
                surveyData = await fallbackResponse.json();
                fullSurveyCategories = surveyData.survey || [];
              }
            }
            const nextDecisionQuestionKey =
              surveyData.branching?.decision_question_key || 'current_employment_status';
            const gatewayCategories = getGatewayCategories(fullSurveyCategories, nextDecisionQuestionKey);
            const nextStage = resolveSurveyStage(nextSurveyStatus, false);

            if (nextStage === 'initial') {
              setCategories(gatewayCategories);
            } else {
              setCategories(fullSurveyCategories);
            }
            setSurveyVersion(surveyData.version || 1);
            setDecisionQuestionKey(nextDecisionQuestionKey);

            const employmentAnswer = mapEmploymentStatusToAnswer(nextSurveyStatus.employmentStatus);
            const decisionQuestion = getDecisionQuestion(gatewayCategories, nextDecisionQuestionKey);
            if (decisionQuestion && employmentAnswer) {
              setAnswers((prev) => ({
                ...prev,
                [String(decisionQuestion.id)]: employmentAnswer
              }));
            }

            if (retakeMode) {
              // Retake always restarts at employment gateway so alumni can switch path.
              setWizardStep(1);
              setPredictionResult(null);
              setSelectedCompetencies(createInitialSelectionState());
              setCompetencySearch(createInitialSearchState());
              setCompetencyView(createInitialViewState());
              setSkillRatings({});
              setProgramSkillRatings({});
              setAnswers({});
              setExperienceAnswers(createInitialExperienceAnswers());
              setCategories(gatewayCategories);
              setSurveyStage('initial');
              return;
            }
          }
        }

        let latestPrediction: Prediction | null = null;
        if (nextSurveyStatus.hasEmployabilityPrediction && !retakeMode) {
          latestPrediction = await fetchLatestPrediction(token);
        } else if (retakeMode) {
          setPredictionResult(null);
        }

        setSurveyStage(resolveSurveyStage(nextSurveyStatus, Boolean(latestPrediction)));
      } catch (error) {
        console.error('Error loading survey page:', error);
        toast({
          title: 'Error',
          description: 'Failed to load survey flow',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [retakeMode, toast, updateUser, user?.username]);

  const setAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const clearCompletionPolling = () => {
    if (completionPollRef.current) {
      clearInterval(completionPollRef.current);
      completionPollRef.current = null;
    }
  };

  const startCompletionPolling = (token: string) => {
    if (!user?.username) return;
    clearCompletionPolling();

    let attempts = 0;
    const maxAttempts = 24; // ~2 minutes at 5s interval
    completionPollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        if (!completionNotifiedRef.current.employability) {
          const employabilityRes = await fetch(
            `${API_URL}/prediction/employability/latest/${user.username}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (employabilityRes.ok) {
            completionNotifiedRef.current.employability = true;
            toast({
              title: 'Employability Model Complete',
              description: 'Your employability prediction is ready.'
            });
          }
        }

        if (!completionNotifiedRef.current.jobMatching) {
          const jobRes = await fetch(
            `${API_URL}/prediction/job-matching/latest/${user.username}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (jobRes.ok) {
            completionNotifiedRef.current.jobMatching = true;
            toast({
              title: 'Job Matcher Complete',
              description: 'Your job-match recommendations are now ready.'
            });
          }
        }
      } catch {
        // keep polling within bounds
      }

      if (
        completionNotifiedRef.current.employability &&
        completionNotifiedRef.current.jobMatching
      ) {
        clearCompletionPolling();
      } else if (attempts >= maxAttempts) {
        clearCompletionPolling();
      }
    }, 5000);
  };

  const getCompetenciesByKind = (kind: CompetencyKind) =>
    availableCompetencies.filter((competency) => competency.kind === kind);

  const renderSurveyCategory = (category: Category, isCompact = false) => {
    return (
      <div key={category.id} className="space-y-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-display font-semibold border-b pb-2">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-muted-foreground italic">{category.description}</p>
          )}
        </div>

        <div className="space-y-6">
          {category.questions
            .filter(q => surveyStage === 'initial' || q.question_key !== decisionQuestionKey)
            .map((question) => (
            <div key={question.id} className="space-y-3">
              <Label className="text-base font-medium">
                {question.text}
                {question.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              
              {question.type === 'select' && (
                <Select
                  value={String(answers[String(question.id)] || '')}
                  onValueChange={(value) => setAnswer(String(question.id), value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      question.question_key === decisionQuestionKey
                        ? ['Employed', 'Unemployed']
                        : (question.options || [])
                    ).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(question.type === 'text' || question.type === 'textarea') && (
                <Input
                  value={String(answers[String(question.id)] || '')}
                  onChange={(e) => setAnswer(String(question.id), e.target.value)}
                  placeholder="Type your answer here..."
                />
              )}

              {question.type === 'number' && (
                <Input
                  type="number"
                  value={String(answers[String(question.id)] || '')}
                  onChange={(e) => setAnswer(String(question.id), e.target.value)}
                  placeholder="0"
                />
              )}

              {question.type === 'scale' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min ({question.scale_min})</span>
                    <span>Max ({question.scale_max})</span>
                  </div>
                  <Slider
                    min={question.scale_min || 1}
                    max={question.scale_max || 5}
                    step={1}
                    value={[Number(answers[String(question.id)]) || question.scale_min || 1]}
                    onValueChange={(value) => setAnswer(String(question.id), value[0])}
                  />
                  <div className="text-center font-bold text-primary">
                    {answers[String(question.id)] || question.scale_min || 1}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const toggleCompetencySelection = (kind: CompetencyKind, competencyId: number, max?: number) => {
    const selectedIds = selectedCompetencies[kind];

    if (!selectedIds.includes(competencyId) && max && selectedIds.length >= max) {
      toast({
        title: 'Selection limit reached',
        description: `You can only select up to ${max} items in this section.`
      });
      return;
    }

    setSelectedCompetencies((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(competencyId)
        ? prev[kind].filter((id) => id !== competencyId)
        : [...prev[kind], competencyId]
    }));
  };

  const renderCompetencySelectionStep = (config: CompetencyStepConfig) => {
    const allItems = getCompetenciesByKind(config.kind);
    const selectedIds = selectedCompetencies[config.kind];
    const selectedSet = new Set(selectedIds);
    const query = competencySearch[config.kind].trim().toLowerCase();
    const view = competencyView[config.kind];

    const filteredItems = allItems
      .filter((competency) => {
        if (view === 'selected' && !selectedSet.has(competency.id)) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchableText = [
          competency.name,
          competency.description || '',
          competency.category || ''
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((left, right) => {
        const leftSelected = selectedSet.has(left.id) ? 1 : 0;
        const rightSelected = selectedSet.has(right.id) ? 1 : 0;

        if (leftSelected !== rightSelected) {
          return rightSelected - leftSelected;
        }

        return left.name.localeCompare(right.name);
      });

    const visibleLimit =
      config.kind === 'TECHNOLOGY'
        ? query || view === 'selected'
          ? TECHNOLOGY_SEARCH_LIMIT
          : TECHNOLOGY_VISIBLE_LIMIT
        : filteredItems.length;
    const visibleItems = filteredItems.slice(0, visibleLimit);
    const isTruncated = visibleItems.length < filteredItems.length;
    const selectionValid =
      selectedIds.length >= config.min && (!config.max || selectedIds.length <= config.max);

    return (
      <div className="space-y-6 flex-1">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Badge
            variant="outline"
            className={
              selectionValid
                ? 'border-success/30 bg-success/5 text-success'
                : 'border-amber-300/40 bg-amber-100/40 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
            }
          >
            {selectedIds.length} selected
            {config.max ? ` • ${config.min}-${config.max} required` : ` • at least ${config.min}`}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={competencySearch[config.kind]}
            onChange={(event) =>
              setCompetencySearch((prev) => ({
                ...prev,
                [config.kind]: event.target.value
              }))
            }
            placeholder={config.searchPlaceholder}
            className="md:max-w-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={view === 'all' ? 'default' : 'outline'}
              onClick={() =>
                setCompetencyView((prev) => ({
                  ...prev,
                  [config.kind]: 'all'
                }))
              }
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'selected' ? 'default' : 'outline'}
              onClick={() =>
                setCompetencyView((prev) => ({
                  ...prev,
                  [config.kind]: 'selected'
                }))
              }
            >
              Selected
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
          {isTruncated
            ? `Showing first ${visibleItems.length} of ${filteredItems.length} matching items. Refine your search to narrow the list further.`
            : `Showing ${filteredItems.length} matching items.`}
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {config.emptyMessage}
          </div>
        ) : (
          <div className="max-h-[340px] overflow-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {visibleItems.map((competency) => {
                const isSelected = selectedSet.has(competency.id);

                return (
                  <button
                    key={competency.id}
                    type="button"
                    title={competency.description || competency.name}
                    onClick={() =>
                      toggleCompetencySelection(config.kind, competency.id, config.max)
                    }
                    className={`min-h-[72px] rounded-xl border-2 p-3 text-left text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/20'
                        : 'bg-muted/50 border-transparent hover:bg-muted'
                    }`}
                  >
                    <span className="line-clamp-3">{competency.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleInitialSubmit = async () => {
    if (!user?.username) {
      return;
    }

    const decisionQuestion = getDecisionQuestion(categories, decisionQuestionKey);
    if (!decisionQuestion) {
      toast({
        title: 'Survey unavailable',
        description: 'The employment gateway question could not be loaded.',
        variant: 'destructive'
      });
      return;
    }

    const selectedAnswer = answers[String(decisionQuestion.id)];
    if (!selectedAnswer || typeof selectedAnswer !== 'string') {
      toast({
        title: 'Employment status required',
        description: 'Please choose your current employment status first.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();

      // Submit ONLY the employment gateway answer
      const response = await fetch(`${API_URL}/alumni/survey/submit/${user.username}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: surveyVersion,
          answers: [
            {
              question_id: decisionQuestion.id,
              answer_text: selectedAnswer
            }
          ],
          pathKey: 'INITIAL'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit employment status');
      }

      const nextSurveyStatus = await fetchSurveyStatus(token);
      await fetchLatestSubmission(token);
      const selectedPath =
        String(selectedAnswer).trim().toLowerCase() === 'employed' ? 'EMPLOYED' : 'UNEMPLOYED';
      const statusForStage = retakeMode
        ? {
            ...nextSurveyStatus,
            completed: false,
            requiresSurvey: true,
            shouldPromptSurvey: true,
            employmentStatus: selectedPath,
            resolvedPath: selectedPath,
            nextPath: selectedPath,
            nextStep:
              selectedPath === 'EMPLOYED'
                ? 'take_employed_survey'
                : 'take_unemployed_assessment',
            status:
              selectedPath === 'EMPLOYED'
                ? 'pending_employed_survey'
                : 'pending_unemployed_assessment'
          }
        : nextSurveyStatus;

      if (
        statusForStage.status === 'pending_employed_survey' ||
        statusForStage.status === 'pending_unemployed_assessment'
      ) {
        const resolvedCollegeId = statusForStage.collegeId || surveyStatus?.collegeId || null;
        if (resolvedCollegeId) {
          const path = statusForStage.nextPath || selectedPath;
          const surveyResponse = await fetch(
            `${API_URL}/alumni/survey/college/${resolvedCollegeId}?path=${path}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (surveyResponse.ok) {
            const surveyData: SurveyDefinitionResponse = await surveyResponse.json();
            const pathSurvey = surveyData.survey || [];
            if (countAnswerableQuestions(pathSurvey, decisionQuestionKey) > 0) {
              setCategories(pathSurvey);
            } else {
              const fallbackResponse = await fetch(
                `${API_URL}/alumni/survey/college/${resolvedCollegeId}?path=INITIAL`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (fallbackResponse.ok) {
                const fallbackData: SurveyDefinitionResponse = await fallbackResponse.json();
                setCategories(fallbackData.survey || []);
              } else {
                setCategories(pathSurvey);
              }
            }
          }
        }
      }

      syncSurveyStatus(statusForStage);
      setSurveyStage(resolveSurveyStage(statusForStage, Boolean(predictionResult)));
    } catch (error) {
      console.error('Initial survey submit error:', error);
      toast({
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'Failed to submit your survey answer.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Employed path: submit survey manager answers, store them, no ML models
  const handleEmployedSurveySubmit = async () => {
    if (!user?.username) return;

    setSubmitting(true);
    try {
      const token = getToken();

      const allAnswers = Object.entries(answers).map(([id, val]) => ({
        question_id: parseInt(id),
        answer_text: Array.isArray(val) ? null : String(val),
        answer_options: Array.isArray(val) ? val : null
      }));

      const response = await fetch(`${API_URL}/alumni/survey/submit/${user.username}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: surveyVersion,
          answers: allAnswers,
          pathKey: 'EMPLOYED'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit survey');
      }

      const nextSurveyStatus = await fetchSurveyStatus(token);
      setSurveyStatus(nextSurveyStatus);
      setSurveyStage(resolveSurveyStage(nextSurveyStatus, false));

      toast({
        title: 'Survey Complete',
        description: 'Thank you! Your employment information has been recorded.'
      });
    } catch (error) {
      console.error('Employed survey submit error:', error);
      toast({
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'Failed to submit survey.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWizardSubmit = async () => {
    if (!user?.username) {
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();
      const skillRatingsFormatted = (Object.keys(selectedCompetencies) as CompetencyKind[]).flatMap(
        (kind) =>
          selectedCompetencies[kind].map((id) => ({
            id,
            score:
              kind === 'HARD_SKILL' || kind === 'SOFT_SKILL'
                ? skillRatings[id] || 5
                : null,
            type: mapCompetencyKindToSubmissionType(kind)
          }))
      );

      const isEmployedPath = surveyStatus?.status === 'pending_employed_survey';
      const assessmentPath = isEmployedPath ? 'EMPLOYED' : 'UNEMPLOYED';

      const response = await fetch(`${API_URL}/prediction/employability/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: user.username,
          academicData: {
            ...academicData,
            internship_score: internshipScoreFromAnswers(experienceAnswers),
            certification_score: certificationScoreFromAnswers(experienceAnswers),
            board_exam:
              experienceAnswers.boardTaken === 'Yes' && experienceAnswers.boardResult === 'Passed'
                ? 1
                : 0,
            leader_pos: experienceAnswers.leadershipHeld === 'Yes',
            act_member_pos: experienceAnswers.activeMember === 'Yes',
            program_skill_ratings: buildProgramSkillRatingsPayload(
              surveyStatus?.programCode,
              programSkillRatings
            )
          },
          skillRatings: skillRatingsFormatted,
          additionalAnswers: {
            ...answers,
            internship_completed: experienceAnswers.internshipCompleted,
            internship_length: experienceAnswers.internshipLength,
            internship_relatedness: experienceAnswers.internshipRelatedness,
            internship_responsibilities: experienceAnswers.internshipResponsibilities,
            internship_improvement: experienceAnswers.internshipImprovement,
            certifications_completed: experienceAnswers.certificationsCompleted,
            certifications_type: experienceAnswers.certificationsType,
            certifications_count: experienceAnswers.certificationsCount,
            certifications_relatedness: experienceAnswers.certificationsRelatedness,
            board_taken: experienceAnswers.boardTaken,
            board_result: experienceAnswers.boardResult
          },
          assessmentPath
        })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result) {
        throw new Error(result?.error || 'Failed to submit assessment');
      }

      if (!isEmployedPath) {
        setPredictionResult(result.prediction);
        completeSurvey();
        completionNotifiedRef.current.employability = Boolean(result?.prediction);
        completionNotifiedRef.current.jobMatching = false;
        startCompletionPolling(token);
      }
      setRetakeMode(false);

      const nextSurveyStatus = await fetchSurveyStatus(token);
      await fetchLatestSubmission(token);

      if (!isEmployedPath && result?.prediction) {
        // Show prediction immediately even if status endpoint still reports a transient
        // "assessment_submitted_prediction_missing" state.
        setSurveyStage('finished');
      } else {
        setSurveyStage(resolveSurveyStage(nextSurveyStatus, !isEmployedPath));
      }
      toast({
        title: isEmployedPath ? 'Survey Complete' : 'Assessment Complete',
        description: isEmployedPath
          ? 'Your employed survey responses have been recorded.'
          : 'Your employability prediction has been generated.'
      });
    } catch (error) {
      console.error('Wizard submission error:', error);
      toast({
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'Failed to generate prediction.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={false} message="Loading survey..." />;
  }

  if (submitting && surveyStatus?.status === 'pending_employed_survey') {
    return (
      <LoadingScreen
        fullScreen={true}
        message="Submitting your survey responses..."
      />
    );
  }

  if (surveyStage === 'employedSurvey') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Employment Details</h1>
            <p className="text-muted-foreground text-sm">
              Please provide details about your current employment and career alignment.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {categories.some((category) => category.questions.length > 0) ? (
            categories
              .filter((category) => category.questions.length > 0)
              .map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                {renderSurveyCategory(category)}
              </motion.div>
              ))
          ) : (
            <div className="glass-card p-12 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h3 className="text-xl font-bold">Ready to Complete</h3>
              <p className="text-muted-foreground">
                No additional questions are required for your employment status. Click below to finish.
              </p>
            </div>
          )}
        </div>

        <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Your answers help us improve our curriculum and job matching services.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={() => navigate('/app/alumni/dashboard')} className="flex-1 md:flex-none">
              Dashboard
            </Button>
            <Button onClick={handleEmployedSurveySubmit} disabled={submitting} className="flex-1 md:flex-none min-w-[160px]">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Saving...' : 'Complete Survey'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (surveyStage === 'finished' && predictionResult) {
    const isEmployable = predictionResult.employable;
    const confidence = Math.round(predictionResult.confidence * 100);
    const probability = Math.round(predictionResult.probability * 100);

    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-10 text-center space-y-6"
        >
          <div className="relative inline-flex items-center justify-center w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isEmployable ? 'hsl(var(--success))' : '#f59e0b'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${probability * 2.82} 282`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold font-display">{probability}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2
              className={`text-4xl font-display font-bold ${
                isEmployable ? 'text-success' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isEmployable ? 'Employable' : 'Readiness In Progress'}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our AI model analyzed your profile with <strong>{confidence}% confidence</strong>.
              {isEmployable
                ? ' You show strong indicators of employment readiness within 6 months of graduation.'
                : ' We recommend focusing on improving your academic and skills profile.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-sm">
            <div className="p-4 rounded-xl border bg-muted/20">
              <p className="text-muted-foreground mb-1">Status</p>
              <p className="font-bold">{isEmployable ? 'Ready' : 'Developing'}</p>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20">
              <p className="text-muted-foreground mb-1">Model Version</p>
              <p className="font-bold">{predictionResult.model_type || 'v1.0.0'}</p>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20">
              <p className="text-muted-foreground mb-1">Path</p>
              <p className="font-bold">{surveyStatus?.resolvedPath || 'UNEMPLOYED'}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center pt-6 border-t font-display">
            <Button variant="outline" size="lg" onClick={() => navigate('/app/alumni/dashboard')}>
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/app/alumni/survey', { state: { retake: true } })}
            >
              Retake Assessment
            </Button>
            <Button size="lg" onClick={() => navigate('/app/alumni/results')}>
              View Detailed Breakdown
            </Button>
          </div>
        </motion.div>

        <div className="glass-card p-6 border-l-4 border-l-primary">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4" /> Next Step: Ground Truth Verification
          </h4>
          <p className="text-sm text-muted-foreground">
            A follow-up employment survey will be scheduled later to help improve the model&apos;s accuracy.
          </p>
        </div>
      </div>
    );
  }

  if (surveyStage === 'completed') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="text-2xl font-display font-bold">Survey Status Updated</h1>
          <p className="text-muted-foreground">{getCompletedMessage(surveyStatus)}</p>
          {latestSubmission && (
            <p className="text-sm text-muted-foreground">
              Latest submission: {new Date(latestSubmission.completed_at).toLocaleString()}
            </p>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/app/alumni/dashboard')}>
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/app/alumni/survey', { state: { retake: true } })}
            >
              Retake Assessment
            </Button>
            <Button
              onClick={() =>
                navigate(
                  surveyStatus?.hasEmployabilityPrediction ? '/app/alumni/results' : '/app/alumni/submissions'
                )
              }
            >
              {surveyStatus?.hasEmployabilityPrediction ? 'View Results' : 'View Submissions'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (submitting && surveyStatus?.status !== 'pending_employed_survey') {
    return (
      <LoadingScreen
        fullScreen={true}
        message="Generating your employability prediction..."
      />
    );
  }

  if (surveyStage === 'wizard') {
    const isBoardProgram = BOARD_PROGRAMS.has(String(surveyStatus?.programCode || '').toUpperCase());
    const currentStep = WIZARD_STEPS.find((step) => step.step === wizardStep) || WIZARD_STEPS[0];
    const totalWizardSteps = WIZARD_STEPS.length;
    const competencyStepConfig = COMPETENCY_STEP_CONFIGS[wizardStep];
    const selectedHardSkills = selectedCompetencies.HARD_SKILL;
    const selectedSoftSkills = selectedCompetencies.SOFT_SKILL;

    const validateWizardStep = () => {
      if (wizardStep === 1 && !academicProfileLoaded) {
        toast({
          title: 'Loading',
          description: 'Academic data is still loading. Please wait.'
        });
        return false;
      }

      if (wizardStep === 2 && !experienceAnswers.internshipCompleted) {
        toast({
          title: 'Validation Error',
          description: 'Please complete internship experience questions.'
        });
        return false;
      }

      if (wizardStep === 3 && !experienceAnswers.certificationsCompleted) {
        toast({
          title: 'Validation Error',
          description: 'Please complete certification questions.'
        });
        return false;
      }

      if (wizardStep === 4 && isBoardProgram && !experienceAnswers.boardTaken) {
        toast({
          title: 'Validation Error',
          description: 'Please complete board exam questions.'
        });
        return false;
      }

      if (wizardStep === 5 && (!experienceAnswers.leadershipHeld || !experienceAnswers.activeMember)) {
        toast({
          title: 'Validation Error',
          description: 'Please complete involvement questions.'
        });
        return false;
      }

      if (wizardStep === 6 && selectedHardSkills.length < HARD_SKILL_MIN_SELECTIONS) {
        toast({
          title: 'Validation Error',
          description: `Please select at least ${HARD_SKILL_MIN_SELECTIONS} hard skills.`
        });
        return false;
      }

      if (wizardStep === 7 && selectedSoftSkills.length < SOFT_SKILL_MIN_SELECTIONS) {
        toast({
          title: 'Validation Error',
          description: `Please select at least ${SOFT_SKILL_MIN_SELECTIONS} soft skills.`
        });
        return false;
      }

      if (wizardStep === 8 && selectedCompetencies.KNOWLEDGE.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 knowledge area.'
        });
        return false;
      }

      if (wizardStep === 9 && selectedCompetencies.ABILITY.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 ability.'
        });
        return false;
      }

      if (wizardStep === 10 && selectedCompetencies.INTEREST.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 interest.'
        });
        return false;
      }

      if (wizardStep === 11 && selectedCompetencies.TECHNOLOGY.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 technology skill.'
        });
        return false;
      }

      return true;
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">Employability Assessment</h1>
            <p className="text-muted-foreground">
              Step {wizardStep} of {totalWizardSteps}: {currentStep.label}
            </p>
          </div>
          <div className="flex gap-2">
            {WIZARD_STEPS.map((step) => (
              <div
                key={step.step}
                className={`h-2 w-12 rounded-full transition-colors ${
                  step.step <= wizardStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          Your initial employment answer has been recorded as <strong>{surveyStatus?.status === 'pending_employed_survey' ? 'Employed' : 'Unemployed'}</strong>. This flow
          now captures hard skills, soft skills, knowledge, abilities, interests, and technology
          skills. Every competency section includes search plus an <strong>All / Selected</strong>{' '}
          filter to make long lists easier to review, and the employability model now treats very
          narrow hard/soft selections more conservatively instead of forcing a tiny range.
        </div>

        <motion.div
          key={wizardStep}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 min-h-[500px] flex flex-col"
        >
          {wizardStep === 1 && (
            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Degree Program</Label>
                  <Input
                    value={
                      availableDegrees.find((d) => String(d.id) === academicData.degree_id)?.name ||
                      academicData.degree_id ||
                      'N/A'
                    }
                    disabled
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Year Graduated</Label>
                  <Input value={academicData.year_graduated || 'N/A'} disabled className="bg-muted/50" />
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6 flex-1">
              <h3 className="text-xl font-semibold">A. Internship Experience</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Did you complete an internship/OJT?</Label>
                  <Select value={experienceAnswers.internshipCompleted} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, internshipCompleted: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>How long was your internship?</Label>
                  <Select disabled={experienceAnswers.internshipCompleted !== 'Yes'} value={experienceAnswers.internshipLength} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, internshipLength: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Less than 1 month">Less than 1 month</SelectItem>
                      <SelectItem value="1-2 months">1-2 months</SelectItem>
                      <SelectItem value="3-4 months">3-4 months</SelectItem>
                      <SelectItem value="5+ months">5+ months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Was your internship related to your course/program?</Label>
                  <Select disabled={experienceAnswers.internshipCompleted !== 'Yes'} value={experienceAnswers.internshipRelatedness} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, internshipRelatedness: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not related">Not related</SelectItem>
                      <SelectItem value="Slightly related">Slightly related</SelectItem>
                      <SelectItem value="Moderately related">Moderately related</SelectItem>
                      <SelectItem value="Highly related">Highly related</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Internship responsibilities</Label>
                  <Select disabled={experienceAnswers.internshipCompleted !== 'Yes'} value={experienceAnswers.internshipResponsibilities} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, internshipResponsibilities: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mostly observation only">Mostly observation only</SelectItem>
                      <SelectItem value="Assisted simple tasks">Assisted simple tasks</SelectItem>
                      <SelectItem value="Handled regular tasks">Handled regular tasks</SelectItem>
                      <SelectItem value="Worked on major responsibilities/projects">Worked on major responsibilities/projects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Did your internship improve your professional skills?</Label>
                  <Select disabled={experienceAnswers.internshipCompleted !== 'Yes'} value={experienceAnswers.internshipImprovement} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, internshipImprovement: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Strongly Disagree">Strongly Disagree</SelectItem>
                      <SelectItem value="Disagree">Disagree</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Agree">Agree</SelectItem>
                      <SelectItem value="Strongly Agree">Strongly Agree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6 flex-1">
              <h3 className="text-xl font-semibold">B. Certifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Have you completed certifications/training programs?</Label>
                  <Select value={experienceAnswers.certificationsCompleted} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, certificationsCompleted: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type of certifications</Label>
                  <Select disabled={experienceAnswers.certificationsCompleted !== 'Yes'} value={experienceAnswers.certificationsType} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, certificationsType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="School seminars only">School seminars only</SelectItem>
                      <SelectItem value="Online short courses">Online short courses</SelectItem>
                      <SelectItem value="Technical/professional certifications">Technical/professional certifications</SelectItem>
                      <SelectItem value="National/international certifications">National/international certifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>How many certifications/trainings?</Label>
                  <Select disabled={experienceAnswers.certificationsCompleted !== 'Yes'} value={experienceAnswers.certificationsCount} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, certificationsCount: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="1-2">1-2</SelectItem>
                      <SelectItem value="3-5">3-5</SelectItem>
                      <SelectItem value="6+">6+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Are certifications related to your degree/career path?</Label>
                  <Select disabled={experienceAnswers.certificationsCompleted !== 'Yes'} value={experienceAnswers.certificationsRelatedness} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, certificationsRelatedness: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not related">Not related</SelectItem>
                      <SelectItem value="Slightly related">Slightly related</SelectItem>
                      <SelectItem value="Mostly related">Mostly related</SelectItem>
                      <SelectItem value="Highly related">Highly related</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-6 flex-1">
              <h3 className="text-xl font-semibold">C. Board Exam</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isBoardProgram && (
                  <>
                    <div className="space-y-2">
                      <Label>Have you taken a licensure/board exam?</Label>
                      <Select value={experienceAnswers.boardTaken} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, boardTaken: v, boardResult: v === 'No' ? 'Failed' : p.boardResult }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Board exam result</Label>
                      <Select disabled={experienceAnswers.boardTaken !== 'Yes'} value={experienceAnswers.boardResult} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, boardResult: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="Passed">Passed</SelectItem><SelectItem value="Failed">Failed</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {wizardStep === 5 && (
            <div className="space-y-6 flex-1">
              <h3 className="text-xl font-semibold">D. Involvement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Have you held a leadership position?</Label>
                  <Select value={experienceAnswers.leadershipHeld} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, leadershipHeld: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Were you an active member in organizations?</Label>
                  <Select value={experienceAnswers.activeMember} onValueChange={(v) => setExperienceAnswers((p) => ({ ...p, activeMember: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {competencyStepConfig && renderCompetencySelectionStep(competencyStepConfig)}

          {wizardStep === 12 && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">E. Crucial Skills Rating (1-10)</h3>
                <p className="text-sm text-muted-foreground">
                  Rate these crucial skills required for your program. These are used directly by the employability model.
                </p>
              </div>
              <div className="space-y-6 pt-2 max-w-3xl mx-auto">
                {getRequiredSkillsForProgram(surveyStatus?.programCode).length > 0 ? (
                  getRequiredSkillsForProgram(surveyStatus?.programCode).map((skill) => (
                    <div key={skill} className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-base font-medium">{skill}</Label>
                        <span className="font-bold text-primary">{programSkillRatings[skill] || 5}</span>
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[programSkillRatings[skill] || 5]}
                        onValueChange={(value) =>
                          setProgramSkillRatings((prev) => ({ ...prev, [skill]: value[0] }))
                        }
                      />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">
                      No crucial skills configured for your program. You can continue.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {wizardStep === 13 && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Rate your Proficiency (1-10)</h3>
                <p className="text-sm text-muted-foreground">
                  How proficient do you feel in the skills you selected? (1 = Beginner, 10 = Expert)
                </p>
              </div>
              <div className="space-y-8 pt-4 max-w-2xl mx-auto">
                {[...selectedHardSkills, ...selectedSoftSkills].map((id) => {
                  const skill = availableCompetencies.find((entry) => entry.id === id);
                  if (!skill) {
                    return null;
                  }

                  return (
                    <div key={id} className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-base font-medium">{skill.name}</Label>
                        <span className="font-bold text-primary">{skillRatings[id] || 5}</span>
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[skillRatings[id] || 5]}
                        onValueChange={(value) =>
                          setSkillRatings((prev) => ({ ...prev, [id]: value[0] }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {wizardStep === 14 && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Additional Tracer Questions</h3>
                <p className="text-sm text-muted-foreground">
                  Please answer these final questions to help us improve our curriculum and alumni support.
                </p>
              </div>
              <div className="space-y-8 pt-4">
                {categories.some((category) =>
                  category.questions.some((question) => question.question_key !== decisionQuestionKey)
                ) ? (
                  categories
                    .filter((category) =>
                      category.questions.some((question) => question.question_key !== decisionQuestionKey)
                    )
                    .map((category) => (
                    <div key={category.id} className="space-y-4">
                      {renderSurveyCategory(category)}
                    </div>
                    ))
                ) : (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">No additional questions defined for this path. You can proceed to generate your prediction.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-auto border-t pt-8 flex justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (wizardStep === 1) {
                  navigate('/app/alumni/dashboard');
                  return;
                }

                setWizardStep((prev) => prev - 1);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> {wizardStep === 1 ? 'Dashboard' : 'Back'}
            </Button>

            {wizardStep < totalWizardSteps ? (
              <Button
                size="lg"
                onClick={() => {
                  if (!validateWizardStep()) {
                    return;
                  }

                  setWizardStep((prev) => prev + 1);
                }}
              >
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" onClick={handleWizardSubmit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {submitting ? 'Processing...' : (surveyStatus?.status === 'pending_employed_survey' ? 'Complete Survey' : 'Generate Prediction')}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h2 className="text-2xl font-display font-bold mb-2">No Survey Available</h2>
        <p className="text-muted-foreground mb-6">
          There is no active survey available for your college at this time.
        </p>
        <Button onClick={() => navigate('/app/alumni/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const gatewayCategory = categories[0];
  const decisionQuestion = getDecisionQuestion(categories, decisionQuestionKey);

  if (!decisionQuestion) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-warning" />
        <h2 className="text-2xl font-display font-bold mb-2">Survey Setup Incomplete</h2>
        <p className="text-muted-foreground mb-6">
          The employment gateway question is missing from the current survey definition.
        </p>
        <Button onClick={() => navigate('/app/alumni/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const selectedGatewayAnswer = answers[String(decisionQuestion.id)] || '';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-2">
          <ClipboardList className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold">Alumni Tracer Survey</h1>
        <p className="text-muted-foreground">
          Welcome back! To help us improve our services and support your career growth, 
          please provide your current employment status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-primary/20 shadow-xl shadow-primary/5"
        >
          {renderSurveyCategory(gatewayCategory)}
          
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded-full bg-blue-500/20">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your response determines whether you'll proceed to the 
                <span className="text-primary font-medium ml-1">Employability Assessment & Skill Matching</span>.
              </p>
            </div>
            
            <Button 
              size="lg" 
              onClick={handleInitialSubmit} 
              disabled={submitting || !selectedGatewayAnswer} 
              className="w-full sm:w-auto min-w-[180px] h-12"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Processing...' : 'Continue'}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => navigate('/app/alumni/dashboard')} className="text-muted-foreground hover:text-primary">
          Cancel and return to dashboard
        </Button>
      </div>
    </div>
  );
}
