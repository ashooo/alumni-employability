import { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Save, X, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { surveyQuestions } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: string[];
  scaleRange?: { min: number; max: number };
  version: number;
}

export default function AdminSurveyManager() {
  const [categories, setCategories] = useState(surveyQuestions as any[]);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const { toast } = useToast();

  const [newQ, setNewQ] = useState<Partial<Question> & { category: string }>({ 
    text: '', 
    type: 'text', 
    required: true, 
    category: '',
    options: ['Option 1'],
    scaleRange: { min: 1, max: 5 }
  });

  const handleSave = () => {
    toast({ title: 'Survey Saved', description: 'Survey structure has been updated successfully.' });
  };

  const handleDeleteQ = (catId: string, qId: string) => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, questions: c.questions.filter((q: any) => q.id !== qId) } : c));
    toast({ title: 'Question Deleted' });
  };

  const handleAddCategory = () => {
    if (!newCat.trim()) return;
    setCategories(prev => [...prev, { id: `cat-${Date.now()}`, category: newCat, questions: [] }]);
    setNewCat('');
    setShowAddCat(false);
    toast({ title: 'Category Added' });
  };

  const handleAddQuestion = () => {
    // Validation
    if (!newQ.text?.trim() || !newQ.category) {
      toast({ 
        title: "Missing Information", 
        description: "Please provide a question and select a category.",
        variant: "destructive"
      });
      return;
    }
    
    // Construct the object
    const preparedQuestion: Question = {
      id: `q-${Date.now()}`,
      text: newQ.text.trim(),
      type: newQ.type || 'text',
      required: !!newQ.required,
      version: 2,
      ...( ['select', 'dropdown', 'checkbox'].includes(newQ.type!) && { options: [...(newQ.options || [])] }),
      ...( newQ.type === 'scale' && { scaleRange: { ...newQ.scaleRange! } })
    };

    // Update State
    setCategories(prev => prev.map(c => {
      if (c.id === newQ.category) {
        return {
          ...c,
          questions: [...(c.questions || []), preparedQuestion]
        };
      }
      return c;
    }));

    // Reset and Close
    setShowAdd(false);
    setNewQ({ 
      text: '', 
      type: 'text', 
      required: true, 
      category: '', 
      options: ['Option 1'], 
      scaleRange: { min: 1, max: 5 } 
    });
    
    toast({ title: 'Question Added' });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Tracer Survey Manager</h1>
          <p className="text-muted-foreground text-sm">Manage survey sections and questions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddCat(true)}>Add Category</Button>
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-1"><Plus className="h-4 w-4" /> Add Question</Button>
          <Button onClick={handleSave} className="gap-1"><Save className="h-4 w-4" /> Save</Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={categories.map(c => c.id)}>
        {categories.map(cat => (
          <AccordionItem key={cat.id} value={cat.id} className="glass-card mb-3 overflow-hidden border">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-display font-semibold text-left">{cat.category}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{cat.questions.length} questions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="space-y-2">
                {cat.questions.map((q: any) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 flex flex-col text-left">
                        <span className="text-sm font-medium">{q.text}</span>
                        {q.options && <span className="text-[10px] text-muted-foreground">Options: {q.options.join(', ')}</span>}
                        {q.scaleRange && <span className="text-[10px] text-muted-foreground">Scale: {q.scaleRange.min} to {q.scaleRange.max}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded uppercase">{q.type}</span>
                    {q.required && <span className="text-xs text-primary font-medium">Required</span>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setEditQ(q)}><Edit2 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteQ(cat.id, q.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {cat.questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No questions in this category yet.</p>}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Add question dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newQ.category} onValueChange={v => setNewQ({ ...newQ, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.category}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} placeholder="e.g. What is your current job title?" />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newQ.type} onValueChange={v => setNewQ({ ...newQ, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['text', 'select', 'dropdown', 'checkbox', 'scale', 'number'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {['select', 'dropdown', 'checkbox'].includes(newQ.type!) && (
              <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-dashed">
                <Label className="text-xs font-bold flex items-center gap-1"><ListPlus className="h-3 w-3"/> Configure Options</Label>
                {newQ.options?.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i+1}`} />
                    <Button variant="ghost" size="icon" onClick={() => setNewQ({...newQ, options: newQ.options?.filter((_, idx) => idx !== i)})}>
                        <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setNewQ({...newQ, options: [...(newQ.options || []), `Option ${(newQ.options?.length || 0) + 1}`]})}>+ Add Option</Button>
              </div>
            )}

            {newQ.type === 'scale' && (
              <div className="p-3 bg-muted/40 rounded-lg border border-dashed flex gap-4">
                <div className="flex-1 space-y-1">
                    <Label className="text-[10px] uppercase">Min Value</Label>
                    <Input type="number" value={newQ.scaleRange?.min} onChange={e => setNewQ({...newQ, scaleRange: {...newQ.scaleRange!, min: parseInt(e.target.value)}})} />
                </div>
                <div className="flex-1 space-y-1">
                    <Label className="text-[10px] uppercase">Max Value</Label>
                    <Input type="number" value={newQ.scaleRange?.max} onChange={e => setNewQ({...newQ, scaleRange: {...newQ.scaleRange!, max: parseInt(e.target.value)}})} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2"><Switch checked={newQ.required} onCheckedChange={v => setNewQ({ ...newQ, required: v })} /><Label>Mark as Required</Label></div>
          </div>
          <DialogFooter className="pt-4">
            <Button onClick={handleAddQuestion} className="w-full">Create Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editQ} onOpenChange={() => setEditQ(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Question</DialogTitle></DialogHeader>
          {editQ && (
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Question Text</Label><Input value={editQ.text} onChange={e => setEditQ({ ...editQ, text: e.target.value })} /></div>
              
              {editQ.options && (
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
                   <Label className="text-xs font-bold">Options</Label>
                   {editQ.options.map((opt, i) => (
                     <div key={i} className="flex gap-2">
                        <Input value={opt} onChange={e => updateOption(i, e.target.value, true)} />
                        <Button variant="ghost" size="icon" onClick={() => setEditQ({...editQ, options: editQ.options?.filter((_, idx) => idx !== i)})}><X className="h-4 w-4"/></Button>
                     </div>
                   ))}
                   <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditQ({...editQ, options: [...(editQ.options || []), "New Option"]})}>+ Add Option</Button>
                </div>
              )}

              {editQ.scaleRange && (
                <div className="flex gap-4 p-3 bg-muted/40 rounded-lg border">
                    <div className="flex-1 space-y-1"><Label className="text-[10px] uppercase">Min</Label><Input type="number" value={editQ.scaleRange.min} onChange={e => setEditQ({...editQ, scaleRange: {...editQ.scaleRange!, min: parseInt(e.target.value)}})} /></div>
                    <div className="flex-1 space-y-1"><Label className="text-[10px] uppercase">Max</Label><Input type="number" value={editQ.scaleRange.max} onChange={e => setEditQ({...editQ, scaleRange: {...editQ.scaleRange!, max: parseInt(e.target.value)}})} /></div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2"><Switch checked={editQ.required} onCheckedChange={v => setEditQ({ ...editQ, required: v })} /><Label>Required</Label></div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button className="w-full" onClick={() => { 
              setCategories(prev => prev.map(c => ({...c, questions: c.questions.map((q:any) => q.id === editQ?.id ? editQ : q)})));
              setEditQ(null); 
              toast({ title: 'Question Updated' }); 
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add category dialog */}
      <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Category</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Personal Information" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button className="w-full" onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}