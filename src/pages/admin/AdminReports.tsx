import { useState, useMemo } from 'react';
import { FileText, FileSpreadsheet, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalFilterBar, FilterState, defaultFilters } from '@/components/GlobalFilterBar';
import { alumniPerProgram, yearlyEmployment, skillsData, alumniRecords } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx-js-style';

const reportTypes = [
  'Alumni per Program',
  'Employment Trends',
  'Participation Rate',
  'Degree Alignment',
  'Skills Assessment Summary',
];

type CellStyle = {
  fill?: { fgColor?: { rgb: string }; patternType?: string };
  font?: { color?: { rgb: string }; bold?: boolean; sz?: number; name?: string };
  alignment?: { horizontal?: string; vertical?: string };
  border?: Record<string, { style: string; color: { rgb: string } }>;
};

const thinBorder = (color = 'D1D5DB') => ({
  top:    { style: 'thin', color: { rgb: color } },
  bottom: { style: 'thin', color: { rgb: color } },
  left:   { style: 'thin', color: { rgb: color } },
  right:  { style: 'thin', color: { rgb: color } },
});

export default function AdminReports() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [reportType, setReportType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const reportData = useMemo(() => {
    switch (reportType) {
      case 'Alumni per Program':
        return alumniPerProgram.map(d => ({
          'Program Name': d.program,
          'Total Alumni': d.count,
          'Employed': d.employed,
          'Employment Rate (%)': d.rate
        }));
      case 'Employment Trends':
        return yearlyEmployment.map(d => ({
          'Year': d.year,
          'Overall Rate (%)': d.rate,
          'Male Employment (%)': d.male,
          'Female Employment (%)': d.female
        }));
      case 'Participation Rate': {
        const total = alumniRecords.length;
        const completed = alumniRecords.filter(r => r.surveyStatus === 'Completed').length;
        const pending = alumniRecords.filter(r => r.surveyStatus === 'Pending').length;
        const notStarted = total - completed - pending;
        return [
          { 'Survey Status': 'Completed',  'Total Users': completed,  'Percentage (%)': Math.round((completed/total)*100) },
          { 'Survey Status': 'Pending',     'Total Users': pending,    'Percentage (%)': Math.round((pending/total)*100)   },
          { 'Survey Status': 'Not Started', 'Total Users': notStarted, 'Percentage (%)': Math.round((notStarted/total)*100) }
        ];
      }
      case 'Degree Alignment':
        return [
          { 'Alignment Level': 'Highly Relevant',     'Alumni Count': 450, 'Percentage (%)': 45 },
          { 'Alignment Level': 'Moderately Relevant', 'Alumni Count': 350, 'Percentage (%)': 35 },
          { 'Alignment Level': 'Slightly Relevant',   'Alumni Count': 150, 'Percentage (%)': 15 },
          { 'Alignment Level': 'Not Relevant',        'Alumni Count': 50,  'Percentage (%)': 5  },
        ];
      case 'Skills Assessment Summary':
        return skillsData.map(d => ({
          'Skill Category': d.skill,
          'Average Score (/100)': d.value
        }));
      default:
        return [];
    }
  }, [reportType]);

  const handleGenerate = () => {
    setShowPreview(true);
    toast({ title: 'Report Generated', description: 'Preview ready. Choose export format to download.' });
  };

  const handleExport = (format: 'Excel' | 'CSV') => {
    if (!reportData || reportData.length === 0) {
      toast({ title: 'Export Failed', description: 'No data available to export.', variant: 'destructive' });
      return;
    }

    const dateStr  = new Date().toLocaleDateString();
    const fileName = `${reportType.replace(/\s+/g, '_')}_Report`;
    const headers  = Object.keys(reportData[0]);

    if (format === 'Excel') {
      try {
        const numCols = headers.length;

        const headerStyle: CellStyle = {
          fill: { fgColor: { rgb: '1E3A5F' }, patternType: 'solid' },
          font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder('1E3A5F'),
        };

        const subHeaderStyle: CellStyle = {
          fill: { fgColor: { rgb: '1E3A5F' }, patternType: 'solid' },
          font: { color: { rgb: 'FFFFFF' }, bold: false, sz: 10, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder('1E3A5F'),
        };

        const colHeaderStyle: CellStyle = {
          fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' },
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: '111827' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder(),
        };

        const dataCellStyle: CellStyle = {
          font: { sz: 11, name: 'Calibri', color: { rgb: '374151' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder(),
        };

        const numCellStyle: CellStyle = {
          font: { sz: 11, name: 'Calibri', color: { rgb: '374151' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: thinBorder(),
        };

        const totalLabelStyle: CellStyle = {
          fill: { fgColor: { rgb: 'EFF6FF' }, patternType: 'solid' },
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: '1E3A5F' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder('93C5FD'),
        };

        const totalNumStyle: CellStyle = {
          fill: { fgColor: { rgb: 'EFF6FF' }, patternType: 'solid' },
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: '1E3A5F' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: thinBorder('93C5FD'),
        };

        const makeCell = (v: string | number, s: CellStyle) => ({
          v, t: typeof v === 'number' ? 'n' : 's', s,
        });

        const blankCells = (s: CellStyle) =>
          Array.from({ length: numCols - 1 }, () => makeCell('', s));

        const titleRow   = [makeCell(`Alumni Tracer System — ${reportType} Report`, headerStyle), ...blankCells(headerStyle)];
        const dateRow    = [makeCell(`Generated on: ${dateStr}`, subHeaderStyle), ...blankCells(subHeaderStyle)];
        const headerRow  = headers.map(h => makeCell(h, colHeaderStyle));

        const dataRows = reportData.map(row =>
          headers.map(h => {
            const val = (row as Record<string, string | number>)[h];
            return makeCell(val, typeof val === 'number' ? numCellStyle : dataCellStyle);
          })
        );

        const totalsRow = headers.map((h, i) => {
          const vals = reportData.map(r => (r as Record<string, string | number>)[h]);
          const allNum = vals.every(v => typeof v === 'number');
          if (i === 0) return makeCell('TOTAL', totalLabelStyle);
          if (allNum) return makeCell((vals as number[]).reduce((a, b) => a + b, 0), totalNumStyle);
          return makeCell('', totalNumStyle);
        });

        const ws = XLSX.utils.aoa_to_sheet([titleRow, dateRow, headerRow, ...dataRows, totalsRow]);

        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
        ];
        ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 6, 22) }));
        ws['!rows'] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 18 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, reportType.substring(0, 31));
        XLSX.writeFile(wb, `${fileName}.xlsx`);

        toast({ title: 'Export Successful', description: 'Your Excel file has been downloaded.' });
      } catch (error) {
        toast({ title: 'Export Error', description: 'Failed to generate Excel file.', variant: 'destructive' });
      }
    } else if (format === 'CSV') {
      try {
        const dataRows = reportData.map(row =>
          headers.map(h => `"${String((row as Record<string, string | number>)[h]).replace(/"/g, '""')}"`).join(',')
        );

        const totalsRow = headers.map((h, i) => {
          const vals = reportData.map(r => (r as Record<string, string | number>)[h]);
          if (i === 0) return '"TOTAL"';
          if (vals.every(v => typeof v === 'number')) return `"${(vals as number[]).reduce((a, b) => a + b, 0)}"`;
          return '""';
        }).join(',');

        const csvContent = [
          headers.map(h => `"${h}"`).join(','),
          ...dataRows,
          totalsRow,
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url  = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Export Successful', description: 'Your CSV file has been downloaded.' });
      } catch (error) {
        toast({ title: 'Export Error', description: 'Failed to generate CSV file.', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Report Generation</h1>
        <p className="text-muted-foreground text-sm">Generate and export analytical reports</p>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Report Type</label>
            <Select value={reportType} onValueChange={(val) => {
              setReportType(val);
              setShowPreview(false);
            }}>
              <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
              <SelectContent>
                {reportTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={!reportType} className="gap-2">
            <FileText className="h-4 w-4" /> Generate Report
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('Excel')} disabled={!showPreview} className="gap-1">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('CSV')} disabled={!showPreview} className="gap-1">
              <Table2 className="h-4 w-4" /> CSV
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
                  {Object.keys(reportData[0]).map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Object.values(row).map((val: any, colIndex) => (
                      <TableCell key={colIndex}>{val}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}