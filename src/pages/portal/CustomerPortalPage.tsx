import { useState, useMemo } from 'react';
import { format, formatDistanceToNow, isPast, addDays } from 'date-fns';
import {
  Briefcase, DollarSign, FileText, CalendarDays, ChevronDown, ChevronUp,
  CreditCard, Clock, Users, CheckCircle2, AlertCircle, ArrowRight,
  Leaf, Phone, Mail, MapPin, ExternalLink, Shield, Eye,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';

// ─── Portal Proposal Types ────────────────────────────────────────
interface PortalLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface PortalProposalSection {
  id: string;
  title: string;
  description: string;
  items: PortalLineItem[];
}

interface PortalProposal {
  id: string;
  title: string;
  customer_id: string;
  sections: PortalProposalSection[];
  notes: string;
  terms: string;
  valid_days: number;
  tax_rate: number;
  discount_percent: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  created_at: string;
}

// ─── Demo Proposals for Portal Customer ───────────────────────────
function getPortalProposals(customerId: string): PortalProposal[] {
  if (customerId !== '1') return [];
  return [
    {
      id: 'portal-p1',
      title: 'Complete Backyard Transformation',
      customer_id: '1',
      sections: [
        {
          id: 's1', title: 'Hardscape', description: 'Patio and walkway installation',
          items: [
            { id: 'i1', description: 'Flagstone patio (400 sq ft)', quantity: 400, unit: 'sq ft', unit_price: 12.50, total: 5000 },
            { id: 'i2', description: 'Decomposed granite walkway', quantity: 120, unit: 'sq ft', unit_price: 8.00, total: 960 },
            { id: 'i3', description: 'Retaining wall (natural stone)', quantity: 40, unit: 'lin ft', unit_price: 45.00, total: 1800 },
          ],
        },
        {
          id: 's2', title: 'Planting', description: 'Native Texas plants and trees',
          items: [
            { id: 'i4', description: 'Live Oak tree (3" caliper)', quantity: 2, unit: 'each', unit_price: 550, total: 1100 },
            { id: 'i5', description: 'Mexican Heather border', quantity: 60, unit: 'plants', unit_price: 5.99, total: 359.40 },
            { id: 'i6', description: 'Bermuda sod installation', quantity: 800, unit: 'sq ft', unit_price: 0.85, total: 680 },
          ],
        },
        {
          id: 's3', title: 'Irrigation', description: 'Smart irrigation system',
          items: [
            { id: 'i7', description: 'Drip irrigation zones (6 zones)', quantity: 6, unit: 'zones', unit_price: 185, total: 1110 },
            { id: 'i8', description: 'Smart Wi-Fi controller', quantity: 1, unit: 'each', unit_price: 289, total: 289 },
          ],
        },
      ],
      notes: 'All plants are native Texas species selected for drought tolerance. 1-year warranty on all plant material. Irrigation system includes smart scheduling based on local weather data.',
      terms: 'Payment: 50% deposit upon acceptance, 50% upon completion. Work begins within 2 weeks of deposit. Estimated completion: 3-4 weeks.',
      valid_days: 30,
      tax_rate: 8.25,
      discount_percent: 0,
      status: 'sent',
      created_at: '2026-03-05T00:00:00Z',
    },
    {
      id: 'portal-p2',
      title: 'Pool Area Landscaping',
      customer_id: '1',
      sections: [
        {
          id: 's4', title: 'Pool Surround Planting', description: 'Tropical and native plantings around pool area',
          items: [
            { id: 'i9', description: 'Bird of Paradise (5 gal)', quantity: 6, unit: 'each', unit_price: 45, total: 270 },
            { id: 'i10', description: 'Agave americana', quantity: 4, unit: 'each', unit_price: 65, total: 260 },
            { id: 'i11', description: 'Lantana ground cover', quantity: 24, unit: 'flats', unit_price: 12, total: 288 },
            { id: 'i12', description: 'Decorative river rock border', quantity: 2, unit: 'tons', unit_price: 280, total: 560 },
          ],
        },
        {
          id: 's5', title: 'Lighting', description: 'Low-voltage landscape lighting',
          items: [
            { id: 'i13', description: 'LED path lights', quantity: 8, unit: 'each', unit_price: 85, total: 680 },
            { id: 'i14', description: 'Spot uplights for trees', quantity: 4, unit: 'each', unit_price: 120, total: 480 },
            { id: 'i15', description: 'Transformer & wiring', quantity: 1, unit: 'system', unit_price: 350, total: 350 },
          ],
        },
      ],
      notes: 'All plantings selected for pool-safe root systems. Lighting designed for ambient evening effect. Installation includes cleanup of all existing debris.',
      terms: 'Full payment due upon completion. Estimated timeline: 5-7 business days.',
      valid_days: 21,
      tax_rate: 8.25,
      discount_percent: 5,
      status: 'sent',
      created_at: '2026-03-07T00:00:00Z',
    },
    {
      id: 'portal-p3',
      title: 'Spring Fertilization Program',
      customer_id: '1',
      sections: [
        {
          id: 's6', title: 'Lawn Treatment', description: '4-visit spring program',
          items: [
            { id: 'i16', description: 'Pre-emergent weed control', quantity: 1, unit: 'application', unit_price: 125, total: 125 },
            { id: 'i17', description: 'Balanced fertilizer (10-10-10)', quantity: 2, unit: 'applications', unit_price: 95, total: 190 },
            { id: 'i18', description: 'Soil pH amendment', quantity: 1, unit: 'application', unit_price: 85, total: 85 },
          ],
        },
      ],
      notes: 'Applications scheduled 3-4 weeks apart for optimal results. All products are pet-safe after drying (typically 2-4 hours).',
      terms: 'Billed as single package. Service begins within one week of acceptance.',
      valid_days: 14,
      tax_rate: 8.25,
      discount_percent: 0,
      status: 'accepted',
      created_at: '2026-02-20T00:00:00Z',
    },
  ];
}

// ─── Demo Payment History ─────────────────────────────────────────
interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  invoice_number: string;
  description: string;
}

function getPaymentHistory(customerId: string): PaymentRecord[] {
  if (customerId !== '1') return [];
  return [
    { id: 'pay-1', date: '2026-03-03', amount: 400, method: 'Credit Card', invoice_number: 'INV-2026-004', description: 'Partial payment - February maintenance' },
    { id: 'pay-2', date: '2026-02-05', amount: 757.75, method: 'ACH Transfer', invoice_number: 'INV-2026-000', description: 'January maintenance (4 visits)' },
    { id: 'pay-3', date: '2026-01-08', amount: 175, method: 'Credit Card', invoice_number: 'INV-2025-047', description: 'Late December maintenance visit' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────
const jobStatusColors: Record<string, 'green' | 'sky' | 'amber' | 'red' | 'earth' | 'purple'> = {
  scheduled: 'sky',
  in_progress: 'amber',
  completed: 'green',
  on_hold: 'earth',
  cancelled: 'red',
  pending: 'purple',
};

const invoiceStatusColors: Record<string, 'green' | 'sky' | 'amber' | 'red' | 'earth'> = {
  paid: 'green',
  sent: 'sky',
  partial: 'amber',
  overdue: 'red',
  draft: 'earth',
  cancelled: 'earth',
};

const proposalStatusColors: Record<string, 'green' | 'sky' | 'amber' | 'red' | 'earth'> = {
  draft: 'earth',
  sent: 'sky',
  viewed: 'amber',
  accepted: 'green',
  declined: 'red',
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getJobStatusLabel(status: string): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getProgressPercent(status: string): number {
  switch (status) {
    case 'scheduled': return 10;
    case 'in_progress': return 55;
    case 'completed': return 100;
    case 'on_hold': return 35;
    default: return 0;
  }
}

// ─── Main Component ──────────────────────────────────────────────
export default function CustomerPortalPage() {
  const { customers, jobs, invoices, crews } = useData();
  const toast = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState('1');
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [proposals, setProposals] = useState<PortalProposal[]>(() => getPortalProposals('1'));
  const [showProposalDetail, setShowProposalDetail] = useState<PortalProposal | null>(null);

  // ─── Derived Data ─────────────────────────────────────────────
  const customer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const customerJobs = useMemo(
    () => jobs.filter(j => j.customer_id === selectedCustomerId),
    [jobs, selectedCustomerId]
  );

  const activeJobs = useMemo(
    () => customerJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled'),
    [customerJobs]
  );

  const customerInvoices = useMemo(
    () => invoices.filter(i => i.customer_id === selectedCustomerId),
    [invoices, selectedCustomerId]
  );

  const pendingProposals = useMemo(
    () => proposals.filter(p => p.status === 'sent' || p.status === 'viewed'),
    [proposals]
  );

  const outstandingBalance = useMemo(
    () => customerInvoices
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.total - (i.amount_paid ?? i.paid_amount ?? 0), 0),
    [customerInvoices]
  );

  const nextScheduledVisit = useMemo(() => {
    const upcoming = customerJobs
      .filter(j => j.status === 'scheduled' && j.scheduled_date)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return upcoming[0] || null;
  }, [customerJobs]);

  const upcomingVisits = useMemo(() => {
    return customerJobs
      .filter(j => j.status === 'scheduled' || j.status === 'in_progress')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .slice(0, 4);
  }, [customerJobs]);

  const paymentHistory = useMemo(
    () => getPaymentHistory(selectedCustomerId),
    [selectedCustomerId]
  );

  // ─── Handlers ─────────────────────────────────────────────────
  const handleApproveProposal = (proposalId: string) => {
    setProposals(prev => prev.map(p =>
      p.id === proposalId ? { ...p, status: 'accepted' } : p
    ));
    toast.success('Proposal approved! We will be in touch to schedule your project.');
    setShowProposalDetail(null);
  };

  const handleDeclineProposal = (proposalId: string) => {
    setProposals(prev => prev.map(p =>
      p.id === proposalId ? { ...p, status: 'declined' } : p
    ));
    toast.info('Proposal declined. Contact us if you change your mind.');
    setShowProposalDetail(null);
  };

  const handlePayNow = () => {
    toast.info('Online payment portal coming soon! Please call (512) 555-0000 for payment options.');
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setProposals(getPortalProposals(id));
    setShowCustomerPicker(false);
  };

  const getCrewName = (crewId?: string) => {
    if (!crewId) return 'Unassigned';
    const crew = crews.find(c => c.id === crewId);
    return crew?.name ?? 'Unassigned';
  };

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <div className="text-center py-8 px-4">
            <AlertCircle className="w-12 h-12 text-earth-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-earth-100 mb-2">Customer Not Found</h3>
            <p className="text-sm text-earth-400">The selected customer account could not be loaded.</p>
          </div>
        </Card>
      </div>
    );
  }

  const firstName = customer.name.split(' ')[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ─── Portal Header ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-green-600/15 via-green-700/10 to-earth-900/60 border border-green-700/30 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-green-600/20 border border-green-600/30 flex items-center justify-center">
              <Leaf className="w-6 h-6 sm:w-7 sm:h-7 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-earth-50">
                Welcome back, {firstName}
              </h1>
              <p className="text-sm text-earth-400 mt-0.5">
                Maas Verde Landscape Restoration — Customer Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomerPicker(true)}
              className="flex items-center gap-2 px-3 py-2 bg-earth-800/60 border border-earth-700 rounded-lg text-sm text-earth-300 hover:text-earth-100 hover:border-earth-600 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View as:</span>
              <span className="font-medium text-earth-100">{customer.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Customer info bar */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-green-700/20">
          <div className="flex items-center gap-1.5 text-sm text-earth-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>{customer.address}, {customer.city} {customer.state}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-earth-400">
            <Phone className="w-3.5 h-3.5" />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-earth-400">
            <Mail className="w-3.5 h-3.5" />
            <span>{customer.email}</span>
          </div>
          {customer.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {customer.tags.map(tag => (
                <Badge key={tag} color="green">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Summary Stat Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={activeJobs.length}
          icon={<Briefcase className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Pending Proposals"
          value={pendingProposals.length}
          icon={<FileText className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          title="Outstanding Balance"
          value={`$${formatCurrency(outstandingBalance)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color={outstandingBalance > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Next Scheduled Visit"
          value={nextScheduledVisit
            ? format(new Date(nextScheduledVisit.scheduled_date), 'MMM d')
            : 'None'}
          icon={<CalendarDays className="w-5 h-5" />}
          color="earth"
        />
      </div>

      {/* ─── Active Jobs Section ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display text-earth-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-400" />
            Your Jobs
          </h2>
          <Badge color="earth">{customerJobs.length} total</Badge>
        </div>

        {customerJobs.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <Briefcase className="w-10 h-10 text-earth-600 mx-auto mb-3" />
              <p className="text-earth-400">No jobs on file yet.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {customerJobs.map(job => {
              const progress = getProgressPercent(job.status);
              const isActive = job.status === 'in_progress' || job.status === 'scheduled';
              return (
                <Card key={job.id} className={isActive ? 'border-green-700/30' : undefined}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium text-earth-100 truncate">{job.title}</h3>
                        <Badge color={jobStatusColors[job.status] ?? 'earth'} dot>
                          {getJobStatusLabel(job.status)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-earth-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {format(new Date(job.scheduled_date), 'EEEE, MMM d, yyyy')}
                          {job.scheduled_time && ` at ${job.scheduled_time}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {getCrewName(job.crew_id)}
                        </span>
                        {job.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {job.estimated_hours}h estimated
                          </span>
                        )}
                      </div>

                      {/* Progress bar for active jobs */}
                      {(job.status === 'in_progress' || job.status === 'scheduled' || job.status === 'on_hold') && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-earth-400 mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-earth-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                job.status === 'in_progress' ? 'bg-amber-500' :
                                job.status === 'on_hold' ? 'bg-earth-500' :
                                'bg-sky-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {job.notes && (
                        <p className="text-xs text-earth-500 mt-2 italic">{job.notes}</p>
                      )}
                    </div>

                    {job.total_price && (
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-earth-100">${formatCurrency(job.total_price)}</p>
                        <p className="text-xs text-earth-500">Job Total</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Proposals Section ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display text-earth-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Proposals
          </h2>
          {pendingProposals.length > 0 && (
            <Badge color="sky" dot>{pendingProposals.length} awaiting your review</Badge>
          )}
        </div>

        {proposals.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-earth-600 mx-auto mb-3" />
              <p className="text-earth-400">No proposals for this account.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {proposals.map(proposal => {
              const subtotal = proposal.sections.reduce(
                (sum, s) => sum + s.items.reduce((si, i) => si + i.total, 0), 0
              );
              const discountAmount = subtotal * (proposal.discount_percent / 100);
              const taxableAmount = subtotal - discountAmount;
              const taxAmount = taxableAmount * (proposal.tax_rate / 100);
              const grandTotal = taxableAmount + taxAmount;
              const isExpanded = expandedProposal === proposal.id;
              const isPending = proposal.status === 'sent' || proposal.status === 'viewed';

              return (
                <Card
                  key={proposal.id}
                  className={isPending ? 'border-sky-700/30' : undefined}
                >
                  {/* Header row */}
                  <div>
                    <div
                      className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedProposal(isExpanded ? null : proposal.id); }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-sky-600/15 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-sky-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-earth-100 truncate">{proposal.title}</p>
                            <Badge color={proposalStatusColors[proposal.status]}>{proposal.status}</Badge>
                          </div>
                          <p className="text-xs text-earth-400">
                            {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                            {' '}&middot;{' '}
                            Valid for {proposal.valid_days} days
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-13 sm:ml-0">
                        <p className="text-lg font-bold text-earth-100">${formatCurrency(grandTotal)}</p>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-earth-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-earth-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-earth-800 space-y-4">
                        {proposal.sections.map(section => (
                          <div key={section.id}>
                            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-1">
                              {section.title}
                            </h4>
                            {section.description && (
                              <p className="text-xs text-earth-400 mb-2">{section.description}</p>
                            )}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-earth-800">
                                    <th className="text-left py-2 text-xs text-earth-400">Description</th>
                                    <th className="text-right py-2 text-xs text-earth-400">Qty</th>
                                    <th className="text-right py-2 text-xs text-earth-400">Rate</th>
                                    <th className="text-right py-2 text-xs text-earth-400">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.items.map(item => (
                                    <tr key={item.id} className="border-b border-earth-800/40">
                                      <td className="py-2 text-earth-200">{item.description}</td>
                                      <td className="py-2 text-right text-earth-300">{item.quantity} {item.unit}</td>
                                      <td className="py-2 text-right text-earth-300">${item.unit_price.toFixed(2)}</td>
                                      <td className="py-2 text-right font-medium text-earth-100">
                                        ${formatCurrency(item.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}

                        {/* Totals */}
                        <div className="border-t border-earth-700 pt-3 space-y-1.5">
                          <div className="flex justify-between text-sm text-earth-300">
                            <span>Subtotal</span>
                            <span>${formatCurrency(subtotal)}</span>
                          </div>
                          {proposal.discount_percent > 0 && (
                            <div className="flex justify-between text-sm text-amber-400">
                              <span>Discount ({proposal.discount_percent}%)</span>
                              <span>-${formatCurrency(discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-earth-300">
                            <span>Tax ({proposal.tax_rate}%)</span>
                            <span>${formatCurrency(taxAmount)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-earth-50 pt-2 border-t border-earth-700">
                            <span>Total</span>
                            <span className="text-green-400">${formatCurrency(grandTotal)}</span>
                          </div>
                        </div>

                        {/* Notes and terms */}
                        {proposal.notes && (
                          <div className="p-3 bg-earth-900/50 rounded-lg border border-earth-800/50">
                            <p className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-1.5">Notes & Scope</p>
                            <p className="text-sm text-earth-300 whitespace-pre-wrap">{proposal.notes}</p>
                          </div>
                        )}
                        {proposal.terms && (
                          <div className="p-3 bg-earth-900/50 rounded-lg border border-earth-800/50">
                            <p className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-1.5">Terms & Conditions</p>
                            <p className="text-sm text-earth-300 whitespace-pre-wrap">{proposal.terms}</p>
                          </div>
                        )}

                        {/* Action buttons for pending proposals */}
                        {isPending && (
                          <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button
                              variant="primary"
                              icon={<CheckCircle2 className="w-4 h-4" />}
                              onClick={() => handleApproveProposal(proposal.id)}
                            >
                              Approve Proposal
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDeclineProposal(proposal.id)}
                            >
                              Decline
                            </Button>
                          </div>
                        )}

                        {proposal.status === 'accepted' && (
                          <div className="flex items-center gap-2 p-3 bg-green-600/10 border border-green-700/30 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                            <p className="text-sm text-green-300">
                              You approved this proposal. Our team will be in touch to schedule your project.
                            </p>
                          </div>
                        )}

                        {proposal.status === 'declined' && (
                          <div className="flex items-center gap-2 p-3 bg-earth-800/40 border border-earth-700/30 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-earth-400 shrink-0" />
                            <p className="text-sm text-earth-400">
                              This proposal was declined. Contact us if you'd like to revisit.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Invoices & Payments Section ───────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display text-earth-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Invoices & Payments
          </h2>
          {outstandingBalance > 0 && (
            <Badge color="amber" dot>${formatCurrency(outstandingBalance)} outstanding</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoices */}
          <div>
            <h3 className="text-sm font-semibold text-earth-300 uppercase tracking-wider mb-3">Invoices</h3>
            {customerInvoices.length === 0 ? (
              <Card>
                <div className="text-center py-6">
                  <DollarSign className="w-8 h-8 text-earth-600 mx-auto mb-2" />
                  <p className="text-earth-400 text-sm">No invoices on file.</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {customerInvoices.map(invoice => {
                  const amountPaid = invoice.amount_paid ?? invoice.paid_amount ?? 0;
                  const remaining = invoice.total - amountPaid;
                  const isOverdue = invoice.status === 'overdue' || (
                    invoice.status === 'sent' && isPast(new Date(invoice.due_date))
                  );
                  const isUnpaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';

                  return (
                    <Card key={invoice.id} className={isOverdue ? 'border-red-700/30' : undefined}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-earth-100">{invoice.invoice_number}</p>
                            <Badge color={invoiceStatusColors[invoice.status] ?? 'earth'} dot>
                              {invoice.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-earth-400 mt-1">
                            <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                            {isOverdue && (
                              <span className="text-red-400 font-medium">
                                Overdue by {formatDistanceToNow(new Date(invoice.due_date))}
                              </span>
                            )}
                          </div>
                          {invoice.line_items.length > 0 && (
                            <p className="text-xs text-earth-500 mt-1 truncate">
                              {invoice.line_items.map(li => li.description).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-bold text-earth-100">${formatCurrency(invoice.total)}</p>
                            {amountPaid > 0 && amountPaid < invoice.total && (
                              <p className="text-xs text-amber-400">${formatCurrency(remaining)} remaining</p>
                            )}
                            {invoice.status === 'paid' && (
                              <p className="text-xs text-green-400">Paid in full</p>
                            )}
                          </div>
                          {isUnpaid && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<CreditCard className="w-3.5 h-3.5" />}
                              onClick={handlePayNow}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-earth-300 uppercase tracking-wider mb-3">Payment History</h3>
            {paymentHistory.length === 0 ? (
              <Card>
                <div className="text-center py-6">
                  <CreditCard className="w-8 h-8 text-earth-600 mx-auto mb-2" />
                  <p className="text-earth-400 text-sm">No payment history yet.</p>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="divide-y divide-earth-800">
                  {paymentHistory.map(payment => (
                    <div key={payment.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-green-600/15 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-earth-200 truncate">{payment.description}</p>
                        <div className="flex items-center gap-2 text-xs text-earth-400">
                          <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                          <span>&middot;</span>
                          <span>{payment.method}</span>
                          <span>&middot;</span>
                          <span>{payment.invoice_number}</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-green-400 shrink-0">
                        -${formatCurrency(payment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ─── Upcoming Schedule Section ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display text-earth-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-purple-400" />
            Upcoming Schedule
          </h2>
        </div>

        {upcomingVisits.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <CalendarDays className="w-10 h-10 text-earth-600 mx-auto mb-3" />
              <p className="text-earth-400">No upcoming visits scheduled.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingVisits.map((visit, idx) => {
              const visitDate = new Date(visit.scheduled_date);
              const isToday = format(visitDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isTomorrow = format(visitDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd');

              return (
                <Card
                  key={visit.id}
                  className={
                    idx === 0
                      ? 'border-green-700/30 bg-gradient-to-br from-green-600/5 to-transparent'
                      : undefined
                  }
                >
                  <div className="flex items-start gap-4">
                    {/* Date tile */}
                    <div className="w-14 h-14 rounded-xl bg-earth-800 border border-earth-700 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-earth-400 uppercase leading-none">
                        {format(visitDate, 'MMM')}
                      </span>
                      <span className="text-xl font-bold text-earth-100 leading-tight">
                        {format(visitDate, 'd')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-earth-100 truncate">{visit.title}</p>
                        {isToday && <Badge color="green">Today</Badge>}
                        {isTomorrow && <Badge color="sky">Tomorrow</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-earth-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {visit.scheduled_time || '8:00 AM'}
                          {visit.estimated_hours && ` (${visit.estimated_hours}h)`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {getCrewName(visit.crew_id)}
                        </span>
                      </div>
                      <Badge color={jobStatusColors[visit.status] ?? 'earth'} size="sm">
                        {getJobStatusLabel(visit.status)}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Portal Footer ─────────────────────────────────────── */}
      <div className="border-t border-earth-800 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-earth-300">Maas Verde Landscape Restoration</p>
              <p className="text-xs text-earth-500">Austin, TX &middot; (512) 555-0000 &middot; info@maasverde.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-earth-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Secure Customer Portal
            </span>
            <span>&middot;</span>
            <button className="hover:text-earth-300 transition-colors cursor-pointer flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* ─── Customer Picker Modal ─────────────────────────────── */}
      <Modal
        isOpen={showCustomerPicker}
        onClose={() => setShowCustomerPicker(false)}
        title="Select Customer Account"
        size="sm"
      >
        <div className="space-y-2">
          <p className="text-sm text-earth-400 mb-3">
            Switch the portal view to a different customer:
          </p>
          {customers.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectCustomer(c.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                c.id === selectedCustomerId
                  ? 'border-green-600/50 bg-green-600/10'
                  : 'border-earth-800 hover:border-earth-600 hover:bg-earth-800/50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center text-sm font-bold text-green-400 shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-earth-100 truncate">{c.name}</p>
                <p className="text-xs text-earth-400 truncate">{c.email}</p>
              </div>
              {c.id === selectedCustomerId && (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              )}
              <ArrowRight className="w-4 h-4 text-earth-500 shrink-0" />
            </button>
          ))}
        </div>
      </Modal>

      {/* ─── Proposal Detail Modal ─────────────────────────────── */}
      {showProposalDetail && (
        <Modal
          isOpen={!!showProposalDetail}
          onClose={() => setShowProposalDetail(null)}
          title={showProposalDetail.title}
          size="lg"
          footer={
            (showProposalDetail.status === 'sent' || showProposalDetail.status === 'viewed') ? (
              <>
                <Button variant="secondary" onClick={() => setShowProposalDetail(null)}>Close</Button>
                <Button variant="secondary" onClick={() => handleDeclineProposal(showProposalDetail.id)}>Decline</Button>
                <Button icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => handleApproveProposal(showProposalDetail.id)}>
                  Approve Proposal
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setShowProposalDetail(null)}>Close</Button>
            )
          }
        >
          <ProposalDetailView proposal={showProposalDetail} />
        </Modal>
      )}
    </div>
  );
}

// ─── Proposal Detail Sub-component ───────────────────────────────
function ProposalDetailView({ proposal }: { proposal: PortalProposal }) {
  const subtotal = proposal.sections.reduce(
    (sum, s) => sum + s.items.reduce((si, i) => si + i.total, 0), 0
  );
  const discountAmount = subtotal * (proposal.discount_percent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (proposal.tax_rate / 100);
  const grandTotal = taxableAmount + taxAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-earth-400">
            Created {format(new Date(proposal.created_at), 'MMMM d, yyyy')}
            {' '}&middot; Valid for {proposal.valid_days} days
          </p>
        </div>
        <Badge color={proposalStatusColors[proposal.status]}>{proposal.status}</Badge>
      </div>

      {proposal.sections.map(section => (
        <div key={section.id}>
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-1">
            {section.title}
          </h4>
          {section.description && (
            <p className="text-xs text-earth-400 mb-2">{section.description}</p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-earth-800">
                <th className="text-left py-2 text-xs text-earth-400">Description</th>
                <th className="text-right py-2 text-xs text-earth-400">Qty</th>
                <th className="text-right py-2 text-xs text-earth-400">Rate</th>
                <th className="text-right py-2 text-xs text-earth-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map(item => (
                <tr key={item.id} className="border-b border-earth-800/40">
                  <td className="py-2 text-earth-200">{item.description}</td>
                  <td className="py-2 text-right text-earth-300">{item.quantity} {item.unit}</td>
                  <td className="py-2 text-right text-earth-300">${item.unit_price.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium text-earth-100">
                    ${formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="border-t border-earth-700 pt-4 space-y-1.5">
        <div className="flex justify-between text-sm text-earth-300">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        {proposal.discount_percent > 0 && (
          <div className="flex justify-between text-sm text-amber-400">
            <span>Discount ({proposal.discount_percent}%)</span>
            <span>-${formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-earth-300">
          <span>Tax ({proposal.tax_rate}%)</span>
          <span>${formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-earth-50 pt-2 border-t border-earth-700">
          <span>Total</span>
          <span className="text-green-400">${formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {proposal.notes && (
        <div className="p-4 bg-earth-900/50 rounded-lg border border-earth-800/50">
          <p className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">Notes & Scope</p>
          <p className="text-sm text-earth-300 whitespace-pre-wrap">{proposal.notes}</p>
        </div>
      )}

      {proposal.terms && (
        <div className="p-4 bg-earth-900/50 rounded-lg border border-earth-800/50">
          <p className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
          <p className="text-sm text-earth-300 whitespace-pre-wrap">{proposal.terms}</p>
        </div>
      )}
    </div>
  );
}
