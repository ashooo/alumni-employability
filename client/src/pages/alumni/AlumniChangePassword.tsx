import { Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AlumniChangePassword() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const { toast } = useToast();

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const strength = () => {
    if (newPw.length < 4) return { label: 'Weak', pct: 25, color: 'bg-destructive' };
    if (newPw.length < 8) return { label: 'Fair', pct: 50, color: 'bg-warning' };
    if (/[A-Z]/.test(newPw) && /\d/.test(newPw)) return { label: 'Strong', pct: 100, color: 'bg-success' };
    return { label: 'Good', pct: 75, color: 'bg-info' };
  };

  const requestOtp = async () => {
    const token = getToken();
    if (!token) {
      toast({ title: 'Not logged in', description: 'Please log in again, then change your password.', variant: 'destructive' });
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password/request-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const raw = await res.text();
      const data = (() => {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
      })();

      if (!res.ok) {
        const details = (data as any)?.error || (raw ? raw.slice(0, 200) : '');
        throw new Error(details ? `${details}` : `Request failed (${res.status})`);
      }

      setOtpSent(true);
      setOtp('');
      toast({ title: 'OTP sent', description: (data as any)?.message || 'We sent an OTP to your account email.' });
    } catch (err) {
      toast({ title: 'OTP failed', description: err instanceof Error ? err.message : 'Failed to send OTP', variant: 'destructive' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirm) { toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' }); return; }
    if (newPw.length < 4) { toast({ title: 'Error', description: 'Password too short', variant: 'destructive' }); return; }
    if (!otpSent) { toast({ title: 'OTP required', description: 'Please request an OTP to your email first.', variant: 'destructive' }); return; }
    if (otp.trim().length !== 6) { toast({ title: 'OTP required', description: 'Please enter the 6-digit OTP sent to your email.', variant: 'destructive' }); return; }

    const token = getToken();
    if (!token) {
      toast({ title: 'Not logged in', description: 'Please log in again, then change your password.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: newPw,
          otp
        })
      });

      const raw = await res.text();
      const data = (() => {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
      })();

      if (!res.ok) {
        const details = (data as any)?.error || (raw ? raw.slice(0, 200) : '');
        throw new Error(details ? `${details}` : `Request failed (${res.status})`);
      }

      toast({ title: 'Password Changed', description: (data as any)?.message || 'Your password has been updated successfully.' });
      setCurrent(''); setNewPw(''); setConfirm(''); setOtp(''); setOtpSent(false);
    } catch (err) {
      toast({
        title: 'Change failed',
        description: err instanceof Error ? err.message : 'Failed to change password',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Change Password</h1>
        <p className="text-muted-foreground text-sm">Update your account password</p>
      </div>

      <form id="change-password-form" onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div>
          <Label>Current Password</Label>
          <div className="relative mt-1.5">
            <Input type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label>New Password</Label>
          <div className="relative mt-1.5">
            <Input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPw && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${strength().color}`} style={{ width: `${strength().pct}%` }} /></div>
              <p className="text-xs text-muted-foreground mt-1">Strength: {strength().label}</p>
            </div>
          )}
        </div>
        <div>
          <Label>Confirm New Password</Label>
          <Input
            type="password"
            value={confirm}
            onChange={e => {
              setConfirm(e.target.value);
            }}
            onBlur={() => {
              // Let users finish typing first; then offer the OTP popup.
              if (confirm.trim().length > 0) setShowSecurityDialog(true);
            }}
            className="mt-1.5"
          />
          {confirm && newPw !== confirm && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Next step: verify with an OTP sent to your email.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSecurityDialog(true)}>
              Open verification
            </Button>
          </div>
        </div>

        <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
          <DialogContent className="sm:max-w-md" aria-describedby="change-password-otp-description">
            <DialogHeader>
              <DialogTitle className="font-display">Verify password change</DialogTitle>
              <DialogDescription id="change-password-otp-description">
                We’ll send a 6-digit OTP to your account email. Enter it below to confirm updating your password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="secondary" onClick={requestOtp} disabled={otpSending}>
                  {otpSending ? 'Sending OTP...' : 'Send OTP to my email'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setOtp(''); setOtpSent(false); }}>
                  Reset OTP
                </Button>
              </div>

              <div className="space-y-2">
                <Label>OTP (6 digits)</Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  containerClassName="justify-start"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {!otpSent ? (
                  <p className="text-xs text-muted-foreground">Click “Send OTP to my email” first.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">OTP sent. Check your inbox/spam folder.</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowSecurityDialog(false)}>
                Not now
              </Button>
              <Button type="submit" form="change-password-form" className="gap-1" disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </div>
  );
}
