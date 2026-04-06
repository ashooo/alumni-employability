import { Search, Upload, Eye, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Clock, Download, FileText, Users, Building2, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { isAdminLike } from '@/lib/roles';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AlumniRecord {
  id: number;
  student_id: string;
  name: string;
  program: string;
  program_id: number;
  college: string;
  college_id: number;
  batch: number;
  status: 'active' | 'inactive' | 'graduated';
  survey_status: 'pending' | 'completed';
  email?: string;
  imported_at?: string;
  imported_by?: string;
}

interface ImportHistory {
  id: number;
  filename: string;
  uploaded_at: string;
  uploaded_by: string;
  total_records: number;
  success_count: number;
  failed_count: number;
  status: 'completed' | 'partial' | 'failed';
}

interface College {
  id: number;
  name: string;
  code: string;
}

interface Program {
  id: number;
  name: string;
  code: string;
  college_id: number;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [alumniRecords, setAlumniRecords] = useState<AlumniRecord[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batchYears, setBatchYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: any[];
  } | null>(null);
  
  // State for import history
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportHistory | null>(null);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusQuickFilter, setStatusQuickFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  const { toast } = useToast();

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // Check if user is admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!isAdminLike(user?.role)) {
      toast({
        title: 'Access Denied',
        description: 'Admin privileges required',
        variant: 'destructive'
      });
      navigate('/app');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch alumni records
  const fetchAlumniRecords = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (collegeFilter && collegeFilter !== 'all') params.append('college', collegeFilter);
      if (programFilter && programFilter !== 'all') params.append('program', programFilter);
      if (batchFilter && batchFilter !== 'all') params.append('batch', batchFilter);

      const response = await fetch(`${API_URL}/admin/alumni?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setAlumniRecords(data);
      } else {
        console.error('Failed to fetch alumni records:', response.status);
        toast({
          title: 'Error',
          description: 'Failed to fetch alumni records',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching alumni:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch alumni records',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch import history
  const fetchImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/import-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setImportHistory(data);
      }
    } catch (error) {
      console.error('Error fetching import history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch import history',
        variant: 'destructive'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch colleges
  const fetchColleges = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/colleges`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setColleges(data);
      }
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

  // Fetch programs
  const fetchPrograms = async () => {
    try {
      const token = getToken();
      let url = `${API_URL}/admin/programs/list`;
      
      // Add college filter if selected
      if (collegeFilter && collegeFilter !== 'all') {
        url += `?collegeId=${collegeFilter}`;
      }
      
      const response = await fetch(url, {
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

  // Fetch batch years
  const fetchBatchYears = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/batch-years`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBatchYears(data);
      }
    } catch (error) {
      console.error('Error fetching batch years:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchColleges();
      fetchBatchYears();
      fetchImportHistory();
    }
  }, [isAuthenticated, user]);

  // Fetch programs when college filter changes
  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchPrograms();
      // Reset program filter when college changes
      if (collegeFilter !== 'all') {
        setProgramFilter('all');
      }
    }
  }, [collegeFilter]);

  // Refetch when filters change - with debounce to prevent too many requests
  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      const timer = setTimeout(() => {
        fetchAlumniRecords();
        setCurrentPage(1);
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(timer);
    }
  }, [search, collegeFilter, programFilter, batchFilter]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/admin/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setImportResults(data.results);
        setImportStep(2);
        
        // Refresh import history
        fetchImportHistory();
        
        toast({
          title: 'Import Preview Ready',
          description: `Found ${data.results.total} records to import`,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: data.error || 'Failed to process file',
          variant: 'destructive'
        });
        setImportStep(0);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Unable to upload file',
        variant: 'destructive'
      });
      setImportStep(0);
    } finally {
      setImportLoading(false);
    }
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      await handleFileUpload(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload an Excel or CSV file',
        variant: 'destructive'
      });
    }
  };

  // Handle file select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await handleFileUpload(file);
    }
  };

  // Confirm import
  const confirmImport = async () => {
    setShowImport(false);
    setImportStep(0);
    setSelectedFile(null);
    setImportResults(null);
    fetchAlumniRecords();
    fetchImportHistory();
    toast({
      title: 'Import Complete',
      description: `${importResults?.success} alumni records imported successfully.`,
    });
  };

  // View import details
  const handleViewImportDetails = (importRecord: ImportHistory) => {
    setSelectedImport(importRecord);
    setShowImportDetails(true);
  };

  // Download error report
  const handleDownloadErrorReport = async (importId: number) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/import/${importId}/errors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-errors-${importId}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Error downloading error report:', error);
      toast({
        title: 'Error',
        description: 'Failed to download error report',
        variant: 'destructive'
      });
    }
  };

  // Export current view as CSV
  const handleExportCSV = () => {
    const headers = ['Student ID', 'Name', 'College', 'Program', 'Batch', 'Status', 'Survey Status', 'Email'];
    const csvData = alumniRecords.map(record => [
      record.student_id,
      record.name,
      record.college,
      record.program,
      record.batch,
      capitalizeStatus(record.status),
      capitalizeStatus(record.survey_status),
      record.email || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumni-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Capitalize status for display
  const capitalizeStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'inactive': 'Inactive',
      'graduated': 'Graduated',
      'pending': 'Pending',
      'completed': 'Completed',
    };
    return statusMap[status] || status;
  };

  // Get college name by ID
  const getCollegeName = (collegeId: string) => {
    const college = colleges.find(c => String(c.id) === collegeId);
    return college ? college.name : 'Unknown';
  };

  const sortedRecords = (() => {
    const records = statusQuickFilter === 'all'
      ? [...alumniRecords]
      : alumniRecords.filter(r => r.status === statusQuickFilter);
    if (!sortKey) return records;

    if (sortKey === 'name') {
      records.sort((a, b) => {
        const res = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? res : -res;
      });
    }

    if (sortKey === 'status') {
      const orderAsc: Record<string, number> = {
        active: 0,
        inactive: 1,
        graduated: 2
      };
      const orderDesc: Record<string, number> = {
        inactive: 0,
        active: 1,
        graduated: 2
      };
      const order = sortDirection === 'asc' ? orderAsc : orderDesc;
      records.sort((a, b) => {
        const av = order[a.status] ?? 99;
        const bv = order[b.status] ?? 99;
        if (av !== bv) return av - bv;
        return a.name.localeCompare(b.name);
      });
    }

    return records;
  })();

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const pagedRecords = sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPage = (page: number) => {
    const next = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(next);
  };

  if (!isAuthenticated || !isAdminLike(user?.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage alumni records and bulk import</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => { 
              setShowImportHistory(true); 
              fetchImportHistory(); 
            }} 
            className="gap-2"
          >
            <Clock className="h-4 w-4" /> Import History
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportCSV} 
            className="gap-2"
            disabled={alumniRecords.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setShowImport(true); setImportStep(0); }} className="gap-2">
            <Upload className="h-4 w-4" /> Import Alumni
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
          
          {/* College Filter */}
          <Select value={collegeFilter} onValueChange={(v) => {
            setCollegeFilter(v);
            // Program filter will be reset by useEffect
          }}>
            <SelectTrigger className="w-[200px]">
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

          {/* Program Filter (depends on college selection) */}
          <Select 
            value={programFilter} 
            onValueChange={setProgramFilter}
            disabled={collegeFilter === 'all'}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {batchYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {(collegeFilter !== 'all' || programFilter !== 'all' || batchFilter !== 'all' || statusQuickFilter !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="text-muted-foreground">Active filters:</span>
            {collegeFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">
                <Building2 className="h-3 w-3 mr-1" />
                {getCollegeName(collegeFilter)}
              </Badge>
            )}
            {programFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">
                <GraduationCap className="h-3 w-3 mr-1" />
                {programs.find(p => String(p.id) === programFilter)?.name || 'Program'}
              </Badge>
            )}
            {batchFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">
                Batch {batchFilter}
              </Badge>
            )}
            {statusQuickFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">
                Status: {capitalizeStatus(statusQuickFilter)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          className="glass-card p-4 text-left hover:bg-muted/40 transition-colors"
          onClick={() => {
            setSortKey('name');
            setSortDirection('asc');
            setStatusQuickFilter('all');
            setCurrentPage(1);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alumniRecords.length}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          className="glass-card p-4 text-left hover:bg-muted/40 transition-colors"
          onClick={() => {
            setSortKey('status');
            setSortDirection('asc'); // active on top
            setStatusQuickFilter('active'); // show active only
            setCurrentPage(1);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {alumniRecords.filter(r => r.status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground">Active Accounts</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          className="glass-card p-4 text-left hover:bg-muted/40 transition-colors"
          onClick={() => {
            setSortKey('status');
            setSortDirection('desc'); // inactive on top
            setStatusQuickFilter('inactive');
            setCurrentPage(1);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {alumniRecords.filter(r => r.status === 'inactive').length}
              </p>
              <p className="text-xs text-muted-foreground">Inactive Records</p>
            </div>
          </div>
        </button>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {alumniRecords.filter(r => r.survey_status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">Surveys Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alumni Records Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading alumni records...</p>
                  </TableCell>
                </TableRow>
              ) : pagedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No alumni records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                pagedRecords.map(a => (
                  <TableRow
                    key={a.id}
                    className="transition-colors hover:bg-muted/50 dark:hover:bg-white/10"
                  >
                    <TableCell className="font-mono text-sm">{a.student_id}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm">{a.college}</TableCell>
                    <TableCell className="text-sm">{a.program}</TableCell>
                    <TableCell>{a.batch}</TableCell>
                    <TableCell><StatusBadge status={capitalizeStatus(a.status)} /></TableCell>
                    <TableCell><StatusBadge status={capitalizeStatus(a.survey_status)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedAlumni(a)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {sortedRecords.length > 0 && (
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            Showing{' '}
            <span className="font-medium">
              {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, sortedRecords.length)}
            </span>{' '}
            of <span className="font-medium">{sortedRecords.length}</span> records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span>
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Profile view modal */}
      <Dialog open={!!selectedAlumni} onOpenChange={() => setSelectedAlumni(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby="profile-description">
          <DialogHeader>
            <DialogTitle className="font-display">Alumni Profile</DialogTitle>
          </DialogHeader>
          <div id="profile-description" className="sr-only">
            View alumni profile details including student ID, name, program, batch, and status
          </div>
          {selectedAlumni && (
            <div className="space-y-3">
              {[
                ['Student ID', selectedAlumni.student_id],
                ['Name', selectedAlumni.name],
                ['College', selectedAlumni.college],
                ['Program', selectedAlumni.program],
                ['Batch', selectedAlumni.batch],
                ['Email', selectedAlumni.email || 'N/A'],
                ['Status', capitalizeStatus(selectedAlumni.status)],
                ['Survey', capitalizeStatus(selectedAlumni.survey_status)],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{l}</span>
                  <span className="text-sm font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import History Modal */}
      <Dialog open={showImportHistory} onOpenChange={setShowImportHistory}>
        <DialogContent className="sm:max-w-5xl" aria-describedby="history-description">
          <DialogHeader>
            <DialogTitle className="font-display">Import History</DialogTitle>
          </DialogHeader>
          <div id="history-description" className="sr-only">
            View history of all alumni data imports
          </div>
          
          {loadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading import history...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        No import history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    importHistory.map(imp => (
                      <TableRow key={imp.id}>
                        <TableCell className="font-medium">{imp.filename}</TableCell>
                        <TableCell>{imp.uploaded_by}</TableCell>
                        <TableCell>{format(new Date(imp.uploaded_at), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>{imp.total_records}</TableCell>
                        <TableCell className="text-success">{imp.success_count}</TableCell>
                        <TableCell className="text-destructive">{imp.failed_count}</TableCell>
                        <TableCell>
                          <StatusBadge status={imp.status === 'completed' ? 'Completed' : imp.status === 'partial' ? 'Pending' : 'Failed'} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewImportDetails(imp)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {imp.failed_count > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDownloadErrorReport(imp.id)}
                              >
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Details Modal */}
      <Dialog open={showImportDetails} onOpenChange={setShowImportDetails}>
        <DialogContent className="sm:max-w-lg" aria-describedby="import-details-description">
          <DialogHeader>
            <DialogTitle className="font-display">Import Details</DialogTitle>
          </DialogHeader>
          <div id="import-details-description" className="sr-only">
            Detailed information about the selected import
          </div>
          
          {selectedImport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Filename</p>
                  <p className="font-medium">{selectedImport.filename}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded By</p>
                  <p className="font-medium">{selectedImport.uploaded_by}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedImport.uploaded_at), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedImport.uploaded_at), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center py-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{selectedImport.total_records}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">{selectedImport.success_count}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{selectedImport.failed_count}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowImportDetails(false)}>
                  Close
                </Button>
                {selectedImport.failed_count > 0 && (
                  <Button onClick={() => handleDownloadErrorReport(selectedImport.id)}>
                    <Download className="h-4 w-4 mr-2" /> Download Error Report
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-lg" aria-describedby="import-description">
          <DialogHeader>
            <DialogTitle className="font-display">Import Alumni Data</DialogTitle>
          </DialogHeader>
          <div id="import-description" className="sr-only">
            Upload an Excel or CSV file containing alumni records
          </div>
          
          {importStep === 0 && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-2">Drag & drop your Excel file here</p>
              <p className="text-sm text-muted-foreground mb-4">Accepts .xlsx, .xls, and .csv files</p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={importLoading}
              >
                {importLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Browse Files
              </Button>
            </div>
          )}

          {importStep === 1 && importLoading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-3">Processing file...</p>
            </div>
          )}

          {importStep === 2 && importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">{importResults.success}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{importResults.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{importResults.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Errors:</p>
                  <div className="max-h-32 overflow-auto text-xs text-destructive bg-destructive/5 p-2 rounded">
                    {importResults.errors.map((err, idx) => (
                      <div key={idx} className="mb-1">
                        Row {err.row || idx + 1}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={confirmImport}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Import
              </Button>
              
              {importResults.failed > 0 && (
                <Button variant="outline" className="w-full gap-2" size="sm">
                  <AlertCircle className="h-4 w-4" /> Download Error Report
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}