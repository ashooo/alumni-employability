import { Plus, Edit2, Trash2, GripVertical, Save, X, ListPlus, Loader2, Building2, Eye, Upload, Download, Copy, CheckCircle2, AlertCircle, GraduationCap} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { isAdminLike } from '@/lib/roles';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Question {
  id: number;
  category_id: number;
  text: string;
  type: 'text' | 'select' | 'dropdown' | 'checkbox' | 'scale' | 'number';
  required: boolean;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  order_index: number;
  version: number;
  colleges?: string[];
  programs?: string[];
}

interface Category {
  id: number;
  name: string;
  description?: string;
  order_index: number;
  questions: Question[];
}

interface College {
  id: number;
  name: string;
  code: string;
  program_count?: number;
  alumni_count?: number;
}

interface Program {
  id: number;
  name: string;
  code: string;
  college_id: number;
  college_name?: string;
  alumni_count?: number;
}

interface PublishedSurvey {
  id: number;
  college_id: number;
  program_id?: number;
  version: number;
  published_at: string;
  published_by: string;
  status: 'active' | 'archived';
  total_questions: number;
  categories_count: number;
}

// Reusable Components
const LoadingSpinner = () => (
  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
);

const EmptyState = ({ message, action }: { message: string; action?: React.ReactNode }) => (
  <div className="col-span-full text-center py-8">
    <p className="text-muted-foreground">{message}</p>
    {action}
  </div>
);

const QuestionBadges = ({ question, colleges, programs }: { question: Question; colleges: College[]; programs: Program[] }) => (
  <div className="flex flex-wrap gap-1 mt-1">
    {question.programs && question.programs.length > 0 ? (
      question.programs.map(id => {
        const program = programs.find(p => String(p.id) === id);
        return program ? (
          <Badge key={id} variant="outline" className="text-[10px] bg-primary/5" title={program.name}>
            {program.code}
          </Badge>
        ) : null;
      })
    ) : question.colleges && question.colleges.length > 0 ? (
      question.colleges.map(id => {
        const college = colleges.find(c => String(c.id) === id);
        return college ? (
          <Badge key={id} variant="outline" className="text-[10px] bg-secondary/5" title={college.name}>
            {college.code}
          </Badge>
        ) : null;
      })
    ) : (
      <Badge variant="outline" className="text-[10px] bg-muted">All Programs</Badge>
    )}
  </div>
);

export default function AdminSurveyManager() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [activeVersion, setActiveVersion] = useState(1);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('builder');
  const [publishedSurveys, setPublishedSurveys] = useState<PublishedSurvey[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{ id: number; name: string } | null>(null);
  const [publishType, setPublishType] = useState<'college' | 'program'>('college');
  const [publishTarget, setPublishTarget] = useState<string>('');
  const [publishing, setPublishing] = useState(false);

  const [newQ, setNewQ] = useState<{
    text: string;
    type: 'text' | 'select' | 'dropdown' | 'checkbox' | 'scale' | 'number';
    required: boolean;
    category_id: string;
    options: string[];
    scale_min: number;
    scale_max: number;
    colleges: string[];
    programs: string[];
  }>({
    text: '', 
    type: 'text', 
    required: true, 
    category_id: '',
    options: ['Option 1'], 
    scale_min: 1, 
    scale_max: 5, 
    colleges: [],
    programs: []
  });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    if (!isAuthenticated || !isAdminLike(user?.role)) window.location.href = '/login';
  }, [isAuthenticated, user]);

  const fetchData = async (url: string, setter: Function, errorMsg: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}${url}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setter(data);
      }
    } catch (error) {
      console.error(errorMsg, error);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const fetchColleges = () => fetchData('/admin/colleges', setColleges, 'Failed to fetch colleges');
  const fetchPrograms = () => fetchData('/admin/programs/list', setPrograms, 'Failed to fetch programs');
  const fetchPublishedSurveys = async () => {
    setLoadingPublished(true);
    await fetchData('/admin/survey/published', setPublishedSurveys, 'Failed to fetch published surveys');
    setLoadingPublished(false);
  };
  const fetchVersions = () => fetchData('/admin/survey/versions', (d: any) => setVersions(d.versions || [1]), '');

  const fetchSurveyData = async () => {
    setLoading(true);
    let url = `/admin/survey?version=${activeVersion}`;
    if (selectedProgram !== 'all') {
      url += `&program=${selectedProgram}`;
    } else if (selectedCollege !== 'all') {
      url += `&college=${selectedCollege}`;
    }
    
    try {
      const token = getToken();
      console.log('Fetching survey from:', `${API_URL}${url}`);
      
      const response = await fetch(`${API_URL}${url}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received survey data:', data);
      
      if (data.categories && Array.isArray(data.categories)) {
        const parsed = data.categories.map((cat: any) => ({
          ...cat,
          questions: cat.questions.map((q: any) => ({
            ...q,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
            colleges: q.colleges ? (typeof q.colleges === 'string' ? JSON.parse(q.colleges) : q.colleges) : [],
            programs: q.programs ? (typeof q.programs === 'string' ? JSON.parse(q.programs) : q.programs) : []
          }))
        }));
        setCategories(parsed);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load survey data', 
        variant: 'destructive' 
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchColleges();
      fetchPrograms();
      fetchVersions();
      fetchPublishedSurveys();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchSurveyData();
    }
  }, [isAuthenticated, user, activeVersion, selectedCollege, selectedProgram]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare data for saving - convert arrays to JSON strings for database
      const saveData = {
        version: activeVersion,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          order_index: cat.order_index,
          questions: cat.questions.map(q => ({
            id: q.id,
            category_id: q.category_id,
            text: q.text,
            type: q.type,
            required: q.required,
            options: q.options && q.options.length > 0 ? q.options : null,
            scale_min: q.scale_min,
            scale_max: q.scale_max,
            order_index: q.order_index,
            version: q.version,
            colleges: q.colleges && q.colleges.length > 0 ? q.colleges : null,
            programs: q.programs && q.programs.length > 0 ? q.programs : null
          }))
        }))
      };

      console.log('Saving survey data:', saveData);

      const res = await fetch(`${API_URL}/admin/survey`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(saveData)
      });
      
      if (res.ok) {
        toast({ title: 'Survey Saved', description: 'Survey structure updated successfully.' });
        fetchSurveyData();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save survey');
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to save survey', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNewVersion = async () => {
    const newVersion = Math.max(...versions, 0) + 1;
    try {
      const saveData = {
        categories: categories.map(cat => ({
          ...cat,
          questions: cat.questions.map(q => ({
            ...q,
            version: newVersion,
            options: q.options && q.options.length > 0 ? q.options : null,
            colleges: q.colleges && q.colleges.length > 0 ? q.colleges : null,
            programs: q.programs && q.programs.length > 0 ? q.programs : null
          }))
        }))
      };

      const res = await fetch(`${API_URL}/admin/survey/version/${newVersion}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(saveData)
      });
      
      if (res.ok) {
        setVersions([...versions, newVersion]);
        setActiveVersion(newVersion);
        toast({ title: 'New Version Created', description: `Version ${newVersion} created.` });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create version');
      }
    } catch (error) {
      console.error('Error creating version:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create version', 
        variant: 'destructive' 
      });
    }
  };

  const handlePublishSurvey = async () => {
    if (!publishTarget) {
      toast({ title: 'Select Target', description: 'Please select a college or program.', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    try {
      const payload: any = { 
        version: activeVersion,
        categories: categories.map(cat => ({
          ...cat,
          questions: cat.questions.map(q => ({
            ...q,
            options: q.options && q.options.length > 0 ? q.options : null,
            colleges: q.colleges && q.colleges.length > 0 ? q.colleges : null,
            programs: q.programs && q.programs.length > 0 ? q.programs : null
          }))
        }))
      };
      
      if (publishType === 'college') {
        payload.college_id = parseInt(publishTarget);
      } else {
        payload.program_id = parseInt(publishTarget);
      }
      
      const res = await fetch(`${API_URL}/admin/survey/publish`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast({ title: 'Survey Published', description: `Version ${activeVersion} published.` });
        setShowPublishDialog(false);
        setPublishTarget('');
        fetchPublishedSurveys();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to publish survey');
      }
    } catch (error) {
      console.error('Error publishing survey:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to publish survey', 
        variant: 'destructive' 
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleArchiveSurvey = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/admin/survey/published/${id}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        toast({ title: 'Survey Archived' });
        fetchPublishedSurveys();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to archive survey');
      }
    } catch (error) {
      console.error('Error archiving survey:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to archive survey', 
        variant: 'destructive' 
      });
    }
  };

  // NEW: Activate Survey function
  const handleActivateSurvey = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/admin/survey/published/${id}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        toast({ title: 'Survey Activated', description: 'Survey is now active.' });
        fetchPublishedSurveys();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to activate survey');
      }
    } catch (error) {
      console.error('Error activating survey:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to activate survey', 
        variant: 'destructive' 
      });
    }
  };

  const handleCloneSurvey = async (survey: PublishedSurvey) => {
    try {
      const res = await fetch(`${API_URL}/admin/survey/clone/${survey.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Survey Cloned', description: `New version ${data.new_version} created.` });
        fetchVersions();
        setActiveVersion(data.new_version);
        setActiveTab('builder');
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to clone survey');
      }
    } catch (error) {
      console.error('Error cloning survey:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to clone survey', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteQ = async (categoryId: number, questionId: number) => {
    try {
      const res = await fetch(`${API_URL}/admin/survey/question/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setCategories(prev => prev.map(c => 
          c.id === categoryId ? { ...c, questions: c.questions.filter(q => q.id !== questionId) } : c
        ));
        toast({ title: 'Question Deleted' });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete question', 
        variant: 'destructive' 
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/survey/category`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          name: newCat, 
          description: newCatDesc, 
          order_index: categories.length 
        })
      });
      if (res.ok) {
        const newCategory = await res.json();
        setCategories([...categories, { ...newCategory, questions: [] }]);
        setNewCat(''); 
        setNewCatDesc(''); 
        setShowAddCat(false);
        toast({ title: 'Category Added' });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add category', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/survey/category/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (res.ok) {
        setCategories(prev =>
          prev
            .filter(c => c.id !== categoryId)
            .map((c, index) => ({ ...c, order_index: index }))
        );
        toast({ title: 'Category Deleted', description: `"${categoryName}" was removed.` });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'destructive'
      });
    }
  };

  const handleAddQuestion = async () => {
    if (!newQ.text?.trim() || !newQ.category_id) {
      toast({ title: "Missing Information", description: "Please provide all fields.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/survey/question`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          category_id: parseInt(newQ.category_id), 
          text: newQ.text, 
          type: newQ.type,
          required: newQ.required, 
          options: newQ.options, 
          scale_min: newQ.scale_min,
          scale_max: newQ.scale_max, 
          order_index: categories.find(c => c.id === parseInt(newQ.category_id))?.questions.length || 0,
          version: activeVersion, 
          colleges: newQ.colleges,
          programs: newQ.programs
        })
      });
      if (res.ok) {
        const question = await res.json();
        const parsed = {
          ...question,
          options: question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : null,
          colleges: question.colleges ? (typeof question.colleges === 'string' ? JSON.parse(question.colleges) : question.colleges) : [],
          programs: question.programs ? (typeof question.programs === 'string' ? JSON.parse(question.programs) : question.programs) : []
        };
        setCategories(prev => prev.map(c => 
          c.id === parseInt(newQ.category_id) ? { ...c, questions: [...c.questions, parsed] } : c
        ));
        setShowAdd(false);
        setNewQ({ 
          text: '', 
          type: 'text', 
          required: true, 
          category_id: '', 
          options: ['Option 1'], 
          scale_min: 1, 
          scale_max: 5, 
          colleges: [], 
          programs: [] 
        });
        toast({ title: 'Question Added' });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add question');
      }
    } catch (error) {
      console.error('Error adding question:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add question', 
        variant: 'destructive' 
      });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editQ) return;
    try {
      const res = await fetch(`${API_URL}/admin/survey/question/${editQ.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          text: editQ.text, 
          type: editQ.type, 
          required: editQ.required,
          options: editQ.options?.length ? editQ.options : null,
          scale_min: editQ.scale_min, 
          scale_max: editQ.scale_max,
          colleges: editQ.colleges?.length ? editQ.colleges : null,
          programs: editQ.programs?.length ? editQ.programs : null
        })
      });
      if (res.ok) {
        setCategories(prev => prev.map(c => ({ 
          ...c, 
          questions: c.questions.map(q => q.id === editQ.id ? editQ : q) 
        })));
        setEditQ(null);
        toast({ title: 'Question Updated' });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update question', 
        variant: 'destructive' 
      });
    }
  };

  const toggleSelection = (id: string, type: 'college' | 'program', isEdit = false) => {
    if (isEdit && editQ) {
      const field = type === 'college' ? 'colleges' : 'programs';
      const current = editQ[field] || [];
      const updated = current.includes(id) 
        ? current.filter(c => c !== id) 
        : [...current, id];
      
      if (type === 'program' && updated.includes(id)) {
        const program = programs.find(p => String(p.id) === id);
        if (program) {
          const collegeId = String(program.college_id);
          const currentColleges = editQ.colleges || [];
          if (!currentColleges.includes(collegeId)) {
            setEditQ({ 
              ...editQ, 
              [field]: updated, 
              colleges: [...currentColleges, collegeId] 
            });
            return;
          }
        }
      }
      
      setEditQ({ ...editQ, [field]: updated });
    } else {
      const field = type === 'college' ? 'colleges' : 'programs';
      const current = newQ[field] || [];
      const updated = current.includes(id) 
        ? current.filter(c => c !== id) 
        : [...current, id];
      
      if (type === 'program' && updated.includes(id)) {
        const program = programs.find(p => String(p.id) === id);
        if (program) {
          const collegeId = String(program.college_id);
          const currentColleges = newQ.colleges || [];
          if (!currentColleges.includes(collegeId)) {
            setNewQ({ 
              ...newQ, 
              [field]: updated, 
              colleges: [...currentColleges, collegeId] 
            });
            return;
          }
        }
      }
      
      setNewQ({ ...newQ, [field]: updated });
    }
  };

  const updateOption = (idx: number, val: string, isEdit = false) => {
    if (isEdit && editQ) {
      const opts = [...(editQ.options || [])];
      opts[idx] = val;
      setEditQ({ ...editQ, options: opts });
    } else {
      const opts = [...(newQ.options || [])];
      opts[idx] = val;
      setNewQ({ ...newQ, options: opts });
    }
  };

  const addOption = (isEdit = false) => {
    if (isEdit && editQ) {
      const opts = [...(editQ.options || []), `Option ${(editQ.options?.length || 0) + 1}`];
      setEditQ({ ...editQ, options: opts });
    } else {
      const opts = [...(newQ.options || []), `Option ${(newQ.options?.length || 0) + 1}`];
      setNewQ({ ...newQ, options: opts });
    }
  };

  const removeOption = (idx: number, isEdit = false) => {
    if (isEdit && editQ) {
      const opts = editQ.options?.filter((_, i) => i !== idx) || [];
      setEditQ({ ...editQ, options: opts });
    } else {
      const opts = newQ.options?.filter((_, i) => i !== idx) || [];
      setNewQ({ ...newQ, options: opts });
    }
  };

  const getProgramsByCollege = (collegeId: string) => {
    return programs.filter(p => String(p.college_id) === collegeId);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Tracer Survey Manager</h1>
          <p className="text-muted-foreground text-sm">Create and manage surveys for different colleges and programs</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {['builder', 'published', 'preview'].map(tab => (
            <TabsTrigger key={tab} value={tab}>
              {tab === 'builder' ? 'Survey Builder' : tab === 'published' ? 'Published Surveys' : 'Preview Mode'}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Select value={String(activeVersion)} onValueChange={v => setActiveVersion(parseInt(v))}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Version" /></SelectTrigger>
                <SelectContent>
                  {versions.map(v => <SelectItem key={v} value={String(v)}>Version {v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleNewVersion}>New Version</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddCat(true)}>Add Category</Button>
              <Button variant="outline" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Question</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Draft
              </Button>
              <Button onClick={() => setShowPublishDialog(true)}><Upload className="h-4 w-4 mr-1" />Publish</Button>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-4">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <Label>Filter by College:</Label>
              <Select value={selectedCollege} onValueChange={(v) => {
                setSelectedCollege(v);
                setSelectedProgram('all');
              }}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {selectedCollege !== 'all' && (
              <div className="flex items-center gap-4 pl-9">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <Label>Filter by Program:</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="All Programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {getProgramsByCollege(selectedCollege).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Accordion type="multiple" defaultValue={categories.map(c => String(c.id))}>
            {categories.map(cat => (
              <AccordionItem key={cat.id} value={String(cat.id)} className="glass-card mb-3 border">
                <AccordionTrigger className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold">{cat.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{cat.questions.length} questions</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteCategoryTarget({ id: cat.id, name: cat.name });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-2">
                    {cat.questions.map(q => (
                      <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{q.text}</span>
                          <QuestionBadges question={q} colleges={colleges} programs={programs} />
                          {q.options && <span className="text-[10px] text-muted-foreground block">Options: {q.options.join(', ')}</span>}
                          {q.scale_min !== undefined && <span className="text-[10px] text-muted-foreground block">Scale: {q.scale_min} to {q.scale_max}</span>}
                        </div>
                        <span className="text-xs bg-background px-2 py-0.5 rounded uppercase">{q.type}</span>
                        {q.required && <span className="text-xs text-primary">Required</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setEditQ(q)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteQ(cat.id, q.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {!cat.questions.length && <p className="text-sm text-muted-foreground text-center py-4">No questions yet.</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="published">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingPublished ? <LoadingSpinner /> : publishedSurveys.length === 0 ? (
              <EmptyState 
                message="No published surveys yet." 
                action={<Button variant="outline" className="mt-4" onClick={() => setShowPublishDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Publish Your First Survey
                </Button>}
              />
            ) : publishedSurveys.map(survey => {
              const college = colleges.find(c => c.id === survey.college_id);
              const program = survey.program_id ? programs.find(p => p.id === survey.program_id) : null;
              return (
                <Card key={survey.id} className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex justify-between">
                      <span>{program ? program.name : college?.name || 'Unknown'}</span>
                      <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>{survey.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Published {new Date(survey.published_at).toLocaleDateString()}
                      {program && <span className="block text-xs">College: {college?.name}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {[
                        ['Version', survey.version],
                        ['Categories', survey.categories_count],
                        ['Questions', survey.total_questions],
                        ['Published By', survey.published_by]
                      ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between">
                          <span className="text-muted-foreground">{label}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                          setActiveVersion(survey.version);
                          if (survey.program_id) {
                            const prog = programs.find(p => p.id === survey.program_id);
                            if (prog) {
                              setSelectedCollege(String(prog.college_id));
                              setSelectedProgram(String(survey.program_id));
                            }
                          } else if (survey.college_id) {
                            setSelectedCollege(String(survey.college_id));
                            setSelectedProgram('all');
                          }
                          setActiveTab('preview');
                        }}><Eye className="h-4 w-4 mr-1" /> Preview</Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCloneSurvey(survey)}>
                          <Copy className="h-4 w-4 mr-1" /> Clone
                        </Button>
                        
                        {/* Conditional buttons based on status */}
                        {survey.status === 'active' && (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleArchiveSurvey(survey.id)}>
                            Archive
                          </Button>
                        )}
                        
                        {survey.status === 'archived' && (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleActivateSurvey(survey.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="glass-card p-6">
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold">Survey Preview</h2>
                <p className="text-sm text-muted-foreground">
                  Version {activeVersion} • 
                  {selectedProgram !== 'all' 
                    ? programs.find(p => String(p.id) === selectedProgram)?.name || selectedProgram
                    : selectedCollege !== 'all'
                    ? colleges.find(c => String(c.id) === selectedCollege)?.name || selectedCollege
                    : 'All Programs'}
                </p>
              </div>
              <Button variant="outline" onClick={() => setActiveTab('builder')}>Back to Editor</Button>
            </div>
            <div className="space-y-6">
              {!categories.length ? <p className="text-center text-muted-foreground py-8">No questions to preview.</p> : categories.map(cat => (
                <div key={cat.id} className="space-y-3">
                  <h3 className="font-display font-semibold text-lg">{cat.name}</h3>
                  {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                  <div className="space-y-3 pl-4">
                    {cat.questions.map((q, i) => (
                      <div key={q.id} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium">{i+1}. {q.text}{q.required && <span className="text-destructive ml-1">*</span>}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Type: {q.type}
                          {q.options && ` • Options: ${q.options.join(', ')}`}
                          {q.scale_min && q.scale_max && ` • Scale: ${q.scale_min} to ${q.scale_max}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={newQ.category_id} onValueChange={v => setNewQ({...newQ, category_id: v})}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            
            <Input value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} placeholder="Question text" />
            
            <Select value={newQ.type} onValueChange={v => setNewQ({...newQ, type: v as any})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['text','select','dropdown','checkbox','scale','number'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
              <Label className="text-xs font-bold flex items-center gap-1">
                <Building2 className="h-3 w-3"/> Apply to Colleges
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {colleges.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`college-${c.id}`} 
                      checked={newQ.colleges.includes(String(c.id))} 
                      onCheckedChange={() => toggleSelection(String(c.id), 'college')} 
                    />
                    <Label htmlFor={`college-${c.id}`} className="text-xs">{c.code}</Label>
                  </div>
                ))}
              </div>
            </div>

            {newQ.colleges.length > 0 && (
              <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <GraduationCap className="h-3 w-3"/> Apply to Specific Programs
                </Label>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {newQ.colleges.flatMap(collegeId => 
                    getProgramsByCollege(collegeId).map(program => (
                      <div key={program.id} className="flex items-center space-x-2 pl-2">
                        <Checkbox 
                          id={`program-${program.id}`}
                          checked={newQ.programs.includes(String(program.id))}
                          onCheckedChange={() => toggleSelection(String(program.id), 'program')}
                        />
                        <Label htmlFor={`program-${program.id}`} className="text-xs">{program.name}</Label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Leave empty to apply to all programs in selected colleges</p>
              </div>
            )}

            {(newQ.type === 'select' || newQ.type === 'dropdown' || newQ.type === 'checkbox') && (
              <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
                <Label className="text-xs font-bold">Options</Label>
                {newQ.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i+1}`} />
                    <Button variant="ghost" size="icon" onClick={() => removeOption(i)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={() => addOption()}>+ Add Option</Button>
              </div>
            )}

            {newQ.type === 'scale' && (
              <div className="flex gap-4 p-3 bg-muted/40 rounded-lg border">
                <div className="flex-1"><Label className="text-[10px]">Min</Label><Input type="number" value={newQ.scale_min} onChange={e => setNewQ({...newQ, scale_min: parseInt(e.target.value) || 1})} /></div>
                <div className="flex-1"><Label className="text-[10px]">Max</Label><Input type="number" value={newQ.scale_max} onChange={e => setNewQ({...newQ, scale_max: parseInt(e.target.value) || 5})} /></div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={newQ.required} onCheckedChange={v => setNewQ({...newQ, required: v})} />
              <Label>Required</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddQuestion} className="w-full">Create Question</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editQ} onOpenChange={() => setEditQ(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader>
          {editQ && (
            <div className="space-y-4">
              <Input value={editQ.text} onChange={e => setEditQ({...editQ, text: e.target.value})} />
              
              <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                <Label className="text-xs font-bold">Apply to Colleges</Label>
                <div className="grid grid-cols-2 gap-2">
                  {colleges.map(c => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`edit-college-${c.id}`} 
                        checked={editQ.colleges?.includes(String(c.id))} 
                        onCheckedChange={() => toggleSelection(String(c.id), 'college', true)} 
                      />
                      <Label htmlFor={`edit-college-${c.id}`} className="text-xs">{c.code}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {editQ.colleges && editQ.colleges.length > 0 && (
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                  <Label className="text-xs font-bold">Apply to Specific Programs</Label>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {editQ.colleges.flatMap(collegeId => 
                      getProgramsByCollege(collegeId).map(program => (
                        <div key={program.id} className="flex items-center space-x-2 pl-2">
                          <Checkbox 
                            id={`edit-program-${program.id}`}
                            checked={editQ.programs?.includes(String(program.id))}
                            onCheckedChange={() => toggleSelection(String(program.id), 'program', true)}
                          />
                          <Label htmlFor={`edit-program-${program.id}`} className="text-xs">{program.name}</Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {editQ.options && editQ.options.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
                  <Label className="text-xs font-bold">Options</Label>
                  {editQ.options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt} onChange={e => updateOption(i, e.target.value, true)} />
                      <Button variant="ghost" size="icon" onClick={() => removeOption(i, true)}><X className="h-4 w-4"/></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => addOption(true)}>+ Add Option</Button>
                </div>
              )}

              {editQ.scale_min !== undefined && (
                <div className="flex gap-4 p-3 bg-muted/40 rounded-lg border">
                  <div className="flex-1"><Label className="text-[10px]">Min</Label><Input type="number" value={editQ.scale_min} onChange={e => setEditQ({...editQ, scale_min: parseInt(e.target.value) || 1})} /></div>
                  <div className="flex-1"><Label className="text-[10px]">Max</Label><Input type="number" value={editQ.scale_max} onChange={e => setEditQ({...editQ, scale_max: parseInt(e.target.value) || 5})} /></div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={editQ.required} onCheckedChange={v => setEditQ({...editQ, required: v})} />
                <Label>Required</Label>
              </div>
            </div>
          )}
          <DialogFooter><Button className="w-full" onClick={handleUpdateQuestion}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Category name" />
            <Input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" />
          </div>
          <DialogFooter><Button className="w-full" onClick={handleAddCategory}>Add Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish Survey</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant={publishType === 'college' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setPublishType('college')}
              >
                <Building2 className="h-4 w-4 mr-2" /> To College
              </Button>
              <Button 
                variant={publishType === 'program' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setPublishType('program')}
              >
                <GraduationCap className="h-4 w-4 mr-2" /> To Program
              </Button>
            </div>

            <Select value={publishTarget} onValueChange={setPublishTarget}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${publishType}`} />
              </SelectTrigger>
              <SelectContent>
                {publishType === 'college' 
                  ? colleges.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>)
                  : programs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.code})</SelectItem>)
                }
              </SelectContent>
            </Select>

            <div className="bg-muted/30 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Survey Summary</p>
              {[
                ['Version', activeVersion],
                ['Categories', categories.length],
                ['Total Questions', categories.reduce((acc, cat) => acc + cat.questions.length, 0)]
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between"><span className="text-muted-foreground">{label}:</span><span>{value}</span></div>
              ))}
            </div>

            <div className="bg-warning/10 p-3 rounded-lg text-xs text-warning">
              Publishing will make this survey available to all alumni from the selected {publishType}. Previous versions will be archived.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button onClick={handlePublishSurvey} disabled={!publishTarget || publishing}>
              {publishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {publishing ? 'Publishing...' : 'Publish Survey'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategoryTarget} onOpenChange={() => setDeleteCategoryTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete category{' '}
            <span className="font-semibold text-foreground">
              "{deleteCategoryTarget?.name}"
            </span>{' '}
            and all its questions? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteCategoryTarget) return;
                handleDeleteCategory(deleteCategoryTarget.id, deleteCategoryTarget.name);
                setDeleteCategoryTarget(null);
              }}
            >
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}