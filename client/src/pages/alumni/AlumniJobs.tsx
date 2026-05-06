import { Briefcase, Award, Loader2, Star, Zap, Linkedin, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const buildNoCompetenciesKey = (username: string) => `jobMatching:noCompetencies:${username}`;

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
  cosine_score?: number;
  match_percentage?: number;
  candidate_match_percentage?: number;
  matched_competencies?: string[];
  top_alternates?: string[];
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

const needsJobMatchingRefresh = (prediction: JobMatchingPrediction | null) => {
  if (!prediction?.matches?.length) {
    return true;
  }

  return prediction.matches.some((match) => !Array.isArray(match.top_alternates) || match.top_alternates.length < 5);
};

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

const getCompatibilitySummary = (avgScore: number) => {
  if (avgScore >= 70) {
    return {
      label: 'Strong Match',
      message: 'Your current competencies are a strong fit for the suggested roles.',
      tone: 'text-success'
    };
  }

  if (avgScore >= 45) {
    return {
      label: 'Moderate Match',
      message: 'Your profile has partial alignment. Strengthening key skills can improve fit.',
      tone: 'text-amber-600'
    };
  }

  return {
    label: 'Low Match',
    message: 'Note: current competencies show low alignment with these roles right now.',
    tone: 'text-orange-600 dark:text-amber-400'
  };
};

export default function AlumniJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobMatchingLoading, setJobMatchingLoading] = useState(false);
  const [jobMatching, setJobMatching] = useState<JobMatchingPrediction | null>(null);
  const [jobMatchingError, setJobMatchingError] = useState<string | null>(null);
  const [expandedJobIndex, setExpandedJobIndex] = useState<number | null>(null);
  const [expandedSkillsIndex, setExpandedSkillsIndex] = useState<number | null>(null);
  const [expandedAlternatesIndex, setExpandedAlternatesIndex] = useState<number | null>(null);

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
          if (!r.ok) {
            const payload = await r.json().catch(() => null);
            throw new Error(payload?.error || 'Unable to generate live job matches.');
          }
        };

        const noCompetenciesKey = buildNoCompetenciesKey(user.username);
        const skipAutoGenerate = sessionStorage.getItem(noCompetenciesKey) === '1';
        let latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
        if (latest.status === 404 && !skipAutoGenerate) {
          try {
            await generate();
            latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
          } catch (generateError) {
            const message = generateError instanceof Error ? generateError.message : 'Unable to generate live job matches.';
            if (message.toLowerCase().includes('no saved competencies were found')) {
              sessionStorage.setItem(noCompetenciesKey, '1');
              throw new Error('No saved competencies found yet. Please complete the survey first, then return to Job Recommendations.');
            }
            throw generateError;
          }
        }
        if (!latest.ok) throw new Error('Unable to load live job matches.');
        let data: JobMatchingPrediction = await latest.json();
        if (needsJobMatchingRefresh(data) && !skipAutoGenerate) {
          try {
            await generate();
            latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
            if (latest.ok) {
              data = await latest.json();
            }
          } catch (generateError) {
            const message = generateError instanceof Error ? generateError.message : '';
            if (message.toLowerCase().includes('no saved competencies were found')) {
              sessionStorage.setItem(noCompetenciesKey, '1');
            }
          }
        }
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
    url.searchParams.append(site.location_param, 'Philippines');
    window.open(url.toString(), '_blank');
  };

  const renderJobSiteIcon = (site: (typeof JOB_SITES)[number]) => {
    const style = JOB_SITE_STYLES[site.name] || { bg: 'bg-muted', text: 'text-foreground', iconText: site.name.slice(0, 2).toLowerCase() };
    if (site.name === 'LinkedIn') {
      return <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${style.bg} ${style.text}`}><Linkedin className="h-3 w-3" /></span>;
    }
    return <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${style.bg} ${style.text} text-[9px] font-bold uppercase`}>{style.iconText}</span>;
  };

  const matches = jobMatching?.matches || [];
  const averageSkillOverlap = matches.length
    ? Math.round(matches.reduce((sum, match) => sum + (match.match_percentage || 0), 0) / matches.length)
    : 0;
  const averageRoleMatch = matches.length
    ? Math.round(matches.reduce((sum, match) => sum + (match.match_percentage || 0), 0) / matches.length)
    : 0;
  const averageCosineScore = matches.length
    ? Math.round((matches.reduce((sum, match) => sum + (match.cosine_score || 0), 0) / matches.length) * 100)
    : 0;
  const overallCompatibility = Math.round((averageSkillOverlap + averageRoleMatch + averageCosineScore) / 3);
  const compatibilitySummary = getCompatibilitySummary(overallCompatibility);

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

      {!jobMatchingLoading && jobMatching?.matches?.length ? (
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-background p-6 shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Compatibility Signal</p>
              <p className={`text-3xl font-display font-extrabold ${compatibilitySummary.tone}`}>
                {compatibilitySummary.label}: {overallCompatibility}%
              </p>
              <p className="max-w-2xl text-sm text-muted-foreground">{compatibilitySummary.message}</p>
              <p className="max-w-2xl text-xs font-medium text-muted-foreground">
                The listed jobs are the closest matches according to our system, but this does not guarantee full compatibility.
              </p>
            </div>
            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background/90 p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-primary">{averageSkillOverlap}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Skill Overlap</p>
              </div>
              <div className="rounded-xl border bg-background/90 p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-primary">{averageRoleMatch}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Role Match</p>
              </div>
              <div className="rounded-xl border bg-background/90 p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-primary">{averageCosineScore}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI Cosine Score</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
              const showAllSkills = expandedSkillsIndex === index;
              const visibleSkills = showAllSkills ? matchedCompetencies : matchedCompetencies.slice(0, 6);
              const showAlternates = expandedAlternatesIndex === index;
              return (
                <motion.div key={`${job.title}-${index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card/70 p-6 shadow-md transition-all hover:border-primary/50 hover:shadow-xl">
                  <div className="mb-4 flex items-start justify-between border-b pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recommended Job #{index + 1}</p>
                      <h4 className="text-xl font-display font-bold leading-tight group-hover:text-primary transition-colors">{job.title}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Ranked Career Path</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xl font-black text-primary">{scorePercent}%</span>
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">Match Score</span>
                    </div>
                  </div>
                  <div className="mb-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Overall Match Score</p>
                    <Progress value={scorePercent} className="h-2" />
                  </div>
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
                  <div className="mb-4 rounded-xl border border-dashed p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Matched Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                    {matchedCompetencies.length > 0 ? visibleSkills.map((skill) => (
                      <Badge key={`${job.title}-${skill}`} variant="outline" className="bg-primary/5 text-foreground">{skill}</Badge>
                    )) : <span className="text-[10px] text-muted-foreground italic">No skills matched</span>}
                    </div>
                  </div>
                  {matchedCompetencies.length > 6 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-4 h-7 self-start px-2 text-[11px] text-primary hover:bg-primary/10"
                      onClick={() => setExpandedSkillsIndex(showAllSkills ? null : index)}
                    >
                      {showAllSkills ? 'Show less skills' : `Show all skills (${matchedCompetencies.length})`}
                    </Button>
                  )}

                  {job.top_alternates && job.top_alternates.length > 0 && (
                    <div className="mb-4 rounded-xl border border-dashed p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" /> Alternate Titles
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10"
                          onClick={() => setExpandedAlternatesIndex(showAlternates ? null : index)}
                        >
                          {showAlternates ? <>Hide <ChevronUp className="h-3 w-3" /></> : <>Show ({job.top_alternates.slice(0, 5).length}) <ChevronDown className="h-3 w-3" /></>}
                        </Button>
                      </div>
                      <AnimatePresence initial={false}>
                        {showAlternates && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 overflow-hidden"
                          >
                            <div className="space-y-2">
                              {job.top_alternates.slice(0, 5).map((role) => (
                                <div
                                  key={`${job.title}-${role}`}
                                  className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                                >
                                  <Button
                                    variant="link"
                                    className="h-auto p-0 text-left text-[11px] font-semibold text-primary"
                                    onClick={() => openJobSite(JOB_SITES[4], role)}
                                    title={`Open LinkedIn for ${role}`}
                                  >
                                    {role}
                                  </Button>
                                  <div className="flex gap-1">
                                    {JOB_SITES.map((site) => (
                                      <Button
                                        key={`${role}-${site.name}`}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                        onClick={() => openJobSite(site, role)}
                                        title={`${site.name}: ${role}`}
                                      >
                                        {renderJobSiteIcon(site)}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-auto h-8 w-full gap-2 border border-dashed border-muted-foreground/20 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    onClick={() => setExpandedJobIndex(expandedJobIndex === index ? null : index)}
                  >
                    {expandedJobIndex === index ? (
                      <>Hide Detailed Breakdown <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>View Detailed Breakdown <ChevronDown className="h-4 w-4" /></>
                    )}
                  </Button>

                  <AnimatePresence initial={false}>
                    {expandedJobIndex === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden border-t border-dashed pt-4"
                      >
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="space-y-1">
                            <p className="text-lg font-black text-primary">{Math.round((job.match_percentage || 0))}%</p>
                            <p className="text-[9px] font-bold uppercase text-muted-foreground">Skill Overlap</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-black text-primary">{Math.round((job.match_percentage || 0))}%</p>
                            <p className="text-[9px] font-bold uppercase text-muted-foreground">Role Match</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-black text-primary">{Math.round((job.cosine_score || 0) * 100)}%</p>
                            <p className="text-[9px] font-bold uppercase text-muted-foreground">AI Cosine Score</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
