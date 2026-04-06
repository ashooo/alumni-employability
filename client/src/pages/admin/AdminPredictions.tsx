import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, BarChart, Bar } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { predictionData } from '@/data/mockData';
import { motion } from 'framer-motion';
import { useState } from 'react';

function MetricsTable({ metrics }: { metrics: { mae: number; rmse: number; mape: number; r2: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {[
        { label: 'MAE', value: metrics.mae },
        { label: 'RMSE', value: metrics.rmse },
        { label: 'MAPE', value: `${metrics.mape}%` },
        { label: 'R²', value: metrics.r2 },
      ].map(m => (
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
    ...data.historical.map(d => ({ ...d, type: 'historical' })),
    ...data.forecast.map(d => ({ ...d, type: 'forecast' })),
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={combined}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
        <Legend />
        <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary) / 0.1)" name="Upper Bound" />
        <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" name="Lower Bound" />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name="Employment Rate %" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function AdminPredictions() {
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
          const d = predictionData[key as keyof typeof predictionData];
          return (
            <TabsContent key={tab} value={tab}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold mb-4">Forecast Visualization</h3>
                <ForecastChart data={d as typeof predictionData.arima} />
                <MetricsTable metrics={(d as typeof predictionData.arima).metrics} />

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
