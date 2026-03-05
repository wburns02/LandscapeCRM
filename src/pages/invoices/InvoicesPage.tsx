import { useState, useMemo } from 'react';
import { Receipt, DollarSign, Send, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import type { InvoiceStatus } from '../../types';

const statusTabs: { key: '' | InvoiceStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
];

export default function InvoicesPage() {
  const { invoices } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search || inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.total - (i.amount_paid ?? 0)), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.total - (i.amount_paid ?? 0)), 0);
  const totalPaidMTD = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount_paid ?? 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-earth-100">Invoices</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} icon={<Receipt className="w-5 h-5" />} color="amber" />
        <StatCard title="Overdue" value={`$${totalOverdue.toLocaleString()}`} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard title="Collected MTD" value={`$${totalPaidMTD.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="green" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === tab.key
                ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." />

      {filtered.length === 0 ? (
        <EmptyState icon={<Receipt className="w-10 h-10" />} title="No invoices found" description="Invoices will appear here when you create them from completed jobs or quotes." />
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <Card key={inv.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-earth-100">{inv.invoice_number}</h3>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5">{inv.customer?.name}</p>
                  <p className="text-xs text-earth-500">
                    Due: {format(new Date(inv.due_date), 'MMM d, yyyy')}
                    {inv.paid_at && ` - Paid: ${format(new Date(inv.paid_at), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-earth-50">${inv.total.toLocaleString()}</p>
                    {(inv.amount_paid ?? 0) > 0 && (inv.amount_paid ?? 0) < inv.total && (
                      <p className="text-xs text-green-400">Paid: ${(inv.amount_paid ?? 0).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {inv.status === 'draft' && (
                      <Button variant="ghost" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => toast.success('Invoice sent')}>Send</Button>
                    )}
                    {(inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partial') && (
                      <Button variant="ghost" size="sm" icon={<DollarSign className="w-3.5 h-3.5" />} onClick={() => toast.success('Payment recorded')}>Record Payment</Button>
                    )}
                  </div>
                </div>
              </div>
              {inv.line_items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-earth-800/50 space-y-1">
                  {inv.line_items.map(li => (
                    <div key={li.id} className="flex justify-between text-xs">
                      <span className="text-earth-300">{li.description}</span>
                      <span className="text-earth-400">${li.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
