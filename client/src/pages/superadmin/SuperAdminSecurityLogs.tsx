import { SecurityLogsTable } from '@/components/superadmin/SecurityLogsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperAdminSecurityLogs() {
  return (
    <Tabs defaultValue="admin">
      <TabsList>
        <TabsTrigger value="admin">Admin</TabsTrigger>
        <TabsTrigger value="user">User</TabsTrigger>
      </TabsList>
      <TabsContent value="admin" className="mt-4">
        <SecurityLogsTable
          title="Security Logs (Admin)"
          subtitle="Login attempts, lockouts, credential changes"
          roleFilter="admin_like"
        />
      </TabsContent>
      <TabsContent value="user" className="mt-4">
        <SecurityLogsTable
          title="Security Logs (User)"
          subtitle="Login attempts, lockouts, email/password changes"
          roleFilter="alumni"
        />
      </TabsContent>
    </Tabs>
  );
}

