import {
  Search, Upload, Eye, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, Clock, Download, FileText, Users, Building2, GraduationCap,
  Trash2, ChevronLeft, ChevronRight, XCircle, SkipForward, ShieldAlert
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { isAdminLike } from '@/lib/roles';
import * as XLSX from 'xlsx';

// ─── API URL ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const BATCH_SIZE = 100;
const PREVIEW_ROWS = 20;

// Required columns and their accepted aliases (lowercase)
const REQUIRED_COLUMNS: Record<string, string[]> = {
  student_id:  ['student_id', 'studentid', 'student id', 'id'],
  first_name:  ['first_name', 'firstname', 'first name'],
  last_name:   ['last_name', 'lastname', 'last name'],
  program:     ['program', 'course', 'program name'],
  batch_year:  ['batch_year', 'batchyear', 'batch year', 'batch', 'year'],
};

// Optional columns
const OPTIONAL_COLUMNS: Record<string, string[]> = {
  middle_name: ['middle_name', 'middlename', 'middle name'],
  suffix:      ['suffix'],
  status:      ['status'],
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', graduated: 'Graduated',
  pending: 'Pending', completed: 'Completed',
};

export const getToken = (): string | null =>
  localStorage.getItem('token') || sessionStorage.getItem('token');

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SurveyResponse {
  question: string;
  answer_text: string;
}

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

// Parsed row from file (normalized keys)
interface ParsedRow {
  rowIndex: number;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  email?: string;
  program: string;
  batch_year: number;
  status?: string;
  [key: string]: unknown;
}

interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
}

interface ImportPreviewState {
  allRows: ParsedRow[];
  validRows: ParsedRow[];
  invalidRows: Array<ParsedRow & { errors: ValidationError[] }>;
  inFileduplicates: ParsedRow[];
  dbDuplicates: ParsedRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeKey(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Map a raw file header to our internal canonical key */
function resolveColumn(header: string): string | null {
  const norm = normalizeKey(header);
  for (const [canonical, aliases] of Object.entries({ ...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS })) {
    if (aliases.includes(norm)) return canonical;
  }
  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidBatchYear(year: unknown): boolean {
  const n = Number(year);
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
}

function parseFileToRows(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [alumniRecords, setAlumniRecords] = useState<AlumniRecord[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batchYears, setBatchYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Import flow state
  // Steps: 0=upload, 1=parsing, 2=preview, 3=importing, 4=summary
  const [importStep, setImportStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    inserted: number;
    duplicatesSkipped: number;
    invalidRejected: number;
    errors: Array<{ row: number; error: string }>;
    wasCancelled: boolean;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);

  const [showImportHistory, setShowImportHistory] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportHistory | null>(null);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusQuickFilter, setStatusQuickFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alumniToDelete, setAlumniToDelete] = useState<string | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);

  const abortRef = useRef(false);
  const { toast } = useToast();

  const capitalizeStatus = (status: string): string =>
    STATUS_LABEL_MAP[status] ?? status;

  // ─── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!isAdminLike(user?.role)) {
      toast({ title: 'Access Denied', description: 'Admin privileges required', variant: 'destructive' });
      navigate('/app');
    }
  }, [isAuthenticated, user, navigate, toast]);

  // ─── Debounce search ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Data fetchers ────────────────────────────────────────────────────────────

  const fetchAlumniRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (collegeFilter !== 'all') params.append('college', collegeFilter);
      if (programFilter !== 'all') params.append('program', programFilter);
      if (batchFilter !== 'all') params.append('batch', batchFilter);
      const response = await fetch(`${API_URL}/admin/alumni?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); return;
      }
      if (response.ok) setAlumniRecords(await response.json());
      else toast({ title: 'Error', description: 'Failed to fetch alumni records', variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch alumni records', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [search, collegeFilter, programFilter, batchFilter, navigate, toast]);

  const fetchImportHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/import-history`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) setImportHistory(await response.json());
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch import history', variant: 'destructive' });
    } finally { setLoadingHistory(false); }
  }, [toast]);

  const fetchColleges = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/colleges`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) setColleges(await response.json());
    } catch { console.error('Error fetching colleges'); }
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const token = getToken();
      const url = collegeFilter !== 'all'
        ? `${API_URL}/admin/programs/list?collegeId=${collegeFilter}`
        : `${API_URL}/admin/programs/list`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) setPrograms(await response.json());
    } catch { console.error('Error fetching programs'); }
  }, [collegeFilter]);

  const fetchBatchYears = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/batch-years`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) setBatchYears(await response.json());
    } catch { console.error('Error fetching batch years'); }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchColleges(); fetchBatchYears(); fetchImportHistory();
    }
  }, [isAuthenticated, user, fetchColleges, fetchBatchYears, fetchImportHistory]);

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchPrograms();
      if (collegeFilter !== 'all') setProgramFilter('all');
    }
  }, [isAuthenticated, user, collegeFilter, fetchPrograms]);

  useEffect(() => {
    if (isAuthenticated && isAdminLike(user?.role)) {
      fetchAlumniRecords(); setCurrentPage(1);
    }
  }, [isAuthenticated, user, search, collegeFilter, programFilter, batchFilter, fetchAlumniRecords]);

  // ─── Memoized table data ───────────────────────────────────────────────────────
  const sortedRecords = useMemo(() => {
    const records = statusQuickFilter === 'all'
      ? [...alumniRecords]
      : alumniRecords.filter(r => r.status === statusQuickFilter);
    if (!sortKey) return records;
    if (sortKey === 'name') records.sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      return sortDirection === 'asc' ? res : -res;
    });
    if (sortKey === 'status') {
      const orderAsc: Record<string, number> = { active: 0, inactive: 1, graduated: 2 };
      const orderDesc: Record<string, number> = { inactive: 0, active: 1, graduated: 2 };
      const order = sortDirection === 'asc' ? orderAsc : orderDesc;
      records.sort((a, b) => {
        const av = order[a.status] ?? 99; const bv = order[b.status] ?? 99;
        return av !== bv ? av - bv : a.name.localeCompare(b.name);
      });
    }
    return records;
  }, [alumniRecords, statusQuickFilter, sortKey, sortDirection]);

  const pagedRecords = useMemo(
    () => sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedRecords, currentPage, pageSize]
  );
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  // ─── View alumni + survey ──────────────────────────────────────────────────────
  const handleViewAlumni = async (alumnus: AlumniRecord) => {
    setSurveyResponses([]); setSelectedAlumni(alumnus);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/alumni/${alumnus.student_id}/responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSurveyResponses((await res.json()) || []);
    } catch { toast({ variant: 'destructive', title: 'Error loading survey' }); }
  };

  // ─── Soft delete ──────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!alumniToDelete) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/alumni/${alumniToDelete}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && !data.error) {
        setAlumniRecords(prev =>
          prev.map(a =>
            a.student_id === alumniToDelete
              ? { ...a, status: 'inactive' }
              : a
          )
        );
        setShowDeleteConfirm(false); setAlumniToDelete(null);
        toast({ title: 'Account Deactivated', description: 'The record is now hidden from active lists.' });
      } else throw new Error(data.error || 'Deactivation failed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Deactivation failed', description: msg });
    }
  };

  // ─── FILE IMPORT FLOW ─────────────────────────────────────────────────────────

  /**
   * STEP 1: Validate file type strictly
   */
  function validateFileType(file: File): string | null {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) {
      return 'Only .xlsx and .csv files are accepted. Please upload a valid file.';
    }
    return null;
  }

  /**
   * STEP 2: Parse raw rows from file, normalize column headers
   */
  async function parseAndValidateFile(file: File): Promise<{
    rows: ParsedRow[];
    headerErrors: string[];
  }> {
    const rawRows = await parseFileToRows(file);
    if (rawRows.length === 0) throw new Error('The file contains no data rows.');

    const firstRow = rawRows[0];
    const fileHeaders = Object.keys(firstRow);

    // Build column mapping: canonical key -> file header
    const colMap: Record<string, string> = {};
    for (const header of fileHeaders) {
      const canonical = resolveColumn(header);
      if (canonical) colMap[canonical] = header;
    }

    // Check required columns are present
    const headerErrors: string[] = [];
    for (const required of Object.keys(REQUIRED_COLUMNS)) {
      if (!colMap[required]) {
        const aliases = REQUIRED_COLUMNS[required];
        headerErrors.push(`Missing required column: "${required}" (accepted names: ${aliases.join(', ')})`);
      }
    }

    if (headerErrors.length > 0) return { rows: [], headerErrors };

    // Map raw rows to ParsedRow
    const rows: ParsedRow[] = rawRows.map((raw, i) => {
      const get = (key: string) => String(raw[colMap[key]] ?? '').trim();
      const getOpt = (key: string) => colMap[key] ? String(raw[colMap[key]] ?? '').trim() || undefined : undefined;
      return {
        rowIndex: i + 2, // +2: header=1, first data row=2
        student_id: get('student_id'),
        first_name: get('first_name'),
        last_name: get('last_name'),
        middle_name: getOpt('middle_name'),
        suffix: getOpt('suffix'),
        email: getOpt('email'),
        program: get('program'),
        batch_year: Number(get('batch_year')),
        status: getOpt('status'),
      };
    });

    return { rows, headerErrors: [] };
  }

  /**
   * STEP 3: Validate each row's data types and required fields
   */
  function validateRows(rows: ParsedRow[]): {
    valid: ParsedRow[];
    invalid: Array<ParsedRow & { errors: ValidationError[] }>;
  } {
    const valid: ParsedRow[] = [];
    const invalid: Array<ParsedRow & { errors: ValidationError[] }> = [];

    for (const row of rows) {
      const errors: ValidationError[] = [];

      if (!row.student_id) errors.push({ rowIndex: row.rowIndex, field: 'student_id', message: 'Student ID is required' });
      if (!row.first_name) errors.push({ rowIndex: row.rowIndex, field: 'first_name', message: 'First name is required' });
      if (!row.last_name) errors.push({ rowIndex: row.rowIndex, field: 'last_name', message: 'Last name is required' });
      if (!row.program) errors.push({ rowIndex: row.rowIndex, field: 'program', message: 'Program is required' });
      if (!isValidBatchYear(row.batch_year)) {
        errors.push({ rowIndex: row.rowIndex, field: 'batch_year', message: `Batch year "${row.batch_year}" is not a valid year (1900–2100)` });
      }
      if (row.email && !isValidEmail(row.email)) {
        errors.push({ rowIndex: row.rowIndex, field: 'email', message: `Email "${row.email}" is not a valid email address` });
      }
      if (row.status && !['active', 'inactive', 'graduated'].includes(row.status.toLowerCase())) {
        errors.push({ rowIndex: row.rowIndex, field: 'status', message: `Status "${row.status}" is invalid (must be active/inactive/graduated)` });
      }

      if (errors.length > 0) invalid.push({ ...row, errors });
      else valid.push(row);
    }

    return { valid, invalid };
  }

  /**
   * STEP 4: Find in-file duplicates (by student_id and email)
   */
  function findInFileDuplicates(rows: ParsedRow[]): {
    unique: ParsedRow[];
    duplicates: ParsedRow[];
  } {
    const seenStudentIds = new Map<string, number>();
    const seenEmails = new Map<string, number>();
    const duplicates: ParsedRow[] = [];
    const unique: ParsedRow[] = [];

    for (const row of rows) {
      const sid = row.student_id.toUpperCase();
      const email = row.email?.toLowerCase() ?? '';
      let isDup = false;

      if (seenStudentIds.has(sid)) {
        duplicates.push({ ...row, _dupReason: `Duplicate student_id "${row.student_id}" (first seen at row ${seenStudentIds.get(sid)})` } as ParsedRow);
        isDup = true;
      } else if (email && seenEmails.has(email)) {
        duplicates.push({ ...row, _dupReason: `Duplicate email "${row.email}" (first seen at row ${seenEmails.get(email)})` } as ParsedRow);
        isDup = true;
      }

      if (!isDup) {
        seenStudentIds.set(sid, row.rowIndex);
        if (email) seenEmails.set(email, row.rowIndex);
        unique.push(row);
      }
    }

    return { unique, duplicates };
  }

  /**
   * STEP 5: Check against DB for duplicates by sending student_ids and emails
   */
  async function checkDbDuplicates(rows: ParsedRow[]): Promise<{
    toInsert: ParsedRow[];
    dbDuplicates: ParsedRow[];
  }> {
    if (rows.length === 0) return { toInsert: [], dbDuplicates: [] };
    const token = getToken();
    const studentIds = rows.map(r => r.student_id);
    const emails = rows.map(r => r.email).filter(Boolean);

    const response = await fetch(`${API_URL}/admin/import/check-duplicates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds, emails }),
    });

    if (!response.ok) {
      // If the endpoint doesn't exist yet, return all as toInsert (graceful degradation)
      console.warn('Duplicate-check endpoint unavailable; skipping DB duplicate check');
      return { toInsert: rows, dbDuplicates: [] };
    }

    const { existingStudentIds, existingEmails }: {
      existingStudentIds: string[];
      existingEmails: string[];
    } = await response.json();

    const existingIdSet = new Set((existingStudentIds ?? []).map((s: string) => s.toUpperCase()));
    const existingEmailSet = new Set((existingEmails ?? []).map((e: string) => e.toLowerCase()));

    const toInsert: ParsedRow[] = [];
    const dbDuplicates: ParsedRow[] = [];

    for (const row of rows) {
      if (
        existingIdSet.has(row.student_id.toUpperCase()) ||
        (row.email && existingEmailSet.has(row.email.toLowerCase()))
      ) {
        dbDuplicates.push(row);
      } else {
        toInsert.push(row);
      }
    }

    return { toInsert, dbDuplicates };
  }

  /**
   * Main: parse file → validate → preview
   */
  const processFile = async (file: File) => {
    setParseError(null);
    setImportStep(1);

    // File type check
    const typeErr = validateFileType(file);
    if (typeErr) {
      setParseError(typeErr);
      setImportStep(0);
      return;
    }

    try {
      // Parse raw rows
      const { rows, headerErrors } = await parseAndValidateFile(file);

      if (headerErrors.length > 0) {
        setParseError(headerErrors.join('\n'));
        setImportStep(0);
        return;
      }

      // Validate data types / required fields
      const { valid, invalid } = validateRows(rows);

      // In-file duplicate detection
      const { unique: deduped, duplicates: inFileDups } = findInFileDuplicates(valid);

      // DB duplicate detection
      const { toInsert, dbDuplicates } = await checkDbDuplicates(deduped);

      setImportPreview({
        allRows: rows,
        validRows: toInsert,
        invalidRows: invalid,
        inFileduplicates: inFileDups,
        dbDuplicates,
      });
      setPreviewPage(0);
      setImportStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error during file parsing';
      setParseError(msg);
      setImportStep(0);
    }
  };

  /**
   * Confirm: insert valid rows in batches
   */
  const confirmImport = async () => {
    if (!importPreview || importPreview.validRows.length === 0) {
      toast({ title: 'Nothing to import', description: 'No valid rows ready for insert.' });
      return;
    }

    setImportStep(3);
    setImportProgress(0);
    abortRef.current = false;

    const rows = importPreview.validRows;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    let inserted = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < totalBatches; i++) {
      if (abortRef.current) break;

      const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/admin/import/batch`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            records: batch,
            filename: selectedFile?.name ?? 'import',
          }),
        });

        const data = await response.json();
        if (response.ok) {
          inserted += data.inserted ?? batch.length;
          if (data.errors) errors.push(...data.errors);
        } else {
          // Mark entire batch as failed
          batch.forEach(r => errors.push({ row: r.rowIndex, error: data.error || 'Batch insert failed' }));
        }
      } catch {
        batch.forEach(r => errors.push({ row: r.rowIndex, error: 'Network error during insert' }));
      }

      setImportProgress(Math.round(((i + 1) / totalBatches) * 100));

      // Yield to UI thread between batches
      await new Promise(r => setTimeout(r, 0));
    }

    const duplicatesSkipped =
      importPreview.inFileduplicates.length + importPreview.dbDuplicates.length;

    const wasCancelled = abortRef.current;

    setImportSummary({
      total: importPreview.allRows.length,
      inserted,
      duplicatesSkipped,
      invalidRejected: importPreview.invalidRows.length,
      errors,
      wasCancelled,
    });

    setImportStep(4);
    fetchAlumniRecords();
    fetchImportHistory();
  };

  const resetImport = () => {
    setImportStep(0);
    setSelectedFile(null);
    setImportPreview(null);
    setImportSummary(null);
    setParseError(null);
    setImportProgress(0);
    abortRef.current = false;
  };

  const handleCloseImport = () => {
    resetImport();
    setShowImport(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); await processFile(file); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); await processFile(file); }
  };

  // ─── Error report download ────────────────────────────────────────────────────
  const handleDownloadErrorReport = async (importId: number) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/import/${importId}/errors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `import-errors-${importId}.csv`; a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch { toast({ title: 'Error', description: 'Failed to download error report', variant: 'destructive' }); }
  };

  const handleDownloadSummaryErrors = () => {
    if (!importSummary) return;
    const rows = [['Row', 'Error'], ...importSummary.errors.map(e => [String(e.row), e.error])];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `import-errors-${Date.now()}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Name', 'College', 'Program', 'Batch', 'Status', 'Survey Status', 'Email'];
    const csvRows = alumniRecords.map(r => [
      r.student_id, r.name, r.college, r.program, r.batch,
      capitalizeStatus(r.status), capitalizeStatus(r.survey_status), r.email || ''
    ]);
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `alumni-records-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCollegeName = (collegeId: string) =>
    colleges.find(c => String(c.id) === collegeId)?.name ?? 'Unknown';

  const handleViewImportDetails = (importRecord: ImportHistory) => {
    setSelectedImport(importRecord); setShowImportDetails(true);
  };

  if (!isAuthenticated || !isAdminLike(user?.role)) return null;

  // ─── Preview pagination ───────────────────────────────────────────────────────
  const previewRows = importPreview?.allRows ?? [];
  const previewTotalPages = Math.max(1, Math.ceil(previewRows.length / PREVIEW_ROWS));
  const previewSlice = previewRows.slice(previewPage * PREVIEW_ROWS, (previewPage + 1) * PREVIEW_ROWS);

  const getRowStatus = (row: ParsedRow): 'valid' | 'invalid' | 'in-file-dup' | 'db-dup' => {
    if (!importPreview) return 'valid';
    if (importPreview.invalidRows.some(r => r.rowIndex === row.rowIndex)) return 'invalid';
    if (importPreview.inFileduplicates.some(r => r.rowIndex === row.rowIndex)) return 'in-file-dup';
    if (importPreview.dbDuplicates.some(r => r.rowIndex === row.rowIndex)) return 'db-dup';
    return 'valid';
  };

  const rowStatusBadge = (status: ReturnType<typeof getRowStatus>) => {
    switch (status) {
      case 'valid': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">✓ Valid</Badge>;
      case 'invalid': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-[10px]">✗ Invalid</Badge>;
      case 'in-file-dup': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">⟳ Dup (file)</Badge>;
      case 'db-dup': return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 text-[10px]">⟳ Dup (DB)</Badge>;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage alumni records and bulk import</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowImportHistory(true); fetchImportHistory(); }} className="gap-2">
            <Clock className="h-4 w-4" /> Import History
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2" disabled={alumniRecords.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { resetImport(); setShowImport(true); }} className="gap-2">
            <Upload className="h-4 w-4" /> Import Alumni
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={collegeFilter} onValueChange={setCollegeFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Colleges" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colleges</SelectItem>
              {colleges.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={programFilter} onValueChange={setProgramFilter} disabled={collegeFilter === 'all'}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {batchYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(collegeFilter !== 'all' || programFilter !== 'all' || batchFilter !== 'all' || statusQuickFilter !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Active filters:</span>
            {collegeFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">
                <Building2 className="h-3 w-3 mr-1" />{getCollegeName(collegeFilter)}
              </Badge>
            )}
            {programFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">
                <GraduationCap className="h-3 w-3 mr-1" />
                {programs.find(p => String(p.id) === programFilter)?.name ?? 'Program'}
              </Badge>
            )}
            {batchFilter !== 'all' && (
              <Badge variant="outline" className="bg-primary/5">Batch {batchFilter}</Badge>
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
        <button type="button" className="glass-card p-4 text-left hover:bg-muted/40 transition-colors"
          onClick={() => { setSortKey('name'); setSortDirection('asc'); setStatusQuickFilter('all'); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{alumniRecords.length}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
          </div>
        </button>
        <button type="button" className="glass-card p-4 text-left hover:bg-muted/40 transition-colors"
          onClick={() => { setSortKey('status'); setSortDirection('asc'); setStatusQuickFilter('active'); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold">{alumniRecords.filter(r => r.status === 'active').length}</p>
              <p className="text-xs text-muted-foreground">Active Accounts</p>
            </div>
          </div>
        </button>
        <button type="button" className="glass-card p-4 text-left hover:bg-muted/40 transition-colors"
          onClick={() => { setSortKey('status'); setSortDirection('desc'); setStatusQuickFilter('inactive'); setCurrentPage(1); }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><AlertCircle className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-2xl font-bold">{alumniRecords.filter(r => r.status === 'inactive').length}</p>
              <p className="text-xs text-muted-foreground">Inactive Records</p>
            </div>
          </div>
        </button>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><FileText className="h-5 w-5 text-info" /></div>
            <div>
              <p className="text-2xl font-bold">{alumniRecords.filter(r => r.survey_status === 'completed').length}</p>
              <p className="text-xs text-muted-foreground">Surveys Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alumni Table */}
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
                <TableHead>Actions</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No alumni records found
                  </TableCell>
                </TableRow>
              ) : (
                pagedRecords.map(a => (
                  <TableRow key={a.id} className="transition-colors hover:bg-muted/50 dark:hover:bg-white/10">
                    <TableCell className="font-mono text-sm">{a.student_id}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm">{a.college}</TableCell>
                    <TableCell className="text-sm">{a.program}</TableCell>
                    <TableCell>{a.batch}</TableCell>
                    <TableCell><StatusBadge status={capitalizeStatus(a.status)} /></TableCell>
                    <TableCell><StatusBadge status={capitalizeStatus(a.survey_status)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewAlumni(a)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setAlumniToDelete(a.student_id); setShowDeleteConfirm(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Pagination */}
      {sortedRecords.length > 0 && (
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            Showing{' '}
            <span className="font-medium">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedRecords.length)}
            </span>{' '}
            of <span className="font-medium">{sortedRecords.length}</span> records
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
              Previous
            </Button>
            <span>Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span></span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Alumni Profile + Survey Modal ── */}
      <Dialog open={!!selectedAlumni} onOpenChange={() => setSelectedAlumni(null)}>
        <DialogContent className="sm:max-w-lg" aria-describedby="profile-desc">
          <DialogHeader><DialogTitle className="font-display">Alumni Details</DialogTitle></DialogHeader>
          <div id="profile-desc" className="sr-only">Alumni profile and survey responses</div>
          {selectedAlumni && (
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="survey">Survey</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-1 mt-4">
                {([
                  ['Student ID', selectedAlumni.student_id],
                  ['Name', selectedAlumni.name],
                  ['College', selectedAlumni.college],
                  ['Program', selectedAlumni.program],
                  ['Batch', selectedAlumni.batch],
                  ['Email', selectedAlumni.email || 'N/A'],
                  ['Status', capitalizeStatus(selectedAlumni.status)],
                  ['Survey', capitalizeStatus(selectedAlumni.survey_status)],
                ] as [string, string | number][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2 border-b last:border-0 text-sm">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="survey" className="mt-4 space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {surveyResponses.length > 0 ? (
                  surveyResponses.map((r, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg border">
                      <p className="text-xs font-bold uppercase mb-1">{r.question}</p>
                      <p className="text-sm">{r.answer_text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-muted-foreground italic">No survey responses found.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Soft Delete Confirmation ── */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => { setShowDeleteConfirm(open); if (!open) setAlumniToDelete(null); }}>
        <DialogContent className="sm:max-w-md" aria-describedby="delete-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-display">
              <AlertCircle className="h-5 w-5" /> Confirm Deactivation
            </DialogTitle>
          </DialogHeader>
          <div id="delete-desc" className="sr-only">Confirm alumni account deactivation</div>
          <p className="text-sm text-muted-foreground py-2">
            Deactivate this account? This hides the alumnus from active lists but preserves their data in the system.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setAlumniToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Deactivate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import History Modal ── */}
      <Dialog open={showImportHistory} onOpenChange={setShowImportHistory}>
        <DialogContent className="sm:max-w-5xl" aria-describedby="history-desc">
          <DialogHeader><DialogTitle className="font-display">Import History</DialogTitle></DialogHeader>
          <div id="history-desc" className="sr-only">History of all alumni data imports</div>
          {loadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : (
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">
                      No import history found.
                    </TableCell>
                  </TableRow>
                ) : importHistory.map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">{imp.filename}</TableCell>
                    <TableCell>{imp.uploaded_by}</TableCell>
                    <TableCell>{format(new Date(imp.uploaded_at), 'MMM d, yyyy h:mm a')}</TableCell>
                    <TableCell>{imp.total_records}</TableCell>
                    <TableCell className="text-success">{imp.success_count}</TableCell>
                    <TableCell className="text-destructive">{imp.failed_count}</TableCell>
                    <TableCell>
                      <StatusBadge status={imp.status === 'completed' ? 'Completed' : imp.status === 'partial' ? 'Partial' : 'Failed'} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewImportDetails(imp)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Import Details Modal ── */}
      <Dialog open={showImportDetails} onOpenChange={setShowImportDetails}>
        <DialogContent className="sm:max-w-lg" aria-describedby="import-details-desc">
          <DialogHeader><DialogTitle className="font-display">Import Details</DialogTitle></DialogHeader>
          <div id="import-details-desc" className="sr-only">Detailed information about the selected import</div>
          {selectedImport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {([
                  ['Filename', selectedImport.filename],
                  ['Uploaded By', selectedImport.uploaded_by],
                  ['Date', format(new Date(selectedImport.uploaded_at), 'MMMM d, yyyy')],
                  ['Time', format(new Date(selectedImport.uploaded_at), 'h:mm a')],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
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
                <Button variant="outline" onClick={() => setShowImportDetails(false)}>Close</Button>
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

      {/* ── Import Alumni Data Modal ── */}
      <Dialog open={showImport} onOpenChange={(open) => { if (!open) handleCloseImport(); }}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          aria-describedby="import-desc"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Alumni Data
              {importStep > 0 && importStep < 4 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  — Step {importStep} of 3
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div id="import-desc" className="sr-only">Upload an Excel or CSV file containing alumni records</div>

          {/* ── Step 0: Upload ── */}
          {importStep === 0 && (
            <div className="space-y-4">
              {parseError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    File validation failed
                  </div>
                  <pre className="text-xs text-destructive/80 whitespace-pre-wrap font-mono">{parseError}</pre>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">Drag & drop your file here, or click to browse</p>
                <p className="text-sm text-muted-foreground mb-1">Accepted formats: <code className="bg-muted px-1 rounded">.xlsx</code> and <code className="bg-muted px-1 rounded">.csv</code> only</p>
                <p className="text-xs text-muted-foreground">Required columns: student_id, first_name, last_name, program, batch_year (+ optional: email, middle_name, suffix, status)</p>
              </div>
              <input type="file" id="file-upload-input" className="hidden" accept=".xlsx,.csv" onChange={handleFileSelect} />
            </div>
          )}

          {/* ── Step 1: Parsing ── */}
          {importStep === 1 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">Parsing and validating file…</p>
              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {importStep === 2 && importPreview && (
            <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">
              {/* Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xl font-bold">{importPreview.allRows.length}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{importPreview.validRows.length}</p>
                  <p className="text-xs text-muted-foreground">Will Import</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                    {importPreview.inFileduplicates.length + importPreview.dbDuplicates.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Duplicates Skipped</p>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
                  <p className="text-xl font-bold text-red-700 dark:text-red-400">{importPreview.invalidRows.length}</p>
                  <p className="text-xs text-muted-foreground">Invalid Rejected</p>
                </div>
              </div>

              {/* Detail tabs for issues */}
              {(importPreview.invalidRows.length > 0 || importPreview.inFileduplicates.length > 0 || importPreview.dbDuplicates.length > 0) && (
                <Tabs defaultValue="invalid" className="flex-shrink-0">
                  <TabsList>
                    {importPreview.invalidRows.length > 0 && (
                      <TabsTrigger value="invalid" className="gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        Invalid ({importPreview.invalidRows.length})
                      </TabsTrigger>
                    )}
                    {importPreview.inFileduplicates.length > 0 && (
                      <TabsTrigger value="file-dups" className="gap-1.5">
                        <SkipForward className="h-3.5 w-3.5 text-amber-500" />
                        File Dups ({importPreview.inFileduplicates.length})
                      </TabsTrigger>
                    )}
                    {importPreview.dbDuplicates.length > 0 && (
                      <TabsTrigger value="db-dups" className="gap-1.5">
                        <SkipForward className="h-3.5 w-3.5 text-orange-500" />
                        DB Dups ({importPreview.dbDuplicates.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="invalid" className="max-h-36 overflow-auto mt-2">
                    <div className="space-y-1">
                      {importPreview.invalidRows.map(row => (
                        <div key={row.rowIndex} className="text-xs bg-destructive/5 border border-destructive/20 rounded px-3 py-1.5">
                          <span className="font-mono font-semibold">Row {row.rowIndex}</span>
                          {' — '}
                          {row.errors.map(e => `${e.field}: ${e.message}`).join(' | ')}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="file-dups" className="max-h-36 overflow-auto mt-2">
                    <div className="space-y-1">
                      {importPreview.inFileduplicates.map(row => (
                        <div key={row.rowIndex} className="text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-1.5">
                          <span className="font-mono font-semibold">Row {row.rowIndex}</span>
                          {' — '}
                          {row.student_id} {row.email ? `/ ${row.email}` : ''} (duplicate within file)
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="db-dups" className="max-h-36 overflow-auto mt-2">
                    <div className="space-y-1">
                      {importPreview.dbDuplicates.map(row => (
                        <div key={row.rowIndex} className="text-xs bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-1.5">
                          <span className="font-mono font-semibold">Row {row.rowIndex}</span>
                          {' — '}
                          {row.student_id} {row.email ? `/ ${row.email}` : ''} (already in database)
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {/* Full preview table */}
              <div className="flex-1 overflow-auto min-h-0 rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSlice.map(row => {
                      const status = getRowStatus(row);
                      return (
                        <TableRow key={row.rowIndex} className={
                          status === 'invalid' ? 'bg-red-50/50 dark:bg-red-950/10' :
                          status === 'in-file-dup' || status === 'db-dup' ? 'bg-amber-50/50 dark:bg-amber-950/10 opacity-60' :
                          ''
                        }>
                          <TableCell className="font-mono text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                          <TableCell>{rowStatusBadge(status)}</TableCell>
                          <TableCell className="font-mono text-xs">{row.student_id}</TableCell>
                          <TableCell className="text-sm">{row.first_name}</TableCell>
                          <TableCell className="text-sm">{row.last_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{row.program}</TableCell>
                          <TableCell className="text-xs">{row.batch_year}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Preview pagination */}
              {previewTotalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
                  <span>
                    Showing rows {previewPage * PREVIEW_ROWS + 1}–{Math.min((previewPage + 1) * PREVIEW_ROWS, previewRows.length)} of {previewRows.length}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={previewPage === 0}
                      onClick={() => setPreviewPage(p => Math.max(0, p - 1))}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="px-2 py-1 rounded border text-xs">
                      {previewPage + 1} / {previewTotalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={previewPage >= previewTotalPages - 1}
                      onClick={() => setPreviewPage(p => Math.min(previewTotalPages - 1, p + 1))}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end flex-shrink-0 pt-2 border-t">
                <Button variant="outline" onClick={resetImport}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmImport}
                  disabled={importPreview.validRows.length === 0}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Import {importPreview.validRows.length} Records
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Importing (batch progress) ── */}
          {importStep === 3 && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Importing records…</span>
                  <span className="font-medium">{importProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Processing in batches of {BATCH_SIZE} — please do not close this window
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { abortRef.current = true; }}
              >
                Cancel Import
              </Button>
            </div>
          )}

          {/* ── Step 4: Summary ── */}
          {importStep === 4 && importSummary && (
            <div className="space-y-5">
              <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                importSummary.wasCancelled
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              }`}>
                {importSummary.wasCancelled
                  ? <XCircle className="h-8 w-8 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  : <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                }
                <div>
                  <p className={`font-semibold ${importSummary.wasCancelled ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                    {importSummary.wasCancelled ? 'Import Cancelled' : 'Import Complete'}
                  </p>
                  <p className={`text-sm ${importSummary.wasCancelled ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {importSummary.wasCancelled
                      ? `Stopped early — ${importSummary.inserted} record${importSummary.inserted !== 1 ? 's' : ''} were imported before cancellation.`
                      : `${importSummary.inserted} record${importSummary.inserted !== 1 ? 's' : ''} successfully imported.`
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{importSummary.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{importSummary.inserted}</p>
                  <p className="text-xs text-muted-foreground mt-1">Successfully Imported</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{importSummary.duplicatesSkipped}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duplicates Skipped</p>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{importSummary.invalidRejected}</p>
                  <p className="text-xs text-muted-foreground mt-1">Invalid Rejected</p>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Insert errors ({importSummary.errors.length}):</p>
                  <div className="max-h-32 overflow-auto rounded border bg-destructive/5 p-2 space-y-1">
                    {importSummary.errors.map((err, idx) => (
                      <div key={idx} className="text-xs text-destructive font-mono">
                        Row {err.row}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t">
                {importSummary.errors.length > 0 && (
                  <Button variant="outline" className="gap-2" onClick={handleDownloadSummaryErrors}>
                    <Download className="h-4 w-4" /> Download Error Report
                  </Button>
                )}
                <Button onClick={handleCloseImport} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
