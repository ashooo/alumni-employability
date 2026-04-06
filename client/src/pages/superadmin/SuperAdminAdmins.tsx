import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type UserRow = {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'alumni';
  first_name: string;
  last_name: string;
  last_login?: string | null;
};

export default function SuperAdminAdmins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniPage, setAlumniPage] = useState(1);
  const alumniPageSize = 20;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [targetDelete, setTargetDelete] = useState<UserRow | null>(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/superadmin/users?role=all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load users',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') fetchUsers();
  }, [user?.role]);

  const sortedByName = (list: UserRow[]) =>
    [...list].sort((a, b) =>
      `${a.last_name || ''} ${a.first_name || ''} ${a.username}`.localeCompare(
        `${b.last_name || ''} ${b.first_name || ''} ${b.username}`
      )
    );

  const superAdmins = sortedByName(users.filter(u => u.role === 'superadmin'));
  const admins = sortedByName(users.filter(u => u.role === 'admin'));
  const alumni = sortedByName(
    users.filter(u => {
      if (u.role !== 'alumni') return false;
      if (!alumniSearch.trim()) return true;
      const key = alumniSearch.toLowerCase();
      return (
        u.username.toLowerCase().includes(key) ||
        `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(key) ||
        u.email.toLowerCase().includes(key)
      );
    })
  );

  const alumniTotalPages = Math.max(1, Math.ceil(alumni.length / alumniPageSize));
  const pagedAlumni = alumni.slice((alumniPage - 1) * alumniPageSize, alumniPage * alumniPageSize);

  const handleCreateAdmin = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/superadmin/admins`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create admin');

      setShowCreate(false);
      setForm({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: ''
      });
      toast({ title: 'Admin created', description: 'New admin account added.', variant: 'success' });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Create failed',
        description: error instanceof Error ? error.message : 'Failed to create admin',
        variant: 'error'
      });
    }
  };

  const handleRoleChange = async (target: UserRow, nextRole: 'superadmin' | 'admin' | 'alumni') => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/superadmin/users/${target.id}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: nextRole })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update role');
      toast({ title: 'Role updated', description: `${target.username} is now ${nextRole}.`, variant: 'success' });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'error'
      });
    }
  };

  const handleRemoveAdmin = async () => {
    if (!targetDelete) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/superadmin/admins/${targetDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to remove admin');
      toast({ title: 'Admin removed', description: `${targetDelete.username} was deleted.`, variant: 'warning' });
      setTargetDelete(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to remove admin',
        variant: 'error'
      });
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
        <h1 className="text-2xl font-display font-bold">Admin Management</h1>
        <p className="text-muted-foreground text-sm">Add admins, edit roles, and remove access</p>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-muted-foreground">Users are sorted alphabetically by last name and first name.</p>
        <Button onClick={() => setShowCreate(true)}>Add Admin</Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-4 pt-4">
          <h3 className="font-display font-semibold text-sm">Superadmin Account</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {superAdmins.map(u => (
              <TableRow key={`sa-${u.id}`}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{`${u.first_name || ''} ${u.last_name || ''}`.trim()}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>Superadmin</TableCell>
                <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</TableCell>
                <TableCell className="text-right">
                  <span className="text-xs text-muted-foreground">Protected</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-4 pt-4">
          <h3 className="font-display font-semibold text-sm">Admin Accounts</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading users...</TableCell>
              </TableRow>
              ) : admins.length === 0 ? (
              <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No admin users found.</TableCell>
              </TableRow>
            ) : users.map(u => (
                u.role === 'admin' ? (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{`${u.first_name || ''} ${u.last_name || ''}`.trim()}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v: any) => handleRoleChange(u, v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="alumni">Alumni</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</TableCell>
                <TableCell className="text-right">
                  {u.id !== user.id ? (
                    <Button variant="destructive" size="sm" onClick={() => setTargetDelete(u)}>
                      Remove
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
                ) : null
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold text-sm">Alumni Accounts</h3>
          <Input
            className="w-full sm:w-[280px]"
            placeholder="Search alumni by username, name, or email"
            value={alumniSearch}
            onChange={(e) => {
              setAlumniSearch(e.target.value);
              setAlumniPage(1);
            }}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading users...</TableCell>
              </TableRow>
            ) : pagedAlumni.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No alumni users found.</TableCell>
              </TableRow>
            ) : pagedAlumni.map(u => (
              <TableRow key={`al-${u.id}`}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{`${u.first_name || ''} ${u.last_name || ''}`.trim()}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><span className="text-xs text-muted-foreground">Alumni (fixed)</span></TableCell>
                <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</TableCell>
                <TableCell className="text-right">
                  {u.id !== user.id ? (
                    <Button variant="destructive" size="sm" onClick={() => setTargetDelete(u)}>
                      Remove
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {alumni.length > 0 && (
          <div className="p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Showing {(alumniPage - 1) * alumniPageSize + 1}-{Math.min(alumniPage * alumniPageSize, alumni.length)} of {alumni.length} alumni
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={alumniPage === 1} onClick={() => setAlumniPage(p => Math.max(1, p - 1))}>Previous</Button>
              <span>Page {alumniPage} of {alumniTotalPages}</span>
              <Button variant="outline" size="sm" disabled={alumniPage === alumniTotalPages} onClick={() => setAlumniPage(p => Math.min(alumniTotalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">New accounts created here will have role: <span className="font-medium text-foreground">admin</span>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateAdmin}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!targetDelete} onOpenChange={() => setTargetDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete account <span className="font-semibold text-foreground">{targetDelete?.username}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveAdmin}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

