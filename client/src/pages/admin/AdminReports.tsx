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

// ── Colors ────────────────────────────────────────────────────────────────────
const NAVY_ARGB = 'FF1B3A6B';
const HEADER_ARGB = 'FFDDEBFA';
const HEADER_BORDER_ARGB = 'FFB7CCE8';
const TOTAL_ARGB = 'FFD2E4F8';
const WHITE_ARGB = 'FFFFFFFF';
const BLACK_ARGB = 'FF1A1A1A';
const GRAY_ARGB = 'FF555555';
const DIVIDER_ARGB = 'FFB8B8B8';
const ROW_ALT_ARGB = 'FFF7F7F7'; // very subtle alternating row

// ── Logo paths ────────────────────────────────────────────────────────────────
const LOGO_SEAL_PATH = '/seal_logo.png';
const LOGO_PASIG_PATH = '/pasig_logo.png';
const LOGO_PLP_PATH = '/plp_logo.png';

async function fetchImage(path: string): Promise<ArrayBuffer> {
  const res = await fetch(path);
  return res.arrayBuffer();
}

/** Normalize snake_case / UPPER_CASE API values to human-readable strings. */
function normalizeStr(val: string): string {
  return val.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const defaultHeader = {
  office: 'College of Computer Studies',
  address: 'Alkalde Jose St. Kapasigan, Pasig City, Philippines 1600',
  contact: '628-1014 Loc. 106',
  email: 'ccs@plpasig.edu.ph',
  showHeader: true,
};

// ── Layout ────────────────────────────────────────────────────────────────────
const LOGO_COL_W = 13;   // Excel col width per logo column
const DATA_COL_MIN = 20;
const MIN_TOTAL_W = 85;

// Row heights in points
const RH = {
  navy: 24,  // 1 — navy university name band
  office: 21,  // 2 — office / dept
  address: 15,  // 3 — address
  contact: 14,  // 4 — phone + email
  separator: 4,  // 5 — gray rule
  date: 12,  // 6 — generated date
  header: 22,  // 7 — column headers
} as const;

// ── Modal ─────────────────────────────────────────────────────────────────────
function HeaderModal({
  header, onChange, onClose, onReset,
}: {
  header: typeof defaultHeader;
  onChange: (h: typeof defaultHeader) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const field = (id: keyof typeof defaultHeader, label: string, ph: string, type = 'text') => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id} type={type}
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {field('office', 'Office / Department', 'e.g. College of Computer Studies')}
        {field('address', 'Address', 'e.g. Alkalde Jose St. Kapasigan, Pasig City, Philippines 1600')}
        {field('contact', 'Contact Number', 'e.g. 628-1014 Loc. 106', 'tel')}
        {field('email', 'Email Address', 'e.g. ccs@plpasig.edu.ph', 'email')}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="showHeader" checked={header.showHeader}
            onChange={e => onChange({ ...header, showHeader: e.target.checked })}
            className="h-4 w-4 cursor-pointer" />
          <Label htmlFor="showHeader" className="cursor-pointer">Show header in export</Label>
        </div>

        {/* Live preview */}
        <div className="rounded-lg overflow-hidden border bg-white shadow-sm text-xs">
          <div className="flex items-stretch">
            <div className="flex items-center justify-center gap-1.5 px-2 py-2 bg-white border-r border-gray-200 min-w-[96px]">
              {['SEAL', 'PASIG', 'PLP'].map(l => (
                <div key={l} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[5px] text-gray-500 font-bold">{l}</div>
              ))}
            </div>
            <div className="flex-1 text-center">
              <div className="py-1 font-bold tracking-widest uppercase text-white text-[8px]" style={{ background: '#1B3A6B' }}>
                Pamantasan ng Lungsod ng Pasig
              </div>
              <div className="pt-0.5 font-bold text-black text-[9px]">{header.office || '—'}</div>
              <div className="text-gray-500 text-[7px]">📍 {header.address || '—'}</div>
              <div className="pb-1 text-gray-500 text-[7px]">📞 {header.contact || '—'}  ✉ {header.email || '—'}</div>
            </div>
          </div>
          <div className="h-px bg-gray-300" />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-muted-foreground">
            Reset to defaults
          </Button>
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [reportType, setReportType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [header, setHeader] = useState(defaultHeader);
  const { toast } = useToast();

  // ── Fetch report data ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!reportType) return;
    setIsLoading(true);
    setShowPreview(false);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (filters.program !== 'all') params.append('program', filters.program);
      if (filters.batchYear !== 'all') params.append('batchYear', filters.batchYear);
      if (filters.employmentStatus !== 'all') params.append('employmentStatus', filters.employmentStatus);
      if (filters.search) params.append('search', filters.search);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/reports?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const raw: any[] = await res.json();

      // Normalize all string values coming from the API
      const normalized = raw.map(row => {
        const out: Record<string, any> = {};
        for (const key of Object.keys(row)) {
          const v = row[key];
          out[key] = typeof v === 'string' ? normalizeStr(v) : v;
        }
        return out;
      });

      setReportData(normalized);
      setShowPreview(true);
      toast({ title: 'Report Generated', description: 'Preview ready.' });
    } catch {
      toast({ title: 'Generation Failed', description: 'Could not reach server.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async (format: 'Excel' | 'CSV' | 'PDF') => {
    if (!reportData.length) {
      toast({ title: 'Export Failed', description: 'No data to export.', variant: 'destructive' });
      return;
    }

    const dateStr = new Date().toLocaleDateString();
    const fileName = `${reportType.replace(/\s+/g, '_')}_Report`;
    const dataCols = Object.keys(reportData[0]);
    const dateLabel = `Generated on: ${dateStr}`;
    const univName = 'PAMANTASAN NG LUNGSOD NG PASIG';

    // ── EXCEL ─────────────────────────────────────────────────────────────────
    if (format === 'PDF') {
      try {
        const headerHtml = header.showHeader
          ? `
            <div class="report-header">
              <div class="univ">PAMANTASAN NG LUNGSOD NG PASIG</div>
              <div class="office">${header.office}</div>
              <div class="meta">${header.address}</div>
              <div class="meta">${header.contact} | ${header.email}</div>
            </div>
          `
          : '';

        const th = dataCols.map(c => `<th>${c}</th>`).join('');
        const rows = reportData.map(row => {
          const tds = dataCols.map(c => `<td>${String(row[c] ?? '')}</td>`).join('');
          return `<tr>${tds}</tr>`;
        }).join('');

        const totalCells = dataCols.map((c, i) => {
          if (i === 0) return '<td><strong>TOTAL</strong></td>';
          const vals = reportData.map(r => r[c]);
          if (vals.every(v => typeof v === 'number')) {
            const sum = (vals as number[]).reduce((a, b) => a + b, 0);
            return `<td><strong>${sum}</strong></td>`;
          }
          return '<td></td>';
        }).join('');

        const html = `
          <!doctype html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>${fileName}</title>
            <style>
              @page { size: A4 landscape; margin: 16mm; }
              body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; }
              .report-header { text-align: center; margin-bottom: 12px; }
              .univ { background: #1B3A6B; color: #fff; font-weight: 700; padding: 6px; letter-spacing: .08em; }
              .office { font-weight: 700; margin-top: 6px; font-size: 14px; }
              .meta { color: #555; font-size: 11px; margin-top: 2px; }
              .date { text-align: right; color: #555; font-size: 11px; margin: 8px 0; }
              h2 { margin: 10px 0 8px; font-size: 16px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #cfd8e3; padding: 6px; text-align: center; }
              th { background: #DDEBFA; font-weight: 700; }
              tbody tr:nth-child(even) td { background: #F7F7F7; }
              tfoot td { background: #D2E4F8; font-weight: 700; }
            </style>
          </head>
          <body>
            ${headerHtml}
            <div class="date">${dateLabel}</div>
            <h2>${reportType}</h2>
            <table>
              <thead><tr>${th}</tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr>${totalCells}</tr></tfoot>
            </table>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');
        if (!printWindow) throw new Error('Popup blocked');
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);

        toast({ title: 'PDF Ready', description: 'Print dialog opened. Choose Save as PDF to download.' });
      } catch {
        toast({ title: 'Export Error', description: 'Failed to generate PDF.', variant: 'destructive' });
      }
      return;
    }

    if (format === 'Excel') {
      try {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Alumni Tracer System';
        wb.created = new Date();
        const ws = wb.addWorksheet(reportType.substring(0, 31));

        const numData = dataCols.length;
        const LOGO_COLS = 3;
        const COL_DATA_START = LOGO_COLS + 1;
        const totalCols = LOGO_COLS + numData;

        // Column widths
        const rawWidths = dataCols.map(c => Math.max(c.length + 10, DATA_COL_MIN));
        const rawTotal = rawWidths.reduce((a, b) => a + b, 0);
        const colWidths = rawWidths.map(w =>
          rawTotal < MIN_TOTAL_W ? w + (MIN_TOTAL_W - rawTotal) / numData : w,
        );
        for (let c = 1; c <= LOGO_COLS; c++) ws.getColumn(c).width = LOGO_COL_W;
        for (let i = 0; i < numData; i++)    ws.getColumn(COL_DATA_START + i).width = colWidths[i];

        // Helper: fill a cell range in a row
        const fill = (row: ExcelJS.Row, from: number, to: number, argb: string) => {
          for (let c = from; c <= to; c++)
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
        };

        if (header.showHeader) {
          // ── Row 1: Navy band — university name, centered over data cols ──────
          const r1 = ws.addRow(Array(totalCols).fill(''));
          r1.height = RH.navy;
          fill(r1, 1, LOGO_COLS, WHITE_ARGB);
          ws.mergeCells(r1.number, COL_DATA_START, r1.number, totalCols);
          const c1 = r1.getCell(COL_DATA_START);
          c1.value = univName;
          c1.font = { bold: true, size: 13, name: 'Calibri', color: { argb: WHITE_ARGB } };
          c1.alignment = { horizontal: 'center', vertical: 'middle' };
          fill(r1, COL_DATA_START, totalCols, NAVY_ARGB);

          // ── Row 2: Office name ───────────────────────────────────────────────
          const r2 = ws.addRow(Array(totalCols).fill(''));
          r2.height = RH.office;
          fill(r2, 1, LOGO_COLS, WHITE_ARGB);
          ws.mergeCells(r2.number, COL_DATA_START, r2.number, totalCols);
          const c2 = r2.getCell(COL_DATA_START);
          c2.value = header.office;
          c2.font = { bold: true, size: 12, name: 'Calibri', color: { argb: BLACK_ARGB } };
          c2.alignment = { horizontal: 'center', vertical: 'middle' };
          fill(r2, COL_DATA_START, totalCols, WHITE_ARGB);

          // ── Row 3: Address ───────────────────────────────────────────────────
          const r3 = ws.addRow(Array(totalCols).fill(''));
          r3.height = RH.address;
          fill(r3, 1, LOGO_COLS, WHITE_ARGB);
          ws.mergeCells(r3.number, COL_DATA_START, r3.number, totalCols);
          const c3 = r3.getCell(COL_DATA_START);
          c3.value = `\uD83D\uDCCD ${header.address}`;
          c3.font = { size: 9, name: 'Calibri', color: { argb: GRAY_ARGB } };
          c3.alignment = { horizontal: 'center', vertical: 'middle' };
          fill(r3, COL_DATA_START, totalCols, WHITE_ARGB);

          // ── Row 4: Contact + Email ───────────────────────────────────────────
          const r4 = ws.addRow(Array(totalCols).fill(''));
          r4.height = RH.contact;
          fill(r4, 1, LOGO_COLS, WHITE_ARGB);
          ws.mergeCells(r4.number, COL_DATA_START, r4.number, totalCols);
          const c4 = r4.getCell(COL_DATA_START);
          c4.value = `\u260E ${header.contact}    \u2709 ${header.email}`;
          c4.font = { size: 9, name: 'Calibri', color: { argb: GRAY_ARGB } };
          c4.alignment = { horizontal: 'center', vertical: 'middle' };
          fill(r4, COL_DATA_START, totalCols, WHITE_ARGB);

          // ── Row 5: Gray separator spanning all columns ───────────────────────
          const r5 = ws.addRow(Array(totalCols).fill(''));
          r5.height = RH.separator;
          ws.mergeCells(r5.number, 1, r5.number, totalCols);
          fill(r5, 1, totalCols, DIVIDER_ARGB);

          // ── Row 6: Generated date — right-aligned ────────────────────────────
          const r6 = ws.addRow(Array(totalCols).fill(''));
          r6.height = RH.date;
          ws.mergeCells(r6.number, 1, r6.number, totalCols);
          const c6 = r6.getCell(1);
          c6.value = dateLabel;
          c6.font = { italic: true, size: 8, name: 'Calibri', color: { argb: GRAY_ARGB } };
          c6.alignment = { horizontal: 'right', vertical: 'middle' };
          fill(r6, 1, totalCols, WHITE_ARGB);

          // ── Logos ────────────────────────────────────────────────────────────
          try {
            const [sealBuf, pasigBuf, plpBuf] = await Promise.all([
              fetchImage(LOGO_SEAL_PATH),
              fetchImage(LOGO_PASIG_PATH),
              fetchImage(LOGO_PLP_PATH),
            ]);
            const toEmu = (px: number) => Math.round(px * 9525);

            // Fit logos within rows 1-4 total height
            const hdrPts = RH.navy + RH.office + RH.address + RH.contact;
            const hdrPx = hdrPts * (96 / 72);
            const LOGO = Math.min(58, Math.floor(hdrPx * 0.82)); // logo size px
            const PAD = 4;
            const top = toEmu(Math.max(2, Math.round((hdrPx - LOGO) / 2)));

            const imgCfg = (col: number, extraW = 0) => ({
              tl: { nativeCol: col, nativeColOff: toEmu(PAD), nativeRow: 0, nativeRowOff: top } as any,
              ext: { width: LOGO + extraW, height: LOGO },
              editAs: 'oneCell',
            } as any);

            const sealId = wb.addImage({ buffer: sealBuf, extension: 'png' });
            const pasigId = wb.addImage({ buffer: pasigBuf, extension: 'png' });
            const plpId = wb.addImage({ buffer: plpBuf, extension: 'png' });

            ws.addImage(sealId, imgCfg(0));       // col 1 — seal (circular)
            ws.addImage(pasigId, imgCfg(1, 10));   // col 2 — pasig wordmark (wider)
            ws.addImage(plpId, imgCfg(2));        // col 3 — plp seal (circular)
          } catch (e) {
            console.warn('Logo load error:', e);
          }
        }

        // ── Column header row ─────────────────────────────────────────────────
        const hdrRow = ws.addRow([...Array(LOGO_COLS).fill(''), ...dataCols]);
        hdrRow.height = RH.header;
        fill(hdrRow, 1, LOGO_COLS, HEADER_ARGB);
        for (let i = 0; i < numData; i++) {
          const cell = hdrRow.getCell(COL_DATA_START + i);
          cell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: BLACK_ARGB } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_ARGB } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            left: { style: 'thin', color: { argb: HEADER_BORDER_ARGB } },
            right: { style: 'thin', color: { argb: HEADER_BORDER_ARGB } },
          };
        }

        // ── Data rows — clean, centered, simple alternating bg ─────────────────
        reportData.forEach((rowObj, idx) => {
          const values = dataCols.map(c => rowObj[c]);
          const dr = ws.addRow([...Array(LOGO_COLS).fill(''), ...values]);
          const bg = idx % 2 === 1 ? ROW_ALT_ARGB : WHITE_ARGB;
          fill(dr, 1, LOGO_COLS, bg);
          for (let i = 0; i < numData; i++) {
            const cell = dr.getCell(COL_DATA_START + i);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { size: 10, name: 'Calibri', color: { argb: BLACK_ARGB } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.border = {
              bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              left: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              right: { style: 'hair', color: { argb: 'FFDDDDDD' } },
            };
          }
        });

        // ── Totals row ────────────────────────────────────────────────────────
        const totVals = dataCols.map((c, i) => {
          if (i === 0) return 'TOTAL';
          const vals = reportData.map(r => r[c]);
          return vals.every(v => typeof v === 'number')
            ? (vals as number[]).reduce((a, b) => a + b, 0)
            : '';
        });
        const totRow = ws.addRow([...Array(LOGO_COLS).fill(''), ...totVals]);
        totRow.height = 20;
        fill(totRow, 1, LOGO_COLS, TOTAL_ARGB);
        for (let i = 0; i < numData; i++) {
          const cell = totRow.getCell(COL_DATA_START + i);
          cell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: BLACK_ARGB } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_ARGB } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'medium', color: { argb: DIVIDER_ARGB } },
            left: { style: 'thin', color: { argb: HEADER_BORDER_ARGB } },
            right: { style: 'thin', color: { argb: HEADER_BORDER_ARGB } },
          };
        }

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

      // ── CSV ───────────────────────────────────────────────────────────────────
    } else {
      try {
        const letterhead = [
          'PAMANTASAN NG LUNGSOD NG PASIG',
          header.office,
          header.address,
          `${header.contact}  |  ${header.email}`,
          dateLabel,
          '',
        ].map(l => `"${l}"`).join('\n');

        const dataRows = reportData.map(row =>
          dataCols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','),
        );
        const totRow = dataCols.map((c, i) => {
          const vals = reportData.map(r => r[c]);
          if (i === 0) return '"TOTAL"';
          return vals.every(v => typeof v === 'number')
            ? `"${(vals as number[]).reduce((a, b) => a + b, 0)}"`
            : '""';
        }).join(',');

        const csv = [letterhead, dataCols.map(c => `"${c}"`).join(','), ...dataRows, totRow].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${fileName}.csv`; a.style.visibility = 'hidden';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast({ title: 'Export Successful', description: 'CSV downloaded.' });
      } catch {
        toast({ title: 'Export Error', description: 'Failed to generate CSV.', variant: 'destructive' });
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
            <Button variant="outline" size="sm" onClick={() => handleExport('PDF')} disabled={!showPreview || isLoading} className="gap-1">
              <FileText className="h-4 w-4" /> PDF
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
                    <TableHead key={h} className="whitespace-nowrap text-center">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, ri) => (
                  <TableRow key={ri}>
                    {Object.values(row).map((v: any, ci) => (
                      <TableCell key={ci} className="text-center">{v}</TableCell>
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
