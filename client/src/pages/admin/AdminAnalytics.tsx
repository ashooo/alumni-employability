import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { GlobalFilterBar, FilterState, defaultFilters } from '@/components/GlobalFilterBar';
import { Users, TrendingUp, GraduationCap, Target } from 'lucide-react';
import { alumniPerProgram, yearlyEmployment } from '@/data/mockData';
import { KpiCard } from '@/components/KpiCard';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function AdminAnalytics() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of alumni employability metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Alumni" value="1,703" icon={Users} trend={{ value: 12, label: 'from last year' }} delay={0} />
        <KpiCard title="Participation Rate" value="78.3%" icon={Target} trend={{ value: 5.2, label: 'improvement' }} delay={0.1} />
        <KpiCard title="Employment Rate" value="83.6%" icon={TrendingUp} trend={{ value: 3.1, label: 'vs last batch' }} delay={0.2} />
        <KpiCard title="Degree Alignment" value="74.2%" icon={GraduationCap} subtitle="Jobs matching degree" delay={0.3} />
      </div>

      <GlobalFilterBar filters={filters} onFiltersChange={setFilters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4">Total Alumni per Program</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alumniPerProgram}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="program" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Total" />
              <Bar dataKey="employed" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} name="Employed" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4">Yearly Employment Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={yearlyEmployment}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[50, 100]} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Overall %" />
              <Line type="monotone" dataKey="male" stroke="hsl(var(--info))" strokeWidth={2} strokeDasharray="5 5" name="Male %" />
              <Line type="monotone" dataKey="female" stroke="hsl(var(--chart-5))" strokeWidth={2} strokeDasharray="5 5" name="Female %" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
