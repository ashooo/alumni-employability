import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { predictionData } from '@/data/mockData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function ArimaLegendExplanation() {
  return (
    <div className="mt-6 p-5 rounded-xl border border-border/50 bg-muted/30">
      <h4 className="font-semibold text-lg mb-3 pb-2 border-b">Legend Explanation</h4>
      <ul className="space-y-3 text-sm text-muted-foreground list-none">
        <li className="flex gap-3">
          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary"></span>
          <span><strong className="text-foreground">Actual Employment Rate:</strong> The true, historical employment percentage recorded for past graduation batches.</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary" style={{ opacity: 0.5 }}></span>
          <span><strong className="text-foreground">Predicted Rate:</strong> What the ARIMA model would have forecasted for those past years, used to measure its accuracy.</span>
        </li>
        <li className="flex gap-3">
          <span className="mt-1 flex-shrink-0 w-2 h-2 bg-primary/20 border border-primary/40"></span>
          <span><strong className="text-foreground">Potential Range:</strong> The 95% confidence interval. Shows the expected margin of error; narrower bands mean the model is more confident.</span>
        </li>
      </ul>
    </div>
  );
}

function ArimaErrorMetrics({ metrics }: { metrics: any }) {
  const mae = metrics.mae ?? 0;
  const rmse = metrics.rmse ?? 0;
  
  return (
    <div className="mt-6">
      <h4 className="font-semibold text-lg mb-4">Error Metrics</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-semibold text-primary">Mean Absolute Error (MAE)</h5>
            <span className="text-2xl font-bold font-display">{mae.toFixed(2)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">What it is:</strong> The average absolute difference between the predicted and actual employment rates.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong className="text-foreground">Purpose:</strong> Shows how far off the predictions are on average, in straightforward percentage points.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-semibold text-primary">Root Mean Sq. Error (RMSE)</h5>
            <span className="text-2xl font-bold font-display">{rmse.toFixed(2)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">What it is:</strong> A measure that penalizes larger errors more heavily than smaller ones.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong className="text-foreground">Purpose:</strong> Helps identify if the model occasionally makes severe mispredictions.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArimaPerformanceInsights({ data }: { data: any }) {
  const insights = data.insights;

  if (!insights) {
    return (
      <div className="mt-8 p-6 rounded-xl border border-dashed text-center">
        <p className="text-sm text-muted-foreground italic">Insights are only available when running against live database records.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h4 className="font-semibold text-lg mb-4">Error Insights</h4>
        <div className="bg-primary/5 p-5 rounded-xl border border-primary/10 space-y-4">
          <p className="text-sm text-foreground"><strong className="text-primary">MAE Takeaway:</strong> {insights.error_takeaway}</p>
          <p className="text-sm text-foreground"><strong className="text-primary">RMSE Takeaway:</strong> {insights.rmse_takeaway}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-4">Model Behavior Insight</h4>
        <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
          <p className="text-sm text-foreground">{insights.behavior}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-4">Performance Summary</h4>
        <div className="p-6 rounded-xl border-2 border-primary/20 bg-card text-center flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Overall Verdict</p>
          <h3 className={`text-3xl font-bold font-display ${insights.verdict_color}`}>{insights.verdict}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Based on the error metrics, this model is considered <strong>{insights.verdict.toLowerCase()}</strong> for forecasting future employment rates.
          </p>
        </div>
      </div>
    </div>
  );
}

function EvaluationChart({ data }: { data: typeof predictionData.arima }) {
  const combined = [
    ...data.historical.map(d => ({
      ...d,
      year: String(d.year),
      actual: d.value,
      predicted: (d as any).predicted,
      upper: (d as any).upper ?? null,
      lower: (d as any).lower ?? null,
      type: 'historical',
    }))
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

function getTrendIcon(data: typeof predictionData.arima) {
  const hist = [...data.historical].sort((a, b) => Number(a.year) - Number(b.year));
  if (hist.length < 2) return <Minus className="h-4 w-4" />;
  const delta = hist[hist.length - 1].value - hist[0].value;
  if (delta > 3) return <TrendingUp className="h-4 w-4 text-green-400" />;
  if (delta < -3) return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-yellow-400" />;
}

export default function ArimaTab() {
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

  const activeData = arimaData || predictionData.arima;

  return (
    <>
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
            {(() => {
              const hist = activeData.historical || [];
              const avg = hist.length > 0 ? (hist.reduce((sum, h) => sum + h.value, 0) / hist.length).toFixed(1) : "0";
              const startYear = hist.length > 0 ? hist[0].year : "";
              const endYear = hist.length > 0 ? hist[hist.length - 1].year : "";
              
              return (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This model analyzes <strong>past employment trends</strong> (averaging {avg}% between {startYear} and {endYear}) 
                  to predict future rates. It detects patterns like gradual increases, declines, or periods of stability 
                  across graduation years — then uses those patterns to estimate what the employment rate will look like in the coming years.
                </p>
              );
            })()}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Employment Trend &amp; Forecast</h3>
          {!loading && !fetchError && getTrendIcon(activeData)}
        </div>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Running ARIMA Model Generator...</p>
          </div>
        ) : (
          <>
            {fetchError && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                <p className="font-bold">Model Fetch Failed</p>
                <p>{fetchError}</p>
              </div>
            )}
            <EvaluationChart data={activeData} />
            <ArimaLegendExplanation />
            <ArimaErrorMetrics metrics={activeData.metrics} />
            <ArimaPerformanceInsights data={activeData} />
          </>
        )}
      </motion.div>
    </>
  );
}
