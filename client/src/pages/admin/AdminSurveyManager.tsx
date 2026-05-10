import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, X, Loader2, ChevronLeft, GripVertical, Search, ToggleLeft, ToggleRight, ListPlus } from 'lucide-react';
import LoadingScreen from '@/components/ui/loading-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const KINDS = ['INITIAL','EMPLOYED','UNEMPLOYED','FOLLOWUP','GENERAL'] as const;
const PATHS = ['INITIAL','EMPLOYED','UNEMPLOYED','FOLLOWUP'] as const;
const Q_TYPES = ['TEXT','TEXTAREA','NUMBER','BOOLEAN','DATE','SINGLE_SELECT','MULTI_SELECT','SCALE'] as const;

interface Template {
  id: number; template_key: string; name: string; description: string | null;
  kind: string; path_key: string; is_followup: boolean; is_active: boolean;
  question_count: number; submission_count: number;
  program_id?: number | null;
  program?: { id: number; code: string; name: string } | null;
  created_at: string; updated_at: string;
}
interface Option { id: number; option_value: string; option_label: string; display_order: number; }
interface TQuestion {
  link_id: number; question_id: number; display_order: number; is_required: boolean;
  section_key: string | null; question_key: string; question_text: string;
  help_text: string | null; question_type: string; is_active: boolean; options: Option[];
}
interface TemplateDetail extends Omit<Template,'question_count'> {
  submission_count: number; questions: TQuestion[];
}
interface ProgramLite {
  id: number;
  code: string;
  name: string;
}
interface ProgramAdditionalQuestionConfig {
  question: string;
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SINGLE_SELECT' | 'MULTI_SELECT';
  required: boolean;
  options?: string[];
}

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API}/admin/survey${path}`, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || r.statusText); }
  return r.json();
}

const kindColor: Record<string,string> = {
  INITIAL: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  EMPLOYED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  UNEMPLOYED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FOLLOWUP: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  GENERAL: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const DEFAULT_PROGRAM_CRUCIAL_SKILLS: Record<string, string[]> = {
  BSA: [
    'Auditing Skills',
    'Budgeting & Analysis Skills',
    'Financial Accounting Skills',
    'Taxation Skills',
    'Risk Management Skills'
  ],
  BSECE: [
    'Leadership & Decision-Making Skills',
    'Networking Skills',
    'Programming Logic Skills',
    'Python Programming Skills',
    'English Communication & Writing Skills',
    'Filipino Communication & Writing Skills',
    'Artificial Intelligence Skills',
    'Cybersecurity Skills',
    'Circuit Design Skills',
    'Communication Systems Skills',
    'Problem-Solving Skills'
  ],
  BSED_FILIPINO: [
    'Filipino Communication & Writing Skills',
    'Cloud Computing Skills',
    'Curriculum Development Skills',
    'Classroom Management Skills',
    'Educational Technology Skills',
    'Teaching Skills'
  ],
  BSED_ENGLISH: [
    'English Communication & Writing Skills',
    'Curriculum Development Skills',
    'Classroom Management Skills',
    'Educational Technology Skills',
    'Teaching Skills'
  ],
  BSN: [
    'Leadership & Decision-Making Skills',
    'English Communication & Writing Skills',
    'Filipino Communication & Writing Skills',
    'Problem-Solving Skills',
    'Clinical Skills',
    'Patient Care Skills',
    'Health Assessment Skills',
    'Emergency Response Skills'
  ],
  BSBA_ENTREP: [
    'Financial Management Skills',
    'Java Programming Skills',
    'Leadership & Decision-Making Skills',
    'Machine Learning Skills',
    'Marketing Skills',
    'Strategic Planning Skills',
    'Innovation & Business Planning Skills'
  ],
  BSBA_MARKETING: [
    'Financial Management Skills',
    'Leadership & Decision-Making Skills',
    'Marketing Skills',
    'Strategic Planning Skills',
    'Consumer Behavior Analysis',
    'Sales Management Skills'
  ],
  BSCS: [
    'Machine Learning Skills',
    'Programming Logic Skills',
    'Python Programming Skills',
    'Artificial Intelligence Skills',
    'Cloud Computing Skills',
    'Curriculum Development Skills',
    'Data Structures & Algorithms',
    'Software Engineering Skills'
  ],
  BSIT: [
    'Java Programming Skills',
    'Networking Skills',
    'Programming Logic Skills',
    'Python Programming Skills',
    'Cybersecurity Skills',
    'Database Management Skills',
    'System Design Skills',
    'Web Development Skills'
  ]
};

const normalizeAdditionalQuestionConfig = (raw: any): ProgramAdditionalQuestionConfig | null => {
  if (typeof raw === 'string') {
    const question = raw.trim();
    if (!question) return null;
    return { question, type: 'TEXT', required: false, options: [] };
  }
  if (!raw || typeof raw !== 'object') return null;
  const question = String(raw.question || raw.text || '').trim();
  if (!question) return null;
  const supportedTypes = new Set(['TEXT', 'TEXTAREA', 'NUMBER', 'SINGLE_SELECT', 'MULTI_SELECT']);
  const type = String(raw.type || 'TEXT').toUpperCase();
  const normalizedType = (supportedTypes.has(type) ? type : 'TEXT') as ProgramAdditionalQuestionConfig['type'];
  const options = Array.isArray(raw.options) ? raw.options.map((o: any) => String(o || '').trim()).filter(Boolean) : [];
  return {
    question,
    type: normalizedType,
    required: Boolean(raw.required),
    options
  };
};

export default function AdminSurveyManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TemplateDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddQ, setShowAddQ] = useState(false);
  const [showEditQ, setShowEditQ] = useState<TQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [programs, setPrograms] = useState<ProgramLite[]>([]);
  const [programCrucialSkillsMap, setProgramCrucialSkillsMap] = useState<Record<string, string[]>>({});
  const [programAdditionalQuestionsMap, setProgramAdditionalQuestionsMap] = useState<Record<string, ProgramAdditionalQuestionConfig[]>>({});
  const [editingProgram, setEditingProgram] = useState<ProgramLite | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newAdditionalQuestion, setNewAdditionalQuestion] = useState('');
  const [newAdditionalQuestionType, setNewAdditionalQuestionType] = useState<ProgramAdditionalQuestionConfig['type']>('TEXT');
  const [newAdditionalQuestionRequired, setNewAdditionalQuestionRequired] = useState(true);
  const [newAdditionalQuestionOptionsText, setNewAdditionalQuestionOptionsText] = useState('');

  // create form
  const [cf, setCf] = useState({ name: '', description: '', kind: 'GENERAL', path_key: 'INITIAL', template_key: '', program_id: 'all' });
  // new question form
  const [nq, setNq] = useState({ question_text: '', question_type: 'TEXT', help_text: '', section_key: '', is_required: true, options: [''] as string[] });
  // edit question form
  const [eq, setEq] = useState({ question_text: '', question_type: '', help_text: '', is_required: true, section_key: '', options: [''] as string[] });

  const load = useCallback(async () => {
    setLoading(true);
    try { setTemplates(await api<Template[]>('/templates')); } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const loadProgramsAndSkills = async () => {
      try {
        const [programRes, skillsRes, additionalRes] = await Promise.all([
          fetch(`${API}/admin/programs/list`, { headers: authHeaders() }),
          fetch(`${API}/admin/program-crucial-skills`, { headers: authHeaders() }),
          fetch(`${API}/admin/program-additional-questions`, { headers: authHeaders() })
        ]);
        if (!programRes.ok) throw new Error('Failed to load programs');
        if (!skillsRes.ok) throw new Error('Failed to load crucial skills config');
        if (!additionalRes.ok) throw new Error('Failed to load additional questions config');
        const programList = await programRes.json();
        const skillConfig = await skillsRes.json();
        const additionalConfig = await additionalRes.json();
        setPrograms((programList || []) as ProgramLite[]);
        setProgramCrucialSkillsMap((skillConfig?.value || {}) as Record<string, string[]>);
        const rawAdditional = (additionalConfig?.value || {}) as Record<string, any[]>;
        const normalizedAdditional: Record<string, ProgramAdditionalQuestionConfig[]> = {};
        Object.entries(rawAdditional || {}).forEach(([programKey, questions]) => {
          normalizedAdditional[programKey] = Array.isArray(questions)
            ? questions.map((q) => normalizeAdditionalQuestionConfig(q)).filter((q): q is ProgramAdditionalQuestionConfig => Boolean(q))
            : [];
        });
        setProgramAdditionalQuestionsMap(normalizedAdditional);
      } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      }
    };
    loadProgramsAndSkills();
  }, [toast]);

  const openTemplate = async (id: number) => {
    try {
      const t = await api<TemplateDetail>(`/templates/${id}`);
      setSelected(t);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleCreate = async () => {
    if (!cf.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...cf, program_id: cf.program_id === 'all' ? null : Number(cf.program_id) };
      await api('/templates', { method: 'POST', body: JSON.stringify(payload) });
      toast({ title: 'Template Created' });
      setShowCreate(false);
      setCf({ name: '', description: '', kind: 'GENERAL', path_key: 'INITIAL', template_key: '', program_id: 'all' });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (t: Template) => {
    try {
      await api(`/templates/${t.id}/activate`, { method: 'PUT', body: JSON.stringify({ is_active: !t.is_active }) });
      toast({ title: t.is_active ? 'Deactivated' : 'Activated' });
      load();
      if (selected?.id === t.id) openTemplate(t.id);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleClone = async (t: Template) => {
    try {
      await api(`/templates/${t.id}/clone`, { method: 'POST', body: JSON.stringify({}) });
      toast({ title: 'Template Cloned' });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Delete "${t.name}"? ${t.submission_count > 0 ? 'It has submissions and will be deactivated instead.' : ''}`)) return;
    try {
      await api(`/templates/${t.id}`, { method: 'DELETE' });
      toast({ title: 'Template Deleted' });
      if (selected?.id === t.id) setSelected(null);
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleAddQuestion = async () => {
    if (!nq.question_text.trim() || !selected) return;
    setSaving(true);
    try {
      const q = await api<any>('/questions', { method: 'POST', body: JSON.stringify({
        question_text: nq.question_text, question_type: nq.question_type, help_text: nq.help_text || null,
        options: ['SINGLE_SELECT','MULTI_SELECT'].includes(nq.question_type) ? nq.options.filter(o => o.trim()) : undefined
      }) });
      await api(`/templates/${selected.id}/questions`, { method: 'POST', body: JSON.stringify({
        question_id: q.id, is_required: nq.is_required, section_key: nq.section_key || null
      }) });
      toast({ title: 'Question Added' });
      setShowAddQ(false);
      setNq({ question_text: '', question_type: 'TEXT', help_text: '', section_key: '', is_required: true, options: [''] });
      openTemplate(selected.id);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleUpdateQuestion = async () => {
    if (!showEditQ || !selected) return;
    setSaving(true);
    try {
      await api(`/questions/${showEditQ.question_id}`, { method: 'PUT', body: JSON.stringify({
        question_text: eq.question_text, question_type: eq.question_type, help_text: eq.help_text || null,
        options: ['SINGLE_SELECT','MULTI_SELECT'].includes(eq.question_type) ? eq.options.filter(o => o.trim()) : undefined
      }) });
      // update link metadata (section, required) via remove+add
      await api(`/templates/${selected.id}/questions`, { method: 'POST', body: JSON.stringify({
        question_id: showEditQ.question_id, is_required: eq.is_required, section_key: eq.section_key || null,
        display_order: showEditQ.display_order
      }) });
      toast({ title: 'Question Updated' });
      setShowEditQ(null);
      openTemplate(selected.id);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleRemoveQuestion = async (q: TQuestion) => {
    if (!selected || !confirm(`Remove "${q.question_text}" from this template?`)) return;
    try {
      await api(`/templates/${selected.id}/questions/${q.question_id}`, { method: 'DELETE' });
      toast({ title: 'Question Removed' });
      openTemplate(selected.id);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const filtered = templates.filter(t => {
    if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
    if (programFilter === 'global' && t.program_id) return false;
    if (programFilter !== 'all' && programFilter !== 'global' && String(t.program_id || '') !== programFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.template_key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const normalizeProgramCodeKey = (value: string) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const currentProgramKey = normalizeProgramCodeKey(editingProgram?.code || '');
  const selectedSkills = programCrucialSkillsMap[currentProgramKey] || DEFAULT_PROGRAM_CRUCIAL_SKILLS[currentProgramKey] || [];
  const selectedAdditionalQuestions = programAdditionalQuestionsMap[currentProgramKey] || [];
  const saveProgramSkills = async (nextSkills: string[]) => {
    const codeKey = currentProgramKey;
    if (!codeKey) return;
    const nextMap = { ...programCrucialSkillsMap, [codeKey]: nextSkills };
    const saveResponse = await fetch(`${API}/admin/program-crucial-skills`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ value: nextMap })
    });
    if (!saveResponse.ok) {
      const payload = await saveResponse.json().catch(() => ({}));
      throw new Error((payload as any).error || 'Failed to save program crucial skills');
    }
    setProgramCrucialSkillsMap(nextMap);
  };
  const addSkill = async () => {
    const skill = newSkill.trim();
    if (!skill || !editingProgram || selectedSkills.includes(skill)) return;
    const proceed = confirm('Adding a new crucial skill may affect model quality and consistency because this feature may not exist in prior training data. Continue?');
    if (!proceed) return;
    await saveProgramSkills([...selectedSkills, skill]);
    setNewSkill('');
  };
  const removeSkill = async (skill: string) => {
    const proceed = confirm('Removing a crucial skill may affect model quality and consistency because the model was trained with the previous feature set. Continue?');
    if (!proceed) return;
    await saveProgramSkills(selectedSkills.filter((s) => s !== skill));
  };
  const saveProgramAdditionalQuestions = async (nextQuestions: ProgramAdditionalQuestionConfig[]) => {
    const codeKey = currentProgramKey;
    if (!codeKey) return;
    const nextMap = { ...programAdditionalQuestionsMap, [codeKey]: nextQuestions };
    const saveResponse = await fetch(`${API}/admin/program-additional-questions`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ value: nextMap })
    });
    if (!saveResponse.ok) {
      const payload = await saveResponse.json().catch(() => ({}));
      throw new Error((payload as any).error || 'Failed to save program additional questions');
    }
    setProgramAdditionalQuestionsMap(nextMap);
  };
  const addAdditionalQuestion = async () => {
    const question = newAdditionalQuestion.trim();
    if (!question || !editingProgram || selectedAdditionalQuestions.some((q) => q.question === question)) return;
    const options = newAdditionalQuestionType === 'SINGLE_SELECT' || newAdditionalQuestionType === 'MULTI_SELECT'
      ? newAdditionalQuestionOptionsText.split(/\r?\n|,/g).map((item) => item.trim()).filter(Boolean)
      : [];
    await saveProgramAdditionalQuestions([
      ...selectedAdditionalQuestions,
      { question, type: newAdditionalQuestionType, required: newAdditionalQuestionRequired, options }
    ]);
    setNewAdditionalQuestion('');
    setNewAdditionalQuestionType('TEXT');
    setNewAdditionalQuestionRequired(true);
    setNewAdditionalQuestionOptionsText('');
  };
  const removeAdditionalQuestion = async (question: string) => {
    await saveProgramAdditionalQuestions(selectedAdditionalQuestions.filter((q) => q.question !== question));
  };

  // Group questions by section_key
  const groupBySection = (questions: TQuestion[]) => {
    const groups: Record<string, TQuestion[]> = {};
    for (const q of questions) {
      const key = q.section_key || 'general';
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const sectionLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (editingProgram) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditingProgram(null)}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Program Config - {editingProgram.code}</h1>
            <p className="text-sm text-muted-foreground">{editingProgram.name}</p>
          </div>
        </div>

        <Tabs defaultValue="skills" className="w-full">
          <TabsList>
            <TabsTrigger value="skills">Crucial Skills</TabsTrigger>
            <TabsTrigger value="questions">Additional Questions</TabsTrigger>
          </TabsList>
          <TabsContent value="skills" className="mt-4">
            <Card className="glass-card">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display font-semibold">Crucial Skills</h3>
                  <p className="text-xs text-amber-600">
                    Adding or removing a crucial skill may affect model quality if training data does not include the updated feature set.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill (e.g., Data Structures & Algorithms)" />
                  <Button onClick={addSkill}><Plus className="h-4 w-4 mr-2" />Add Skill</Button>
                </div>
                <div className="space-y-2">
                  {selectedSkills.length === 0 ? (
                    <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">No skills configured for this program.</div>
                  ) : (
                    selectedSkills.map((skill, index) => (
                      <div key={skill} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">#{index + 1}</p>
                          <p className="text-sm">{skill}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeSkill(skill)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="questions" className="mt-4">
            <Card className="glass-card">
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-display font-semibold">Additional Questions</h3>
                <div className="space-y-3">
                  <Input value={newAdditionalQuestion} onChange={(e) => setNewAdditionalQuestion(e.target.value)} placeholder="Question text" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select value={newAdditionalQuestionType} onValueChange={(v) => setNewAdditionalQuestionType(v as ProgramAdditionalQuestionConfig['type'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXT">Text</SelectItem>
                        <SelectItem value="TEXTAREA">Textarea</SelectItem>
                        <SelectItem value="NUMBER">Number</SelectItem>
                        <SelectItem value="SINGLE_SELECT">Radio / Single Select</SelectItem>
                        <SelectItem value="MULTI_SELECT">Checkbox / Multi Select</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newAdditionalQuestionRequired ? 'required' : 'optional'} onValueChange={(v) => setNewAdditionalQuestionRequired(v === 'required')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addAdditionalQuestion}><Plus className="h-4 w-4 mr-2" />Add Question</Button>
                  </div>
                  {(newAdditionalQuestionType === 'SINGLE_SELECT' || newAdditionalQuestionType === 'MULTI_SELECT') && (
                    <Input
                      value={newAdditionalQuestionOptionsText}
                      onChange={(e) => setNewAdditionalQuestionOptionsText(e.target.value)}
                      placeholder="Options (comma-separated), e.g., Yes,No,Maybe"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  {selectedAdditionalQuestions.length === 0 ? (
                    <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">No additional questions configured for this program.</div>
                  ) : (
                    selectedAdditionalQuestions.map((q, index) => (
                      <div key={`${q.question}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">#{index + 1}</p>
                          <p className="text-sm">{q.question}</p>
                          <p className="text-xs text-muted-foreground">
                            {q.type} | {q.required ? 'Required' : 'Optional'}
                            {q.options && q.options.length > 0 ? ` | Options: ${q.options.join(', ')}` : ''}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeAdditionalQuestion(q.question)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ─── Detail view ────────────────────────────────────────────────────────
  if (selected) {
    const sections = groupBySection(selected.questions);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold">{selected.name}</h1>
              <Badge variant="outline" className={kindColor[selected.kind] || ''}>{selected.kind}</Badge>
              <Badge variant="outline">{selected.path_key}</Badge>
              <Badge variant={selected.is_active ? 'default' : 'secondary'}>{selected.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{selected.description || 'No description'} | Key: <code className="text-xs">{selected.template_key}</code></p>
            {selected.program && <p className="text-xs text-muted-foreground mt-1">Program-specific: {selected.program.code} - {selected.program.name}</p>}
          </div>
          <Button variant="outline" onClick={() => setShowAddQ(true)} className="gap-1"><Plus className="h-4 w-4" /> Add Question</Button>
        </div>

        {sections.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No questions yet. Click "Add Question" to get started.</p>
          </CardContent></Card>
        ) : (
          <Accordion type="multiple" defaultValue={sections.map(([k]) => k)}>
            {sections.map(([sectionKey, questions]) => (
              <AccordionItem key={sectionKey} value={sectionKey} className="glass-card mb-3 overflow-hidden border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-left">{sectionLabel(sectionKey)}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{questions.length} questions</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-2">
                    {questions.map((q) => (
                      <div key={q.link_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 flex flex-col text-left">
                          <span className="text-sm font-medium">{q.question_text}</span>
                          {q.help_text && <span className="text-[10px] text-muted-foreground">{q.help_text}</span>}
                          {q.options.length > 0 && <span className="text-[10px] text-muted-foreground">Options: {q.options.map(o => o.option_label).join(', ')}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded uppercase">{q.question_type}</span>
                        {q.is_required && <span className="text-xs text-primary font-medium">Required</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => {
                          setShowEditQ(q);
                          setEq({ question_text: q.question_text, question_type: q.question_type, help_text: q.help_text || '',
                            is_required: q.is_required, section_key: q.section_key || '',
                            options: q.options.length > 0 ? q.options.map(o => o.option_label) : [''] });
                        }}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => handleRemoveQuestion(q)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Add question dialog */}
        <Dialog open={showAddQ} onOpenChange={setShowAddQ}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Add Question</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Question Text</Label>
                <Input value={nq.question_text} onChange={e => setNq({...nq, question_text: e.target.value})} placeholder="e.g. What is your current job title?" /></div>
              <div className="space-y-2"><Label>Section</Label>
                <Input value={nq.section_key} onChange={e => setNq({...nq, section_key: e.target.value})} placeholder="e.g. employment_details" /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={nq.question_type} onValueChange={v => setNq({...nq, question_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Q_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Help Text</Label>
                <Input value={nq.help_text} onChange={e => setNq({...nq, help_text: e.target.value})} placeholder="Optional guidance" /></div>
              {['SINGLE_SELECT','MULTI_SELECT'].includes(nq.question_type) && (
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-dashed">
                  <Label className="text-xs font-bold flex items-center gap-1"><ListPlus className="h-3 w-3"/>Options</Label>
                  {nq.options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt} onChange={e => { const o = [...nq.options]; o[i] = e.target.value; setNq({...nq, options: o}); }} placeholder={`Option ${i+1}`} />
                      <Button variant="ghost" size="icon" onClick={() => setNq({...nq, options: nq.options.filter((_, idx) => idx !== i)})}><X className="h-4 w-4" /></Button>
                    </div>))}
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setNq({...nq, options: [...nq.options, '']})}>+ Add Option</Button>
                </div>)}
              <div className="flex items-center gap-2 pt-2"><Switch checked={nq.is_required} onCheckedChange={v => setNq({...nq, is_required: v})} /><Label>Required</Label></div>
            </div>
            <DialogFooter className="pt-4"><Button onClick={handleAddQuestion} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Question</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit question dialog */}
        <Dialog open={!!showEditQ} onOpenChange={() => setShowEditQ(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Edit Question</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Question Text</Label>
                <Input value={eq.question_text} onChange={e => setEq({...eq, question_text: e.target.value})} /></div>
              <div className="space-y-2"><Label>Section</Label>
                <Input value={eq.section_key} onChange={e => setEq({...eq, section_key: e.target.value})} /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={eq.question_type} onValueChange={v => setEq({...eq, question_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Q_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Help Text</Label>
                <Input value={eq.help_text} onChange={e => setEq({...eq, help_text: e.target.value})} /></div>
              {['SINGLE_SELECT','MULTI_SELECT'].includes(eq.question_type) && (
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-dashed">
                  <Label className="text-xs font-bold">Options</Label>
                  {eq.options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt} onChange={e => { const o = [...eq.options]; o[i] = e.target.value; setEq({...eq, options: o}); }} />
                      <Button variant="ghost" size="icon" onClick={() => setEq({...eq, options: eq.options.filter((_, idx) => idx !== i)})}><X className="h-4 w-4" /></Button>
                    </div>))}
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEq({...eq, options: [...eq.options, '']})}>+ Add Option</Button>
                </div>)}
              <div className="flex items-center gap-2 pt-2"><Switch checked={eq.is_required} onCheckedChange={v => setEq({...eq, is_required: v})} /><Label>Required</Label></div>
            </div>
            <DialogFooter className="pt-4"><Button onClick={handleUpdateQuestion} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Changes</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen fullScreen={false} message="Loading survey templates..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Survey Manager</h1>
          <p className="text-muted-foreground text-sm">Manage survey templates and their questions</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1"><Plus className="h-4 w-4" /> New Template</Button>
      </div>

      <div className="glass-card p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Kinds" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Kinds</SelectItem>
              {KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              <SelectItem value="global">Global Templates Only</SelectItem>
              {programs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.code} ({p.name})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => (
          <Card key={t.id} className="glass-card cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" onClick={() => openTemplate(t.id)}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-display font-semibold truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground truncate font-mono">{t.template_key}</p>
                </div>
                <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(t)} title={t.is_active ? 'Deactivate' : 'Activate'}>
                    {t.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleClone(t)} title="Clone"><Copy className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={kindColor[t.kind] || ''}>{t.kind}</Badge>
                <Badge variant="outline">{t.path_key}</Badge>
                <Badge variant="outline">{t.program ? `Program: ${t.program.code}` : 'Global'}</Badge>
                <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-[10px]">{t.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>{t.question_count} questions</span>
                <span>{t.submission_count} submissions</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No templates found.</div>
        )}
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-display font-semibold">Programs</h3>
            <p className="text-xs text-muted-foreground">Configure crucial skills and additional questions per program.</p>
          </div>
          <div className="space-y-2">
            {programs.map((program) => (
              <div key={program.id} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{program.code}</p>
                  <p className="text-xs text-muted-foreground">{program.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(programCrucialSkillsMap[normalizeProgramCodeKey(program.code)] || DEFAULT_PROGRAM_CRUCIAL_SKILLS[normalizeProgramCodeKey(program.code)] || []).length} skills | {(programAdditionalQuestionsMap[normalizeProgramCodeKey(program.code)] || []).length} additional questions
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingProgram(program);
                    setNewSkill('');
                    setNewAdditionalQuestion('');
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create template dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Create Survey Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name *</Label>
              <Input value={cf.name} onChange={e => setCf({...cf, name: e.target.value})} placeholder="e.g. Employed Alumni Survey" /></div>
            <div className="space-y-2"><Label>Template Key</Label>
              <Input value={cf.template_key} onChange={e => setCf({...cf, template_key: e.target.value})} placeholder="Auto-generated if empty" /></div>
            <div className="space-y-2"><Label>Description</Label>
              <Input value={cf.description} onChange={e => setCf({...cf, description: e.target.value})} placeholder="Brief description" /></div>
            <div className="space-y-2"><Label>Program Scope</Label>
              <Select value={cf.program_id} onValueChange={v => setCf({...cf, program_id: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Global (All Programs)</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.code} ({p.name})</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Kind</Label>
                <Select value={cf.kind} onValueChange={v => setCf({...cf, kind: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Path</Label>
                <Select value={cf.path_key} onValueChange={v => setCf({...cf, path_key: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PATHS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
          </div>
          <DialogFooter className="pt-4"><Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Template</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
