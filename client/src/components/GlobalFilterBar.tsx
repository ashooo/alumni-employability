import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { programs, batchYears, employmentStatuses } from '@/data/mockData';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export interface FilterState {
  program: string;
  batchYear: string;
  employmentStatus: string;
  search: string;
}

interface GlobalFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  showEmployment?: boolean;
}

const defaultFilters: FilterState = { program: '', batchYear: '', employmentStatus: '', search: '' };

export function GlobalFilterBar({ filters, onFiltersChange, showEmployment = true }: GlobalFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = filters.program || filters.batchYear || filters.employmentStatus || filters.search;

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.search}
            onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange(defaultFilters)} className="gap-1 text-destructive">
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>
      {expanded && (
        <div className="flex gap-3 mt-3 flex-wrap animate-fade-in">
          <Select value={filters.program} onValueChange={v => onFiltersChange({ ...filters, program: v })}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.batchYear} onValueChange={v => onFiltersChange({ ...filters, batchYear: v })}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {batchYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {showEmployment && (
            <Select value={filters.employmentStatus} onValueChange={v => onFiltersChange({ ...filters, employmentStatus: v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {employmentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

export { defaultFilters };
