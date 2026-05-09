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

export type AuditLogRow = {
  id: number;
  user_id: number | null;
  username: string | null;
  email?: string | null;
  role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  metadata: string | Record<string, any> | null;
  created_at: string;
};

type AuditLogsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AuditLogRow[];
};

type Props = {
  title: string;
  subtitle?: string;
  category: 'system' | 'security';
  roleFilter?: '' | 'admin' | 'alumni' | 'superadmin' | 'admin_like';
  showSecurityTabs?: boolean;
  systemFilters?: boolean;
};

export function AuditLogsTable({
  title,
  subtitle,
  category,
  roleFilter = '',
  systemFilters = false
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const systemActionOptions = [
    'create_template',
    'update_template',
    'activate_template',
    'deactivate_template',
    'clone_template',
    'delete_template',
    'create_question',
    'update_question',
    'delete_question',
    'add_question_to_template',
    'remove_question_from_template',
    'reorder_template_questions',
    'import_alumni_batch',
    'import_alumni_file',
    'deactivate_alumni',
    'export_import_error_csv',
    'generate_report',
    'save_content_settings',
    'upsert_setting',
    'create_admin',
    'remove_user',
    'update_user_role'
  ];
  const entityTypeOptions = [
    'survey_template',
    'survey_question',
    'alumni_profile',
    'import_history',
    'report',
    'system_setting',
    'user',
    'auth'
  ];

  const [filters, setFilters] = useState({
    email: '',
    action: '',
    entityType: '',
    datePreset: '7d' as 'today' | '7d' | '30d' | 'all',
  });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

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

  const getTemplateNameFromMetadata = (parsed: Record<string, any> | null) => {
    if (!parsed) return null;
    const directName =
      parsed.templateName ??
      parsed.template_name ??
      parsed.templateTitle ??
      parsed.template_title ??
      parsed.name ??
      parsed.title;
    if (typeof directName === 'string' && directName.trim()) return directName.trim();

    const nestedTemplate = parsed.template;
    if (nestedTemplate && typeof nestedTemplate === 'object') {
      const nestedName =
        nestedTemplate.name ??
        nestedTemplate.title ??
        nestedTemplate.templateName ??
        nestedTemplate.template_title;
      if (typeof nestedName === 'string' && nestedName.trim()) return nestedName.trim();
    }
    return null;
  };

  const formatDetails = (log: AuditLogRow) => {
    const parsed = parseMetadata(log.metadata);
    if (log.action === 'delete_template') {
      const templateName = getTemplateNameFromMetadata(parsed);
      if (templateName) return `Delete template: ${templateName}`;
      if (log.entity_id != null) return `Delete template #${log.entity_id}`;
      return 'Delete template';
    }
    return formatMetadata(log.metadata);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const query = new URLSearchParams();
      query.set('category', category);
      query.set('page', String(page));
      query.set('pageSize', String(pageSize));

      if (filters.email.trim()) query.set('email', filters.email.trim());
      if (filters.action) query.set('action', filters.action);
      if (filters.entityType) query.set('entityType', filters.entityType);
      if (roleFilter) query.set('role', roleFilter);

      if (systemFilters) {
        const now = new Date();
        if (filters.datePreset === 'today') {
          const from = new Date(now);
          from.setHours(0, 0, 0, 0);
          query.set('from', from.toISOString());
          query.set('to', now.toISOString());
        } else if (filters.datePreset === '7d') {
          const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          query.set('from', from.toISOString());
          query.set('to', now.toISOString());
        } else if (filters.datePreset === '30d') {
          const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          query.set('from', from.toISOString());
          query.set('to', now.toISOString());
        }
      }

      const res = await fetch(`${API_URL}/superadmin/audit-logs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: AuditLogsResponse | any = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to load logs');
      setLogs(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === 'number' ? data.total : Array.isArray(data) ? data.length : 0);
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Failed to load logs',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page, roleFilter]);

  const visibleLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [logs]
  );

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
            <Label>User Email</Label>
            <Input
              placeholder="e.g. admin@plpasig.edu.ph"
              value={filters.email}
              onChange={(e) => setFilters((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <Label>Action</Label>
            <Select value={filters.action || 'all'} onValueChange={(v) => setFilters((p) => ({ ...p, action: v === 'all' ? '' : v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(category === 'system' ? systemActionOptions : []).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Entity Type</Label>
            <Select value={filters.entityType || 'all'} onValueChange={(v) => setFilters((p) => ({ ...p, entityType: v === 'all' ? '' : v }))}>
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entityTypeOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {systemFilters ? (
            <div>
              <Label>Date Range</Label>
              <Select value={filters.datePreset} onValueChange={(v) => { setFilters((p) => ({ ...p, datePreset: v as any })); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
          <div className="hidden md:block" />
          <div className="flex gap-2">
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
                setFilters({
                  action: '',
                  entityType: '',
                  email: '',
                  datePreset: '7d'
                });
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
                <TableHead>Details</TableHead>
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
                    No logs found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.email || log.username || `User #${log.user_id ?? '-'}`}</TableCell>
                    <TableCell>{log.role || '-'}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      {[log.entity_type, log.entity_id != null ? `#${log.entity_id}` : null]
                        .filter(Boolean)
                        .join(' ')}
                    </TableCell>
                    <TableCell className="max-w-[340px] truncate" title={formatDetails(log)}>
                      {formatDetails(log)}
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

