import { useState, useMemo } from 'react';
import {
  RefreshCw, Receipt, DollarSign, Clock, CheckCircle2, AlertTriangle,
  FileText, Send, ChevronDown, ChevronRight, Calendar, Zap, Settings2,
  ArrowRight, CircleDot, Check,
} from 'lucide-react';
import clsx from 'clsx';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import type { RecurringService, Invoice } from '../../types';

type BillingTab = 'queue' | 'history' | 'settings';

interface BillingRecord {
  service: RecurringService;
  visitsInPeriod: number;
  periodTotal: number;
  lastInvoiced: string | null;
  invoiceId: string | null;
  status: 'pending' | 'generated' | 'sent' | 'paid';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getVisitsInMonth(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 4;
    case 'biweekly': return 2;
    case 'monthly': return 1;
    case 'quarterly': return 0.33;
    default: return 1;
  }
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecurringBillingPage() {
  const { recurringServices, invoices, addInvoice, customers } = useData();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<BillingTab>('queue');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [billingMonth, setBillingMonth] = useState(2); // March (0-indexed)
  const [billingYear, setBillingYear] = useState(2026);
  const [generating, setGenerating] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [previewService, setPreviewService] = useState<BillingRecord | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedInvoices, setGeneratedInvoices] = useState<Map<string, Invoice>>(new Map());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Settings state
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [autoSend, setAutoSend] = useState(false);
  const [generateDaysBefore, setGenerateDaysBefore] = useState(3);
  const [defaultTerms, setDefaultTerms] = useState(30);
  const [includeTax, setIncludeTax] = useState(true);
  const [taxRate, setTaxRate] = useState(8.25);

  const activeServices = recurringServices.filter(s => s.status === 'active');

  // Build billing records
  const billingRecords: BillingRecord[] = useMemo(() => {
    return activeServices.map(service => {
      const visits = Math.round(getVisitsInMonth(service.frequency));
      const periodTotal = visits * service.price_per_visit;

      // Check if invoice exists for this service this period
      const existingInvoice = invoices.find(inv =>
        inv.customer_id === service.customer_id &&
        inv.line_items?.some(li =>
          li.description.toLowerCase().includes(service.title.toLowerCase()) ||
          li.description.toLowerCase().includes(MONTHS[billingMonth].toLowerCase())
        )
      );

      const generatedInv = generatedInvoices.get(service.id);

      let status: BillingRecord['status'] = 'pending';
      let invoiceId: string | null = null;
      let lastInvoiced: string | null = null;

      if (generatedInv) {
        status = generatedInv.status === 'sent' ? 'sent' : generatedInv.status === 'paid' ? 'paid' : 'generated';
        invoiceId = generatedInv.id;
        lastInvoiced = generatedInv.created_at;
      } else if (existingInvoice) {
        status = existingInvoice.status === 'paid' ? 'paid' : existingInvoice.status === 'sent' ? 'sent' : 'generated';
        invoiceId = existingInvoice.id;
        lastInvoiced = existingInvoice.created_at;
      }

      return {
        service,
        visitsInPeriod: visits,
        periodTotal,
        lastInvoiced,
        invoiceId,
        status,
      };
    });
  }, [activeServices, invoices, billingMonth, generatedInvoices]);

  const filteredRecords = billingRecords.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.service.title.toLowerCase().includes(q) ||
      r.service.customer?.name.toLowerCase().includes(q) ||
      r.service.service_type.toLowerCase().includes(q)
    );
  });

  const pendingRecords = filteredRecords.filter(r => r.status === 'pending');
  const generatedRecords = filteredRecords.filter(r => r.status !== 'pending');

  // Stats
  const totalMonthlyRevenue = billingRecords.reduce((sum, r) => sum + r.periodTotal, 0);
  const pendingCount = billingRecords.filter(r => r.status === 'pending').length;
  const generatedCount = billingRecords.filter(r => r.status !== 'pending').length;
  const totalGenerated = billingRecords
    .filter(r => r.status !== 'pending')
    .reduce((sum, r) => sum + r.periodTotal, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRecords.map(r => r.service.id)));
    }
  };

  const generateInvoice = async (record: BillingRecord) => {
    setGenerating(record.service.id);
    const service = record.service;
    const periodLabel = `${MONTHS[billingMonth]} ${billingYear}`;
    const visits = record.visitsInPeriod;
    const subtotal = record.periodTotal;
    const taxAmt = includeTax ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmt;

    const dueDate = new Date(billingYear, billingMonth + 1, defaultTerms > 28 ? 28 : defaultTerms);

    const invoiceData: Partial<Invoice> = {
      customer_id: service.customer_id,
      customer: service.customer,
      status: autoSend ? 'sent' : 'draft',
      line_items: [
        {
          id: `li-${Date.now()}`,
          description: `${service.title} — ${periodLabel} (${visits} visit${visits !== 1 ? 's' : ''})`,
          quantity: visits,
          unit_price: service.price_per_visit,
          total: subtotal,
        },
      ],
      subtotal,
      tax_rate: includeTax ? taxRate : 0,
      tax_amount: taxAmt,
      total,
      due_date: dueDate.toISOString().split('T')[0],
      notes: `Auto-generated from recurring service: ${service.title}\nBilling period: ${periodLabel}\nFrequency: ${service.frequency}`,
    };

    if (autoSend) {
      invoiceData.sent_at = new Date().toISOString();
    }

    try {
      const newInvoice = await addInvoice(invoiceData);
      setGeneratedInvoices(prev => new Map(prev).set(service.id, newInvoice));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(service.id);
        return next;
      });
      toast.success(`Invoice generated for ${service.customer?.name || 'customer'}${autoSend ? ' and sent' : ''}`);
    } catch {
      toast.error('Failed to generate invoice');
    }
    setGenerating(null);
  };

  const generateBatch = async () => {
    setBatchGenerating(true);
    const toGenerate = pendingRecords.filter(r => selectedIds.has(r.service.id));
    let successCount = 0;

    for (const record of toGenerate) {
      try {
        await generateInvoice(record);
        successCount++;
      } catch {
        // Continue with remaining
      }
    }

    setBatchGenerating(false);
    if (successCount > 0) {
      toast.success(`Generated ${successCount} invoice${successCount > 1 ? 's' : ''} successfully`);
    }
  };

  const openPreview = (record: BillingRecord) => {
    setPreviewService(record);
    setShowPreview(true);
  };

  const statusColors: Record<BillingRecord['status'], { color: 'green' | 'amber' | 'sky' | 'earth'; label: string }> = {
    pending: { color: 'amber', label: 'Pending' },
    generated: { color: 'sky', label: 'Generated' },
    sent: { color: 'earth', label: 'Sent' },
    paid: { color: 'green', label: 'Paid' },
  };

  const frequencyLabels: Record<string, { label: string; color: 'green' | 'sky' | 'amber' | 'purple' }> = {
    weekly: { label: 'Weekly', color: 'green' },
    biweekly: { label: 'Bi-weekly', color: 'sky' },
    monthly: { label: 'Monthly', color: 'amber' },
    quarterly: { label: 'Quarterly', color: 'purple' },
  };

  // History: combine real invoices + generated invoices
  const allGeneratedInvoices = useMemo(() => {
    const result: { invoice: Invoice; serviceName: string; serviceId: string }[] = [];

    generatedInvoices.forEach((inv, serviceId) => {
      const service = recurringServices.find(s => s.id === serviceId);
      result.push({ invoice: inv, serviceName: service?.title || 'Unknown', serviceId });
    });

    // Include existing invoices that look like recurring billing
    invoices.forEach(inv => {
      const alreadyIncluded = result.some(r => r.invoice.id === inv.id);
      if (!alreadyIncluded && inv.line_items?.some(li =>
        li.description.toLowerCase().includes('visit') ||
        li.description.toLowerCase().includes('maintenance') ||
        li.description.toLowerCase().includes('monthly') ||
        li.description.toLowerCase().includes('weekly')
      )) {
        const matchedService = recurringServices.find(s => s.customer_id === inv.customer_id);
        result.push({
          invoice: inv,
          serviceName: matchedService?.title || 'Service',
          serviceId: matchedService?.id || '',
        });
      }
    });

    return result.sort((a, b) => new Date(b.invoice.created_at).getTime() - new Date(a.invoice.created_at).getTime());
  }, [invoices, generatedInvoices, recurringServices]);

  const tabs: { key: BillingTab; label: string; icon: typeof Receipt; count?: number }[] = [
    { key: 'queue', label: 'Billing Queue', icon: Receipt, count: pendingCount },
    { key: 'history', label: 'Generated Invoices', icon: FileText, count: allGeneratedInvoices.length },
    { key: 'settings', label: 'Billing Settings', icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-earth-400">Generate invoices from recurring services automatically</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-earth-800/50 border border-earth-700 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-earth-400" />
            <select
              className="bg-transparent text-sm text-earth-200 border-none outline-none cursor-pointer"
              value={billingMonth}
              onChange={e => setBillingMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i} className="bg-earth-900">{m}</option>
              ))}
            </select>
            <select
              className="bg-transparent text-sm text-earth-200 border-none outline-none cursor-pointer"
              value={billingYear}
              onChange={e => setBillingYear(Number(e.target.value))}
            >
              <option value={2025} className="bg-earth-900">2025</option>
              <option value={2026} className="bg-earth-900">2026</option>
              <option value={2027} className="bg-earth-900">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Billable Services"
          value={activeServices.length}
          icon={<RefreshCw className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          title="Period Revenue"
          value={formatMoney(totalMonthlyRevenue)}
          prefix="$"
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Ready to Invoice"
          value={pendingCount}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Generated"
          value={formatMoney(totalGenerated)}
          prefix="$"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors',
                activeTab === tab.key
                  ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                  : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={clsx(
                  'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                  activeTab === tab.key
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-earth-700 text-earth-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Billing Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <SearchBar value={search} onChange={setSearch} placeholder="Search services..." />
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  icon={<Zap className="w-4 h-4" />}
                  onClick={generateBatch}
                  disabled={batchGenerating}
                >
                  {batchGenerating ? 'Generating...' : `Generate ${selectedIds.size} Invoice${selectedIds.size > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>

          {/* Pending invoices section */}
          {pendingRecords.length > 0 && (
            <Card header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-earth-200">
                    Awaiting Invoice Generation ({pendingRecords.length})
                  </h3>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-earth-400 hover:text-green-400 transition-colors cursor-pointer"
                >
                  {selectedIds.size === pendingRecords.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            }>
              <div className="divide-y divide-earth-800/60">
                {pendingRecords.map(record => {
                  const freq = frequencyLabels[record.service.frequency] || { label: record.service.frequency, color: 'earth' as const };
                  const isSelected = selectedIds.has(record.service.id);
                  const isGenerating = generating === record.service.id;

                  return (
                    <div
                      key={record.service.id}
                      className={clsx(
                        'flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors',
                        isSelected && 'bg-green-600/5'
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(record.service.id)}
                        className={clsx(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-green-600 border-green-600'
                            : 'border-earth-600 hover:border-earth-400'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Service info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-earth-100 truncate">
                            {record.service.title}
                          </p>
                          <Badge color={freq.color}>{freq.label}</Badge>
                        </div>
                        <p className="text-xs text-earth-400 truncate">
                          {record.service.customer?.name}
                          {record.service.crew?.name && ` — ${record.service.crew.name}`}
                        </p>
                      </div>

                      {/* Visits */}
                      <div className="hidden sm:block text-center shrink-0">
                        <p className="text-sm font-semibold text-earth-100">{record.visitsInPeriod}</p>
                        <p className="text-[10px] text-earth-500 uppercase">Visits</p>
                      </div>

                      {/* Per visit */}
                      <div className="hidden md:block text-center shrink-0">
                        <p className="text-sm text-earth-200">${formatMoney(record.service.price_per_visit)}</p>
                        <p className="text-[10px] text-earth-500 uppercase">Per Visit</p>
                      </div>

                      {/* Period total */}
                      <div className="text-right shrink-0 min-w-[80px]">
                        <p className="text-sm font-bold text-green-400">${formatMoney(record.periodTotal)}</p>
                        <p className="text-[10px] text-earth-500 uppercase">Period Total</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openPreview(record)}
                          className="p-1.5 text-earth-400 hover:text-earth-200 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
                          title="Preview invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <Button
                          size="sm"
                          onClick={() => generateInvoice(record)}
                          disabled={isGenerating}
                          icon={isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        >
                          <span className="hidden sm:inline">{isGenerating ? 'Creating...' : 'Generate'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Already generated section */}
          {generatedRecords.length > 0 && (
            <Card header={
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-earth-200">
                  Invoiced This Period ({generatedRecords.length})
                </h3>
              </div>
            }>
              <div className="divide-y divide-earth-800/60">
                {generatedRecords.map(record => {
                  const statusConf = statusColors[record.status];
                  return (
                    <div key={record.service.id} className="flex items-center gap-4 py-3">
                      <div className="p-2 bg-green-600/10 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-earth-100 truncate">{record.service.title}</p>
                        <p className="text-xs text-earth-400">{record.service.customer?.name}</p>
                      </div>
                      <Badge color={statusConf.color} dot>{statusConf.label}</Badge>
                      <p className="text-sm font-semibold text-earth-100 shrink-0">
                        ${formatMoney(record.periodTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Empty state */}
          {filteredRecords.length === 0 && (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-earth-800/50 rounded-2xl text-earth-400 mb-4">
                  <Receipt className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-earth-200 mb-2">No Billable Services</h3>
                <p className="text-sm text-earth-400 max-w-sm">
                  Active recurring services will appear here for invoice generation. Add services on the Recurring Services page.
                </p>
              </div>
            </Card>
          )}

          {/* Billing summary bar */}
          {billingRecords.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-earth-900/80 border border-earth-800 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-earth-400" />
                <span className="text-earth-400">Period Summary:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-earth-300">{billingRecords.length} services</span>
                <ArrowRight className="w-3 h-3 text-earth-600" />
                <span className="font-semibold text-green-400">${formatMoney(totalMonthlyRevenue)}</span>
                <span className="text-earth-400">total</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-earth-700" />
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-amber-400">{pendingCount} pending</span>
                <span className="text-earth-600">/</span>
                <span className="text-green-400">{generatedCount} generated</span>
              </div>
              {pendingCount > 0 && (
                <>
                  <div className="hidden sm:block w-px h-4 bg-earth-700" />
                  <span className="text-amber-400 font-medium">
                    ${formatMoney(pendingRecords.reduce((s, r) => s + r.periodTotal, 0))} uninvoiced
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {allGeneratedInvoices.length > 0 ? (
            <Card header={
              <h3 className="text-sm font-semibold text-earth-200">Invoice Generation History</h3>
            }>
              <div className="divide-y divide-earth-800/60">
                {allGeneratedInvoices.map(({ invoice, serviceName, serviceId }) => {
                  const isExpanded = expandedHistory.has(invoice.id);
                  const customer = customers.find(c => c.id === invoice.customer_id);

                  return (
                    <div key={invoice.id}>
                      <button
                        onClick={() => setExpandedHistory(prev => {
                          const next = new Set(prev);
                          if (next.has(invoice.id)) next.delete(invoice.id);
                          else next.add(invoice.id);
                          return next;
                        })}
                        className="flex items-center gap-4 py-3 w-full text-left hover:bg-earth-800/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className={clsx(
                          'p-2 rounded-lg shrink-0',
                          invoice.status === 'paid' ? 'bg-green-600/10' :
                          invoice.status === 'sent' ? 'bg-sky-600/10' :
                          'bg-earth-700/50'
                        )}>
                          <Receipt className={clsx(
                            'w-4 h-4',
                            invoice.status === 'paid' ? 'text-green-400' :
                            invoice.status === 'sent' ? 'text-sky-400' :
                            'text-earth-400'
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-earth-100">{invoice.invoice_number}</p>
                            <Badge color={
                              invoice.status === 'paid' ? 'green' :
                              invoice.status === 'sent' ? 'sky' :
                              invoice.status === 'overdue' ? 'red' :
                              invoice.status === 'partial' ? 'amber' :
                              'earth'
                            } dot>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-earth-400 truncate">
                            {customer?.name || 'Customer'} — {serviceName}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-earth-100">${formatMoney(invoice.total)}</p>
                          <p className="text-[10px] text-earth-500">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-earth-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-earth-500 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="ml-12 pb-3 space-y-2">
                          {invoice.line_items?.map(li => (
                            <div key={li.id} className="flex items-center justify-between text-xs text-earth-300 py-1">
                              <span>{li.description}</span>
                              <span className="text-earth-200">{li.quantity} x ${formatMoney(li.unit_price)} = ${formatMoney(li.total)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-earth-800">
                            <span className="text-earth-400">Subtotal</span>
                            <span className="text-earth-200">${formatMoney(invoice.subtotal)}</span>
                          </div>
                          {invoice.tax_amount > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-earth-400">Tax ({invoice.tax_rate}%)</span>
                              <span className="text-earth-200">${formatMoney(invoice.tax_amount)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-earth-300">Total</span>
                            <span className="text-green-400">${formatMoney(invoice.total)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-earth-500 pt-1">
                            <Calendar className="w-3 h-3" />
                            Due: {invoice.due_date}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-earth-800/50 rounded-2xl text-earth-400 mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-earth-200 mb-2">No Generated Invoices Yet</h3>
                <p className="text-sm text-earth-400 max-w-sm">
                  Invoices generated from recurring services will appear here. Go to the Billing Queue to generate invoices.
                </p>
                <Button className="mt-4" onClick={() => setActiveTab('queue')}>
                  View Billing Queue
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4 max-w-2xl">
          <Card header={
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-earth-200">Auto-Generation Rules</h3>
            </div>
          }>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-earth-200">Auto-Generate Invoices</p>
                  <p className="text-xs text-earth-400 mt-0.5">Automatically create invoices at the start of each billing period</p>
                </div>
                <button
                  onClick={() => setAutoGenerate(!autoGenerate)}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors cursor-pointer',
                    autoGenerate ? 'bg-green-600' : 'bg-earth-700'
                  )}
                >
                  <div className={clsx(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    autoGenerate ? 'translate-x-5.5' : 'translate-x-0.5'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-earth-200">Auto-Send to Customers</p>
                  <p className="text-xs text-earth-400 mt-0.5">Automatically send invoices after generation</p>
                </div>
                <button
                  onClick={() => setAutoSend(!autoSend)}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors cursor-pointer',
                    autoSend ? 'bg-green-600' : 'bg-earth-700'
                  )}
                >
                  <div className={clsx(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    autoSend ? 'translate-x-5.5' : 'translate-x-0.5'
                  )} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-earth-200 mb-1.5">
                  Generate Days Before Period End
                </label>
                <select
                  className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 outline-none focus:border-green-600/50"
                  value={generateDaysBefore}
                  onChange={e => setGenerateDaysBefore(Number(e.target.value))}
                >
                  <option value={0}>Same day (period start)</option>
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={5}>5 days before</option>
                  <option value={7}>7 days before</option>
                </select>
              </div>
            </div>
          </Card>

          <Card header={
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-earth-200">Invoice Defaults</h3>
            </div>
          }>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-earth-200 mb-1.5">
                  Default Payment Terms (days)
                </label>
                <select
                  className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 outline-none focus:border-green-600/50"
                  value={defaultTerms}
                  onChange={e => setDefaultTerms(Number(e.target.value))}
                >
                  <option value={7}>Net 7</option>
                  <option value={14}>Net 14</option>
                  <option value={15}>Net 15</option>
                  <option value={30}>Net 30</option>
                  <option value={45}>Net 45</option>
                  <option value={60}>Net 60</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-earth-200">Include Tax</p>
                  <p className="text-xs text-earth-400 mt-0.5">Apply tax rate to generated invoices</p>
                </div>
                <button
                  onClick={() => setIncludeTax(!includeTax)}
                  className={clsx(
                    'relative w-11 h-6 rounded-full transition-colors cursor-pointer',
                    includeTax ? 'bg-green-600' : 'bg-earth-700'
                  )}
                >
                  <div className={clsx(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    includeTax ? 'translate-x-5.5' : 'translate-x-0.5'
                  )} />
                </button>
              </div>

              {includeTax && (
                <div>
                  <label className="block text-sm font-medium text-earth-200 mb-1.5">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="25"
                    value={taxRate}
                    onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 outline-none focus:border-green-600/50"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card header={
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-earth-200">Notification Settings</h3>
            </div>
          }>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-earth-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-earth-200">Email invoice to customer</p>
                  <p className="text-xs text-earth-400 mt-0.5">Send PDF invoice via email when generated</p>
                </div>
                <Badge color="amber">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-earth-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-earth-200">Payment reminder emails</p>
                  <p className="text-xs text-earth-400 mt-0.5">Auto-send reminders for overdue invoices</p>
                </div>
                <Badge color="amber">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-earth-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-earth-200">Billing summary report</p>
                  <p className="text-xs text-earth-400 mt-0.5">Weekly digest of billing activity</p>
                </div>
                <Badge color="amber">Coming Soon</Badge>
              </div>
            </div>
          </Card>

          <div className="pt-2">
            <Button
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => toast.success('Billing settings saved')}
            >
              Save Settings
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Invoice Preview"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>Cancel</Button>
            {previewService && previewService.status === 'pending' && (
              <Button
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => {
                  if (previewService) {
                    generateInvoice(previewService);
                    setShowPreview(false);
                  }
                }}
              >
                Generate Invoice
              </Button>
            )}
          </>
        }
      >
        {previewService && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between p-4 bg-earth-800/30 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-earth-100">{previewService.service.customer?.name}</p>
                <p className="text-xs text-earth-400">{previewService.service.customer?.address}</p>
              </div>
              <Badge color={statusColors[previewService.status].color} dot>
                {statusColors[previewService.status].label}
              </Badge>
            </div>

            {/* Service details */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-earth-500">Service Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-earth-800/20 rounded-lg">
                  <p className="text-[10px] text-earth-500 uppercase">Service</p>
                  <p className="text-sm text-earth-100 mt-0.5">{previewService.service.title}</p>
                </div>
                <div className="p-3 bg-earth-800/20 rounded-lg">
                  <p className="text-[10px] text-earth-500 uppercase">Frequency</p>
                  <p className="text-sm text-earth-100 mt-0.5 capitalize">{previewService.service.frequency}</p>
                </div>
                <div className="p-3 bg-earth-800/20 rounded-lg">
                  <p className="text-[10px] text-earth-500 uppercase">Billing Period</p>
                  <p className="text-sm text-earth-100 mt-0.5">{MONTHS[billingMonth]} {billingYear}</p>
                </div>
                <div className="p-3 bg-earth-800/20 rounded-lg">
                  <p className="text-[10px] text-earth-500 uppercase">Payment Terms</p>
                  <p className="text-sm text-earth-100 mt-0.5">Net {defaultTerms}</p>
                </div>
              </div>
            </div>

            {/* Line items preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-earth-500">Line Items</p>
              <div className="border border-earth-800 rounded-lg overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-2 bg-earth-800/40 text-[10px] font-semibold uppercase tracking-wider text-earth-500">
                  <span className="flex-1">Description</span>
                  <span className="w-12 text-center">Qty</span>
                  <span className="w-20 text-right">Rate</span>
                  <span className="w-20 text-right">Amount</span>
                </div>
                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="flex-1 text-sm text-earth-200">
                    {previewService.service.title} — {MONTHS[billingMonth]} {billingYear} ({previewService.visitsInPeriod} visit{previewService.visitsInPeriod !== 1 ? 's' : ''})
                  </span>
                  <span className="w-12 text-center text-sm text-earth-300">{previewService.visitsInPeriod}</span>
                  <span className="w-20 text-right text-sm text-earth-300">${formatMoney(previewService.service.price_per_visit)}</span>
                  <span className="w-20 text-right text-sm font-medium text-earth-100">${formatMoney(previewService.periodTotal)}</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-2 border-t border-earth-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-earth-400">Subtotal</span>
                <span className="text-earth-200">${formatMoney(previewService.periodTotal)}</span>
              </div>
              {includeTax && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-earth-400">Tax ({taxRate}%)</span>
                  <span className="text-earth-200">${formatMoney(previewService.periodTotal * (taxRate / 100))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold pt-1">
                <span className="text-earth-200">Total</span>
                <span className="text-green-400">
                  ${formatMoney(previewService.periodTotal + (includeTax ? previewService.periodTotal * (taxRate / 100) : 0))}
                </span>
              </div>
            </div>

            {/* Services included */}
            {previewService.service.services_included.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-earth-500">Services Included</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewService.service.services_included.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-earth-800/50 text-earth-300 text-xs rounded-md border border-earth-700/50">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
