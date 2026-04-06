import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { loadContentSettings } from '@/lib/contentSettings';

export default function HelpGuide() {
  const content = loadContentSettings();
  const faqs = content.faqs;

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-display font-bold">Help / Guide</h1><p className="text-muted-foreground text-sm">Learn how the system works</p></div>
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold">How the Tracer System Works</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{content.help.howItWorks}</p>
      </div>
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold">How to Complete the Tracer Survey</h3>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
          <li>Navigate to "Tracer Survey" from the sidebar</li>
          <li>Answer each section's questions honestly</li>
          <li>Review your answers before submitting</li>
          <li>View your results and job recommendations</li>
        </ol>
      </div>
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold">Data Privacy</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{content.help.privacy}</p>
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
