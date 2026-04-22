import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sliders, Target, TrendingUp, UserCheck, ShieldAlert, Loader2, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SimulationResult {
  employable: boolean;
  probability: number;
  label: string;
  confidence: number;
  model_type: string;
}

export default function ModelSimulator() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [degrees, setDegrees] = useState<{id: number, name: string}[]>([]);

  // Simulation inputs
  const [inputs, setInputs] = useState({
    Gender: 'Male',
    Age: 22,
    Degree: 'BS Information Technology',
    'Year Graduated': new Date().getFullYear(),
    CGPA: 1.5,
    'Average Prof Grade': 1.5,
    'Average Elec Grade': 1.5,
    'OJT Grade': 1.5,
    'Leadership POS': 'No',
    'Act Member POS': 'No',
    'Soft Skills Ave': 7.5,
    'Hard Skills Ave': 7.5
  });

  useEffect(() => {
    // Fetch degrees for the dropdown
    const fetchDegrees = async () => {
      try {
        const res = await fetch(`${API_URL}/prediction/degrees`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}` }
        });
        if (res.ok) setDegrees(await res.json());
      } catch (e) {
        console.error('Failed to fetch degrees', e);
      }
    };
    fetchDegrees();
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/prediction/employability/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelInput: inputs })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.prediction);
        toast({
          title: 'Simulation Complete',
          description: `Model predicted: ${data.prediction.label}`
        });
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Prediction failed');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInput = (key: string, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
            Employability Model Simulator
          </h1>
          <p className="text-muted-foreground">Test the AI prediction engine by adjusting profile parameters in real-time.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20">
          v1.0 Logistic Regression
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* INPUTS PANEL */}
        <Card className="xl:col-span-1 shadow-xl border-t-4 border-primary overflow-hidden glass-card">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sliders className="h-5 w-5" /> Profile Parameters
            </CardTitle>
            <CardDescription>Adjust variables to see how they impact employability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {/* Academic Data */}
            <div className="space-y-4">
               <h4 className="text-sm font-bold uppercase tracking-wider text-primary/70">Academic Background</h4>
               
               <div className="space-y-2">
                 <Label>Degree Program</Label>
                 <Select value={inputs.Degree} onValueChange={v => updateInput('Degree', v)}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {degrees.length > 0 ? degrees.map(d => (
                       <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                     )) : (
                       <SelectItem value="BS Information Technology">BS Information Technology</SelectItem>
                     )}
                   </SelectContent>
                 </Select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>CGPA (1.0 = Best, 5.0 = Fail)</Label>
                   <Slider 
                     min={1.0} max={5.0} step={0.01} 
                     value={[inputs.CGPA]} 
                     onValueChange={v => updateInput('CGPA', v[0])} 
                   />
                   <div className="text-right text-xs font-bold text-primary">{inputs.CGPA}</div>
                 </div>
                 <div className="space-y-2">
                   <Label>Prof Grade (1.0 = Best)</Label>
                   <Slider 
                     min={1.0} max={5.0} step={0.01} 
                     value={[inputs['Average Prof Grade']]} 
                     onValueChange={v => updateInput('Average Prof Grade', v[0])} 
                   />
                   <div className="text-right text-xs font-bold text-primary">{inputs['Average Prof Grade']}</div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Elective Grade (1.0 = Best)</Label>
                   <Slider 
                     min={1.0} max={5.0} step={0.01} 
                     value={[inputs['Average Elec Grade']]} 
                     onValueChange={v => updateInput('Average Elec Grade', v[0])} 
                   />
                   <div className="text-right text-xs font-bold text-primary">{inputs['Average Elec Grade']}</div>
                 </div>
                 <div className="space-y-2">
                   <Label>OJT Grade (1.0 = Best)</Label>
                   <Slider 
                     min={1.0} max={5.0} step={0.01} 
                     value={[inputs['OJT Grade']]} 
                     onValueChange={v => updateInput('OJT Grade', v[0])} 
                   />
                   <div className="text-right text-xs font-bold text-primary">{inputs['OJT Grade']}</div>
                 </div>
               </div>
            </div>

            {/* Participation */}
            <div className="space-y-4 pt-4 border-t">
               <h4 className="text-sm font-bold uppercase tracking-wider text-primary/70">Extracurriculars</h4>
               <div className="flex items-center justify-between">
                 <Label>Leadership Role</Label>
                 <Switch 
                  checked={inputs['Leadership POS'] === 'Yes'} 
                  onCheckedChange={v => updateInput('Leadership POS', v ? 'Yes' : 'No')} 
                 />
               </div>
               <div className="flex items-center justify-between">
                 <Label>Active Member</Label>
                 <Switch 
                  checked={inputs['Act Member POS'] === 'Yes'} 
                  onCheckedChange={v => updateInput('Act Member POS', v ? 'Yes' : 'No')} 
                 />
               </div>
            </div>

            {/* Skills */}
            <div className="space-y-4 pt-4 border-t">
               <h4 className="text-sm font-bold uppercase tracking-wider text-primary/70">Skill Proficiency (1-10)</h4>
               <div className="space-y-3">
                 <div className="flex justify-between items-end">
                   <Label>Hard Skills Average</Label>
                   <span className="text-xs font-black">{inputs['Hard Skills Ave']}</span>
                 </div>
                 <Slider 
                   min={1} max={10} step={0.1} 
                   value={[inputs['Hard Skills Ave']]} 
                   onValueChange={v => updateInput('Hard Skills Ave', v[0])} 
                 />
               </div>
               <div className="space-y-3">
                 <div className="flex justify-between items-end">
                   <Label>Soft Skills Average</Label>
                   <span className="text-xs font-black">{inputs['Soft Skills Ave']}</span>
                 </div>
                 <Slider 
                   min={1} max={10} step={0.1} 
                   value={[inputs['Soft Skills Ave']]} 
                   onValueChange={v => updateInput('Soft Skills Ave', v[0])} 
                 />
               </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 border-t">
            <Button className="w-full py-6 text-lg font-bold" onClick={handlePredict} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-5 w-5" /> Run Simulation
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* RESULTS PANEL */}
        <div className="xl:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-muted bg-muted/5"
              >
                <div className="p-4 rounded-full bg-muted/20 mb-4">
                  <RefreshCcw className="h-12 w-12 text-muted-foreground animate-spin-slow" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">Ready for Simulation</h3>
                <p className="text-muted-foreground max-w-sm">Adjust the profile parameters on the left and click "Run Simulation" to see the AI's verdict.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Result Header Card */}
                <Card className={`overflow-hidden shadow-2xl border-none ${result.employable ? 'bg-success/5' : 'bg-destructive/5'}`}>
                  <CardHeader className={`${result.employable ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'} p-8`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">Prediction Output</p>
                        <h2 className="text-5xl font-black font-display">{result.label}</h2>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                        {result.employable ? <UserCheck className="h-12 w-12" /> : <ShieldAlert className="h-12 w-12" />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Probability Gauge */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-bold">Readiness Probability</Label>
                          <span className="text-3xl font-black text-primary">{Math.round(result.probability * 100)}%</span>
                        </div>
                        <Progress value={result.probability * 100} className="h-4" />
                        <p className="text-sm text-muted-foreground">This score indicates the likelihood of the candidate being employed within 6 months based on historical data.</p>
                      </div>

                      {/* Model Confidence */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-bold">Model Confidence</Label>
                          <span className="text-3xl font-black text-primary">{Math.round(result.confidence * 100)}%</span>
                        </div>
                        <div className="flex gap-2">
                           {[1,2,3,4,5].map(i => (
                             <div key={i} className={`flex-1 h-3 rounded-full ${i <= (result.confidence * 5) ? 'bg-primary' : 'bg-muted'}`} />
                           ))}
                        </div>
                        <p className="text-sm text-muted-foreground">Reflects how certain the {result.model_type} algorithm is about this specific classification.</p>
                      </div>
                    </div>

                    <div className="pt-8 border-t space-y-6">
                       <h3 className="font-display font-bold text-xl flex items-center gap-2">
                         <TrendingUp className="h-6 w-6 text-primary" /> Why this prediction?
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-2xl bg-muted/30 space-y-1">
                            <span className="text-xs text-muted-foreground font-bold uppercase">Strongest Factor</span>
                            <p className="font-bold text-primary">CGPA ({inputs.CGPA})</p>
                            <p className="text-[10px] text-muted-foreground">Academic performance is a primary feature in the Logistic Regression model.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-muted/30 space-y-1">
                            <span className="text-xs text-muted-foreground font-bold uppercase">Skill Balance</span>
                            <p className="font-bold text-primary">High Soft Skills</p>
                            <p className="text-[10px] text-muted-foreground">Self-rated soft skills contribute significantly to the "Employable" label.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-muted/30 space-y-1">
                            <span className="text-xs text-muted-foreground font-bold uppercase">Experience</span>
                            <p className="font-bold text-primary">OJT Performance</p>
                            <p className="text-[10px] text-muted-foreground">Internship grades acts as a proxy for industry readiness in our dataset.</p>
                          </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 py-6" onClick={() => setResult(null)}>
                     Reset Simulator
                  </Button>
                  <Button className="flex-1 py-6" onClick={handlePredict}>
                     Re-run Prediction
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
