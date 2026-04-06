import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Eye, Loader2 } from 'lucide-react';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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