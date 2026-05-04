import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { GlobalFilterBar, FilterState, defaultFilters } from '@/components/GlobalFilterBar';
import { Users, TrendingUp, GraduationCap, Target, Loader2 } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface KpiData {
  totalAlumni: number;
  participationRate: number;
  employmentRate: number;
  employmentTrend: number;
  degreeAlignment: number;
}

interface ProgramData {
  program: string;
  count: number;
  employed: number;
}

interface TrendData {
  year: string | number;
  rate: number;
  male: number;
  female: number;
}

export default function AdminAnalytics() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [kpis, setKpis] = useState<KpiData>({
    totalAlumni: 0,
    participationRate: 0,
    employmentRate: 0, employmentTrend: 0,
    degreeAlignment: 0
  });
  const [programData, setProgramData] = useState<ProgramData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const params = new URLSearchParams();
        
        // Correctly mapping to FilterState fields to fix Typescript errors
        if (filters.search) params.append('search', filters.search);
        if (filters.employmentStatus && filters.employmentStatus !== 'all') params.append('employmentStatus', filters.employmentStatus);
        if (filters.program && filters.program !== 'all') params.append('program', filters.program);
        if (filters.batchYear && filters.batchYear !== 'all') params.append('batchYear', filters.batchYear);

        const response = await fetch(`${API_URL}/admin/analytics?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch analytics data');

        const data = await response.json();
        
        setKpis(data.kpis);
        setProgramData(data.programData);
        setTrendData(data.trendData);

      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: 'Data Load Error',
          description: 'Failed to load analytics dashboard data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filters, navigate, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of alumni employability metrics</p>
      </div>

      <GlobalFilterBar filters={filters} onFiltersChange={setFilters} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Compiling analytics data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Total Alumni" 
              value={kpis.totalAlumni.toLocaleString()} 
              icon={Users} 
              delay={0} 
            />
            <KpiCard 
              title="Participation Rate" 
              value={`${kpis.participationRate.toFixed(1)}%`} 
              icon={Target} 
              delay={0.1} 
            />
            <KpiCard 
              title="Employment Rate" 
              value={`${kpis.employmentRate.toFixed(1)}%`} 
              icon={TrendingUp} 
              trend={{ value: kpis.employmentTrend, label: 'vs last batch' }} 
              delay={0.2} 
            />
            <KpiCard 
              title="Degree Alignment" 
              value={`${kpis.degreeAlignment.toFixed(1)}%`} 
              icon={GraduationCap} 
              subtitle="Jobs matching degree" 
              delay={0.3} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Total Alumni per Program</h3>
              {programData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={programData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="program" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Total" />
                    <Bar dataKey="employed" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} name="Employed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                  No program data available
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Yearly Employment Trend</h3>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Overall %" />
                    <Line type="monotone" dataKey="male" stroke="hsl(var(--info))" strokeWidth={2} strokeDasharray="5 5" name="Male %" />
                    <Line type="monotone" dataKey="female" stroke="hsl(var(--chart-5))" strokeWidth={2} strokeDasharray="5 5" name="Female %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                  No trend data available
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
