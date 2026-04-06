import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadContentSettings, saveContentSettings } from '@/lib/contentSettings';

export default function AdminContent() {
  const { toast } = useToast();
  const [overviewContent, setOverviewContent] = useState(loadContentSettings().overview);

  const [helpContent, setHelpContent] = useState(loadContentSettings().help);

  const [faqs, setFaqs] = useState(loadContentSettings().faqs);

  useEffect(() => {
    const current = loadContentSettings();
    setOverviewContent(current.overview);
    setHelpContent(current.help);
    setFaqs(current.faqs);
  }, []);

  const handleSave = () => {
    saveContentSettings({
      overview: overviewContent,
      help: helpContent,
      faqs: faqs.filter(f => f.q.trim() || f.a.trim())
    });
    toast({ title: 'Content Saved', description: 'All changes have been saved successfully.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Content Manager</h1>
          <p className="text-muted-foreground text-sm">Edit system pages and content blocks</p>
        </div>
        <Button onClick={handleSave} className="gap-1"><Save className="h-4 w-4" /> Save All</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="help">Help / Guide</TabsTrigger>
          <TabsTrigger value="faq">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            <div><Label>Welcome Title</Label><Input className="mt-1.5" value={overviewContent.welcome} onChange={e => setOverviewContent({ ...overviewContent, welcome: e.target.value })} /></div>
            <div><Label>System Purpose</Label><Textarea className="mt-1.5 min-h-[100px]" value={overviewContent.purpose} onChange={e => setOverviewContent({ ...overviewContent, purpose: e.target.value })} /></div>
            <div><Label>Importance of Participation</Label><Textarea className="mt-1.5 min-h-[100px]" value={overviewContent.importance} onChange={e => setOverviewContent({ ...overviewContent, importance: e.target.value })} /></div>
          </div>
        </TabsContent>

        <TabsContent value="help" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            <div><Label>How It Works</Label><Textarea className="mt-1.5 min-h-[100px]" value={helpContent.howItWorks} onChange={e => setHelpContent({ ...helpContent, howItWorks: e.target.value })} /></div>
            <div><Label>Data Privacy Statement</Label><Textarea className="mt-1.5 min-h-[100px]" value={helpContent.privacy} onChange={e => setHelpContent({ ...helpContent, privacy: e.target.value })} /></div>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-4 rounded-lg border space-y-2">
                <div><Label>Question</Label><Input className="mt-1" value={faq.q} onChange={e => { const f = [...faqs]; f[i].q = e.target.value; setFaqs(f); }} /></div>
                <div><Label>Answer</Label><Textarea className="mt-1" value={faq.a} onChange={e => { const f = [...faqs]; f[i].a = e.target.value; setFaqs(f); }} /></div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setFaqs([...faqs, { q: '', a: '' }])}>+ Add FAQ</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
