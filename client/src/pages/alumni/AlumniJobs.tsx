import { Briefcase, Loader2, Star, Linkedin, RotateCcw, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

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
  totalMatchesInField?: number;
  totalMatchesAllTitles?: number;
  candidateSkills: string[];
  matches: JobMatch[];
  matches_in_field?: JobMatch[];
  matches_all_titles?: JobMatch[];
  filters?: {
    min_cosine_score?: number;
    min_candidate_match_percentage?: number;
    min_matched_competencies?: number;
  } | null;
}

const needsJobMatchingRefresh = (prediction: JobMatchingPrediction | null) => {
  if (!prediction) return true;
  const general = prediction.matches_all_titles || prediction.matches || [];
  const inField = prediction.matches_in_field || [];
  if (!general.length) return true;
  // If an older saved output has zero in-field matches while general matches exist,
  // force one regeneration so server-side in-field extraction can repopulate.
  if (general.length > 0 && inField.length === 0) return true;
  if (!prediction.matches_all_titles || !prediction.matches_in_field) return true;
  return general.some((match) => !Array.isArray(match.top_alternates) || match.top_alternates.length < 3) || inField.some((match) => !Array.isArray(match.top_alternates) || match.top_alternates.length < 3);
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

const getJobMatchRawScore = (match: JobMatch) => {
  if (typeof match.display_score === 'number') return match.display_score;
  if (typeof match.final_score === 'number') return match.final_score;
  if (typeof match.score === 'number') return match.score;
  return 0;
};

const extractTopMatches = (matches: JobMatch[] | undefined, limit = 5) => {
  const list = Array.isArray(matches) ? matches : [];
  const byTitle = new Map<string, JobMatch>();
  for (const match of list) {
    const titleKey = String(match?.title || '').trim().toLowerCase();
    if (!titleKey) continue;
    const existing = byTitle.get(titleKey);
    if (!existing || getJobMatchRawScore(match) > getJobMatchRawScore(existing)) {
      byTitle.set(titleKey, match);
    }
  }
  return Array.from(byTitle.values())
    .sort((a, b) => getJobMatchRawScore(b) - getJobMatchRawScore(a))
    .slice(0, limit);
};

const getCompatibilitySummary = (avgScore: number) => {
  if (avgScore >= 70) return { label: 'Strong Match', message: 'Your competencies are strongly aligned with your recommended roles.', tone: 'text-success' };
  if (avgScore >= 45) return { label: 'Moderate Match', message: 'You have partial alignment. Upskilling can improve fit.', tone: 'text-amber-600' };
  return { label: 'Low Match', message: 'Current alignment is low. Consider targeted skills improvement.', tone: 'text-orange-600 dark:text-amber-400' };
};

export default function AlumniJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobMatchingLoading, setJobMatchingLoading] = useState(false);
  const [jobMatching, setJobMatching] = useState<JobMatchingPrediction | null>(null);
  const [jobMatchingError, setJobMatchingError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobMatch | null>(null);

  const openJobSite = (site: (typeof JOB_SITES)[number], roleTitle: string) => {
    const url = new URL(site.base_url);
    url.searchParams.append(site.query_param, roleTitle);
    url.searchParams.append(site.location_param, 'Philippines');
    window.open(url.toString(), '_blank');
  };

  const renderJobSiteIcon = (site: (typeof JOB_SITES)[number], size = 'h-5 w-5') => {
    const style = JOB_SITE_STYLES[site.name] || { bg: 'bg-muted', text: 'text-foreground', iconText: site.name.slice(0, 2).toLowerCase() };
    if (site.name === 'LinkedIn') return <span className={`inline-flex ${size} items-center justify-center rounded-full ${style.bg} ${style.text}`}><Linkedin className="h-3 w-3" /></span>;
    return <span className={`inline-flex ${size} items-center justify-center rounded-full ${style.bg} ${style.text} text-[9px] font-bold uppercase`}>{style.iconText}</span>;
  };

  const loadMatches = async (forceGenerate = false) => {
    const token = getToken();
    if (!token || !user?.username) {
      setLoading(false);
      return;
    }

    setJobMatchingLoading(true);
    setJobMatchingError(null);

    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const noCompetenciesKey = buildNoCompetenciesKey(user.username);
      const skipAutoGenerate = sessionStorage.getItem(noCompetenciesKey) === '1' && !forceGenerate;

      const generate = async () => {
        const r = await fetch(`${API_URL}/prediction/job-matching/generate/${user.username}`, { method: 'POST', headers, body: JSON.stringify({ topN: 5 }) });
        if (!r.ok) {
          const payload = await r.json().catch(() => null);
          throw new Error(payload?.error || 'Unable to generate job matches.');
        }
      };

      let latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
      if ((latest.status === 404 || forceGenerate) && !skipAutoGenerate) {
        try {
          await generate();
          latest = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to generate job matches.';
          if (message.toLowerCase().includes('no saved competencies were found')) {
            sessionStorage.setItem(noCompetenciesKey, '1');
            throw new Error('No saved competencies found yet. Complete the survey first, then return here.');
          }
          throw error;
        }
      }

      if (!latest.ok) throw new Error('Unable to load job matches.');
      let data: JobMatchingPrediction = await latest.json();

      if (needsJobMatchingRefresh(data) && !skipAutoGenerate) {
        try {
          await generate();
          const refreshed = await fetch(`${API_URL}/prediction/job-matching/latest/${user.username}`, { headers });
          if (refreshed.ok) data = await refreshed.json();
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (message.toLowerCase().includes('no saved competencies were found')) {
            sessionStorage.setItem(noCompetenciesKey, '1');
          }
        }
      }

      setJobMatching(data);
    } catch (error) {
      setJobMatchingError(error instanceof Error ? error.message : 'Unable to load job matches.');
    } finally {
      setLoading(false);
      setJobMatchingLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const inFieldMatches = extractTopMatches(jobMatching?.matches_in_field, 5);
  const allTitleMatches = extractTopMatches(jobMatching?.matches_all_titles || jobMatching?.matches, 5);
  const overallList = jobMatching?.matches_all_titles || jobMatching?.matches || [];
  const normalizedTitle = (title: string) => String(title || '').trim().toLowerCase();
  const shouldMergeSections = useMemo(() => {
    if (!inFieldMatches.length || !allTitleMatches.length) return false;
    if (inFieldMatches.length !== allTitleMatches.length) return false;
    for (let i = 0; i < inFieldMatches.length; i += 1) {
      if (normalizedTitle(inFieldMatches[i].title) !== normalizedTitle(allTitleMatches[i].title)) {
        return false;
      }
    }
    return true;
  }, [inFieldMatches, allTitleMatches]);

  const overallCompatibility = useMemo(() => {
    if (!overallList.length) return 0;
    return Math.round(overallList.reduce((sum, m) => sum + getJobMatchScorePercent(m), 0) / overallList.length);
  }, [overallList]);

  const compatibilitySummary = getCompatibilitySummary(overallCompatibility);

  const generalDiffersFromInField = useMemo(() => {
    if (!inFieldMatches.length || !allTitleMatches.length) return false;
    const inFieldTitles = new Set(inFieldMatches.map((m) => m.title));
    return allTitleMatches.some((m) => !inFieldTitles.has(m.title));
  }, [inFieldMatches, allTitleMatches]);

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Job Recommendations</h1>
          <p className="text-sm text-muted-foreground">Two views: jobs in your field and jobs across all titles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/app/alumni/results')}>View Employability Results</Button>
          <Button variant="secondary" className="gap-2" onClick={() => loadMatches(true)} disabled={jobMatchingLoading}>
            {jobMatchingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Regenerate
          </Button>
        </div>
      </div>

      {!jobMatchingLoading && overallList.length ? (
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-background p-5 shadow-xl">
          <p className={`text-2xl font-display font-extrabold ${compatibilitySummary.tone}`}>{compatibilitySummary.label}: {overallCompatibility}%</p>
          <p className="text-sm text-muted-foreground mt-1">{compatibilitySummary.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {generalDiffersFromInField
              ? 'Your skills are also highly compatible with roles outside your direct field.'
              : 'Your strongest matches are mostly within your field.'}
          </p>
        </div>
      ) : null}

      {shouldMergeSections ? (
        <div className="grid grid-cols-1 gap-6">
          <section className="glass-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Top Matches (In-Field and General)</h2>
              <Badge variant="outline">{allTitleMatches.length}</Badge>
            </div>
            <div className="space-y-3">
              {allTitleMatches.map((job, index) => {
                const score = getJobMatchScorePercent(job);
                return (
                  <motion.div key={`merged-${job.title}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div role="button" tabIndex={0} className="rounded-xl border bg-card/70 p-4 hover:border-primary/50 cursor-pointer" onClick={() => setActiveJob(job)} onKeyDown={(e) => { if (e.key === 'Enter') setActiveJob(job); }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Match #{index + 1}</p>
                          <h3 className="text-base font-bold leading-tight">{job.title}</h3>
                        </div>
                        <p className="text-lg font-black text-primary">{score}%</p>
                      </div>
                      <Progress value={score} className="mt-3 h-2" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="glass-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Top 5 In-Field Matches</h2>
              <Badge variant="outline">{jobMatching?.totalMatchesInField ?? inFieldMatches.length}</Badge>
            </div>
            <div className="space-y-3">
              {inFieldMatches.length ? inFieldMatches.map((job, index) => {
                const score = getJobMatchScorePercent(job);
                return (
                  <motion.div key={`in-${job.title}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div role="button" tabIndex={0} className="rounded-xl border bg-card/70 p-4 hover:border-primary/50 cursor-pointer" onClick={() => setActiveJob(job)} onKeyDown={(e) => { if (e.key === 'Enter') setActiveJob(job); }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">In-field #{index + 1}</p>
                          <h3 className="text-base font-bold leading-tight">{job.title}</h3>
                        </div>
                        <p className="text-lg font-black text-primary">{score}%</p>
                      </div>
                      <Progress value={score} className="mt-3 h-2" />
                    </div>
                  </motion.div>
                );
              }) : <p className="text-sm text-muted-foreground">No in-field matches found for your current profile.</p>}
            </div>
          </section>

          <section className="glass-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Top 5 General Matches</h2>
              <Badge variant="outline">{jobMatching?.totalMatchesAllTitles ?? allTitleMatches.length}</Badge>
            </div>
            <div className="space-y-3">
              {allTitleMatches.length ? allTitleMatches.map((job, index) => {
                const score = getJobMatchScorePercent(job);
                return (
                  <motion.div key={`all-${job.title}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div role="button" tabIndex={0} className="rounded-xl border bg-card/70 p-4 hover:border-primary/50 cursor-pointer" onClick={() => setActiveJob(job)} onKeyDown={(e) => { if (e.key === 'Enter') setActiveJob(job); }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">General #{index + 1}</p>
                          <h3 className="text-base font-bold leading-tight">{job.title}</h3>
                        </div>
                        <p className="text-lg font-black text-primary">{score}%</p>
                      </div>
                      <Progress value={score} className="mt-3 h-2" />
                    </div>
                  </motion.div>
                );
              }) : <p className="text-sm text-muted-foreground">No general matches available yet.</p>}
            </div>
          </section>
        </div>
      )}

      <div className="glass-card p-5">
        {jobMatchingLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Generating live results...</div>
        ) : overallList.length ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4 text-primary" />Showing top {inFieldMatches.length} in-field and top {allTitleMatches.length} all-title matches from {jobMatching?.candidateSkills?.length || 0} saved competencies.</div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="font-medium">No job matches available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">{jobMatchingError || 'Please complete your survey and save competencies first.'}</p>
            <Button className="mt-4" onClick={() => navigate('/app/alumni/survey')}>Go to Survey</Button>
          </div>
        )}
      </div>

      <Dialog open={!!activeJob} onOpenChange={() => setActiveJob(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{activeJob?.title}</DialogTitle>
          </DialogHeader>
          {activeJob ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Match Score</p>
                <p className="text-2xl font-black text-primary">{getJobMatchScorePercent(activeJob)}%</p>
                <Progress value={getJobMatchScorePercent(activeJob)} className="mt-2 h-2" />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Open this title on job sites</p>
                <div className="flex flex-wrap gap-2">
                  {JOB_SITES.map((site) => (
                    <Button key={`main-${site.name}`} variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openJobSite(site, activeJob.title)}>
                      {renderJobSiteIcon(site)}
                      <span>{site.name}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Alternate Titles</p>
                <div className="space-y-2">
                  {(activeJob.top_alternates || []).slice(0, 3).map((title) => (
                    <div key={`${activeJob.title}-${title}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <p className="text-sm font-semibold">{title}</p>
                      <div className="flex gap-1">
                        {JOB_SITES.map((site) => (
                          <Button key={`${title}-${site.name}`} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openJobSite(site, title)} title={`${site.name}: ${title}`}>
                            {renderJobSiteIcon(site, 'h-4 w-4')}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!(activeJob.top_alternates || []).length && <p className="text-sm text-muted-foreground">No alternate titles provided.</p>}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Matched skills (reference)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(activeJob.matched_competencies || []).slice(0, 8).map((skill) => (
                    <Badge key={`${activeJob.title}-${skill}`} variant="outline" className="text-[10px]">{skill}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
