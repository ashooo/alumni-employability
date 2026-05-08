import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend, Area, ComposedChart } from 'recharts';
import { GlobalFilterBar, FilterState, defaultFilters } from '@/components/GlobalFilterBar';
import { Users, TrendingUp, GraduationCap, Target, Loader2 } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface CollegeData {
  id: number;
  name: string;
  code?: string | null;
  program_count: number;
  alumni_count: number;
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
  const [collegeData, setCollegeData] = useState<CollegeData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [predictionData, setPredictionData] = useState<any[]>([]);
  const [predictionMetrics, setPredictionMetrics] = useState<any>(null);

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

        const [response, predResponse, collegeResponse] = await Promise.all([
          fetch(`${API_URL}/admin/analytics?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          fetch(`${API_URL}/admin/predictions/arima`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }).catch(err => {
            console.error('Prediction fetch error:', err);
            return { ok: false, status: 500, json: async () => ({}) };
          }),
          fetch(`${API_URL}/admin/colleges`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          })
        ]);

        if (
          response.status === 401 ||
          response.status === 403 ||
          predResponse.status === 401 ||
          predResponse.status === 403 ||
          collegeResponse.status === 401 ||
          collegeResponse.status === 403
        ) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch analytics data');

        const data = await response.json();

        setKpis(data.kpis);
        setProgramData(data.programData);
        setTrendData(data.trendData);
        if (collegeResponse.ok) {
          const colleges = await collegeResponse.json();
          setCollegeData(Array.isArray(colleges) ? colleges : []);
        } else {
          setCollegeData([]);
        }

        if (predResponse.ok) {
          const predData = await predResponse.json();
          const chartDataMap = new Map();

          predData.historical?.forEach((item: any) => {
            chartDataMap.set(item.year, {
              year: item.year,
              historical: item.value,
            });
          });

          predData.forecast?.forEach((item: any) => {
            const existing = chartDataMap.get(item.year) || { year: item.year };
            chartDataMap.set(item.year, {
              ...existing,
              forecast: item.value,
              range: [item.lower, item.upper]
            });
          });

          if (predData.historical?.length > 0 && predData.forecast?.length > 0) {
            const lastHist = predData.historical[predData.historical.length - 1];
            const existing = chartDataMap.get(lastHist.year) || { year: lastHist.year };
            chartDataMap.set(lastHist.year, {
              ...existing,
              forecast: lastHist.value,
              range: [lastHist.value, lastHist.value],
            });
          }

          const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.year - b.year);
          setPredictionData(chartData);
          setPredictionMetrics(predData.insights);
        }

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

  const renderCustomLegend = () => {
    const items = [
      {
        name: "Historical Employment Rate",
        color: "hsl(var(--primary))",
        icon: (
          <svg width="24" height="12" viewBox="0 0 24 12">
            <line x1="0" y1="6" x2="24" y2="6" stroke="hsl(var(--primary))" strokeWidth="3" />
            <circle cx="12" cy="6" r="4" fill="hsl(var(--primary))" />
          </svg>
        ),
      },
      {
        name: "Potential Range",
        color: "hsl(var(--chart-3))",
        icon: (
          <svg width="24" height="12" viewBox="0 0 24 12">
            <rect x="0" y="2" width="24" height="8" rx="2" fill="hsl(var(--chart-3))" opacity={0.4} />
          </svg>
        ),
      },
      {
        name: "Forecasted Employment Rate",
        color: "hsl(var(--chart-3))",
        icon: (
          <svg width="24" height="12" viewBox="0 0 24 12">
            <line x1="0" y1="6" x2="24" y2="6" stroke="hsl(var(--chart-3))" strokeWidth="3" strokeDasharray="5 5" />
            <circle cx="12" cy="6" r="4" fill="hsl(var(--chart-3))" />
          </svg>
        ),
      },
    ];

    return (
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginTop: "8px" }}>
        {items.map((item) => (
          <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            {item.icon}
            <span style={{ color: item.color }}>{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

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
              <Tabs defaultValue="programs" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="programs">Program View</TabsTrigger>
                  <TabsTrigger value="colleges">College View</TabsTrigger>
                </TabsList>

                <TabsContent value="programs" className="space-y-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold">Total Alumni per Program</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Details</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Program Distribution Details</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-6">
                      {programData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={360}>
                          <BarChart data={programData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="program" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                            <Legend />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Total Alumni" />
                            <Bar dataKey="employed" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} name="Employable Alumni" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                          No program data available
                        </div>
                      )}

                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-lg mb-3 pb-2 border-b">Legend Explanation</h4>
                          <ul className="space-y-3 text-sm text-muted-foreground list-none">
                            <li className="flex gap-2">
                              <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary"></span>
                              <span><strong className="text-foreground">Total Alumni:</strong> All alumni records under a program for the selected filters.</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-chart-3"></span>
                              <span><strong className="text-foreground">Employable Alumni:</strong> Alumni in the same program whose latest employability model result is positive.</span>
                            </li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-lg mb-3 pb-2 border-b">How To Read This</h4>
                          <p className="text-sm text-muted-foreground">
                            Larger gaps between total and employable bars indicate programs where more graduates still need readiness improvement before reaching positive employability outcomes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Compares the total number of registered alumni (green) against the number predicted as employable (teal) for each academic program.</p>
              {programData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={programData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="program" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Total" />
                    <Bar dataKey="employed" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} name="Employable" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                  No program data available
                </div>
              )}
                </TabsContent>

                <TabsContent value="colleges" className="space-y-3">
                  <div className="mb-1">
                    <h3 className="font-display font-semibold">All Colleges</h3>
                    <p className="text-xs text-muted-foreground">College-level summary across programs and alumni records.</p>
                  </div>
                  {collegeData.length > 0 ? (
                    <div className="max-h-[300px] overflow-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">College</th>
                            <th className="text-left p-3 font-semibold">Code</th>
                            <th className="text-right p-3 font-semibold">Programs</th>
                            <th className="text-right p-3 font-semibold">Alumni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {collegeData.map((college) => (
                            <tr key={college.id} className="border-b last:border-0">
                              <td className="p-3">{college.name}</td>
                              <td className="p-3">{college.code || '-'}</td>
                              <td className="p-3 text-right">{Number(college.program_count || 0).toLocaleString()}</td>
                              <td className="p-3 text-right">{Number(college.alumni_count || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                      No college data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold">Yearly Employment Trend</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Details</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Employment Rate Forecast Details</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      {predictionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <ComposedChart data={predictionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(tick) => `${Math.round(tick)}%`} />
                            <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} formatter={(value: number | [number, number], name: string) => {
                              if (name === "Potential Range" && Array.isArray(value)) return [`${value[0]}% - ${value[1]}%`, name];
                              return [`${value}%`, name];
                            }} />
                            <Legend content={renderCustomLegend} />
                            <Area type="monotone" dataKey="range" fill="hsl(var(--chart-3))" stroke="none" opacity={0.15} name="Potential Range" legendType="none" />
                            <Line type="monotone" dataKey="historical" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Historical Employment Rate" />
                            <Line type="monotone" dataKey="forecast" stroke="hsl(var(--chart-3))" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5, shape: "triangle" }} name="Forecasted Employment Rate" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                          No prediction data available
                        </div>
                      )}

                      {(() => {
                        if (!predictionData || predictionData.length === 0) return null;

                        const insights = predictionMetrics || {};
                        const trendDirection = insights.trend_direction || "Stable";
                        const growthExplanation = insights.growth_explanation || "The employment rate is projected to remain relatively stable.";
                        const biggestChangeText = insights.biggest_change_text || "Not enough data to calculate significant changes.";
                        const recentTrendText = insights.recent_trend_text || "Not enough historical data to determine a recent trend.";

                        return (
                          <div className="mt-8 space-y-8">
                            <div>
                              <h4 className="font-semibold text-lg mb-3 pb-2 border-b">Legend Explanation</h4>
                              <ul className="space-y-3 text-sm text-muted-foreground list-none">
                                <li className="flex gap-2">
                                  <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary"></span>
                                  <span><strong className="text-foreground">Historical Employment Rate:</strong> The actual, recorded employment percentage of alumni from past graduation batches.</span>
                                </li>
                                <li className="flex gap-2">
                                  <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-chart-3"></span>
                                  <span><strong className="text-foreground">Forecasted Employment Rate:</strong> The projected employment percentage for future batches, calculated using predictive models based on historical patterns.</span>
                                </li>
                                <li className="flex gap-2">
                                  <span className="mt-1 flex-shrink-0 w-2 h-2 bg-chart-3/20 border border-chart-3/50"></span>
                                  <span><strong className="text-foreground">Potential Range:</strong> The shaded area representing the 95% confidence interval. This highlights the most statistically probable range where the actual future employment rate will land.</span>
                                </li>
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold text-lg mb-4 pb-2 border-b">Key Takeaways</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-muted/30 p-5 rounded-xl border">
                                  <h5 className="font-semibold mb-3 text-primary flex items-center gap-2">
                                    Trend Insights
                                  </h5>
                                  <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li><strong className="text-foreground block mb-1">Trend Direction:</strong> {trendDirection}</li>
                                    <li><strong className="text-foreground block mb-1">Growth/Decline:</strong> {growthExplanation}</li>
                                  </ul>
                                </div>
                                
                                <div className="bg-muted/30 p-5 rounded-xl border">
                                  <h5 className="font-semibold mb-3 text-primary flex items-center gap-2">
                                    What Changed
                                  </h5>
                                  <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li><strong className="text-foreground block mb-1">Biggest Shift:</strong> {biggestChangeText}</li>
                                    <li><strong className="text-foreground block mb-1">Recent Trend:</strong> {recentTrendText}</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Tracks the expected and historical employment rate (%) of alumni. A rising trend indicates improving employability outcomes over time.</p>
              {predictionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={predictionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(tick) => `${Math.round(tick)}%`} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} formatter={(value: number | [number, number], name: string) => {
                      if (name === "Potential Range" && Array.isArray(value)) return [`${value[0]}% - ${value[1]}%`, name];
                      return [`${value}%`, name];
                    }} />
                    <Legend content={renderCustomLegend} />
                    <Line type="monotone" dataKey="historical" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Historical Employment Rate" />
                    <Area type="monotone" dataKey="range" fill="hsl(var(--chart-3))" stroke="none" opacity={0.15} name="Potential Range" legendType="none" />
                    <Line type="monotone" dataKey="forecast" stroke="hsl(var(--chart-3))" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5, shape: "triangle" }} name="Forecasted Employment Rate" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg border-dashed">
                  No prediction data available
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
