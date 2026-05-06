import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { loadContentSettings } from '@/lib/contentSettings';

export default function HelpGuide() {
  const content = loadContentSettings();
  const faqs = content.faqs;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-display font-bold">Help / Guide</h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">Learn how the system works and how to make the most of your tracer survey experience.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass-card h-full p-6 space-y-4">
          <h3 className="font-display font-semibold">How the Tracer System Works</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{content.help.howItWorks}</p>
        </div>

        <div className="glass-card h-full p-6 space-y-4">
          <h3 className="font-display font-semibold">How to Complete the Tracer Survey</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Navigate to "Tracer Survey" from the sidebar.</li>
            <li>Answer each section's questions honestly.</li>
            <li>Review your answers before submitting.</li>
            <li>View your results and job recommendations.</li>
          </ol>
        </div>

        <div className="glass-card h-full p-6 space-y-4">
          <h3 className="font-display font-semibold">Data Privacy</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{content.help.privacy}</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display font-semibold mb-4">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible>
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
