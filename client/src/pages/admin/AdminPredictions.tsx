import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { predictionData } from '@/data/mockData';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MetricsTable({ metrics, model }: { metrics: { mae: number; rmse: number; mape?: number; r2?: number }, model: string }) {
  const isArima = model === 'arima';

  if (isArima) {
    const mae = metrics.mae ?? 0;
    const rmse = metrics.rmse ?? 0;
    return (
      <div className="mt-6 space-y-3">
        <h4 className="font-display font-semibold text-sm">Model Accuracy</h4>
        <p className="text-xs text-muted-foreground mb-3">
          On average, predictions are within <span className="text-primary font-semibold">±{mae.toFixed(2)}%</span> of actual values.
          Lower numbers mean more accurate forecasts.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs font-semibold text-muted-foreground">MAE</p>
              <span title="Mean Absolute Error — the average gap between predicted and actual employment rates.">
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </span>
            </div>
            <p className="text-2xl font-bold font-display">{mae.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Average prediction error in %</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs font-semibold text-muted-foreground">RMSE</p>
              <span title="Root Mean Squared Error — penalises larger errors more. Lower is better.">
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </span>
            </div>
            <p className="text-2xl font-bold font-display">{rmse.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Penalises larger errors more</p>
          </div>
        </div>
      </div>
    );
  }

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
        <Legend />
        {/* Confidence band — rendered beneath the lines */}
        <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary) / 0.12)" name="Upper Bound" legendType="none" connectNulls />
        <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" name="Lower Bound" legendType="none" connectNulls />
        <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Actual Rate %" />
        <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeDasharray="5 5" strokeWidth={3} dot={{ r: 5 }} name="Predicted Rate %" connectNulls={true} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Auto-generate key insights from ARIMA data
function generateInsights(data: typeof predictionData.arima): string[] {
  const insights: string[] = [];
  const hist = [...data.historical].sort((a, b) => Number(a.year) - Number(b.year));
  const forecast = [...data.forecast].sort((a, b) => Number(a.year) - Number(b.year));

  if (hist.length < 2) return ['Insufficient historical data to generate insights.'];

  // Trend across historical years
  const first = hist[0].value;
  const last = hist[hist.length - 1].value;
  const overallChange = last - first;

  if (Math.abs(overallChange) < 3) {
    const startYear = hist[0].year;
    const endYear = hist[hist.length - 1].year;
    insights.push(`Employment rate remained relatively stable from ${startYear} to ${endYear}, hovering around ${last.toFixed(1)}%.`);
  } else if (overallChange < 0) {
    insights.push(`Employment rate declined by approximately ${Math.abs(overallChange).toFixed(1)}% from ${hist[0].year} to ${hist[hist.length - 1].year}.`);
  } else {
    insights.push(`Employment rate improved by approximately ${overallChange.toFixed(1)}% from ${hist[0].year} to ${hist[hist.length - 1].year}.`);
  }

  // Most recent year change
  if (hist.length >= 2) {
    const prev = hist[hist.length - 2];
    const curr = hist[hist.length - 1];
    const recentChange = curr.value - prev.value;
    if (Math.abs(recentChange) >= 1.5) {
      const direction = recentChange < 0 ? 'declined' : 'increased';
      insights.push(`A ${direction} of ${Math.abs(recentChange).toFixed(1)}% was observed in ${curr.year} compared to ${prev.year}.`);
    }
  }

  // Peak and lowest years
  const peakYear = hist.reduce((best, d) => d.value > best.value ? d : best, hist[0]);
  const lowYear = hist.reduce((best, d) => d.value < best.value ? d : best, hist[0]);
  if (peakYear.year !== lowYear.year) {
    insights.push(`Highest recorded rate: ${peakYear.value.toFixed(1)}% in ${peakYear.year}. Lowest: ${lowYear.value.toFixed(1)}% in ${lowYear.year}.`);
  }

  // Forecast summary
  if (forecast.length > 0) {
    const forecastFirst = forecast[0].value;
    const forecastLast = forecast[forecast.length - 1].value;
    const forecastDelta = forecastLast - forecastFirst;
    if (Math.abs(forecastDelta) < 2) {
      insights.push(`The forecast suggests a stable employment rate through ${forecast[forecast.length - 1].year}, with no major shifts expected.`);
    } else if (forecastDelta < 0) {
      insights.push(`Forecast indicates a gradual decline through ${forecast[forecast.length - 1].year}. Consider reviewing employability support programs.`);
    } else {
      insights.push(`Forecast projects a gradual improvement through ${forecast[forecast.length - 1].year}. Current trends appear positive.`);
    }
  }

  return insights;
}

function generateForecastInterpretation(data: typeof predictionData.arima): string {
  const forecast = [...data.forecast].sort((a, b) => Number(a.year) - Number(b.year));
  if (forecast.length === 0) return 'No forecast data available.';

  const first = forecast[0].value;
  const last = forecast[forecast.length - 1].value;
  const delta = last - first;
  const endYear = forecast[forecast.length - 1].year;

  if (Math.abs(delta) < 2) {
    return `The model suggests employment rates will remain stable over the next ${forecast.length} year${forecast.length > 1 ? 's' : ''}, with no major increases or declines expected through ${endYear}.`;
  } else if (delta < 0) {
    return `The model forecasts a gradual decline of about ${Math.abs(delta).toFixed(1)}% by ${endYear}. This warrants attention to employability initiatives for upcoming graduates.`;
  } else {
    return `The model forecasts a gradual improvement of about ${delta.toFixed(1)}% by ${endYear}. Current conditions appear to support continued graduate employability.`;
  }
}

function getTrendIcon(data: typeof predictionData.arima) {
  const hist = [...data.historical].sort((a, b) => Number(a.year) - Number(b.year));
  if (hist.length < 2) return <Minus className="h-4 w-4" />;
  const delta = hist[hist.length - 1].value - hist[0].value;
  if (delta > 3) return <TrendingUp className="h-4 w-4 text-green-400" />;
  if (delta < -3) return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-yellow-400" />;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Employment Forecast Models</h1>
        <p className="text-muted-foreground text-sm">Predict future employment rates using trained machine learning models</p>
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

          const isArima = tab === 'arima';
          const activeData = d as typeof predictionData.arima;

          return (
            <TabsContent key={tab} value={tab}>

              {/* ── ARIMA-only: What is ARIMA? ── */}
              {isArima && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-4 border-l-4 border-primary/60">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm mb-1">
                        What does this model do?{' '}
                        <span className="text-xs font-normal text-muted-foreground ml-1"
                          title="ARIMA = AutoRegressive Integrated Moving Average — a statistical time-series forecasting method">
                          (ARIMA <Info className="inline h-3 w-3 cursor-help" />)
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This model analyzes <strong>past employment trends</strong> to predict future rates. It detects patterns
                        like gradual increases, declines, or periods of stability across graduation years — then uses those
                        patterns to estimate what the employment rate will look like in the coming years.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">

                {/* Chart Header */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display font-semibold">Employment Trend &amp; Forecast</h3>
                  {!loading && !fetchError && isArima && arimaData && getTrendIcon(activeData)}
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
