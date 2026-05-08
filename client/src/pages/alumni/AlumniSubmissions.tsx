import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Eye, Loader2 } from 'lucide-react';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

interface Submission {
  id: number;
  survey_version: number;
  completed_at: string;
  status: string;
  answers: {
    question_id: number;
    question_text: string;
    question_type: string;
    answer_text?: string;
    answer_options?: string[];
    answer_number?: number;
  }[];
  submission_summary?: {
    id: number;
    branch_path?: string | null;
    additional_data?: {
      academic_data?: Record<string, unknown>;
      additional_answers?: Record<string, unknown>;
    } | null;
    academic_snapshot?: {
      board_exam?: number | null;
    } | null;
    academic_snapshot_skills?: Array<{
      id: number;
      skill_name: string;
      skill_value?: number | null;
      source_column?: string | null;
    }>;
    survey_answers?: Array<{
      question_id: number;
      question_key?: string | null;
      question_text: string;
      value: string | number | boolean | Record<string, unknown> | Array<unknown> | null;
    }>;
    competencies?: Array<{
      id: number;
      name: string;
      kind: string;
      score?: number | null;
      importance?: number | null;
      selected?: boolean;
    }>;
    competencies_by_kind?: Record<string, Array<{
      id: number;
      name: string;
      kind: string;
      score?: number | null;
      importance?: number | null;
      selected?: boolean;
    }>>;
  };
}

interface Category {
  id: number;
  name: string;
  description?: string;
  questions: {
    id: number;
    text: string;
    type: string;
  }[];
}

export default function AlumniSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [viewSub, setViewSub] = useState<Submission | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Get token from storage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user?.username) return;
      
      setLoading(true);
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/alumni/survey/responses/${user.username}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSubmissions(data);
        } else {
          throw new Error('Failed to fetch submissions');
        }
      } catch (error) {
        console.error('Error fetching submissions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load submissions',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [user]);

  // Fetch categories for a specific version when viewing submission
  const fetchCategoriesForVersion = async (version: number) => {
    setLoadingDetails(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/survey?version=${version}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewSubmission = (submission: Submission) => {
    setViewSub(submission);
    fetchCategoriesForVersion(submission.survey_version);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnswerDisplay = (answer: Submission['answers'][0]) => {
    if (answer.answer_options) {
      return answer.answer_options.join(', ');
    } else if (answer.answer_number !== undefined && answer.answer_number !== null) {
      return String(answer.answer_number);
    } else if (answer.answer_text) {
      return answer.answer_text;
    }
    return '—';
  };

  const getSubmissionAcademicData = (submission: Submission | null) => (
    (submission?.submission_summary?.additional_data?.academic_data || {}) as Record<string, unknown>
  );

  const getExperienceItems = (submission: Submission | null) => {
    const academicData = getSubmissionAcademicData(submission);
    return EXPERIENCE_LABEL_MAP
      .map(({ key, label }) => ({ label, value: academicData[key] }))
      .filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
  };

  const getProgramSkillRatings = (submission: Submission | null) => (
    (() => {
      const summary = submission?.submission_summary;
      const academicData = (summary?.additional_data?.academic_data || {}) as Record<string, unknown>;
      const fromSnapshot = (summary?.academic_snapshot_skills || [])
        .filter((skill) => skill.source_column === 'program_skill_rating' || !skill.source_column)
        .map((skill) => ({ key: String(skill.id), name: skill.skill_name, value: skill.skill_value ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (fromSnapshot.length > 0) {
        return fromSnapshot;
      }

      if (!Array.isArray(academicData.program_skill_ratings)) {
        return [];
      }

      return academicData.program_skill_ratings
        .map((entry, index) => {
          if (!entry || typeof entry !== 'object') return null;
          const row = entry as Record<string, unknown>;
          const name = String(row.skill_name || row.skill || '').trim();
          const valueRaw = row.skill_value ?? row.score;
          const value = valueRaw === null || valueRaw === undefined || valueRaw === '' ? null : Number(valueRaw);
          if (!name) return null;
          return { key: `payload-${index}-${name}`, name, value: Number.isFinite(value) ? value : null };
        })
        .filter((item): item is { key: string; name: string; value: number | null } => Boolean(item))
        .sort((a, b) => a.name.localeCompare(b.name));
    })()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">My Submissions</h1>
        <p className="text-muted-foreground text-sm">View your past tracer survey submissions (read-only)</p>
      </div>

      {submissions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No submissions found.</p>
          <Button 
            className="mt-4" 
            onClick={() => window.location.href = '/app/alumni/survey'}
          >
            Take Your First Survey
          </Button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {formatDate(sub.completed_at)}
                  </TableCell>
                  <TableCell>Version {sub.survey_version}</TableCell>
                  <TableCell>{sub.answers?.length || 0}</TableCell>
                  <TableCell>
                    <StatusBadge status={sub.status === 'completed' ? 'Completed' : sub.status} />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleViewSubmission(sub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Submission Details Dialog */}
      <Dialog open={!!viewSub} onOpenChange={() => setViewSub(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Submission Details — Version {viewSub?.survey_version}
            </DialogTitle>
          </DialogHeader>
          
          {viewSub && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-medium">{formatDate(viewSub.completed_at)}</span>
              </div>
              
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">Questions Answered</span>
                <span className="font-medium">{viewSub.answers?.length || 0}</span>
              </div>

              {viewSub.submission_summary ? (
                <div className="space-y-2 border-b pb-3">
                  <p className="text-sm font-semibold">Submission Summary</p>
                  <p className="text-xs text-muted-foreground">
                    Branch: {viewSub.submission_summary.branch_path || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Flow: {String(viewSub.submission_summary.branch_path || '').toUpperCase() === 'EMPLOYED' ? 'Save-only (employed path)' : 'Save + predict (unemployed path)'}
                  </p>
                  {viewSub.submission_summary.competencies?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {viewSub.submission_summary.competencies.slice(0, 12).map((item) => (
                        <span key={`${item.kind}-${item.id}`} className="rounded-full border bg-muted/20 px-2 py-1 text-[10px]">
                          {item.name}
                        </span>
                      ))}
                      {viewSub.submission_summary.competencies.length > 12 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{viewSub.submission_summary.competencies.length - 12} more
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {getExperienceItems(viewSub).length ? (
                <div className="space-y-2 border-b pb-3">
                  <p className="text-sm font-semibold">Experience and Achievement</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {getExperienceItems(viewSub).map((item) => (
                      <div key={item.label} className="rounded-md border bg-muted/20 p-2">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium">{String(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {getProgramSkillRatings(viewSub).length ? (
                <div className="space-y-2 border-b pb-3">
                  <p className="text-sm font-semibold">Crucial Skills Ratings</p>
                  <div className="flex flex-wrap gap-2">
                    {getProgramSkillRatings(viewSub).map((skill) => (
                      <Badge key={skill.key} variant="outline">
                        {skill.name}: {skill.value ?? 'N/A'}/10
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {viewSub.submission_summary?.survey_answers?.length ? (
                <div className="space-y-2 border-b pb-3">
                  <p className="text-sm font-semibold">Scoped Survey Answers</p>
                  <div className="space-y-2">
                    {viewSub.submission_summary.survey_answers.map((answer) => (
                      <div key={`${answer.question_id}-${answer.question_key || 'summary'}`} className="rounded-md border bg-muted/20 p-2">
                        <p className="text-xs text-muted-foreground">{answer.question_text}</p>
                        <p className="text-sm font-medium">
                          {Array.isArray(answer.value)
                            ? answer.value.join(', ')
                            : answer.value === null || answer.value === undefined || answer.value === ''
                              ? '—'
                              : String(answer.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {loadingDetails ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Your Answers:</p>
                  
                  {categories.length > 0 ? (
                    categories.map((category) => {
                      const categoryAnswers = viewSub.answers?.filter(
                        answer => category.questions.some(q => q.id === answer.question_id)
                      );
                      
                      if (!categoryAnswers || categoryAnswers.length === 0) return null;
                      
                      return (
                        <div key={category.id} className="space-y-2">
                          <h4 className="text-sm font-semibold text-primary border-b pb-1">
                            {category.name}
                          </h4>
                          {categoryAnswers.map((answer) => {
                            const question = category.questions.find(q => q.id === answer.question_id);
                            return (
                              <div key={answer.question_id} className="pl-2">
                                <p className="text-xs text-muted-foreground">
                                  {question?.text || `Question ${answer.question_id}`}
                                </p>
                                <p className="text-sm font-medium">
                                  {getAnswerDisplay(answer)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    // Fallback if categories not available
                    viewSub.answers?.map((answer, index) => (
                      <div key={answer.question_id} className="border-b pb-2">
                        <p className="text-xs text-muted-foreground">
                          Question {index + 1}
                        </p>
                        <p className="text-sm font-medium">
                          {getAnswerDisplay(answer)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic pt-4 border-t">
                Read-only view. Past submissions cannot be edited.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
