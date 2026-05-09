import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import LoadingScreen from '@/components/ui/loading-screen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Step = 'identify' | 'verify' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('identify');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((currentCooldown) => (currentCooldown > 0 ? currentCooldown - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleIdentify = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (response.ok) {
        setMaskedEmail(String(data.email || 'your email'));
        setStep('verify');
        setResendCooldown(30);
        toast({ title: 'Code Sent', description: data.message || 'OTP sent successfully.' });
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        setResendCooldown(Number(data.retryAfterSeconds));
      }

      toast({
        title: 'Error',
        description: data.error || 'Unable to send OTP.',
        variant: 'destructive'
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Connection failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading || resendCooldown > 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (response.ok) {
        setMaskedEmail(String(data.email || maskedEmail || 'your email'));
        setResendCooldown(30);
        toast({ title: 'Code Resent', description: data.message || 'OTP resent successfully.' });
        return;
      }

      if (response.status === 429 && data.retryAfterSeconds) {
        setResendCooldown(Number(data.retryAfterSeconds));
      }

      toast({
        title: 'Error',
        description: data.error || 'Unable to resend OTP.',
        variant: 'destructive'
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Connection failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();

    if (otp.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit code.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp })
      });

      const data = await response.json();

      if (response.ok) {
        setStep('reset');
        toast({ title: 'Verified', description: data.message || 'OTP verified successfully.' });
        return;
      }

      toast({
        title: 'Invalid Code',
        description: data.error || 'OTP verification failed.',
        variant: 'destructive'
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Connection failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: 'Too Short',
        description: 'Password must be at least 4 characters.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
        return;
      }

      toast({
        title: 'Error',
        description: data.error || 'Unable to reset password.',
        variant: 'destructive'
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Connection failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const stepMotion = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {loading && <LoadingScreen message={step === 'identify' ? 'Finding your account...' : step === 'verify' ? 'Verifying code...' : 'Resetting password...'} />}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="inline-block rounded-2xl bg-primary/10 p-3 mb-4">
            <KeyRound className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold">Forgot Password</h1>
          <p className="mt-2 text-muted-foreground">
            {step === 'identify' && 'Enter your user ID to find your account'}
            {step === 'verify' && `Enter the code sent to ${maskedEmail}`}
            {step === 'reset' && 'Create a secure new password'}
            {step === 'success' && 'Your password has been reset'}
          </p>
        </div>

        <div className="glass-card p-8 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 'identify' && (
              <motion.form
                key="identify"
                variants={stepMotion}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleIdentify}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">User ID</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="e.g. 23-00240"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Find My Account
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back to Login
                </button>
              </motion.form>
            )}

            {step === 'verify' && (
              <motion.form
                key="verify"
                variants={stepMotion}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleVerify}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      className="pl-10 text-center font-mono text-lg tracking-[0.5em]"
                      required
                    />
                  </div>
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    Didn&apos;t receive it?{' '}
                    <button
                      type="button"
                      onClick={() => void handleResend()}
                      className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                      disabled={loading || resendCooldown > 0}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={otp.length !== 6 || loading}
                >
                  Verify Code
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('identify');
                    setOtp('');
                  }}
                  className="w-full flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Change User ID
                </button>
              </motion.form>
            )}

            {step === 'reset' && (
              <motion.form
                key="reset"
                variants={stepMotion}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleReset}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((currentValue) => !currentValue)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  Reset Password
                </Button>
              </motion.form>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                variants={stepMotion}
                initial="initial"
                animate="animate"
                className="space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-success" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold">Reset Successful</h3>
                  <p className="text-muted-foreground">
                    Your password has been updated. You can now log in with your new password.
                  </p>
                </div>

                <Button onClick={() => navigate('/login')} className="w-full" size="lg">
                  Proceed to Login
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
