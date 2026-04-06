import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, Star, Briefcase, TrendingUp } from 'lucide-react';
import { skillsData, jobRecommendations } from '@/data/mockData';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AlumniResults() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.surveyCompleted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
        <h2 className="text-xl font-display font-bold">Survey Required</h2>
        <p className="text-muted-foreground">Please complete the tracer survey first to view your results and job recommendations.</p>
        <Button onClick={() => navigate('/app/alumni/survey')}>Take Survey Now</Button>
      </div>
    );
  }

  const readinessScore = 82;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Survey Results & Job Recommendations</h1>
        <p className="text-muted-foreground text-sm">Based on your latest completed survey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Employment Readiness</p>
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${readinessScore * 2.51} 251`} />
            </svg>
            <span className="absolute text-2xl font-bold font-display">{readinessScore}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Above program average (78%)</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Degree Relevance</p>
          <p className="text-4xl font-bold font-display text-primary mb-2">High</p>
          <p className="text-xs text-muted-foreground">Your current job aligns well with your degree</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <p className="text-sm text-muted-foreground mb-3">Identified Strengths</p>
          <div className="space-y-2">
            {['Teamwork', 'Communication', 'Technical Skills'].map(s => (
              <div key={s} className="flex items-center gap-2">
                <Star className="h-3 w-3 text-primary" />
                <span className="text-sm font-medium">{s}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Skill gap: Leadership</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4">Skills Assessment</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={skillsData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Your Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4">Job Recommendations</h3>
          <div className="space-y-4">
            {jobRecommendations.map((job, i) => (
              <motion.div key={job.title} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-lg border hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.industry}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{job.match}%</span>
                </div>
                <Progress value={job.match} className="h-1.5 mb-2" />
                <div className="flex gap-1 flex-wrap">
                  {job.skills.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted">{s}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
