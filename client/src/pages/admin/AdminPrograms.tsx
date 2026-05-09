import {  Plus, Edit2, Trash2, Save, X, Loader2, Building2, GraduationCap, Users, FileText, CheckCircle2, AlertCircle, Download, Upload, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { isAdminLike } from '@/lib/roles';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Program {
  id: number;
  name: string;
  code: string;
  college_id: number;
  college_name?: string;
  college_code?: string;
  description?: string;
  alumni_count?: number;
  surveys_completed?: number;
  active_accounts?: number;
  employment_records?: number;
}

interface College {
  id: number;
  name: string;
  code: string;
  description?: string;
  program_count?: number;
  alumni_count?: number;
}

export default function AdminPrograms() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAddCollegeDialog, setShowAddCollegeDialog] = useState(false);
  const [showEditCollegeDialog, setShowEditCollegeDialog] = useState(false);
  const [showDeleteCollegeDialog, setShowDeleteCollegeDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    college_id: '',
    description: ''
  });

  // Bulk import state
  const [bulkData, setBulkData] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [collegeFormData, setCollegeFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Stats state
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    if (!isAuthenticated || !isAdminLike(user?.role)) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch colleges
  const fetchColleges = async () => {
    try {
      const token = getToken();
      const [baseRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/colleges`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/admin/colleges/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (baseRes.ok) {
        const baseData = await baseRes.json();
        const statsData = statsRes.ok ? await statsRes.json() : [];
        const statsMap = new Map(
          (Array.isArray(statsData) ? statsData : []).map((s: any) => [
            Number(s.id),
            {
              program_count: Number(s.total_programs || 0),
              alumni_count: Number(s.total_alumni || 0)
            }
          ])
        );

        const merged = (Array.isArray(baseData) ? baseData : []).map((c: any) => ({
          ...c,
          program_count: statsMap.get(Number(c.id))?.program_count ?? Number(c.program_count || 0),
          alumni_count: statsMap.get(Number(c.id))?.alumni_count ?? Number(c.alumni_count || 0)
        }));

        setColleges(merged);
      } else if (statsRes.ok) {
        const statsData = await statsRes.json();
        const fallback = (Array.isArray(statsData) ? statsData : []).map((s: any) => ({
          id: Number(s.id),
          name: s.name || '',
          code: s.code || '',
          description: '',
          program_count: Number(s.total_programs || 0),
          alumni_count: Number(s.total_alumni || 0)
        }));
        setColleges(fallback);
      }
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

  // Fetch programs
  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const url = collegeFilter !== 'all' 
        ? `${API_URL}/admin/programs/list?collegeId=${collegeFilter}`
        : `${API_URL}/admin/programs/list`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrograms(data);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch programs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/programs/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchColleges();
      fetchPrograms();
      fetchStats();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchPrograms();
    }
  }, [collegeFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      college_id: '',
      description: ''
    });
  };

  const resetCollegeForm = () => {
    setCollegeFormData({
      name: '',
      code: '',
      description: ''
    });
  };

  // Handle create program
  const handleCreate = async () => {
    if (!formData.name || !formData.code || !formData.college_id) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/programs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Program created successfully'
        });
        setShowAddDialog(false);
        resetForm();
        fetchPrograms();
        fetchStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create program');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle update program
  const handleUpdate = async () => {
    if (!selectedProgram) return;
    
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/programs/${selectedProgram.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Program updated successfully'
        });
        setShowEditDialog(false);
        setSelectedProgram(null);
        resetForm();
        fetchPrograms();
        fetchStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update program');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete program
  const handleDelete = async () => {
    if (!selectedProgram) return;
    
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/programs/${selectedProgram.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Program deleted successfully'
        });
        setShowDeleteDialog(false);
        setSelectedProgram(null);
        fetchPrograms();
        fetchStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete program');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    try {
      // Parse bulk data (JSON format)
      const programs = JSON.parse(bulkData);
      
      if (!Array.isArray(programs)) {
        throw new Error('Data must be an array of programs');
      }

      setSaving(true);
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/programs/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ programs })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Bulk Import Complete',
          description: `${result.results.success} programs processed, ${result.results.failed} failed`
        });
        setShowBulkDialog(false);
        setBulkData('');
        setBulkPreview([]);
        fetchPrograms();
        fetchStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk import');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollege = async () => {
    if (!collegeFormData.name.trim()) {
      toast({ title: 'Missing Field', description: 'College name is required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/colleges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(collegeFormData)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to create college');
      toast({ title: 'Success', description: 'College created successfully.' });
      setShowAddCollegeDialog(false);
      resetCollegeForm();
      fetchColleges();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCollege = async () => {
    if (!selectedCollege) return;
    if (!collegeFormData.name.trim()) {
      toast({ title: 'Missing Field', description: 'College name is required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/colleges/${selectedCollege.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(collegeFormData)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to update college');
      toast({ title: 'Success', description: 'College updated successfully.' });
      setShowEditCollegeDialog(false);
      setSelectedCollege(null);
      resetCollegeForm();
      fetchColleges();
      fetchPrograms();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollege = async () => {
    if (!selectedCollege) return;
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/colleges/${selectedCollege.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to delete college');
      toast({ title: 'Success', description: 'College deleted successfully.' });
      setShowDeleteCollegeDialog(false);
      setSelectedCollege(null);
      fetchColleges();
      if (collegeFilter === String(selectedCollege.id)) setCollegeFilter('all');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Preview bulk data
  const previewBulkData = () => {
    try {
      const programs = JSON.parse(bulkData);
      setBulkPreview(programs);
      setBulkErrors([]);
    } catch (error: any) {
      setBulkErrors([error.message]);
      setBulkPreview([]);
    }
  };

  // Filter programs by search
  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-display font-bold">Program Management</h1>
          <p className="text-muted-foreground text-sm">Manage colleges and their academic programs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddCollegeDialog(true)}>
            <Building2 className="h-4 w-4 mr-2" /> Add College
          </Button>
          <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
            <Upload className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Program
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{programs.length}</p>
                <p className="text-xs text-muted-foreground">Total Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.reduce((sum, s) => sum + (s.total_alumni || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Alumni</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <CheckCircle2 className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.reduce((sum, s) => sum + (s.surveys_completed || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Surveys Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.reduce((sum, s) => sum + (s.employment_records || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Employment Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search programs..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
          
          <Select value={collegeFilter} onValueChange={setCollegeFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Colleges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colleges</SelectItem>
              {colleges.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colleges Table */}
      <div className="glass-card overflow-hidden border-2 border-primary/15">
        <div className="p-4 border-b bg-primary/5">
          <h3 className="font-display font-semibold">Colleges</h3>
          <p className="text-xs text-muted-foreground">Define colleges where programs belong.</p>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>College Name</TableHead>
                <TableHead className="text-center">Programs</TableHead>
                <TableHead className="text-center">Alumni</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colleges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No colleges found</TableCell>
                </TableRow>
              ) : (
                colleges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm font-medium">{c.code || '-'}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-center">{c.program_count || 0}</TableCell>
                    <TableCell className="text-center">{c.alumni_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCollege(c);
                            setCollegeFormData({
                              name: c.name || '',
                              code: c.code || '',
                              description: c.description || ''
                            });
                            setShowEditCollegeDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCollege(c);
                            setShowDeleteCollegeDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Programs Table */}
      <div className="glass-card overflow-hidden border-2 border-border/60">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-display font-semibold">Programs</h3>
          <p className="text-xs text-muted-foreground">Programs mapped under each college.</p>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Program Name</TableHead>
                <TableHead>College</TableHead>
                <TableHead className="text-center">Alumni</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Surveyed</TableHead>
                <TableHead className="text-center">Employed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No programs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrograms.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm font-medium">{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/5">
                        <Building2 className="h-3 w-3 mr-1" />
                        {p.college_code || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{p.alumni_count || 0}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-success/5">
                        {p.active_accounts || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{p.surveys_completed || 0}</TableCell>
                    <TableCell className="text-center">{p.employment_records || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedProgram(p);
                            setFormData({
                              name: p.name,
                              code: p.code,
                              college_id: String(p.college_id),
                              description: p.description || ''
                            });
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedProgram(p);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>


      {/* Add Program Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Program Name *</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Bachelor of Science in Information Technology"
              />
            </div>
            <div className="space-y-2">
              <Label>Program Code *</Label>
              <Input 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                placeholder="e.g., BSIT"
              />
            </div>
            <div className="space-y-2">
              <Label>College *</Label>
              <Select 
                value={formData.college_id} 
                onValueChange={v => setFormData({...formData, college_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the program"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Program Name *</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Program Code *</Label>
              <Input 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>College *</Label>
              <Select 
                value={formData.college_id} 
                onValueChange={v => setFormData({...formData, college_id: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Program</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedProgram?.name}</span>?
              This action cannot be undone.
            </p>
            {selectedProgram?.alumni_count && selectedProgram.alumni_count > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-destructive">
                  ⚠️ This program has {selectedProgram.alumni_count} alumni records. 
                  You cannot delete it until these records are reassigned.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={saving || (selectedProgram?.alumni_count || 0) > 0}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Programs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paste JSON Data</Label>
              <textarea 
                className="w-full h-40 p-3 rounded-lg border bg-muted font-mono text-sm"
                value={bulkData}
                onChange={e => setBulkData(e.target.value)}
                placeholder='[
  {
    "name": "Bachelor of Science in Information Technology",
    "code": "BSIT",
    "college_id": 1,
    "description": "IT Program"
  }
]'
              />
              <Button variant="outline" size="sm" onClick={previewBulkData}>
                Preview
              </Button>
            </div>

            {bulkErrors.length > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs font-semibold text-destructive mb-1">Errors:</p>
                {bulkErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}

            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({bulkPreview.length} programs)</Label>
                <div className="max-h-40 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>College ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{p.code}</TableCell>
                          <TableCell className="text-xs">{p.name}</TableCell>
                          <TableCell className="text-xs">{p.college_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Format:</strong> Array of objects with name, code, college_id, and optional description.
                Existing programs will be updated based on code.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={!bulkData || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import Programs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCollegeDialog} onOpenChange={setShowAddCollegeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add College</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>College Name *</Label>
              <Input value={collegeFormData.name} onChange={e => setCollegeFormData({ ...collegeFormData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>College Code</Label>
              <Input value={collegeFormData.code} onChange={e => setCollegeFormData({ ...collegeFormData, code: e.target.value })} placeholder="e.g., CCS" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={collegeFormData.description} onChange={e => setCollegeFormData({ ...collegeFormData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCollegeDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCollege} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create College
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCollegeDialog} onOpenChange={setShowEditCollegeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit College</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>College Name *</Label>
              <Input value={collegeFormData.name} onChange={e => setCollegeFormData({ ...collegeFormData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>College Code</Label>
              <Input value={collegeFormData.code} onChange={e => setCollegeFormData({ ...collegeFormData, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={collegeFormData.description} onChange={e => setCollegeFormData({ ...collegeFormData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCollegeDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateCollege} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCollegeDialog} onOpenChange={setShowDeleteCollegeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete College</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedCollege?.name}</span>?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Colleges with programs cannot be deleted until programs are moved or removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteCollegeDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCollege} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete College
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
