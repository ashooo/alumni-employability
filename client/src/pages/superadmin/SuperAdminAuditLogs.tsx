import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type AuditLogRow = {
  id: number;
  user_id: number | null;
  username: string | null;
  role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  metadata: string | Record<string, any> | null;
  created_at: string;
};

export default function SuperAdminAuditLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    limit: 100
  });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const query = new URLSearchParams();
      if (filters.userId.trim()) query.set('userId', filters.userId.trim());
      if (filters.action.trim()) query.set('action', filters.action.trim());
      if (filters.entityType.trim()) query.set('entityType', filters.entityType.trim());
      query.set('limit', String(filters.limit || 100));

      const res = await fetch(`${API_URL}/superadmin/audit-logs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || 'Failed to load audit logs');
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Failed to load audit logs',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchLogs();
    }
  }, [user?.role]);

  const visibleLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [logs]
  );

  const parseMetadata = (metadata: AuditLogRow['metadata']) => {
    try {
      if (!metadata) return null;
      if (typeof metadata === 'object') return metadata;
      if (typeof metadata === 'string') return JSON.parse(metadata);
      return null;
    } catch {
      return null;
    }
  };

  const formatMetadata = (metadata: AuditLogRow['metadata']) => {
    const parsed = parseMetadata(metadata);
    if (!parsed) return '-';
    const entries = Object.entries(parsed).slice(0, 4);
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' | ');
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
        <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">Track admin actions across the system</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label>User ID</Label>
            <Input
              placeholder="e.g. 1"
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            />
          </div>
          <div>
            <Label>Action</Label>
            <Input
              placeholder="e.g. upsert_setting"
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            />
          </div>
          <div>
            <Label>Entity Type</Label>
            <Input
              placeholder="e.g. user"
              value={filters.entityType}
              onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
            />
          </div>
          <div>
            <Label>Limit</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={filters.limit}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  limit: Math.min(500, Math.max(1, Number(e.target.value) || 100))
                }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogs} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Apply</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ userId: '', action: '', entityType: '', limit: 100 });
                setTimeout(() => fetchLogs(), 0);
              }}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">Recent Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : visibleLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No audit logs found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>{log.username || `User #${log.user_id ?? '-'}`}</TableCell>
                    <TableCell>{log.role || '-'}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      {[log.entity_type, log.entity_id != null ? `#${log.entity_id}` : null].filter(Boolean).join(' ')}
                    </TableCell>
                    <TableCell className="max-w-[340px] truncate" title={formatMetadata(log.metadata)}>
                      {formatMetadata(log.metadata)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

