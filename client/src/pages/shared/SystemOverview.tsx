import { Users, TrendingUp, Target, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { KpiCard } from '@/components/KpiCard';
import { loadContentSettings } from '@/lib/contentSettings';

export default function SystemOverview() {
  const { user } = useAuth();
  const content = loadContentSettings();
  return (
    <div className="space-y-6">
      <div className="glass-card p-8">
        <h1 className="text-2xl font-display font-bold mb-2">{content.overview.welcome}</h1>
        <p className="text-muted-foreground leading-relaxed">{content.overview.purpose}</p>
      </div>
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold mb-2">Why Your Participation Matters</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{content.overview.importance}</p>
      </div>
    </div>
  );
}
