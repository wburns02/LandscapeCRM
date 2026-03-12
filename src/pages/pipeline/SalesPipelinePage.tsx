import { useState, useMemo } from 'react';
import {
  FileText, Briefcase, Receipt, ArrowRight, CheckCircle2, Clock,
  AlertTriangle, TrendingUp, DollarSign, ChevronRight, ChevronDown,
  Filter, Zap, ArrowRightCircle, Plus, XCircle, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import type { Quote, Job, Invoice } from '../../types';

type ViewMode = 'pipeline' | 'board';

interface PipelineItem {
  quote: Quote;
  linkedJob: Job | null;
  linkedInvoice: Invoice | null;
  stage: 'quote' | 'accepted' | 'job_created' | 'in_progress' | 'invoiced' | 'paid' | 'lost';
  stageLabel: string;
  progress: number; // 0-100
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SalesPipelinePage() {
  const { quotes, jobs, invoices, customers, addJob, addInvoice, updateQuote } = useData();
  const toast = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState<PipelineItem | null>(null);
  const [convertType, setConvertType] = useState<'job' | 'invoice'>('job');
  const [jobForm, setJobForm] = useState({
    scheduled_date: '',
    scheduled_time: '08:00',
    crew_id: '',
    estimated_hours: '4',
    notes: '',
  });

  // Build pipeline items by linking quotes → jobs → invoices
  const pipelineItems: PipelineItem[] = useMemo(() => {
    return quotes.map(quote => {
      // Find linked job (by quote_id or customer_id + matching title/amount)
      const linkedJob = jobs.find(j =>
        (j as any).quote_id === quote.id ||
        (j.customer_id === quote.customer_id &&
          (j.title?.toLowerCase().includes(quote.title?.toLowerCase().split(' ')[0] || '') ||
           Math.abs((j.total_price || 0) - quote.total) < 1))
      ) || null;

      // Find linked invoice (by quote_id or customer match + amount)
      const linkedInvoice = invoices.find(inv =>
        inv.quote_id === quote.id ||
        (inv.customer_id === quote.customer_id &&
          Math.abs(inv.total - quote.total) < 1)
      ) || null;

      let stage: PipelineItem['stage'] = 'quote';
      let stageLabel = 'Quote Sent';
      let progress = 15;

      if (quote.status === 'declined') {
        stage = 'lost';
        stageLabel = 'Lost';
        progress = 0;
      } else if (linkedInvoice?.status === 'paid') {
        stage = 'paid';
        stageLabel = 'Paid';
        progress = 100;
      } else if (linkedInvoice) {
        stage = 'invoiced';
        stageLabel = 'Invoiced';
        progress = 85;
      } else if (linkedJob?.status === 'in_progress') {
        stage = 'in_progress';
        stageLabel = 'In Progress';
        progress = 60;
      } else if (linkedJob) {
        stage = 'job_created';
        stageLabel = 'Job Created';
        progress = 45;
      } else if (quote.status === 'accepted') {
        stage = 'accepted';
        stageLabel = 'Accepted';
        progress = 30;
      } else if (quote.status === 'draft') {
        stage = 'quote';
        stageLabel = 'Draft';
        progress = 5;
      }

      return { quote, linkedJob, linkedInvoice, stage, stageLabel, progress };
    }).sort((a, b) => {
      const stageOrder = { lost: 0, quote: 1, accepted: 2, job_created: 3, in_progress: 4, invoiced: 5, paid: 6 };
      return (stageOrder[b.stage] || 0) - (stageOrder[a.stage] || 0);
    });
  }, [quotes, jobs, invoices]);

  const filteredItems = filterStage === 'all'
    ? pipelineItems
    : pipelineItems.filter(p => p.stage === filterStage);

  // Stats
  const totalPipelineValue = pipelineItems
    .filter(p => !['lost', 'paid'].includes(p.stage))
    .reduce((sum, p) => sum + p.quote.total, 0);
  const wonValue = pipelineItems
    .filter(p => p.stage === 'paid')
    .reduce((sum, p) => sum + p.quote.total, 0);
  const conversionRate = pipelineItems.length > 0
    ? Math.round((pipelineItems.filter(p => ['job_created', 'in_progress', 'invoiced', 'paid'].includes(p.stage)).length / pipelineItems.length) * 100)
    : 0;
  const actionNeeded = pipelineItems.filter(p => p.stage === 'accepted').length;

  const stageColors: Record<string, { bg: string; text: string; border: string; badge: 'green' | 'amber' | 'sky' | 'red' | 'earth' | 'purple' }> = {
    quote: { bg: 'bg-earth-700/20', text: 'text-earth-300', border: 'border-earth-600/30', badge: 'earth' },
    accepted: { bg: 'bg-amber-600/10', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'amber' },
    job_created: { bg: 'bg-sky-600/10', text: 'text-sky-400', border: 'border-sky-500/30', badge: 'sky' },
    in_progress: { bg: 'bg-purple-600/10', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'purple' },
    invoiced: { bg: 'bg-amber-600/10', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'amber' },
    paid: { bg: 'bg-green-600/10', text: 'text-green-400', border: 'border-green-500/30', badge: 'green' },
    lost: { bg: 'bg-red-600/10', text: 'text-red-400', border: 'border-red-500/30', badge: 'red' },
  };

  const stageFilters = [
    { key: 'all', label: 'All', count: pipelineItems.length },
    { key: 'quote', label: 'Quoted', count: pipelineItems.filter(p => p.stage === 'quote').length },
    { key: 'accepted', label: 'Accepted', count: pipelineItems.filter(p => p.stage === 'accepted').length },
    { key: 'job_created', label: 'Job Created', count: pipelineItems.filter(p => p.stage === 'job_created').length },
    { key: 'in_progress', label: 'In Progress', count: pipelineItems.filter(p => p.stage === 'in_progress').length },
    { key: 'invoiced', label: 'Invoiced', count: pipelineItems.filter(p => p.stage === 'invoiced').length },
    { key: 'paid', label: 'Paid', count: pipelineItems.filter(p => p.stage === 'paid').length },
    { key: 'lost', label: 'Lost', count: pipelineItems.filter(p => p.stage === 'lost').length },
  ];

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openConvert = (item: PipelineItem, type: 'job' | 'invoice') => {
    setConvertingQuote(item);
    setConvertType(type);
    setJobForm({
      scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      scheduled_time: '08:00',
      crew_id: '',
      estimated_hours: '4',
      notes: '',
    });
    setShowConvertModal(true);
  };

  const handleConvertToJob = async () => {
    if (!convertingQuote) return;
    const q = convertingQuote.quote;
    const customer = customers.find(c => c.id === q.customer_id);

    try {
      await addJob({
        title: q.title,
        customer_id: q.customer_id,
        customer: customer,
        ...({ quote_id: q.id } as any),
        status: 'scheduled',
        job_type: 'landscaping',
        scheduled_date: jobForm.scheduled_date,
        scheduled_time: jobForm.scheduled_time,
        estimated_hours: parseFloat(jobForm.estimated_hours) || 4,
        total_price: q.subtotal,
        notes: jobForm.notes || `Created from quote: ${q.title}`,
        address: customer?.address || '',
      });
      toast.success(`Job "${q.title}" created from quote`);
      setShowConvertModal(false);
    } catch {
      toast.error('Failed to create job');
    }
  };

  const handleConvertToInvoice = async () => {
    if (!convertingQuote) return;
    const q = convertingQuote.quote;
    const customer = customers.find(c => c.id === q.customer_id);

    try {
      await addInvoice({
        customer_id: q.customer_id,
        customer: customer,
        quote_id: q.id,
        line_items: q.line_items,
        subtotal: q.subtotal,
        tax_rate: q.tax_rate,
        tax_amount: q.tax_amount,
        total: q.total,
        status: 'draft',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notes: `Generated from quote: ${q.title}`,
      });
      toast.success(`Invoice created from quote "${q.title}"`);
      setShowConvertModal(false);
    } catch {
      toast.error('Failed to create invoice');
    }
  };

  const handleMarkAccepted = async (item: PipelineItem) => {
    try {
      await updateQuote(item.quote.id, { status: 'accepted', accepted_at: new Date().toISOString() });
      toast.success(`"${item.quote.title}" marked as accepted`);
    } catch {
      toast.error('Failed to update quote');
    }
  };

  const handleMarkDeclined = async (item: PipelineItem) => {
    try {
      await updateQuote(item.quote.id, { status: 'declined' });
      toast.success(`"${item.quote.title}" marked as declined`);
    } catch {
      toast.error('Failed to update quote');
    }
  };

  // Board view stage columns
  const boardStages = ['quote', 'accepted', 'job_created', 'in_progress', 'invoiced', 'paid'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-earth-400">Track quotes from proposal to payment</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('pipeline')}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors',
              viewMode === 'pipeline' ? 'bg-green-600/15 text-green-400 border border-green-500/30' : 'text-earth-400 hover:text-earth-200 border border-transparent'
            )}
          >
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors',
              viewMode === 'board' ? 'bg-green-600/15 text-green-400 border border-green-500/30' : 'text-earth-400 hover:text-earth-200 border border-transparent'
            )}
          >
            Board
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pipeline Value"
          value={formatMoney(totalPipelineValue)}
          prefix="$"
          icon={<TrendingUp className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          title="Won Revenue"
          value={formatMoney(wonValue)}
          prefix="$"
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Needs Action"
          value={actionNeeded}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={actionNeeded > 0 ? 'amber' : 'earth'}
        />
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <>
          {/* Stage filters */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {stageFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStage(f.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors',
                  filterStage === f.key
                    ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                    : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
                )}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={clsx(
                    'px-1.5 py-0.5 text-xs rounded-full',
                    filterStage === f.key ? 'bg-green-500/20' : 'bg-earth-700'
                  )}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Pipeline list */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <Card>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 bg-earth-800/50 rounded-2xl text-earth-400 mb-4">
                    <Filter className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-earth-200 mb-2">No items in this stage</h3>
                  <p className="text-sm text-earth-400">Quotes will appear here as they move through the pipeline.</p>
                </div>
              </Card>
            ) : (
              filteredItems.map(item => {
                const colors = stageColors[item.stage] || stageColors.quote;
                const isExpanded = expandedItems.has(item.quote.id);

                return (
                  <Card key={item.quote.id} hover>
                    {/* Main row */}
                    <div className="flex items-center gap-4">
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(item.quote.id)}
                        className="p-1 text-earth-500 hover:text-earth-300 cursor-pointer transition-colors"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </button>

                      {/* Progress bar */}
                      <div className="hidden sm:block w-24 shrink-0">
                        <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              item.stage === 'lost' ? 'bg-red-500' :
                              item.stage === 'paid' ? 'bg-green-500' :
                              item.progress > 50 ? 'bg-sky-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-earth-500 mt-0.5 text-center">{item.progress}%</p>
                      </div>

                      {/* Quote info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-earth-100 truncate">{item.quote.title}</p>
                          <Badge color={colors.badge}>{item.stageLabel}</Badge>
                        </div>
                        <p className="text-xs text-earth-400 truncate">
                          {item.quote.customer?.name}
                          {item.quote.created_at && ` — ${formatDate(item.quote.created_at)}`}
                        </p>
                      </div>

                      {/* Stage icons */}
                      <div className="hidden md:flex items-center gap-1">
                        <div className={clsx('p-1.5 rounded-lg', item.stage !== 'lost' ? 'bg-green-600/15' : 'bg-earth-800')}>
                          <FileText className={clsx('w-3.5 h-3.5', item.stage !== 'lost' ? 'text-green-400' : 'text-earth-500')} />
                        </div>
                        <ArrowRight className="w-3 h-3 text-earth-600" />
                        <div className={clsx('p-1.5 rounded-lg', ['job_created', 'in_progress', 'invoiced', 'paid'].includes(item.stage) ? 'bg-sky-600/15' : 'bg-earth-800')}>
                          <Briefcase className={clsx('w-3.5 h-3.5', ['job_created', 'in_progress', 'invoiced', 'paid'].includes(item.stage) ? 'text-sky-400' : 'text-earth-500')} />
                        </div>
                        <ArrowRight className="w-3 h-3 text-earth-600" />
                        <div className={clsx('p-1.5 rounded-lg', ['invoiced', 'paid'].includes(item.stage) ? 'bg-amber-600/15' : 'bg-earth-800')}>
                          <Receipt className={clsx('w-3.5 h-3.5', ['invoiced', 'paid'].includes(item.stage) ? 'text-amber-400' : 'text-earth-500')} />
                        </div>
                        <ArrowRight className="w-3 h-3 text-earth-600" />
                        <div className={clsx('p-1.5 rounded-lg', item.stage === 'paid' ? 'bg-green-600/15' : 'bg-earth-800')}>
                          <CheckCircle2 className={clsx('w-3.5 h-3.5', item.stage === 'paid' ? 'text-green-400' : 'text-earth-500')} />
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-earth-100">${formatMoney(item.quote.total)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.stage === 'quote' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleMarkAccepted(item)}>
                              Accept
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleMarkDeclined(item)}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {item.stage === 'accepted' && (
                          <Button size="sm" icon={<Zap className="w-3.5 h-3.5" />} onClick={() => openConvert(item, 'job')}>
                            <span className="hidden lg:inline">Create Job</span>
                          </Button>
                        )}
                        {['job_created', 'in_progress'].includes(item.stage) && !item.linkedInvoice && (
                          <Button size="sm" variant="secondary" icon={<Receipt className="w-3.5 h-3.5" />} onClick={() => openConvert(item, 'invoice')}>
                            <span className="hidden lg:inline">Invoice</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-earth-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Quote details */}
                          <div className={clsx('p-3 rounded-lg border', colors.bg, colors.border)}>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-earth-400" />
                              <p className="text-xs font-semibold uppercase tracking-wider text-earth-400">Quote</p>
                            </div>
                            <p className="text-sm text-earth-200">{item.quote.title}</p>
                            <p className="text-xs text-earth-400 mt-1">{item.quote.line_items.length} line items</p>
                            <p className="text-sm font-semibold text-earth-100 mt-2">${formatMoney(item.quote.total)}</p>
                            {item.quote.valid_until && (
                              <p className="text-xs text-earth-500 mt-1">Valid until {formatDate(item.quote.valid_until)}</p>
                            )}
                          </div>

                          {/* Job details */}
                          <div className={clsx(
                            'p-3 rounded-lg border',
                            item.linkedJob ? 'bg-sky-600/5 border-sky-500/20' : 'bg-earth-800/20 border-earth-700/30'
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="w-4 h-4 text-earth-400" />
                              <p className="text-xs font-semibold uppercase tracking-wider text-earth-400">Job</p>
                            </div>
                            {item.linkedJob ? (
                              <>
                                <p className="text-sm text-earth-200">{item.linkedJob.title}</p>
                                <Badge color={
                                  item.linkedJob.status === 'completed' ? 'green' :
                                  item.linkedJob.status === 'in_progress' ? 'amber' :
                                  'sky'
                                }>
                                  {item.linkedJob.status.replace('_', ' ')}
                                </Badge>
                                {item.linkedJob.scheduled_date && (
                                  <p className="text-xs text-earth-500 mt-2">
                                    <Calendar className="w-3 h-3 inline mr-1" />
                                    {formatDate(item.linkedJob.scheduled_date)}
                                  </p>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-2">
                                <p className="text-xs text-earth-500 mb-2">No job created yet</p>
                                {item.stage === 'accepted' && (
                                  <Button size="sm" variant="ghost" icon={<Plus className="w-3 h-3" />} onClick={() => openConvert(item, 'job')}>
                                    Create Job
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Invoice details */}
                          <div className={clsx(
                            'p-3 rounded-lg border',
                            item.linkedInvoice ? 'bg-amber-600/5 border-amber-500/20' : 'bg-earth-800/20 border-earth-700/30'
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <Receipt className="w-4 h-4 text-earth-400" />
                              <p className="text-xs font-semibold uppercase tracking-wider text-earth-400">Invoice</p>
                            </div>
                            {item.linkedInvoice ? (
                              <>
                                <p className="text-sm text-earth-200">{item.linkedInvoice.invoice_number}</p>
                                <Badge color={
                                  item.linkedInvoice.status === 'paid' ? 'green' :
                                  item.linkedInvoice.status === 'overdue' ? 'red' :
                                  item.linkedInvoice.status === 'sent' ? 'sky' :
                                  'earth'
                                }>
                                  {item.linkedInvoice.status}
                                </Badge>
                                <p className="text-sm font-semibold text-earth-100 mt-2">${formatMoney(item.linkedInvoice.total)}</p>
                                {item.linkedInvoice.due_date && (
                                  <p className="text-xs text-earth-500 mt-1">Due {formatDate(item.linkedInvoice.due_date)}</p>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-2">
                                <p className="text-xs text-earth-500 mb-2">No invoice yet</p>
                                {item.linkedJob && (
                                  <Button size="sm" variant="ghost" icon={<Plus className="w-3 h-3" />} onClick={() => openConvert(item, 'invoice')}>
                                    Create Invoice
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Line items */}
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-earth-500 mb-2">Line Items</p>
                          <div className="space-y-1">
                            {item.quote.line_items.map(li => (
                              <div key={li.id} className="flex justify-between text-xs py-1">
                                <span className="text-earth-300">{li.description}</span>
                                <span className="text-earth-400">{li.quantity} x ${formatMoney(li.unit_price)} = ${formatMoney(li.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[900px]">
            {boardStages.map(stage => {
              const stageItems = pipelineItems.filter(p => p.stage === stage);
              const colors = stageColors[stage] || stageColors.quote;
              const stageTotal = stageItems.reduce((sum, p) => sum + p.quote.total, 0);
              const stageLabels: Record<string, string> = {
                quote: 'Quoted', accepted: 'Accepted', job_created: 'Job Created',
                in_progress: 'In Progress', invoiced: 'Invoiced', paid: 'Paid',
              };

              return (
                <div key={stage} className="flex-1 min-w-[180px]">
                  {/* Column header */}
                  <div className={clsx('p-3 rounded-t-xl border-b-2', colors.bg, colors.border)}>
                    <div className="flex items-center justify-between mb-1">
                      <p className={clsx('text-sm font-semibold', colors.text)}>{stageLabels[stage]}</p>
                      <span className={clsx('px-1.5 py-0.5 text-xs rounded-full', colors.bg, colors.text)}>
                        {stageItems.length}
                      </span>
                    </div>
                    <p className="text-xs text-earth-500">${formatMoney(stageTotal)}</p>
                  </div>

                  {/* Column cards */}
                  <div className="space-y-2 mt-2">
                    {stageItems.map(item => (
                      <div
                        key={item.quote.id}
                        className={clsx(
                          'p-3 rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
                          colors.bg, colors.border
                        )}
                      >
                        <p className="text-sm font-medium text-earth-100 truncate">{item.quote.title}</p>
                        <p className="text-xs text-earth-400 truncate mt-0.5">{item.quote.customer?.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-earth-200">${formatMoney(item.quote.total)}</p>
                          {item.stage === 'accepted' && (
                            <button
                              onClick={() => openConvert(item, 'job')}
                              className="p-1 text-amber-400 hover:text-amber-300 cursor-pointer"
                              title="Create Job"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                            </button>
                          )}
                          {['job_created', 'in_progress'].includes(item.stage) && !item.linkedInvoice && (
                            <button
                              onClick={() => openConvert(item, 'invoice')}
                              className="p-1 text-sky-400 hover:text-sky-300 cursor-pointer"
                              title="Create Invoice"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {/* Mini progress bar */}
                        <div className="h-1 bg-earth-800 rounded-full mt-2 overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              item.stage === 'paid' ? 'bg-green-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {stageItems.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-xs text-earth-600">No items</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline summary */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-earth-900/80 border border-earth-800 rounded-xl text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-earth-400" />
          <span className="text-earth-400">Pipeline:</span>
        </div>
        <span className="text-earth-300">{pipelineItems.length} quotes</span>
        <div className="w-px h-4 bg-earth-700" />
        <span className="text-sky-400">${formatMoney(totalPipelineValue)} active</span>
        <div className="w-px h-4 bg-earth-700" />
        <span className="text-green-400">${formatMoney(wonValue)} won</span>
        <div className="w-px h-4 bg-earth-700" />
        <span className="text-earth-300">{conversionRate}% conversion</span>
      </div>

      {/* Convert Modal */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title={convertType === 'job' ? 'Create Job from Quote' : 'Create Invoice from Quote'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConvertModal(false)}>Cancel</Button>
            <Button
              icon={convertType === 'job' ? <Briefcase className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
              onClick={convertType === 'job' ? handleConvertToJob : handleConvertToInvoice}
            >
              {convertType === 'job' ? 'Create Job' : 'Create Invoice'}
            </Button>
          </>
        }
      >
        {convertingQuote && (
          <div className="space-y-4">
            {/* Quote summary */}
            <div className="p-4 bg-earth-800/30 rounded-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-earth-500 mb-2">From Quote</p>
              <p className="text-sm font-medium text-earth-100">{convertingQuote.quote.title}</p>
              <p className="text-xs text-earth-400 mt-0.5">{convertingQuote.quote.customer?.name}</p>
              <p className="text-sm font-bold text-green-400 mt-2">${formatMoney(convertingQuote.quote.total)}</p>
              <div className="mt-2 space-y-0.5">
                {convertingQuote.quote.line_items.slice(0, 3).map(li => (
                  <p key={li.id} className="text-xs text-earth-400">{li.description} — ${formatMoney(li.total)}</p>
                ))}
                {convertingQuote.quote.line_items.length > 3 && (
                  <p className="text-xs text-earth-500">+{convertingQuote.quote.line_items.length - 3} more</p>
                )}
              </div>
            </div>

            {convertType === 'job' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Scheduled Date"
                    type="date"
                    value={jobForm.scheduled_date}
                    onChange={e => setJobForm(f => ({ ...f, scheduled_date: e.target.value }))}
                  />
                  <Input
                    label="Time"
                    type="time"
                    value={jobForm.scheduled_time}
                    onChange={e => setJobForm(f => ({ ...f, scheduled_time: e.target.value }))}
                  />
                </div>
                <Input
                  label="Estimated Hours"
                  type="number"
                  value={jobForm.estimated_hours}
                  onChange={e => setJobForm(f => ({ ...f, estimated_hours: e.target.value }))}
                />
                <Input
                  label="Notes"
                  value={jobForm.notes}
                  onChange={e => setJobForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Special instructions..."
                />
              </div>
            )}

            {convertType === 'invoice' && (
              <div className="space-y-3">
                <div className="p-3 bg-earth-800/20 rounded-lg">
                  <p className="text-xs text-earth-500">The invoice will be created with:</p>
                  <ul className="text-sm text-earth-300 mt-1 space-y-0.5">
                    <li>All line items from the quote</li>
                    <li>Tax rate: {convertingQuote.quote.tax_rate}%</li>
                    <li>Due in 30 days</li>
                    <li>Status: Draft (ready to send)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
