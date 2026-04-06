import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlobalFilterBar, FilterState, defaultFilters } from '@/components/GlobalFilterBar';
import { FileText, FileSpreadsheet, Table2 } from 'lucide-react';
import { alumniPerProgram } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const reportTypes = [
  'Alumni per Program',
  'Employment Trends',
  'Participation Rate',
  'Degree Alignment',
  'Skills Assessment Summary',
];

export default function AdminReports() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [reportType, setReportType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleGenerate = () => {
    setShowPreview(true);
    toast({ title: 'Report Generated', description: 'Preview ready. Choose export format to download.' });
  };

  const handleExport = (format: 'Excel' | 'CSV') => {
    if (!showPreview || !reportType) {
      toast({
        title: 'Generate report first',
        description: 'Please generate a report before exporting.',
        variant: 'destructive'
      });
      return;
    }

    const rows = [
      ['Program', 'Total Alumni', 'Employed', 'Employment Rate'],
      ...alumniPerProgram.map(r => [r.program, String(r.count), String(r.employed), `${r.rate}%`])
    ];

    const dateStr = new Date().toISOString().split('T')[0];
    const safeReportName = reportType.replace(/\s+/g, '_').toLowerCase();

    if (format === 'CSV') {
      const csvContent = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeReportName}_${dateStr}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'CSV exported', description: 'Your CSV report has been downloaded.' });
      return;
    }

    // Excel-friendly format (opens in Excel) using tab-separated values with .xls extension.
    const tsvContent = rows.map(row => row.join('\t')).join('\n');
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeReportName}_${dateStr}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: 'Excel exported', description: 'Your Excel report has been downloaded.' });
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
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
              <SelectContent>
                {reportTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={!reportType} className="gap-2"><FileText className="h-4 w-4" /> Generate Report</Button>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('Excel')}
              className="gap-1"
              disabled={!showPreview}
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('CSV')}
              className="gap-1"
              disabled={!showPreview}
            >
              <Table2 className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <GlobalFilterBar filters={filters} onFiltersChange={setFilters} />

      {showPreview && (
        <div className="glass-card p-6 animate-fade-in space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold">Data Preview — {reportType}</h3>
              <p className="text-xs text-muted-foreground">
                Review the data below, then choose an export format to download a polished report.
              </p>
            </div>
          </div>
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Total Alumni</TableHead>
                  <TableHead>Employed</TableHead>
                  <TableHead>Employment Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alumniPerProgram.map(r => (
                  <TableRow key={r.program}>
                    <TableCell className="font-medium">{r.program}</TableCell>
                    <TableCell>{r.count}</TableCell>
                    <TableCell>{r.employed}</TableCell>
                    <TableCell>{r.rate}%</TableCell>
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
