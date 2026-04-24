import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, Star, Briefcase, TrendingUp, Loader2, Target } from 'lucide-react';
import { jobRecommendations } from '@/data/mockData';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Prediction {
  id: number;
  probability: number;
  employable: boolean;
  confidence: number;
  input_snapshot: any; // Dynamic from model
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
      kind: 'SOFT_SKILL' | 'HARD_SKILL' | 'KNOWLEDGE' | 'ABILITY' | 'INTEREST' | 'TECHNOLOGY';
      score?: number | null;
      importance?: number | null;
      selected?: boolean;
    }>;
    competencies_by_kind: Record<
      'SOFT_SKILL' | 'HARD_SKILL' | 'KNOWLEDGE' | 'ABILITY' | 'INTEREST' | 'TECHNOLOGY',
      Array<{
        id: number;
        name: string;
        kind: 'SOFT_SKILL' | 'HARD_SKILL' | 'KNOWLEDGE' | 'ABILITY' | 'INTEREST' | 'TECHNOLOGY';
        score?: number | null;
        importance?: number | null;
        selected?: boolean;
      }>
    >;
  } | null;
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

export default function AlumniResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);


  useEffect(() => {
    const fetchLatestPrediction = async () => {
      if (!user?.username) return;
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/prediction/employability/latest/${user.username}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPrediction(data);
        }
      } catch (error) {
        console.error('Error fetching prediction:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPrediction();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
        <h2 className="text-xl font-display font-bold">Assessment Required</h2>
        <p className="text-muted-foreground">Please complete the employability assessment first to view your AI-powered results.</p>
        <Button onClick={() => navigate('/app/alumni/survey')}>Take Assessment Now</Button>
      </div>
    );
  }

  const readinessScore = Math.round(prediction.probability * 100);
  const isEmployable = prediction.employable;
  
  // Prepare radar data from the snapshot if available
  const snapshot = prediction.input_snapshot || {};
  const submissionSummary = prediction.submission_summary;
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
    { skill: 'CGPA', value: (parseFloat(snapshot.CGPA) || 0) * 20 }, // Normalize roughly
    { skill: 'Prof Grade', value: (parseFloat(snapshot['Average Prof Grade']) || 0) * 20 },
    { skill: 'Soft Skills', value: (snapshot['Soft Skills Ave'] || 0) * 20 },
    { skill: 'Hard Skills', value: (snapshot['Hard Skills Ave'] || 0) * 20 },
    { skill: 'OJT', value: (parseFloat(snapshot['OJT Grade']) || 0) * 20 },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Employability Insights</h1>
          <p className="text-muted-foreground text-sm">AI Prediction Model v1.0 • Last updated {new Date(prediction.created_at).toLocaleDateString()}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/alumni/survey')}>
           Retake Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center shadow-lg border-t-4 border-t-primary">
          <p className="text-sm text-muted-foreground mb-2">Readiness Probability</p>
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke={isEmployable ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 text-center shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">Primary Prediction</p>
          <p className={`text-4xl font-bold font-display mb-2 ${isEmployable ? 'text-success' : 'text-destructive'}`}>
            {isEmployable ? 'Employable' : 'Building'}
          </p>
          <p className="text-xs text-muted-foreground">Model confidence: {Math.round(prediction.confidence * 100)}%</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 shadow-lg">
          <p className="text-sm text-muted-foreground mb-3">Strongest Indicators</p>
          <div className="space-y-2">
            {[
              { label: 'CGPA', val: snapshot.CGPA },
              { label: 'Leadership', val: snapshot['Leadership POS'] },
              { label: 'Hard Skills', val: snapshot['Hard Skills Ave'] }
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                <span className="text-xs font-bold">{s.val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="glass-card p-4 border-l-4 border-l-primary">
        <p className="text-sm text-muted-foreground">
          The <strong>employability prediction above is live model output</strong> generated from your
          saved academic and competency inputs. The market alignment cards below are still sample UI
          placeholders until the real job-matching results are surfaced on this page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 shadow-xl">
          <h3 className="font-display font-semibold mb-6 flex items-center gap-2">
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
          <p className="text-xs text-muted-foreground mt-4 text-center italic">
             Normalized snapshot of features used for this specific prediction.
          </p>
        </div>

        <div className="glass-card p-6 shadow-xl">
          <h3 className="font-display font-semibold mb-6 flex items-center gap-2">
             <Briefcase className="h-5 w-5 text-primary" /> Market Alignment
          </h3>
          <div className="space-y-4">
            {jobRecommendations.map((job, i) => (
              <motion.div key={job.title} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold">{job.title}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{job.industry}</p>
                  </div>
                  <span className="text-sm font-black text-primary">{job.match}%</span>
                </div>
                <Progress value={job.match} className="h-2 mb-3" />
                <div className="flex gap-1.5 flex-wrap">
                  {job.skills.map(s => (
                    <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/5 text-primary/80 border border-primary/10">{s}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 shadow-xl space-y-6">
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-xl">Full Submission Summary</h3>
          <p className="text-sm text-muted-foreground">
            This is the saved profile and the exact selections currently attached to this prediction.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Academic and Model Inputs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {submissionSummary.survey_answers.map((answer) => (
                <div key={`${answer.question_id}-${answer.question_key || 'answer'}`} className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{answer.question_text}</p>
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

        <div className="space-y-4">
          <h4 className="font-semibold">Selected Competencies</h4>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {(
              Object.keys(COMPETENCY_GROUP_LABELS) as Array<keyof typeof COMPETENCY_GROUP_LABELS>
            ).map((kind) => {
              const items = submissionSummary?.competencies_by_kind?.[kind] || [];

              return (
                <div key={kind} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="font-medium">{COMPETENCY_GROUP_LABELS[kind]}</h5>
                    <Badge variant="outline">{items.length} selected</Badge>
                  </div>
                  {items.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <Badge key={item.id} variant="outline" className="bg-primary/5 text-foreground">
                          {item.name}
                          {item.score !== null && item.score !== undefined ? ` • ${item.score}/10` : ''}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No selections saved in this category.</p>
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
