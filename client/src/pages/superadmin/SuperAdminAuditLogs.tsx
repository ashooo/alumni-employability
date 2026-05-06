import { useAuth } from '@/contexts/AuthContext';
import { Outlet } from 'react-router-dom';

export default function SuperAdminAuditLogs() {
  const { user } = useAuth();

  if (user?.role !== 'superadmin') {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
}

