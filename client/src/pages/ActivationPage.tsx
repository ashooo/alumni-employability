import { GraduationCap, Loader2, CheckCircle2, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, type ClipboardEvent } from 'react';

const STEPS = ['Identity', 'Verification', 'Credentials', 'OTP Sent', 'Confirm OTP'];

// API URL - change this to your backend URL
const API_URL = 'http://localhost:5000/api';

export default function ActivationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'found' | 'not_found' | 'already'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [preferredEmailDomain, setPreferredEmailDomain] = useState<'plpasig.edu.ph' | 'gmail.com'>('gmail.com');

  const progress = ((step + 1) / STEPS.length) * 100;

  const passwordStrength = () => {
    if (password.length < 4) return { label: 'Weak', pct: 25, color: 'bg-destructive' };
    if (password.length < 8) return { label: 'Fair', pct: 50, color: 'bg-warning' };
    if (/[A-Z]/.test(password) && /\d/.test(password)) return { label: 'Strong', pct: 100, color: 'bg-success' };
    return { label: 'Good', pct: 75, color: 'bg-info' };
  };

  // Step 1: Verify if student exists in alumni_records
const handleVerify = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/auth/check-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        studentId, 
        firstName,
        lastName
      }),
    });

    const data = await response.json();

    if (data.status === 'found') {
      setVerifyStatus('found');
      // Auto-fill the name from the record if needed
      if (data.record) {
        setFirstName(data.record.firstName);
        setLastName(data.record.lastName);
        setPreferredEmailDomain(data.record.preferredEmailDomain === 'plpasig.edu.ph' ? 'plpasig.edu.ph' : 'gmail.com');
      }
      toast({
        title: 'Record Found',
        description: 'Alumni record verified successfully!'
      });
    } else if (data.status === 'already') {
      setVerifyStatus('already');
      toast({
        title: 'Account Already Exists',
        description: data.message || 'This student ID already has an account.',
        variant: 'destructive'
      });
    } else {
      setVerifyStatus('not_found');
      toast({
        title: 'Verification Failed',
        description: data.message || 'No matching record found.',
        variant: 'destructive'
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    toast({
      title: 'Verification Failed',
      description: 'Unable to verify student record. Please try again.',
      variant: 'destructive'
    });
    setVerifyStatus('not_found');
  } finally {
    setLoading(false);
  }
};

  // Step 2: Send OTP to email
  const handleSendOtp = async () => {
    setLoading(true);
    try {
      // Generate a random 6-digit OTP (in real app, this should be done on backend)
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(generatedOtp);
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      // Send OTP via email (you'll need to implement this on your backend)
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otp: generatedOtp,
          studentId 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEmailSuggestion('');
        setStep(3);
        startCooldown();
        toast({
          title: 'OTP Sent',
          description: `Verification code sent to ${maskedEmail}`,
        });
      } else {
        setEmailSuggestion(data.suggestion || '');
        toast({
          title: 'Failed to Send OTP',
          description: data.suggestion ? `${data.error} Use ${data.suggestion}.` : (data.error || 'Please try again later'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to Send OTP',
        description: 'Unable to send verification code. Please check your email.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP and create account
  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      // Verify OTP
      const enteredOtp = otp.join('');
      
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          otp: enteredOtp,
          email 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Now create the user account
        const registerResponse = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId,
            firstName,
            lastName,
            email,
            password
          }),
        });

        const registerData = await registerResponse.json();

        if (registerResponse.ok && registerData.success) {
          setEmailSuggestion('');
          setStep(4);
          toast({
            title: 'Account Activated!',
            description: 'Your account has been successfully created. You can now log in.',
          });
          
          // Clear sensitive data
          setPassword('');
          setConfirmPassword('');
          setOtp(['', '', '', '', '', '']);
        } else {
          setEmailSuggestion(registerData.suggestion || '');
          toast({
            title: 'Registration Failed',
            description: registerData.suggestion ? `${registerData.error} Use ${registerData.suggestion}.` : (registerData.error || 'Unable to create account'),
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Invalid OTP',
          description: 'The verification code you entered is incorrect',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Activation Failed',
        description: 'Unable to activate account. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown(p => { 
        if (p <= 1) { 
          clearInterval(timer); 
          return 0; 
        } 
        return p - 1; 
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      // Generate new OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(generatedOtp);
      
      await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp: generatedOtp }),
      });

      startCooldown();
      toast({
        title: 'OTP Resent',
        description: `New verification code sent to ${maskedEmail}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to Resend OTP',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) {
      const next = document.getElementById(`otp-${idx + 1}`);
      next?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    e.preventDefault();
    const nextOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) {
      nextOtp[i] = pasted[i];
    }
    setOtp(nextOtp);

    const focusIndex = Math.min(pasted.length, 5);
    const next = document.getElementById(`otp-${focusIndex}`);
    next?.focus();
  };

  const applyEmailSuggestion = () => {
    if (!emailSuggestion) return;
    setEmail(emailSuggestion);
    setEmailSuggestion('');
  };

  const applyPreferredDomain = () => {
    const current = email.trim();
    if (!current) return;
    const localPart = current.includes('@') ? current.split('@')[0] : current;
    if (!localPart) return;
    setEmail(`${localPart}@${preferredEmailDomain}`);
  };

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  const isValidEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const emailPlaceholder = preferredEmailDomain === 'plpasig.edu.ph' ? 'Juan@plpasig.edu.ph' : 'Juan@gmail.com';

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="studentId">Student ID Number</Label>
              <Input 
                id="studentId"
                placeholder="e.g. 24-00100" 
                value={studentId} 
                onChange={e => setStudentId(e.target.value)} 
                className="mt-1.5" 
              />
            </div>
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName"
                placeholder="Juan" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                className="mt-1.5" 
              />
            </div>
            <div>
              <Label htmlFor="firstName">Last Name</Label>
              <Input 
                id="lastName"
                placeholder="Dela Cruz" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                className="mt-1.5" 
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate('/login')}>Cancel</Button>
              <Button 
                className="flex-1" 
                disabled={!studentId || !firstName || !lastName} 
                onClick={() => { 
                  setStep(1); 
                  handleVerify(); 
                }}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            {loading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-3">Checking alumni record…</p>
              </div>
            )}
            
            {!loading && verifyStatus === 'found' && (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="font-semibold text-lg">Alumni Record Found!</p>
                <p className="text-muted-foreground text-sm mt-1">Welcome, {firstName} {lastName}. Proceed to set up your account.</p>
                <Button className="mt-6 w-full" onClick={() => setStep(2)}>
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {!loading && verifyStatus === 'not_found' && (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">❌</span>
                </div>
                <p className="font-semibold text-lg">Record Not Found</p>
                <p className="text-muted-foreground text-sm mt-1">
                  No alumni record matches your Student ID. Please contact the registrar office.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => { setStep(0); setVerifyStatus('idle'); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
                </Button>
              </div>
            )}

            {!loading && verifyStatus === 'already' && (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="font-semibold text-lg">Already Activated</p>
                <p className="text-muted-foreground text-sm mt-1">
                  This student ID has an existing account. Please log in instead.
                </p>
                <Button className="mt-6" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Personal Email</Label>
              <Input 
                id="email"
                type="email" 
                placeholder={emailPlaceholder}
                value={email} 
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailSuggestion) setEmailSuggestion('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Tab' && emailSuggestion) {
                    e.preventDefault();
                    applyEmailSuggestion();
                  }
                }}
                className="mt-1.5" 
              />
              <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium text-foreground">
                  {preferredEmailDomain === 'plpasig.edu.ph'
                    ? 'School record found!:    '
                    : 'No school email record'}
                  <button
                  type="button"
                  onClick={applyPreferredDomain}
                  className="mt-2 inline-flex text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                   Use @{preferredEmailDomain}
                </button>
                </p>
                
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {preferredEmailDomain === 'plpasig.edu.ph'
                    ? 'Click the use button to use the school domain for faster verification.'
                    : 'Click the use button to use the personal Gmail address for activation.'}
                </p>
                
              </div>
              {emailSuggestion && (
                <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm">
                  Did you mean{' '}
                  <button
                    type="button"
                    onClick={applyEmailSuggestion}
                    className="font-semibold text-amber-950 underline underline-offset-2 transition-colors hover:text-amber-700"
                  >
                    {emailSuggestion}
                  </button>
                  ? Press `Tab` or click to apply.
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input 
                  id="password"
                  type={showPw ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Create password" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPw(!showPw)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${passwordStrength().color}`} 
                      style={{ width: `${passwordStrength().pct}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Strength: {passwordStrength().label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword"
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Re-enter password" 
                className="mt-1.5" 
              />
            </div>
            
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button 
                className="flex-1" 
                disabled={!isValidEmail || !password || password !== confirmPassword || password.length < 4} 

                onClick={handleSendOtp}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Send OTP <ArrowRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-muted/50 inline-block">
              <span className="text-3xl">📧</span>
            </div>
            
            <p className="font-semibold text-lg">OTP Sent!</p>
            <p className="text-muted-foreground text-sm">
              We've sent a verification code to <strong>{maskedEmail}</strong>
            </p>

            <div className="flex gap-2 justify-center my-6">
              {otp.map((d, i) => (
                <Input
                  key={i}
                  id={`otp-${i}`}
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-12 text-center text-lg font-bold"
                  disabled={loading}
                />
              ))}
            </div>

            <Button 
              className="w-full" 
              disabled={otp.some(d => !d) || loading} 
              onClick={handleVerifyOtp}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Activate'}
            </Button>

            <div className="flex justify-center gap-4 text-sm">
              <button 
                disabled={resendCooldown > 0 || loading} 
                onClick={handleResendOtp} 
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
              <button 
                onClick={() => setStep(2)} 
                className="text-muted-foreground hover:text-foreground"
              >
                Change email
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-6">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            </motion.div>
            
            <h3 className="text-2xl font-display font-bold mb-2">Account Activated!</h3>
            <p className="text-muted-foreground mb-8">
              Your account has been successfully activated. You can now log in.
            </p>
            
            <Button size="lg" className="w-full font-semibold" onClick={() => navigate('/login')}>
              Proceed to Login <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-lg"
      >
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display font-bold">Account Activation</span>
          </div>

          {step < 4 && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                {STEPS.map((s, i) => (
                  <span key={i} className={i <= step ? 'text-primary font-medium' : ''}>
                    {s}
                  </span>
                ))}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div 
              key={step} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.3 }}
            >
              {stepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-center mt-4">
          <button 
            onClick={() => navigate('/')} 
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}