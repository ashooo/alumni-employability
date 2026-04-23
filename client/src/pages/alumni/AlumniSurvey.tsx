import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Bell, Briefcase, AlertTriangle } from 'lucide-react';
import { useAuth, type SurveyFlowStatus } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Question {
  id: number;
  question_key?: string;
  category_id: number;
  text: string;
  type: 'text' | 'select' | 'dropdown' | 'checkbox' | 'scale' | 'number' | 'radio';
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
}

type SurveyStage = 'initial' | 'wizard' | 'employedPending' | 'completed' | 'finished';

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
  { step: 2, label: 'Hard Skills' },
  { step: 3, label: 'Soft Skills' },
  { step: 4, label: 'Knowledge' },
  { step: 5, label: 'Abilities' },
  { step: 6, label: 'Interests' },
  { step: 7, label: 'Technology Skills' },
  { step: 8, label: 'Skill Proficiency' }
];

const TECHNOLOGY_VISIBLE_LIMIT = 120;
const TECHNOLOGY_SEARCH_LIMIT = 180;

const COMPETENCY_STEP_CONFIGS: Record<number, CompetencyStepConfig> = {
  2: {
    step: 2,
    kind: 'HARD_SKILL',
    title: 'Select 6-8 Hard Skills',
    min: 6,
    max: 8,
    description: 'Choose the technical and professional skills that best represent your strongest areas.',
    searchPlaceholder: 'Search hard skills',
    emptyMessage: 'No hard skills matched your current search or filter.'
  },
  3: {
    step: 3,
    kind: 'SOFT_SKILL',
    title: 'Select 4-5 Soft Skills',
    min: 4,
    max: 5,
    description: 'Choose the people and workplace skills that best describe how you work with others.',
    searchPlaceholder: 'Search soft skills',
    emptyMessage: 'No soft skills matched your current search or filter.'
  },
  4: {
    step: 4,
    kind: 'KNOWLEDGE',
    title: 'Select Knowledge Areas',
    min: 1,
    description: 'Pick at least one knowledge area that matches what you are most familiar with academically or professionally.',
    searchPlaceholder: 'Search knowledge areas',
    emptyMessage: 'No knowledge areas matched your current search or filter.'
  },
  5: {
    step: 5,
    kind: 'ABILITY',
    title: 'Select Abilities',
    min: 1,
    description: 'Pick at least one ability that reflects how you naturally solve problems and perform tasks.',
    searchPlaceholder: 'Search abilities',
    emptyMessage: 'No abilities matched your current search or filter.'
  },
  6: {
    step: 6,
    kind: 'INTEREST',
    title: 'Select Interests',
    min: 1,
    description: 'Pick at least one interest that aligns with the type of work and environment you prefer.',
    searchPlaceholder: 'Search interests',
    emptyMessage: 'No interests matched your current search or filter.'
  },
  7: {
    step: 7,
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
    case 'SELF_EMPLOYED':
      return 'Self-Employed';
    case 'FREELANCER':
      return 'Freelancer';
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

const getGatewayCategories = (survey: Category[], decisionQuestionKey: string) => {
  const gatewayCategory = survey.find((category) =>
    category.questions.some((question) => question.question_key === decisionQuestionKey)
  );

  return gatewayCategory ? [gatewayCategory] : survey.slice(0, 1);
};

const resolveSurveyStage = (
  surveyStatus: SurveyFlowStatus,
  hasPrediction: boolean
): SurveyStage => {
  if (surveyStatus.status === 'pending_unemployed_assessment') {
    return 'wizard';
  }

  if (surveyStatus.status === 'pending_employed_survey') {
    return 'employedPending';
  }

  if (surveyStatus.completed && hasPrediction) {
    return 'finished';
  }

  if (
    surveyStatus.completed ||
    surveyStatus.status === 'assessment_submitted_prediction_missing' ||
    surveyStatus.status === 'completed_awaiting_followup'
  ) {
    return 'completed';
  }

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
  const [academicData, setAcademicData] = useState({
    cgpa: '',
    prof_grade: '',
    elec_grade: '',
    ojt_grade: '',
    gender: '',
    age: '',
    year_graduated: new Date().getFullYear().toString(),
    leader_pos: false,
    act_member_pos: false,
    degree_id: ''
  });
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
  const [predictionResult, setPredictionResult] = useState<Prediction | null>(null);

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

        if (competenciesResponse.ok) {
          setAvailableCompetencies(await competenciesResponse.json());
        }

        if (degreesResponse.ok) {
          setAvailableDegrees(await degreesResponse.json());
        }

        if (nextSurveyStatus.programId) {
          setAcademicData((prev) => ({
            ...prev,
            degree_id: prev.degree_id || String(nextSurveyStatus.programId)
          }));
        }

        await fetchLatestSubmission(token);

        const resolvedCollegeId = nextSurveyStatus.collegeId || profileData?.college_id || null;
        if (resolvedCollegeId) {
          const surveyResponse = await fetch(`${API_URL}/alumni/survey/college/${resolvedCollegeId}`, {
            headers
          });

          if (surveyResponse.ok) {
            const surveyData: SurveyDefinitionResponse = await surveyResponse.json();
            const nextDecisionQuestionKey =
              surveyData.branching?.decision_question_key || 'current_employment_status';
            const gatewayCategories = getGatewayCategories(
              surveyData.survey || [],
              nextDecisionQuestionKey
            );

            setCategories(gatewayCategories);
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
          }
        }

        let latestPrediction: Prediction | null = null;
        if (nextSurveyStatus.hasEmployabilityPrediction) {
          latestPrediction = await fetchLatestPrediction(token);
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
  }, [toast, updateUser, user?.username]);

  const setAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const getCompetenciesByKind = (kind: CompetencyKind) =>
    availableCompetencies.filter((competency) => competency.kind === kind);

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
                : 'border-destructive/30 bg-destructive/5 text-destructive'
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
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit employment gateway');
      }

      const nextSurveyStatus = await fetchSurveyStatus(token);
      await fetchLatestSubmission(token);

      if (nextSurveyStatus.status === 'pending_unemployed_assessment') {
        setSurveyStage('wizard');
        toast({
          title: 'Unemployed path selected',
          description: 'Continue with the employability assessment.'
        });
      } else if (nextSurveyStatus.status === 'pending_employed_survey') {
        setSurveyStage('employedPending');
        toast({
          title: 'Employment path recorded',
          description: 'Your employed path has been saved. The dedicated employed survey is next.'
        });
      } else {
        setSurveyStage(resolveSurveyStage(nextSurveyStatus, Boolean(predictionResult)));
      }
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

      const response = await fetch(`${API_URL}/prediction/employability/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: user.username,
          academicData,
          skillRatings: skillRatingsFormatted,
          additionalAnswers: answers
        })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result) {
        throw new Error(result?.error || 'Failed to submit assessment');
      }

      setPredictionResult(result.prediction);
      completeSurvey();

      const nextSurveyStatus = await fetchSurveyStatus(token);
      await fetchLatestSubmission(token);

      setSurveyStage(resolveSurveyStage(nextSurveyStatus, true));
      toast({
        title: 'Assessment Complete',
        description: 'Your employability prediction has been generated.'
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (surveyStage === 'employedPending') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-8 text-center space-y-4">
          <Briefcase className="mx-auto h-14 w-14 text-primary" />
          <h1 className="text-2xl font-display font-bold">Employment Path Recorded</h1>
          <p className="text-muted-foreground">
            Your answer has been saved as <strong>{mapEmploymentStatusToAnswer(surveyStatus?.employmentStatus)}</strong>.
            The dedicated employed survey flow is still pending implementation, so there is nothing else to answer here yet.
          </p>
          {latestSubmission && (
            <p className="text-sm text-muted-foreground">
              Latest submission: {new Date(latestSubmission.completed_at).toLocaleString()}
            </p>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/app/alumni/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate('/app/alumni/submissions')}>
              View Submissions
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
                stroke={isEmployable ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
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
                isEmployable ? 'text-success' : 'text-destructive'
              }`}
            >
              {isEmployable ? 'Employable' : 'Not Yet Employable'}
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

  if (surveyStage === 'wizard') {
    const currentStep = WIZARD_STEPS.find((step) => step.step === wizardStep) || WIZARD_STEPS[0];
    const totalWizardSteps = WIZARD_STEPS.length;
    const competencyStepConfig = COMPETENCY_STEP_CONFIGS[wizardStep];
    const selectedHardSkills = selectedCompetencies.HARD_SKILL;
    const selectedSoftSkills = selectedCompetencies.SOFT_SKILL;

    const validateWizardStep = () => {
      if (wizardStep === 1 && (!academicData.cgpa || !academicData.age || !academicData.degree_id)) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in the required academic details.'
        });
        return false;
      }

      if (wizardStep === 2 && selectedHardSkills.length < 6) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 6 hard skills.'
        });
        return false;
      }

      if (wizardStep === 3 && selectedSoftSkills.length < 4) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 4 soft skills.'
        });
        return false;
      }

      if (wizardStep === 4 && selectedCompetencies.KNOWLEDGE.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 knowledge area.'
        });
        return false;
      }

      if (wizardStep === 5 && selectedCompetencies.ABILITY.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 ability.'
        });
        return false;
      }

      if (wizardStep === 6 && selectedCompetencies.INTEREST.length < 1) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 1 interest.'
        });
        return false;
      }

      if (wizardStep === 7 && selectedCompetencies.TECHNOLOGY.length < 1) {
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
          Your initial employment answer has been recorded as <strong>Unemployed</strong>. This flow
          now captures hard skills, soft skills, knowledge, abilities, interests, and technology
          skills. Every competency section includes search plus an <strong>All / Selected</strong>{' '}
          filter to make long lists easier to review.
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
                  <Label>Gender</Label>
                  <Select
                    value={academicData.gender}
                    onValueChange={(value) => setAcademicData((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 22"
                    value={academicData.age}
                    onChange={(event) =>
                      setAcademicData((prev) => ({ ...prev, age: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree Program</Label>
                  <Select
                    value={academicData.degree_id}
                    onValueChange={(value) =>
                      setAcademicData((prev) => ({ ...prev, degree_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Degree" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDegrees.map((degree) => (
                        <SelectItem key={degree.id} value={String(degree.id)}>
                          {degree.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Overall CGPA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1.25"
                    value={academicData.cgpa}
                    onChange={(event) =>
                      setAcademicData((prev) => ({ ...prev, cgpa: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Average Prof Grade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={academicData.prof_grade}
                    onChange={(event) =>
                      setAcademicData((prev) => ({ ...prev, prof_grade: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Average Elective Grade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={academicData.elec_grade}
                    onChange={(event) =>
                      setAcademicData((prev) => ({ ...prev, elec_grade: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>OJT Grade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={academicData.ojt_grade}
                    onChange={(event) =>
                      setAcademicData((prev) => ({ ...prev, ojt_grade: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year Graduated</Label>
                  <Input
                    type="number"
                    value={academicData.year_graduated}
                    onChange={(event) =>
                      setAcademicData((prev) => ({
                        ...prev,
                        year_graduated: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Leadership Position</Label>
                    <p className="text-sm text-muted-foreground">
                      Did you hold a leadership role in any student organization?
                    </p>
                  </div>
                  <Switch
                    checked={academicData.leader_pos}
                    onCheckedChange={(value) =>
                      setAcademicData((prev) => ({ ...prev, leader_pos: value }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Active Membership</Label>
                    <p className="text-sm text-muted-foreground">
                      Were you an active member of organization(s)?
                    </p>
                  </div>
                  <Switch
                    checked={academicData.act_member_pos}
                    onCheckedChange={(value) =>
                      setAcademicData((prev) => ({ ...prev, act_member_pos: value }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {competencyStepConfig && renderCompetencySelectionStep(competencyStepConfig)}

          {wizardStep === 8 && (
            <div className="space-y-6 flex-1">
              <h3 className="text-xl font-semibold">Rate your Proficiency (1-10)</h3>
              <div className="space-y-8 max-w-2xl mx-auto">
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
                {submitting ? 'Analyzing...' : 'Generate Prediction'}
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
  const initialProgress = selectedGatewayAnswer ? 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Survey Path Check</h1>
        <p className="text-muted-foreground text-sm">
          Step 1 asks for your employment status so we can open the right survey path.
        </p>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Employment gateway</span>
          <span>{Math.round(initialProgress)}%</span>
        </div>
        <Progress value={initialProgress} className="h-2" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card p-6"
      >
        <h3 className="mb-2 text-lg font-display font-semibold">{gatewayCategory.name}</h3>
        {gatewayCategory.description && (
          <p className="mb-4 text-sm text-muted-foreground">{gatewayCategory.description}</p>
        )}

        <div className="space-y-3">
          <Label className="text-base">
            {decisionQuestion.text}
            {decisionQuestion.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <Select
            value={String(selectedGatewayAnswer)}
            onValueChange={(value) => setAnswer(String(decisionQuestion.id), value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your current status" />
            </SelectTrigger>
            <SelectContent>
              {(decisionQuestion.options || []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Unemployed alumni will continue to the employability assessment. Employed alumni will be
            routed to the employed path once it is ready.
          </p>
        </div>

        {latestSubmission && (
          <div className="mt-4 rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Latest survey submission</p>
            <p className="text-muted-foreground">
              {new Date(latestSubmission.completed_at).toLocaleString()}
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={() => navigate('/app/alumni/dashboard')}>
            Back to Dashboard
          </Button>
          <Button onClick={handleInitialSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
