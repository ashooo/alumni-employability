import { Briefcase, Award, Loader2, Star, Zap, Linkedin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const JOB_SITES = [
  { name: 'Indeed', base_url: 'https://www.indeed.com/jobs', query_param: 'q', location_param: 'l' },
  { name: 'Glassdoor', base_url: 'https://www.glassdoor.com/Job/jobs.htm', query_param: 'sc.keyword', location_param: 'locKeyword' },
  { name: 'Monster', base_url: 'https://www.monster.com/jobs/search/', query_param: 'q', location_param: 'where' },
  { name: 'ZipRecruiter', base_url: 'https://www.ziprecruiter.com/jobs-search', query_param: 'search', location_param: 'location' },
  { name: 'LinkedIn', base_url: 'https://www.linkedin.com/jobs/search/', query_param: 'keywords', location_param: 'location' }
];

const JOB_SITE_STYLES: Record<string, { bg: string; text: string; iconText: string }> = {
  Indeed: { bg: 'bg-[#2557A7]', text: 'text-white', iconText: 'in' },
  Glassdoor: { bg: 'bg-[#0CAA41]', text: 'text-white', iconText: 'gd' },
  Monster: { bg: 'bg-[#6E46AE]', text: 'text-white', iconText: 'm' },
  ZipRecruiter: { bg: 'bg-[#2A6DF5]', text: 'text-white', iconText: 'zr' },
  LinkedIn: { bg: 'bg-[#0A66C2]', text: 'text-white', iconText: 'in' }
};

interface JobMatch {
  title: string;
  score?: number;
  final_score?: number;
  display_score?: number;
  matched_competencies?: string[];
}

interface JobMatchingPrediction {
  totalMatches: number;
  candidateSkills: string[];
  matches: JobMatch[];
  filters?: {
    min_cosine_score?: number;
    min_candidate_match_percentage?: number;
    min_matched_competencies?: number;
  } | null;
}

const getJobMatchScorePercent = (match: JobMatch) => {
  const rawScore =
    typeof match.display_score === 'number'
      ? match.display_score
      : typeof match.final_score === 'number'
        ? match.final_score
        : typeof match.score === 'number'
          ? match.score
          : null;
  if (rawScore === null) return 0;
  return Math.max(0, Math.min(100, Math.round(rawScore * 100)));
};

export default function AlumniJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobMatchingLoading, setJobMatchingLoading] = useState(false);
  const [jobMatching, setJobMatching] = useState<JobMatchingPrediction | null>(null);
  const [jobMatchingError, setJobMatchingError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const fetchJobs = async () => {
      const token = getToken();
      if (!token || !user?.username) {
        if (isActive) setLoading(false);
        return;
      }

      try {
        setJobMatchingLoading(true);
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const generate = async () => {
          const r = await fetch(`${API_URL}/prediction/job-matching/generate/${user.username}`, { method: 'POST', headers, body: JSON.stringify({ topN: 5 }) });
          if (!r.ok) throw new Error('Unable to generate live job matches.');
        };

        let latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
        if (latest.status === 404) {
          await generate();
          latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
        }
        if (!latest.ok) throw new Error('Unable to load live job matches.');
        const data = await latest.json();
        if (isActive) setJobMatching(data);
      } catch (error) {
        if (isActive) setJobMatchingError(error instanceof Error ? error.message : 'Unable to load live job matches.');
      } finally {
        if (isActive) {
          setLoading(false);
          setJobMatchingLoading(false);
        }
      }
    };
    fetchJobs();
    return () => { isActive = false; };
  }, [user?.username]);

  const openJobSite = (site: (typeof JOB_SITES)[number], roleTitle: string) => {
    const url = new URL(site.base_url);
    url.searchParams.append(site.query_param, roleTitle);
    url.searchParams.append(site.location_param, 'Manila');
    window.open(url.toString(), '_blank');
  };

  const renderJobSiteIcon = (site: (typeof JOB_SITES)[number]) => {
    const style = JOB_SITE_STYLES[site.name] || { bg: 'bg-muted', text: 'text-foreground', iconText: site.name.slice(0, 2).toLowerCase() };
    if (site.name === 'LinkedIn') {
      return <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${style.bg} ${style.text}`}><Linkedin className="h-3 w-3" /></span>;
    }
    return <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${style.bg} ${style.text} text-[9px] font-bold uppercase`}>{style.iconText}</span>;
  };

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Job Recommendations</h1>
          <p className="text-sm text-muted-foreground">Dedicated live job-matching results from your saved competencies.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/alumni/results')}>View Employability Results</Button>
      </div>

      <div className="glass-card p-6 shadow-xl">
        {jobMatchingLoading ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Generating live job matches</p>
          </div>
        ) : jobMatching?.matches?.length ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span>{jobMatching.totalMatches || jobMatching.matches.length} live role matches from {jobMatching.candidateSkills.length} saved competencies.</span>
              </div>
            </div>
            {jobMatching.matches.map((job, index) => {
              const scorePercent = getJobMatchScorePercent(job);
              const matchedCompetencies = job.matched_competencies || [];
              return (
                <motion.div key={`${job.title}-${index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card/50 p-6 shadow-md transition-all hover:border-primary/50 hover:shadow-xl">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xl font-display font-bold leading-tight group-hover:text-primary transition-colors">{job.title}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Ranked Career Path</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xl font-black text-primary">{scorePercent}%</span>
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">Match Score</span>
                    </div>
                  </div>
                  <div className="mb-5"><Progress value={scorePercent} className="h-2" /></div>
                  <div className="mb-5 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5"><Zap className="h-4 w-4" /> Search "{job.title}" on job sites</p>
                    <div className="flex flex-wrap gap-2">
                      {JOB_SITES.map((site) => (
                        <Button key={site.name} variant="outline" size="sm" className="h-9 gap-2 text-[11px] font-bold shadow-sm transition-all bg-background hover:bg-primary hover:text-primary-foreground" onClick={() => openJobSite(site, job.title)} title={`Open ${site.name}`}>
                          {renderJobSiteIcon(site)}<span>{site.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {matchedCompetencies.length > 0 ? matchedCompetencies.slice(0, 6).map((skill) => (
                      <Badge key={`${job.title}-${skill}`} variant="outline" className="bg-primary/5 text-foreground">{skill}</Badge>
                    )) : <span className="text-[10px] text-muted-foreground italic">No skills matched</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="font-medium">No job matches available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">{jobMatchingError || 'Please generate results from your survey first.'}</p>
            <Button className="mt-4" onClick={() => navigate('/app/alumni/survey')}>Go to Survey</Button>
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          <span>These recommendations are computed from your latest competency submission.</span>
        </div>
      </div>
    </div>
  );
}
