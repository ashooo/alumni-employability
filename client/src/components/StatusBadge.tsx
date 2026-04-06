import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  // Account status
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  graduated: 'bg-info/10 text-info border-info/20',
  
  // Survey status
  pending: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-success/10 text-success border-success/20',
  
  // Employment status (for future use)
  Employed: 'bg-success/10 text-success',
  Unemployed: 'bg-destructive/10 text-destructive',
  'Self-Employed': 'bg-info/10 text-info',
  Freelancer: 'bg-info/10 text-info',
  'Further Studies': 'bg-primary/10 text-primary',
  
  // Legacy support for capitalized versions
  Active: 'bg-success/10 text-success',
  Inactive: 'bg-muted text-muted-foreground',
  Pending: 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
};

const displayText: Record<string, string> = {
  // Lowercase from DB
  active: 'Active',
  inactive: 'Inactive',
  graduated: 'Graduated',
  pending: 'Pending',
  completed: 'Completed',
  
  // Capitalized from mockData
  Active: 'Active',
  Inactive: 'Inactive',
  Pending: 'Pending',
  Completed: 'Completed',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const displayStatus = displayText[status] || status;
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      statusStyles[status] || 'bg-muted text-muted-foreground border-border',
      className
    )}>
      {displayStatus}
    </span>
  );
}