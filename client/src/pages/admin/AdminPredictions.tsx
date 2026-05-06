import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { predictionData } from '@/data/mockData';
import { motion } from 'framer-motion';
import ArimaTab from './prediction_tabs/ArimaTab';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MetricsTable({ metrics }: { metrics: { mae: number; rmse: number; mape?: number; r2?: number } }) {
  const metricsList = [
    { label: 'MAE', value: metrics.mae, desc: 'Avg error in %' },
    { label: 'RMSE', value: metrics.rmse, desc: 'Penalises large errors' },
    { label: 'MAPE', value: `${metrics.mape}%`, desc: 'Avg % error' },
    { label: 'R²', value: metrics.r2, desc: 'Fit quality (1 = perfect)' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {metricsList.map(m => (
        <div key={m.label} className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{m.label}</p>
          <p className="text-lg font-bold font-display">{m.value}</p>
          <p className="text-xs text-muted-foreground">{m.desc}</p>
        </div>
      ))}
    </div>
  );
}


const renderCustomLegend = () => {
  const items = [
    {
      name: "Actual Employment Rate",
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
      color: "hsl(var(--primary))",
      icon: (
        <svg width="24" height="12" viewBox="0 0 24 12">
          <rect x="0" y="2" width="24" height="8" rx="2" fill="hsl(var(--primary))" opacity={0.15} />
        </svg>
      ),
    },
    {
      name: "Predicted Rate",
      color: "hsl(var(--primary))",
      icon: (
        <svg width="24" height="12" viewBox="0 0 24 12">
          <line x1="0" y1="6" x2="24" y2="6" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="5 5" />
          <circle cx="12" cy="6" r="4" fill="hsl(var(--primary))" />
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


function ForecastChart({ data }: { data: typeof predictionData.arima }) {
  const combined = [
    ...data.historical.map(d => ({
      ...d,
      year: String(d.year),
      actual: d.value,
      predicted: (d as any).predicted,
      upper: (d as any).upper ?? null,
      lower: (d as any).lower ?? null,
      type: 'historical',
    })),
    ...data.forecast.map(d => ({
      ...d,
      year: String(d.year),
      predicted: d.value,
      upper: (d as any).upper ?? null,
      lower: (d as any).lower ?? null,
      type: 'forecast',
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={combined}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis domain={[20, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
          formatter={(value: number, name: string) => [`${Number(value).toFixed(2)}%`, name]}
        />
        <Legend content={renderCustomLegend} />
        {/* Confidence band — rendered beneath the lines */}
        <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary) / 0.12)" name="Upper Bound" legendType="none" connectNulls />
        <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" name="Lower Bound" legendType="none" connectNulls />
        <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Actual Rate %" />
        <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeDasharray="5 5" strokeWidth={3} dot={{ r: 5 }} name="Predicted Rate %" connectNulls={true} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Legacy insights generators removed


// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminPredictions() {
  const [arimaData, setArimaData] = useState<typeof predictionData.arima | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRerunning, setIsRerunning] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/predictions/arima', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setArimaData(data);
      } else {
        setFetchError(data.error || 'Server returned an error status: ' + res.status);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Network fetch failed');
      console.error('Failed to fetch ARIMA predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const rerunArima = async () => {
    try {
      setIsRerunning(true);
      setFetchError(null);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/predictions/arima/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setFetchError(data.error || 'Failed to re-run ARIMA model.');
        return;
      }
      await fetchPrediction();
    } catch (err: any) {
      setFetchError(err.message || 'Failed to re-run ARIMA model.');
    } finally {
      setIsRerunning(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Employment Forecast Models</h1>
        <p className="text-muted-foreground text-sm">Predict future employment rates using trained machine learning models</p>
        <div className="mt-3">
          <Button onClick={rerunArima} disabled={isRerunning || loading}>
            {isRerunning ? 'Re-running ARIMA...' : 'Re-run ARIMA Model'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="arima">
        <TabsList className="mb-4">
          <TabsTrigger value="arima">ARIMA</TabsTrigger>
        </TabsList>

        <TabsContent value="arima">
          <ArimaTab />
        </TabsContent>

        {(['linear', 'rf'] as const).map(tab => {
          const key = tab === 'rf' ? 'randomForest' : tab;
          const activeData = predictionData[key as keyof typeof predictionData] as typeof predictionData.arima;

          return (
            <TabsContent key={tab} value={tab}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold">Employment Trend &amp; Forecast</h3>
                </div>

                {/* How to Read This Chart */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block w-6 h-0.5 bg-primary rounded" /> Actual Rate
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block w-6 border-t-2 border-dashed border-primary" /> Predicted Rate
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block w-5 h-3 bg-primary/15 rounded-sm border border-primary/20" /> Confidence Range
                  </span>
                  <span className="text-xs text-muted-foreground">X-axis: Year &nbsp;|&nbsp; Y-axis: Employment Rate (%)</span>
                </div>

                {tab === 'arima' && loading ? (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground animate-pulse">Loading trained ARIMA output...</p>
                  </div>
                ) : (
                  <>
                    {tab === 'arima' && fetchError && (
                      <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                        <p className="font-bold">Model Fetch Failed</p>
                        <p>{fetchError}</p>
                      </div>
                    )}

                    <ForecastChart data={activeData} />

                    {/* Metrics */}
                    <MetricsTable metrics={activeData.metrics} model={tab} />

                    {/* ── ARIMA-only: Key Insights ── */}
                    {isArima && !fetchError && (
                      <div className="mt-6 p-4 rounded-lg bg-muted/40 border border-border/50">
                        <p className="text-sm font-semibold mb-2">Key Insights</p>
                        <ul className="space-y-1.5">
                          {generateInsights(activeData).map((insight, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ── ARIMA-only: Forecast Interpretation ── */}
                    {isArima && !fetchError && activeData.forecast?.length > 0 && (
                      <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/15">
                        <p className="text-sm font-medium text-primary mb-1">Forecast Interpretation</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {generateForecastInterpretation(activeData)}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-2 italic">
                          The shaded band represents the model's confidence range — wider bands in future years reflect
                          increasing uncertainty, which is normal for any time-series forecast.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* ── Random Forest: Feature Importance ── */}
                {tab === 'rf' && predictionData.randomForest.featureImportance && (
                  <div className="mt-6">
                    <h4 className="font-display font-semibold mb-3">Feature Importance</h4>
                    <p className="text-xs text-muted-foreground mb-3">Gender is identified as a significant factor affecting employment rate predictions.</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={predictionData.randomForest.featureImportance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="feature" tick={{ fontSize: 12 }} width={100} />
                        <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-sm font-medium text-primary">📊 Gender Impact Analysis</p>
                      <p className="text-xs text-muted-foreground mt-1">Gender accounts for approximately 12% of employment rate variance. Female graduates show a consistently higher employment rate (+3-4%) across all programs and years studied.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
