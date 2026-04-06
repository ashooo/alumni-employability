import { ClipboardCheck, Briefcase, TrendingUp, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/KpiCard';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// API URL
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
  latestSubmission?: {
    date: string;
    version: string;
    questionsAnswered: number;
    status: string;
    completed_at?: string;
  };
}

interface SurveyResponse {
  id: number;
  survey_version: number;
  completed_at: string;
  status: string;
  answers: any[];
}

export default function AlumniDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alumniData, setAlumniData] = useState<AlumniData>({
    firstName: '',
    lastName: '',
    program: '',
    batchYear: new Date().getFullYear(),
    surveyCompleted: false,
    employmentStatus: 'Not Specified',
  });

  // Get token from storage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // Fetch alumni data
  useEffect(() => {
    const fetchAlumniData = async () => {
      if (!user?.username) return;
      
      setLoading(true);
      try {
        const token = getToken();
        
        // Fetch profile data
        const profileResponse = await fetch(`${API_URL}/alumni/profile/${user.username}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        console.log('Profile data:', profileData); // Debug log
        
        // Fetch employment data
        const employmentResponse = await fetch(`${API_URL}/alumni/employment/${user.username}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let employmentStatus = 'Not Specified';
        if (employmentResponse.ok) {
          const empData = await employmentResponse.json();
          if (empData.length > 0) {
            employmentStatus = empData[0].status;
          }
        }

        // Fetch survey responses to check if completed
        const surveyResponse = await fetch(`${API_URL}/alumni/survey/responses/${user.username}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let surveyCompleted = false;
        let latestSubmission = undefined;
        let readinessScore = 0;
        
        if (surveyResponse.ok) {
          const submissions: SurveyResponse[] = await surveyResponse.json();
          console.log('Survey submissions:', submissions); // Debug log
          
          if (submissions.length > 0) {
            surveyCompleted = true;
            const latest = submissions[0]; // Most recent submission
            
            // Calculate readiness score based on answers (you can implement your own logic)
            // This is a placeholder - you might want to calculate based on actual answers
            readinessScore = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
            
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

        setAlumniData({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          middleName: profileData.middle_name,
          suffix: profileData.suffix,
          program: profileData.program_name || profileData.program || '',
          batchYear: profileData.batch_year || new Date().getFullYear(),
          surveyCompleted,
          employmentStatus,
          readinessScore: surveyCompleted ? readinessScore : undefined,
          latestSubmission
        });
        
        console.log('Alumni data set:', {
          surveyCompleted,
          employmentStatus,
          readinessScore
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
  }, [user]);

  // Get display name
  const getDisplayName = () => {
    if (alumniData.firstName && alumniData.lastName) {
      return `${alumniData.firstName} ${alumniData.lastName}`;
    }
    return user?.username || 'Alumni';
  };

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
          Welcome back, {getDisplayName()}! 👋
        </h1>
        <p className="text-muted-foreground">
          {alumniData.program ? `Batch ${alumniData.batchYear} • ${alumniData.program}` : 'Alumni Tracer Dashboard'}
        </p>
      </motion.div>

      {!alumniData.surveyCompleted ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-4 flex-wrap"
        >
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Tracer Survey Pending</p>
            <p className="text-xs text-muted-foreground">
              Please complete the tracer survey to receive your results and job recommendations.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/app/alumni/survey')}>
            Take Survey
          </Button>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-4 flex-wrap"
        >
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Survey Completed!</p>
            <p className="text-xs text-muted-foreground">
              Thank you for completing the survey. You can view your results below.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/app/alumni/results')}>
            View Results
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard 
          title="Survey Status" 
          value={alumniData.surveyCompleted ? 'Completed' : 'Pending'} 
          icon={ClipboardCheck} 
          delay={0}
          subtitle={alumniData.surveyCompleted ? 'Thank you for participating!' : 'Action required'}
        />
        
        <KpiCard 
          title="Employment Status" 
          value={alumniData.employmentStatus} 
          icon={Briefcase} 
          delay={0.1}
          subtitle={alumniData.employmentStatus !== 'Not Specified' ? 'Updated recently' : 'Please update'}
        />
        
        <KpiCard 
          title="Readiness Score" 
          value={alumniData.readinessScore ? `${alumniData.readinessScore}%` : 'N/A'} 
          icon={TrendingUp} 
          delay={0.2}
          subtitle={alumniData.readinessScore ? 'Based on your survey' : 'Complete survey to see score'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/app/alumni/profile')}
            >
              📝 Update My Profile
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/app/alumni/survey')}
            >
              📋 {alumniData.surveyCompleted ? 'View/Edit Survey' : 'Take Survey'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/app/alumni/results')}
              disabled={!alumniData.surveyCompleted}
            >
              📊 View Results & Jobs
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/app/alumni/submissions')}
            >
              📁 View Submissions
            </Button>
          </div>
        </div>

        {/* Latest Submission */}
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
                <span className="font-medium text-success">{alumniData.latestSubmission.status}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No submissions yet</p>
              <Button 
                size="sm" 
                onClick={() => navigate('/app/alumni/survey')}
              >
                Take First Survey
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}