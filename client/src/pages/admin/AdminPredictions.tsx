import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">ARIMA Employment Rate Forecast Performance</h1>
        <p className="text-muted-foreground text-sm">Evaluate predictive performance of the ARIMA model for alumni employment rates</p>
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

                <ForecastChart data={activeData} />
                {/* Metrics */}
                <MetricsTable metrics={activeData.metrics} />

                {/* ── Random Forest: Feature Importance ── */}
                {tab === 'rf' && predictionData.randomForest.featureImportance && (
                  <div className="mt-6">
                    <h4 className="font-display font-semibold mb-3">Feature Importance</h4>
                    {(() => {
                      const sortedFeatures = [...predictionData.randomForest.featureImportance].sort((a, b) => b.importance - a.importance);
                      const topFeature = sortedFeatures[0];
                      const secondFeature = sortedFeatures[1];
                      
                      return (
                        <>
                          <p className="text-xs text-muted-foreground mb-3">
                            <strong>{topFeature.feature}</strong> is identified as the most significant factor, 
                            accounting for {(topFeature.importance * 100).toFixed(0)}% of the model's predictive weight.
                          </p>
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
                            <p className="text-sm font-medium text-primary">📊 Key Driver Analysis</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              The model indicates that <strong>{topFeature.feature}</strong> and <strong>{secondFeature.feature}</strong> are 
                              the primary drivers of employment outcomes. Variations in these factors explain over 
                              {((topFeature.importance + secondFeature.importance) * 100).toFixed(0)}% of the predicted trends.
                            </p>
                          </div>
                        </>
                      );
                    })()}
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
