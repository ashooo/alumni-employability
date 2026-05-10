import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type SecurityLogRow = {
  id: number;
  user_id: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
  action: string;
  status: string | null;
  ip_address: string | null;
  details: string | null;
  metadata: string | Record<string, any> | null;
  created_at: string;
};

type SecurityLogsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: SecurityLogRow[];
};

type Props = {
  title: string;
  subtitle?: string;
  roleFilter: 'admin_like' | 'alumni';
};

const ACTION_OPTIONS = [
  { id: 'all', label: 'All actions' },
  { id: 'login_success', label: 'LOGIN_SUCCESS' },
  { id: 'login_failed', label: 'LOGIN_FAILED' },
  { id: 'password_changed', label: 'PASSWORD_CHANGED' },
  { id: 'password_reset', label: 'PASSWORD_RESET' },
  { id: 'account_locked', label: 'ACCOUNT_LOCKED' },
  { id: 'account_unlocked', label: 'ACCOUNT_UNLOCKED' },
  { id: 'security_alert', label: 'SECURITY_ALERT' }
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'failure', label: 'Failure' },
  { id: 'locked', label: 'Locked' }
];

export function SecurityLogsTable({ title, subtitle, roleFilter }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SecurityLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [filters, setFilters] = useState({
    datePreset: '7d' as 'today' | '7d' | '30d' | 'all',
    userId: '',
    action: 'all',
    status: 'all',
    ipAddress: ''
  });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const mapActionFilter = (actionId: string) => {
    if (actionId === 'login_failed') {
      return ['login_failed', 'login_failed_3x', 'login_failed_unknown_user'];
    }
    if (actionId === 'account_locked') {
      return [
        'temp_lock_15m',
        'account_locked_permanently',
        'login_blocked_temp_lock',
        'login_blocked_permanent_lock'
      ];
    }
    if (actionId === 'security_alert') {
      return ['security_alert'];
    }
    if (actionId === 'all') return [];
    return [actionId];
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const query = new URLSearchParams();
      query.set('category', 'security');
      query.set('role', roleFilter);
      query.set('page', String(page));
      query.set('pageSize', String(pageSize));

      const now = new Date();
      if (filters.datePreset === 'today') {
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        query.set('from', from.toISOString());
        query.set('to', now.toISOString());
      } else if (filters.datePreset === '7d') {
        query.set('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        query.set('to', now.toISOString());
      } else if (filters.datePreset === '30d') {
        query.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        query.set('to', now.toISOString());
      }

      if (filters.userId.trim()) query.set('username', filters.userId.trim());
      if (filters.status !== 'all') query.set('status', filters.status);
      if (filters.ipAddress.trim()) query.set('ipAddress', filters.ipAddress.trim());

      const mapped = mapActionFilter(filters.action);
      // server supports single action filter; send the first and rely on search/status for now
      if (mapped.length === 1) query.set('action', mapped[0]);

      const res = await fetch(`${API_URL}/superadmin/audit-logs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: SecurityLogsResponse | any = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to load security logs');
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Failed to load security logs',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter]);

  const visible = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [rows]
  );

  const formatStatus = (status: string | null) => {
    if (!status) return '-';
    const s = status.toLowerCase();
    if (s === 'success') return 'Success';
    if (s === 'failure') return 'Failure';
    if (s === 'locked') return 'Locked';
    return status;
  };

  const formatDetails = (row: SecurityLogRow) => {
    if (row.details) return row.details;
    if (row.status?.toLowerCase() === 'success') return 'Success';
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">{title}</h1>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Date Range</Label>
            <Select value={filters.datePreset} onValueChange={(v) => { setFilters((p) => ({ ...p, datePreset: v as any })); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>User ID</Label>
            <Input
              placeholder="e.g. 01-00123"
              value={filters.userId}
              onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
            />
          </div>
          <div>
            <Label>Action</Label>
            <Select value={filters.action} onValueChange={(v) => { setFilters((p) => ({ ...p, action: v })); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(v) => { setFilters((p) => ({ ...p, status: v })); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>IP Address</Label>
            <Input
              placeholder="e.g. 192.168."
              value={filters.ipAddress}
              onChange={(e) => setFilters((p) => ({ ...p, ipAddress: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 md:justify-end">
            <Button
              onClick={() => {
                setPage(1);
                fetchLogs();
              }}
              disabled={loading}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ datePreset: '7d', userId: '', action: 'all', status: 'all', ipAddress: '' });
                setPage(1);
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
          <CardTitle className="font-display">Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    No security logs found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell>{row.username || `#${row.user_id ?? '-'}`}</TableCell>
                    <TableCell>{row.email || '-'}</TableCell>
                    <TableCell className="font-medium">{String(row.action || '').toUpperCase()}</TableCell>
                    <TableCell>{formatStatus(row.status)}</TableCell>
                    <TableCell>{row.ip_address || '-'}</TableCell>
                    <TableCell className="max-w-[420px] truncate" title={formatDetails(row)}>
                      {formatDetails(row)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {total > 0
            ? <>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</>
            : <>Showing 0</>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <span className="text-sm">
            Page <span className="font-medium">{page}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

