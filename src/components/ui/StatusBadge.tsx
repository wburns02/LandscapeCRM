import Badge from './Badge';
import type { JobStatus, QuoteStatus, InvoiceStatus, LeadStatus, EquipmentStatus } from '../../types';

type AnyStatus = JobStatus | QuoteStatus | InvoiceStatus | LeadStatus | EquipmentStatus;

const statusConfig: Record<string, { color: 'green' | 'amber' | 'red' | 'sky' | 'earth' | 'purple'; label: string }> = {
  // Job statuses
  scheduled: { color: 'sky', label: 'Scheduled' },
  in_progress: { color: 'amber', label: 'In Progress' },
  completed: { color: 'green', label: 'Completed' },
  cancelled: { color: 'red', label: 'Cancelled' },
  on_hold: { color: 'earth', label: 'On Hold' },
  // Quote statuses
  draft: { color: 'earth', label: 'Draft' },
  sent: { color: 'sky', label: 'Sent' },
  accepted: { color: 'green', label: 'Accepted' },
  declined: { color: 'red', label: 'Declined' },
  expired: { color: 'earth', label: 'Expired' },
  // Invoice statuses
  paid: { color: 'green', label: 'Paid' },
  overdue: { color: 'red', label: 'Overdue' },
  partial: { color: 'amber', label: 'Partial' },
  // Lead statuses
  new: { color: 'sky', label: 'New' },
  contacted: { color: 'amber', label: 'Contacted' },
  qualified: { color: 'purple', label: 'Qualified' },
  quoted: { color: 'sky', label: 'Quoted' },
  won: { color: 'green', label: 'Won' },
  lost: { color: 'red', label: 'Lost' },
  // Equipment statuses
  available: { color: 'green', label: 'Available' },
  in_use: { color: 'sky', label: 'In Use' },
  maintenance: { color: 'amber', label: 'Maintenance' },
  retired: { color: 'earth', label: 'Retired' },
};

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || { color: 'earth' as const, label: status };
  return <Badge color={config.color} size={size} dot>{config.label}</Badge>;
}
