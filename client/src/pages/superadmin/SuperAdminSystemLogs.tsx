import { AuditLogsTable } from '@/components/superadmin/AuditLogsTable';

export default function SuperAdminSystemLogs() {
  return (
    <AuditLogsTable
      title="System Logs"
      subtitle="Administrative actions (templates, imports, reports, settings)"
      category="system"
      systemFilters
    />
  );
}

