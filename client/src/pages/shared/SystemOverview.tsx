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
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Alumni" value="1,703" icon={Users} delay={0} />
          <KpiCard title="Participation" value="78.3%" icon={Target} delay={0.1} />
          <KpiCard title="Employment" value="83.6%" icon={TrendingUp} delay={0.2} />
          <KpiCard title="Degree Alignment" value="74.2%" icon={GraduationCap} delay={0.3} />
        </div>
      )}
    </div>
  );
}
