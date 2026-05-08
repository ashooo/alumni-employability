import { ClipboardCheck, Briefcase, TrendingUp, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth, type SurveyFlowStatus } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/KpiCard';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AlumniData {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  program: string;
  batchYear: number;
  surveyCompleted: boolean;
  employmentStatus: string;
  readinessScore?: number;
  resultsReady: boolean;
  surveyStatusLabel: string;
  surveySummary: string;
  surveyActionLabel: string;
  latestSubmission?: {
    date: string;
    version: string;
    questionsAnswered: number;
    status: string;
    completed_at?: string;
  };
  surveyState: SurveyFlowStatus | null;
}

interface SurveyResponse {
  id: number;
  survey_version: number;
  completed_at: string;
  status: string;
  answers: any[];
}

interface LatestPrediction {
  probability: number;
}

const formatEmploymentStatus = (status?: string | null) => {
  if (!status) {
    return '-';
  }

  return String(status)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getTracerEmploymentStatus = (surveyState: SurveyFlowStatus | null) => {
  if (!surveyState) {
    return '-';
  }

  if (surveyState.employmentStatus) {
    return formatEmploymentStatus(surveyState.employmentStatus);
  }

  if (surveyState.resolvedPath === 'EMPLOYED' || surveyState.nextPath === 'EMPLOYED') {
    return 'Employed';
  }

  if (surveyState.resolvedPath === 'UNEMPLOYED' || surveyState.nextPath === 'UNEMPLOYED') {
    return 'Unemployed';
  }

  return '-';
};

const getSurveySummary = (surveyState: SurveyFlowStatus | null) => {
  if (!surveyState) {
    return 'Survey status unavailable.';
  }

  switch (surveyState.status) {
    case 'pending_initial_survey':
      return 'Please answer the employment gateway question to start the correct survey path.';
    case 'pending_initial_path_answer':
      return 'Your first survey step still needs an employment-status answer.';
    case 'pending_unemployed_assessment':
      return 'Your unemployed path is open. Continue the employability assessment to generate results.';
    case 'pending_employed_survey':
      return 'Your employed path was recorded. Continue to complete your employed survey questions.';
    case 'assessment_submitted_prediction_missing':
      return 'Your assessment was submitted. The prediction result is still being finalized.';
    case 'completed_awaiting_followup':
      return 'Your initial unemployed assessment is complete. A follow-up survey is scheduled later.';
    case 'completed':
      return 'Your survey flow is complete. You can view your prediction results.';
    default:
      return 'Survey status available.';
  }
};

const getSurveyStatusLabel = (surveyState: SurveyFlowStatus | null) => {
  if (!surveyState) {
    return 'Unknown';
  }

  if (surveyState.completed) {
    return 'Completed';
  }

  if (surveyState.nextPath === 'UNEMPLOYED') {
    return 'Assessment Pending';
  }

  if (surveyState.nextPath === 'EMPLOYED') {
    return 'Employed Path Pending';
  }

  return 'Pending';
};

const getSurveyActionLabel = (surveyState: SurveyFlowStatus | null) => {
  if (!surveyState) {
    return 'Open Survey';
  }

  switch (surveyState.status) {
    case 'pending_unemployed_assessment':
      return 'Continue Assessment';
    case 'pending_employed_survey':
      return 'View Status';
    case 'completed':
    case 'completed_awaiting_followup':
      return 'View Survey Status';
    default:
      return 'Take Survey';
  }
};

export default function AlumniDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alumniData, setAlumniData] = useState<AlumniData>({
    firstName: '',
    lastName: '',
    program: '',
    batchYear: new Date().getFullYear(),
    surveyCompleted: false,
    employmentStatus: '-',
    resultsReady: false,
    surveyStatusLabel: 'Pending',
    surveySummary: 'Survey status unavailable.',
    surveyActionLabel: 'Take Survey',
    surveyState: null
  });

  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  useEffect(() => {
    const fetchAlumniData = async () => {
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

        const [profileResponse, surveyStatusResponse, surveyResponse] =
          await Promise.all([
            fetch(`${API_URL}/alumni/profile/${user.username}`, { headers }),
            fetch(`${API_URL}/alumni/survey/status/${user.username}`, { headers }),
            fetch(`${API_URL}/alumni/survey/responses/${user.username}`, { headers })
          ]);

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        if (!surveyStatusResponse.ok) {
          throw new Error('Failed to fetch survey status');
        }

        const profileData = await profileResponse.json();
        const surveyState: SurveyFlowStatus = await surveyStatusResponse.json();

        updateUser({
          survey: surveyState,
          surveyCompleted: Boolean(surveyState.completed)
        });

        const employmentStatus = getTracerEmploymentStatus(surveyState);

        let latestSubmission = undefined;
        if (surveyResponse.ok) {
          const submissions: SurveyResponse[] = await surveyResponse.json();
          if (submissions.length > 0) {
            const latest = submissions[0];
            latestSubmission = {
              date: new Date(latest.completed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              version: `Version ${latest.survey_version}`,
              questionsAnswered: latest.answers?.length || 0,
              status: latest.status || 'Completed',
              completed_at: latest.completed_at
            };
          }
        }

        let readinessScore = undefined;
        if (surveyState.hasEmployabilityPrediction) {
          const predictionResponse = await fetch(
            `${API_URL}/prediction/employability/latest/${user.username}`,
            { headers }
          );

          if (predictionResponse.ok) {
            const prediction: LatestPrediction = await predictionResponse.json();
            readinessScore = Math.round((prediction.probability || 0) * 100);
          }
        }

        setAlumniData({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          middleName: profileData.middle_name,
          suffix: profileData.suffix,
          program: profileData.program_name || profileData.program || '',
          batchYear: profileData.batch_year || new Date().getFullYear(),
          surveyCompleted: Boolean(surveyState.completed),
          employmentStatus,
          readinessScore,
          resultsReady: Boolean(surveyState.hasEmployabilityPrediction),
          surveyStatusLabel: getSurveyStatusLabel(surveyState),
          surveySummary: getSurveySummary(surveyState),
          surveyActionLabel: getSurveyActionLabel(surveyState),
          latestSubmission,
          surveyState
        });
      } catch (error) {
        console.error('Error fetching alumni data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlumniData();
  }, [toast, updateUser, user?.username]);

  const getDisplayName = () => {
    if (alumniData.firstName && alumniData.lastName) {
      return `${alumniData.firstName} ${alumniData.lastName}`;
    }
    return user?.username || 'Alumni';
  };

  const bannerIsComplete = alumniData.surveyCompleted && alumniData.resultsReady;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h1 className="text-2xl font-display font-bold mb-1">
          Welcome back, {getDisplayName()}!
        </h1>
        <p className="text-muted-foreground">
          {alumniData.program
            ? `Batch ${alumniData.batchYear} • ${alumniData.program}`
            : 'Alumni Tracer Dashboard'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${
          bannerIsComplete
            ? 'border-success/20 bg-success/10'
            : 'border-warning/20 bg-warning/10'
        }`}
      >
        {bannerIsComplete ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold">{alumniData.surveyStatusLabel}</p>
          <p className="text-xs text-muted-foreground">{alumniData.surveySummary}</p>
        </div>
        <Button
          size="sm"
          variant={bannerIsComplete ? 'outline' : 'default'}
          onClick={() =>
            navigate(bannerIsComplete ? '/app/alumni/results' : '/app/alumni/survey')
          }
        >
          {bannerIsComplete ? 'View Results' : alumniData.surveyActionLabel}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Survey Status"
          value={alumniData.surveyStatusLabel}
          icon={ClipboardCheck}
          delay={0}
          subtitle={alumniData.surveySummary}
        />

        <KpiCard
          title="Employment Status"
          value={alumniData.employmentStatus}
          icon={Briefcase}
          delay={0.1}
          subtitle={
            alumniData.employmentStatus !== '-' ? 'From tracer survey path' : 'Set after tracer survey gateway'
          }
        />

        <KpiCard
          title="Readiness Score"
          value={alumniData.readinessScore ? `${alumniData.readinessScore}%` : 'N/A'}
          icon={TrendingUp}
          delay={0.2}
          subtitle={
            alumniData.readinessScore
              ? 'From your latest employability prediction'
              : 'Complete the unemployed assessment to see this'
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/app/alumni/profile')}
            >
              Update My Profile
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/app/alumni/survey')}
            >
              {alumniData.surveyActionLabel}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/app/alumni/results')}
              disabled={!alumniData.resultsReady}
            >
              View Employability Results
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/app/alumni/jobs')}
              disabled={!alumniData.resultsReady}
            >
              View Job Recommendations
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/app/alumni/submissions')}
            >
              View Submissions
            </Button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-3">Latest Submission</h3>
          {alumniData.latestSubmission ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{alumniData.latestSubmission.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{alumniData.latestSubmission.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions Answered</span>
                <span className="font-medium">{alumniData.latestSubmission.questionsAnswered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{alumniData.latestSubmission.status}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No submissions yet</p>
              <Button size="sm" onClick={() => navigate('/app/alumni/survey')}>
                Start Survey
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
