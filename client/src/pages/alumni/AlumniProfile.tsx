import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Building2, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ProfileData {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  email: string;
  phone: string;
  address: string;
  programId: number;
  programName: string;
  programCode: string;
  collegeId: number;
  collegeName: string;
  collegeCode: string;
  batch: number;
  employmentStatus: string;
  company: string;
  position: string;
  industry: string;
  employmentStartDate?: string;
  monthlyIncome?: string;
}

interface EmploymentRecord {
  id?: number;
  status: string;
  company: string;
  position: string;
  industry: string;
  start_date: string;
  monthly_income?: string;
}

interface Program {
  id: number;
  name: string;
  code: string;
  college_id: number;
  college_name?: string;
}

export default function AlumniProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpVerifying, setEmailOtpVerifying] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [originalEmail, setOriginalEmail] = useState('');
  const [emailOtpSentTo, setEmailOtpSentTo] = useState<string | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailVerifiedFor, setEmailVerifiedFor] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    email: '',
    phone: '',
    address: '',
    programId: 0,
    programName: '',
    programCode: '',
    collegeId: 0,
    collegeName: '',
    collegeCode: '',
    batch: new Date().getFullYear(),
    employmentStatus: 'Unemployed',
    company: '',
    position: '',
    industry: '',
    employmentStartDate: '',
    monthlyIncome: '',
  });

  // Get token from storage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // Fetch programs list
  const fetchPrograms = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/programs/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPrograms(data);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  // Fetch alumni profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.username) return;
      
      setLoading(true);
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/alumni/profile/${user.username}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Fetch employment records
          const employmentResponse = await fetch(`${API_URL}/alumni/employment/${user.username}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          let employmentData = null;
          if (employmentResponse.ok) {
            const empData = await employmentResponse.json();
            employmentData = empData[0];
          }

          setProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            middleName: data.middle_name || '',
            suffix: data.suffix || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            programId: data.program_id || 0,
            programName: data.program_name || '',
            programCode: data.program_code || '',
            collegeId: data.college_id || 0,
            collegeName: data.college_name || '',
            collegeCode: data.college_code || '',
            batch: data.batch_year || new Date().getFullYear(),
            employmentStatus: employmentData?.status || 'Unemployed',
            company: employmentData?.company || '',
            position: employmentData?.position || '',
            industry: employmentData?.industry || '',
            employmentStartDate: employmentData?.start_date || '',
            monthlyIncome: employmentData?.monthly_income || '',
          });

          const loadedEmail = (data.email || '').trim();
          setOriginalEmail(loadedEmail);
          setEmailOtpSentTo(null);
          setEmailOtpCode('');
          setEmailVerifiedFor(null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    fetchPrograms();
  }, [user]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();

      const currentEmail = (profile.email || '').trim();
      const emailChanged = currentEmail !== (originalEmail || '').trim();
      if (emailChanged && emailVerifiedFor !== currentEmail) {
        toast({
          title: 'Email change not verified',
          description: 'Please verify your new email with the OTP before saving.',
          variant: 'destructive'
        });
        return;
      }
      
      // Update contact info
      const contactResponse = await fetch(`${API_URL}/alumni/profile/${user?.username}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Email is updated via OTP endpoint (only include if unchanged)
          email: emailChanged ? originalEmail : currentEmail,
          phone: profile.phone,
          address: profile.address
        })
      });

      if (!contactResponse.ok) {
        throw new Error('Failed to update contact information');
      }

      // Update or create employment record
      const employmentResponse = await fetch(`${API_URL}/alumni/employment/${user?.username}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: profile.employmentStatus,
          company: profile.company,
          position: profile.position,
          industry: profile.industry,
          start_date: profile.employmentStartDate || new Date().toISOString().split('T')[0],
          monthly_income: profile.monthlyIncome
        })
      });

      if (!employmentResponse.ok) {
        throw new Error('Failed to update employment information');
      }

      toast({ 
        title: 'Profile Updated', 
        description: 'Your profile has been saved successfully.' 
      });

      if (emailChanged) {
        setOriginalEmail(currentEmail);
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile changes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const requestEmailOtp = async () => {
    const newEmail = (profile.email || '').trim();
    if (!newEmail) {
      toast({ title: 'Missing email', description: 'Please enter your new email first.', variant: 'destructive' });
      return;
    }

    setEmailOtpSending(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/alumni/profile/${user?.username}/email/request-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newEmail })
      });

      const raw = await res.text();
      const data = (() => {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
      })();
      if (!res.ok) {
        const serverError = (data as any)?.error;
        const details = serverError || (raw ? raw.slice(0, 200) : '');
        throw new Error(details ? `Failed to send OTP (${res.status}): ${details}` : `Failed to send OTP (${res.status})`);
      }

      setEmailOtpSentTo(newEmail);
      setEmailOtpCode('');
      setEmailVerifiedFor(null);
      toast({ title: 'OTP sent', description: 'We sent an OTP to your new email. Enter it below to confirm.' });
    } catch (e) {
      toast({ title: 'OTP failed', description: e instanceof Error ? e.message : 'Failed to send OTP', variant: 'destructive' });
    } finally {
      setEmailOtpSending(false);
    }
  };

  const verifyEmailOtp = async () => {
    const newEmail = (profile.email || '').trim();
    const otp = (emailOtpCode || '').trim();

    if (!newEmail || !otp) {
      toast({ title: 'Missing details', description: 'Please enter the new email and OTP.', variant: 'destructive' });
      return;
    }

    setEmailOtpVerifying(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/alumni/profile/${user?.username}/email/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newEmail, otp })
      });

      const raw = await res.text();
      const data = (() => {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
      })();
      if (!res.ok) {
        const serverError = (data as any)?.error;
        const details = serverError || (raw ? raw.slice(0, 200) : '');
        throw new Error(details ? `OTP verification failed (${res.status}): ${details}` : `OTP verification failed (${res.status})`);
      }

      setEmailVerifiedFor(newEmail);
      setOriginalEmail(newEmail);
      toast({ title: 'Email verified', description: 'Your email was updated successfully.' });
    } catch (e) {
      toast({ title: 'Invalid OTP', description: e instanceof Error ? e.message : 'OTP verification failed', variant: 'destructive' });
    } finally {
      setEmailOtpVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">My Profile</h1>
          <p className="text-muted-foreground text-sm">View and update your personal information</p>
        </div>
        <Button onClick={handleSave} className="gap-1" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Information */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-semibold">Academic Information</h3>
          
          <div>
            <Label>Student ID</Label>
            <Input 
              className="mt-1.5 bg-muted" 
              value={user?.username || ''} 
              disabled 
            />
          </div>
          
          <div>
            <Label>Full Name</Label>
            <Input 
              className="mt-1.5 bg-muted" 
              value={`${profile.firstName} ${profile.middleName || ''} ${profile.lastName} ${profile.suffix || ''}`.trim()} 
              disabled 
            />
          </div>

          {/* College Information - Now stacked vertically */}
          <div className="space-y-3">
            <div>
              <Label>College</Label>
              <div className="mt-1.5 p-3 bg-muted rounded-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">{profile.collegeName || 'Not specified'}</span>
                {profile.collegeCode && (
                  <Badge variant="outline" className="text-xs">
                    {profile.collegeCode}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <Label>Program</Label>
              <div className="mt-1.5 p-3 bg-muted rounded-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">{profile.programName || 'Not specified'}</span>
                {profile.programCode && (
                  <Badge variant="outline" className="text-xs">
                    {profile.programCode}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Batch Year</Label>
            <Input 
              className="mt-1.5 bg-muted" 
              value={profile.batch} 
              disabled 
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-display font-semibold">Contact Information</h3>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              className="mt-1.5" 
              value={profile.email} 
              onChange={e => {
                const next = e.target.value;
                setProfile({ ...profile, email: next });
                setEmailOtpCode('');
                setEmailVerifiedFor(null);
                setEmailOtpSentTo(null);
              }}
              placeholder="your@email.com"
            />

            {((profile.email || '').trim() !== (originalEmail || '').trim()) && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={requestEmailOtp}
                    disabled={emailOtpSending || !(profile.email || '').trim()}
                  >
                    {emailOtpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {emailOtpSending ? 'Sending OTP...' : 'Send OTP to new email'}
                  </Button>

                  <Button
                    type="button"
                    className="gap-2"
                    onClick={verifyEmailOtp}
                    disabled={emailOtpVerifying || (emailOtpSentTo || '').trim() !== (profile.email || '').trim() || emailOtpCode.trim().length !== 6}
                  >
                    {emailOtpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {emailOtpVerifying ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>OTP (6 digits)</Label>
                  <InputOTP
                    maxLength={6}
                    value={emailOtpCode}
                    onChange={setEmailOtpCode}
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

                  <p className="text-xs text-muted-foreground">
                    OTP will be sent to <span className="font-medium">{(profile.email || '').trim()}</span>. After verification, your email is updated immediately.
                  </p>

                  {emailVerifiedFor === (profile.email || '').trim() && (
                    <p className="text-xs text-success">Email verified.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone"
              className="mt-1.5" 
              value={profile.phone} 
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
              placeholder="09123456789"
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input 
              id="address"
              className="mt-1.5" 
              value={profile.address} 
              onChange={e => setProfile({ ...profile, address: e.target.value })}
              placeholder="City, Province"
            />
          </div>
        </div>

        {/* Employment Information */}
        <div className="glass-card p-6 space-y-4 lg:col-span-2">
          <h3 className="font-display font-semibold">Employment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employmentStatus">Employment Status</Label>
              <Select 
                value={profile.employmentStatus} 
                onValueChange={v => setProfile({ ...profile, employmentStatus: v })}
              >
                <SelectTrigger id="employmentStatus" className="mt-1.5">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {['Employed', 'Unemployed', 'Self-Employed', 'Freelancer', 'Further Studies'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(profile.employmentStatus === 'Employed' || profile.employmentStatus === 'Self-Employed' || profile.employmentStatus === 'Freelancer') && (
              <>
                <div>
                  <Label htmlFor="company">Company / Business</Label>
                  <Input 
                    id="company"
                    className="mt-1.5" 
                    value={profile.company} 
                    onChange={e => setProfile({ ...profile, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position / Role</Label>
                  <Input 
                    id="position"
                    className="mt-1.5" 
                    value={profile.position} 
                    onChange={e => setProfile({ ...profile, position: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={profile.industry} 
                    onValueChange={v => setProfile({ ...profile, industry: v })}
                  >
                    <SelectTrigger id="industry" className="mt-1.5">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Technology', 'Education', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Construction', 'Transportation', 'Hospitality', 'Other'].map(i => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate"
                    type="date"
                    className="mt-1.5" 
                    value={profile.employmentStartDate} 
                    onChange={e => setProfile({ ...profile, employmentStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="income">Monthly Income (PHP)</Label>
                  <Input 
                    id="income"
                    type="number"
                    className="mt-1.5" 
                    value={profile.monthlyIncome} 
                    onChange={e => setProfile({ ...profile, monthlyIncome: e.target.value })}
                    placeholder="e.g., 25000"
                  />
                </div>
              </>
            )}

            {profile.employmentStatus === 'Further Studies' && (
              <div className="md:col-span-2">
                <Label htmlFor="course">Course/Program</Label>
                <Input 
                  id="course"
                  className="mt-1.5" 
                  placeholder="e.g., Master in Information Technology"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}