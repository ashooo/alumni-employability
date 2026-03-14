import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId || !password) {
      setError('Please enter both User ID and Password.');
      return;
    }
    const result = await login(userId, password);
    if (result.success) {
      toast({ title: 'Login Successful', description: 'Welcome back!' });
      navigate('/app');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-primary-foreground max-w-md">
          <div className="p-3 rounded-2xl bg-primary-foreground/10 inline-block mb-8">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-display font-extrabold mb-4">Alumni Employability Tracer</h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">Track employment outcomes, predict career trends, and empower alumni with data-driven insights.</p>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <span className="font-display font-bold text-lg">Alumni Tracer</span>
          </div>

          <h2 className="text-2xl font-display font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input id="userId" placeholder="e.g. admin or 23-00240" value={userId} onChange={e => setUserId(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(!!c)} />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me</Label>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full font-semibold" size="lg" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/activate')} className="text-sm text-primary hover:underline font-medium">Don't have an account? Activate here</button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground">← Back to Home</button>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Demo Accounts:</p>
            <p className="text-xs text-muted-foreground">Admin: <code className="bg-muted px-1 rounded">admin</code> / <code className="bg-muted px-1 rounded">admin123</code></p>
            <p className="text-xs text-muted-foreground">Alumni: <code className="bg-muted px-1 rounded">23-00240</code> / <code className="bg-muted px-1 rounded">0000</code></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
