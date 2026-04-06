import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type BrandingSettings = {
  logoUrl: string;
};

type RetentionSettings = {
  auditLogDays: number;
  backupRetentionDays: number;
  deletedRecordsRetentionDays: number;
};

export default function SuperAdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>({ logoUrl: '/plp_logo.png' });
  const [retention, setRetention] = useState<RetentionSettings>({
    auditLogDays: 365,
    backupRetentionDays: 30,
    deletedRecordsRetentionDays: 90
  });

  const logoPreview = useMemo(() => branding.logoUrl || '/plp_logo.png', [branding.logoUrl]);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const parseSettingValue = (raw: any) => {
    try {
      if (raw && typeof raw === 'object') return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return null;
    } catch {
      return null;
    }
  };

  const loadSetting = async (key: string) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/superadmin/settings/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load ${key}`);
    const data = await res.json();
    return parseSettingValue(data?.value);
  };

  const saveSetting = async (key: string, value: any) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/superadmin/settings/${key}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Failed to save ${key}`);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (user?.role !== 'superadmin') return;
      setLoading(true);
      try {
        const [brandingValue, retentionValue] = await Promise.all([
          loadSetting('system_branding'),
          loadSetting('retention_rules')
        ]);

        if (brandingValue?.logoUrl) {
          setBranding({ logoUrl: String(brandingValue.logoUrl) });
        }

        if (retentionValue) {
          setRetention({
            auditLogDays: Number(retentionValue.auditLogDays) || 365,
            backupRetentionDays: Number(retentionValue.backupRetentionDays) || 30,
            deletedRecordsRetentionDays: Number(retentionValue.deletedRecordsRetentionDays) || 90
          });
        }
      } catch (error) {
        toast({
          title: 'Load failed',
          description: error instanceof Error ? error.message : 'Failed to load settings',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.role]);

  const handleImageFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'warning' });
      return;
    }
    const token = getToken();
    if (!token) {
      toast({ title: 'Unauthorized', description: 'Please log in again.', variant: 'error' });
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch(`${API_URL}/superadmin/settings/upload-logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to upload logo');
      }

      const logoUrl = String(data?.logoUrl || '');
      if (!logoUrl) throw new Error('Upload did not return logo URL');
      setBranding(prev => ({ ...prev, logoUrl }));
      toast({ title: 'Logo uploaded', description: 'Logo uploaded successfully. Click Save to apply.', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'error'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('system_branding', branding),
        saveSetting('retention_rules', retention)
      ]);
      toast({ title: 'Settings saved', description: 'System settings updated successfully.', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">System Settings</h1>
        <p className="text-muted-foreground text-sm">Logo, backups, cleanup, and system-wide configuration</p>
      </div>

      {loading ? (
        <div className="glass-card p-8 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
        </div>
      ) : (
        <>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start">
                <div className="h-28 w-28 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="System logo preview" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Logo URL</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="https://your-domain/logo.png"
                      value={branding.logoUrl}
                      onChange={(e) => setBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                    />
                  </div>
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleImageFile(e.dataTransfer.files?.[0]);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">
                        Drag & drop a logo image here, or browse from your device. The image is uploaded to server storage.
                      </div>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) => handleImageFile(e.target.files?.[0])}
                        />
                        <span className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                          {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {uploadingLogo ? 'Uploading...' : 'Upload'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Retention Rules</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Audit Log Retention (days)</Label>
                <Input
                  type="number"
                  min={30}
                  className="mt-1.5"
                  value={retention.auditLogDays}
                  onChange={(e) => setRetention(prev => ({ ...prev, auditLogDays: Number(e.target.value) || 30 }))}
                />
              </div>
              <div>
                <Label>Backup Retention (days)</Label>
                <Input
                  type="number"
                  min={7}
                  className="mt-1.5"
                  value={retention.backupRetentionDays}
                  onChange={(e) => setRetention(prev => ({ ...prev, backupRetentionDays: Number(e.target.value) || 7 }))}
                />
              </div>
              <div>
                <Label>Deleted Records Retention (days)</Label>
                <Input
                  type="number"
                  min={30}
                  className="mt-1.5"
                  value={retention.deletedRecordsRetentionDays}
                  onChange={(e) => setRetention(prev => ({ ...prev, deletedRecordsRetentionDays: Number(e.target.value) || 30 }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

