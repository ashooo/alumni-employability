import { useState } from 'react';
import { FileText, FileSpreadsheet, Table2, Loader2, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalFilterBar, FilterState, defaultFilters } from '@/components/GlobalFilterBar';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const reportTypes = [
  'Alumni per Program',
  'Employment Trends',
  'Participation Rate',
  'Degree Alignment',
  'Skills Assessment Summary',
];

// ── PLP Green Palette (ARGB) ──────────────────────────────────────────────────
const G1 = 'FF013C06'; // school name row  – darkest
const G2 = 'FF014A07'; // address / dept rows
const G3 = 'FF016008'; // report title row
const G4 = 'FF013504'; // date row         – near-black

// ── Logo paths (from /public/) ────────────────────────────────────────────────
const LOGO_LEFT_PATH  = '/plp_logo.png';
const LOGO_RIGHT_PATH = '/ccs_logo.png';

async function fetchImage(path: string): Promise<ArrayBuffer> {
  const res = await fetch(path);
  return res.arrayBuffer();
}

const defaultHeader = {
  schoolName: 'Pamantasan ng Lungsod ng Pasig',
  address:    'Alkalde Jose St. Kapasigan, Pasig City',
  department: 'College of Computer Studies',
  showLogos:  true,
};

// ── Layout constants ──────────────────────────────────────────────────────────
const LOGO_COL_WIDTH   = 14;   // Excel width units for each logo column
const LOGO_SIZE_PX     = 85;   // left (PLP) logo size in pixels
const LOGO_RIGHT_SIZE  = 68;   // right (CCS) logo size — slightly smaller
const ROW_HEIGHTS      = [30, 16, 20, 24, 15] as const; // pts for rows 1-5

// Minimum width (in Excel units) for each inner data column when there are few columns.
// This prevents the header text area from being too narrow for logos + text to coexist.
const MIN_DATA_COL_WIDTH = 22;
// Minimum *total* inner-data width (sum of all data col widths) in Excel units.
// At ~7px per unit this keeps the header text area at least ~700px wide.
const MIN_TOTAL_DATA_WIDTH = 80; // units — roughly equivalent to ~6 standard columns

// ── Modal ─────────────────────────────────────────────────────────────────────
function HeaderModal({
  header, onChange, onClose, onReset, reportType,
}: {
  header: typeof defaultHeader;
  onChange: (h: typeof defaultHeader) => void;
  onClose: () => void;
  onReset: () => void;
  reportType: string;
}) {
  const field = (id: keyof typeof defaultHeader, label: string, ph: string) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={header[id] as string}
        onChange={e => onChange({ ...header, [id]: e.target.value })}
        placeholder={ph}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Customize Export Header</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {field('schoolName', 'School / University Name', 'e.g. Pamantasan ng Lungsod ng Pasig')}
        {field('address',    'Address',                  'e.g. Alkalde Jose St. Kapasigan, Pasig City')}
        {field('department', 'Department / College',     'e.g. College of Computer Studies')}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="showLogos" checked={header.showLogos}
            onChange={e => onChange({ ...header, showLogos: e.target.checked })}
            className="h-4 w-4 cursor-pointer" />
          <Label htmlFor="showLogos" className="cursor-pointer">Show logos in Excel export</Label>
        </div>

        {/* Live preview */}
        <div className="rounded-lg overflow-hidden border text-center text-xs leading-5">
          <div className="py-1.5 font-bold tracking-wide uppercase" style={{ background: '#013C06', color: '#fff' }}>
            {header.schoolName || '—'}
          </div>
          <div className="py-1 italic" style={{ background: '#014A07', color: '#fff' }}>
            {header.address || '—'}
          </div>
          <div className="py-1 font-semibold uppercase" style={{ background: '#014A07', color: '#fff' }}>
            {header.department || '—'}
          </div>
          <div className="py-1.5 font-semibold" style={{ background: '#016008', color: '#fff' }}>
            Alumni Tracer: {reportType || '<Report Type>'} Report
          </div>
          <div className="py-1 italic" style={{ background: '#013504', color: '#ccc' }}>
            Generated on: {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-muted-foreground">Reset to defaults</Button>
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [filters, setFilters]         = useState<FilterState>(defaultFilters);
  const [reportType, setReportType]   = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData]   = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const [header, setHeader]           = useState(defaultHeader);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!reportType) return;
    setIsLoading(true);
    setShowPreview(false);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (filters.program !== 'all')          params.append('program',          filters.program);
      if (filters.batchYear !== 'all')        params.append('batchYear',        filters.batchYear);
      if (filters.employmentStatus !== 'all') params.append('employmentStatus', filters.employmentStatus);
      if (filters.search)                     params.append('search',           filters.search);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      setReportData(await res.json());
      setShowPreview(true);
      toast({ title: 'Report Generated', description: 'Preview ready.' });
    } catch {
      toast({ title: 'Generation Failed', description: 'Could not reach server.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'Excel' | 'CSV') => {
    if (!reportData.length) {
      toast({ title: 'Export Failed', description: 'No data to export.', variant: 'destructive' });
      return;
    }

    const dateStr  = new Date().toLocaleDateString();
    const fileName = `${reportType.replace(/\s+/g, '_')}_Report`;
    const dataCols = Object.keys(reportData[0]);

    const line1 = header.schoolName.toUpperCase();
    const line2 = header.address;
    const line3 = header.department.toUpperCase();
    const line4 = `Alumni Tracer: ${reportType} Report`;
    const line5 = `Generated on: ${dateStr}`;

    if (format === 'Excel') {
      try {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Alumni Tracer System';
        wb.created = new Date();
        const ws = wb.addWorksheet(reportType.substring(0, 31));

        // ── Column structure ─────────────────────────────────────────────────
        // Col 1          → left logo holder  (blank, wide)
        // Cols 2 … N+1   → actual data columns
        // Col N+2        → right logo holder (blank, wide)
        const numData    = dataCols.length;
        const totalCols  = numData + 2;
        const COL_LOGO_L     = 1;
        const COL_LOGO_R     = totalCols;
        const COL_DATA_START = 2;
        const COL_DATA_END   = numData + 1;

        // ── Compute per-column widths, enforcing a minimum total ─────────────
        // First pass: natural widths
        const naturalWidths = dataCols.map(c => Math.max(c.length + 8, MIN_DATA_COL_WIDTH));
        const naturalTotal  = naturalWidths.reduce((a, b) => a + b, 0);

        // If the natural total is below our minimum, distribute the extra width
        // evenly across all data columns so the header text area stays wide enough.
        const dataColWidths = naturalWidths.slice();
        if (naturalTotal < MIN_TOTAL_DATA_WIDTH) {
          const deficit    = MIN_TOTAL_DATA_WIDTH - naturalTotal;
          const perColBonus = deficit / numData;
          for (let i = 0; i < numData; i++) {
            dataColWidths[i] = naturalWidths[i] + perColBonus;
          }
        }

        // Apply widths
        ws.getColumn(COL_LOGO_L).width = LOGO_COL_WIDTH;
        for (let i = 0; i < numData; i++) {
          ws.getColumn(COL_DATA_START + i).width = dataColWidths[i];
        }
        ws.getColumn(COL_LOGO_R).width = LOGO_COL_WIDTH;

        // ── Helper: add a merged letterhead row ──────────────────────────────
        const addLetterheadRow = (
          text: string,
          bgArgb: string,
          bold: boolean,
          fontSize: number,
          rowHeight: number,
          italic = false,
        ) => {
          const row = ws.addRow(Array(totalCols).fill(''));
          row.height = rowHeight;
          ws.mergeCells(row.number, 1, row.number, totalCols);
          const cell     = row.getCell(1);
          cell.value     = text;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
          cell.font      = { bold, italic, size: fontSize, name: 'Arial', color: { argb: 'FFFFFFFF' } };
          for (let c = 1; c <= totalCols; c++) {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          }
          return row;
        };

        // ── Letterhead rows 1–5 ──────────────────────────────────────────────
        addLetterheadRow(line1, G1, true,  15, ROW_HEIGHTS[0]);
        addLetterheadRow(line2, G2, false, 10, ROW_HEIGHTS[1], true);
        addLetterheadRow(line3, G2, true,  12, ROW_HEIGHTS[2]);
        addLetterheadRow(line4, G3, true,  12, ROW_HEIGHTS[3]);
        addLetterheadRow(line5, G4, false,  9, ROW_HEIGHTS[4], true);

        // ── Gold separator (row 6) ───────────────────────────────────────────
        const sepRow = ws.addRow(Array(totalCols).fill(''));
        sepRow.height = 4;
        ws.mergeCells(sepRow.number, 1, sepRow.number, totalCols);
        for (let c = 1; c <= totalCols; c++) {
          sepRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
        }

        // ── Column header row (row 7) ────────────────────────────────────────
        const hdrRow = ws.addRow(['', ...dataCols, '']);
        hdrRow.height = 22;
        for (const c of [COL_LOGO_L, COL_LOGO_R]) {
          hdrRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
        }
        for (let i = COL_DATA_START; i <= COL_DATA_END; i++) {
          const cell = hdrRow.getCell(i);
          cell.font      = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border    = {
            top:    { style: 'thin',   color: { argb: 'FF388E3C' } },
            bottom: { style: 'medium', color: { argb: 'FFFFD700' } },
            left:   { style: 'thin',   color: { argb: 'FF388E3C' } },
            right:  { style: 'thin',   color: { argb: 'FF388E3C' } },
          };
        }

        // ── Data rows ────────────────────────────────────────────────────────
        reportData.forEach((rowObj, rowIdx) => {
          const values = dataCols.map(c => rowObj[c]);
          const dr     = ws.addRow(['', ...values, '']);
          const isEven = rowIdx % 2 === 1;
          const rowBg  = isEven ? 'FFE8F5E9' : 'FFFFFFFF';

          for (const c of [COL_LOGO_L, COL_LOGO_R]) {
            dr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          }
          for (let i = 0; i < numData; i++) {
            const cell  = dr.getCell(COL_DATA_START + i);
            const val   = values[i];
            const isNum = typeof val === 'number';
            cell.alignment = { horizontal: isNum ? 'right' : 'left', vertical: 'middle' };
            cell.font      = { size: 10, name: 'Arial', color: { argb: 'FF1A1A1A' } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.border    = {
              top:    { style: 'hair', color: { argb: 'FFBDBDBD' } },
              bottom: { style: 'hair', color: { argb: 'FFBDBDBD' } },
              left:   { style: 'hair', color: { argb: 'FFBDBDBD' } },
              right:  { style: 'hair', color: { argb: 'FFBDBDBD' } },
            };
          }
        });

        // ── Totals row ────────────────────────────────────────────────────────
        const totDataVals = dataCols.map((c, i) => {
          if (i === 0) return 'TOTAL';
          const vals = reportData.map(r => r[c]);
          if (vals.every(v => typeof v === 'number')) return (vals as number[]).reduce((a, b) => a + b, 0);
          return '';
        });
        const totRow = ws.addRow(['', ...totDataVals, '']);
        totRow.height = 20;

        for (const c of [COL_LOGO_L, COL_LOGO_R]) {
          totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: G1 } };
        }
        for (let i = 0; i < numData; i++) {
          const cell = totRow.getCell(COL_DATA_START + i);
          const val  = totDataVals[i];
          cell.font      = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: G1 } };
          cell.alignment = {
            horizontal: i === 0 ? 'left' : (typeof val === 'number' ? 'right' : 'left'),
            vertical:   'middle',
          };
          cell.border = {
            top:    { style: 'medium', color: { argb: 'FFFFD700' } },
            bottom: { style: 'medium', color: { argb: 'FFFFD700' } },
            left:   { style: 'thin',   color: { argb: 'FF388E3C' } },
            right:  { style: 'thin',   color: { argb: 'FF388E3C' } },
          };
        }

        // ── Logos ─────────────────────────────────────────────────────────────
        if (header.showLogos) {
          try {
            const [leftBuf, rightBuf] = await Promise.all([
              fetchImage(LOGO_LEFT_PATH),
              fetchImage(LOGO_RIGHT_PATH),
            ]);
            const leftId  = wb.addImage({ buffer: leftBuf,  extension: 'png' });
            const rightId = wb.addImage({ buffer: rightBuf, extension: 'png' });

            const toEmu = (px: number) => Math.round(px * 9525);

            const headerPtTotal = ROW_HEIGHTS.reduce((a, b) => a + b, 0);
            const headerPx      = headerPtTotal * (96 / 72);
            const PAD_PX        = 8;

            // Left (PLP) logo — full size, vertically centered
            const leftTopPx = Math.max(4, Math.round((headerPx - LOGO_SIZE_PX) / 2));
            ws.addImage(leftId, {
              tl: {
                nativeCol:    0,
                nativeColOff: toEmu(PAD_PX),
                nativeRow:    0,
                nativeRowOff: toEmu(leftTopPx),
              } as any,
              ext:    { width: LOGO_SIZE_PX, height: LOGO_SIZE_PX },
              editAs: 'oneCell',
            } as any);

            // Right (CCS) logo — slightly smaller, vertically centered independently
            const rightTopPx = Math.max(4, Math.round((headerPx - LOGO_RIGHT_SIZE) / 2));
            ws.addImage(rightId, {
              tl: {
                nativeCol:    totalCols - 1,
                nativeColOff: toEmu(PAD_PX),
                nativeRow:    0,
                nativeRowOff: toEmu(rightTopPx),
              } as any,
              ext:    { width: LOGO_RIGHT_SIZE, height: LOGO_RIGHT_SIZE },
              editAs: 'oneCell',
            } as any);

          } catch (imgErr) {
            console.warn('Logo images could not be loaded:', imgErr);
          }
        }

        // ── Download ──────────────────────────────────────────────────────────
        const buffer = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          `${fileName}.xlsx`,
        );
        toast({ title: 'Export Successful', description: 'Excel file downloaded.' });

      } catch (e) {
        console.error(e);
        toast({ title: 'Export Error', description: 'Failed to generate Excel.', variant: 'destructive' });
      }

    } else {
      // ── CSV ───────────────────────────────────────────────────────────────
      try {
        const letterhead = [line1, line2, line3, line4, line5, ''].map(l => `"${l}"`).join('\n');
        const dataRows   = reportData.map(row =>
          dataCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','),
        );
        const totRow = dataCols.map((c, i) => {
          const vals = reportData.map(r => r[c]);
          if (i === 0) return '"TOTAL"';
          if (vals.every(v => typeof v === 'number'))
            return `"${(vals as number[]).reduce((a, b) => a + b, 0)}"`;
          return '""';
        }).join(',');

        const csv  = [letterhead, dataCols.map(c => `"${c}"`).join(','), ...dataRows, totRow].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${fileName}.csv`; a.style.visibility = 'hidden';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast({ title: 'Export Successful', description: 'CSV downloaded.' });
      } catch {
        toast({ title: 'Export Error', description: 'Failed to generate CSV.', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Report Generation</h1>
        <p className="text-muted-foreground text-sm">Generate and export analytical reports</p>
      </div>

      {modalOpen && (
        <HeaderModal
          header={header}
          onChange={setHeader}
          onClose={() => setModalOpen(false)}
          onReset={() => setHeader(defaultHeader)}
          reportType={reportType}
        />
      )}

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Report Type</label>
            <Select value={reportType} onValueChange={v => { setReportType(v); setShowPreview(false); }}>
              <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
              <SelectContent>
                {reportTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={!reportType || isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('Excel')} disabled={!showPreview || isLoading} className="gap-1">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('CSV')} disabled={!showPreview || isLoading} className="gap-1">
              <Table2 className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)} className="gap-1" title="Customize header">
              <Settings2 className="h-4 w-4" /> Header
            </Button>
          </div>
        </div>
      </div>

      <GlobalFilterBar filters={filters} onFiltersChange={setFilters} />

      {showPreview && reportData.length > 0 && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="font-display font-semibold mb-4">Data Preview — {reportType}</h3>
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(reportData[0]).map(h => (
                    <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, ri) => (
                  <TableRow key={ri}>
                    {Object.values(row).map((v: any, ci) => (
                      <TableCell key={ci}>{v}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showPreview && reportData.length === 0 && (
        <div className="glass-card p-6 text-center text-muted-foreground animate-fade-in">
          No data found for the selected report and filters.
        </div>
      )}
    </div>
  );
}