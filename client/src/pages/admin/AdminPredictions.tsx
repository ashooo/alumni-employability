import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, BarChart, Bar, ComposedChart } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { predictionData } from '@/data/mockData';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

function MetricsTable({ metrics, model }: { metrics: { mae: number; rmse: number; mape?: number; r2?: number }, model: string }) {
  const metricsList = [
    { label: 'MAE', value: metrics.mae },
    { label: 'RMSE', value: metrics.rmse },
    { label: 'MAPE', value: `${metrics.mape}%` },
    { label: 'R²', value: metrics.r2 },
  ];

  const displayMetrics = model === 'arima'
    ? metricsList.filter(m => m.label === 'MAE' || m.label === 'RMSE')
    : metricsList;

  return (
    <div className={`grid grid-cols-2 ${displayMetrics.length > 2 ? 'md:grid-cols-4' : ''} gap-4 mt-4`}>
      {displayMetrics.map(m => (
        <div key={m.label} className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{m.label}</p>
          <p className="text-lg font-bold font-display">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

function ForecastChart({ data }: { data: typeof predictionData.arima }) {
  const combined = [
    ...data.historical.map(d => ({ ...d, year: String(d.year), actual: d.value, predicted: (d as any).predicted, type: 'historical' })),
    ...data.forecast.map(d => ({ ...d, year: String(d.year), predicted: d.value, type: 'forecast' })),
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={combined}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
        <Legend />
        <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary) / 0.1)" name="Upper Bound" />
        <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" name="Lower Bound" />
        <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Actual Rate %" />
        <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeDasharray="5 5" strokeWidth={3} dot={{ r: 5 }} name="Predicted Rate %" connectNulls={true} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function AdminPredictions() {
  const [arimaData, setArimaData] = useState<typeof predictionData.arima | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
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
    
    fetchPrediction();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Prediction Models</h1>
        <p className="text-muted-foreground text-sm">Forecast employment rates using multiple ML models</p>
      </div>

      <Tabs defaultValue="arima">
        <TabsList className="mb-4">
          <TabsTrigger value="arima">ARIMA</TabsTrigger>
          <TabsTrigger value="linear">Linear Regression</TabsTrigger>
          <TabsTrigger value="rf">Random Forest</TabsTrigger>
        </TabsList>

        {(['arima', 'linear', 'rf'] as const).map(tab => {
          const key = tab === 'rf' ? 'randomForest' : tab;
          let d = predictionData[key as keyof typeof predictionData];
          
          if (tab === 'arima' && arimaData) {
            d = arimaData as any;
          }

          return (
            <TabsContent key={tab} value={tab}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Forecast Visualization</h3>
                {tab === 'arima' && loading ? (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground animate-pulse">Running ARIMA Model Generator...</p>
                  </div>
                ) : (
                  <>
                    {tab === 'arima' && fetchError && (
                      <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                        <p className="font-bold">Model Fetch Failed</p>
                        <p>{fetchError}</p>
                      </div>
                    )}
                    <ForecastChart data={d as typeof predictionData.arima} />
                    <MetricsTable metrics={(d as typeof predictionData.arima).metrics} model={tab} />
                  </>
                )}

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
