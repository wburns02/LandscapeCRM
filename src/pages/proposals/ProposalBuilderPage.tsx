import { useState, useMemo } from 'react';
import {
  Plus, Trash2, FileText, Send, Eye, Download, ChevronRight,
  ChevronLeft, GripVertical, DollarSign, Percent, Copy, Check,
  Briefcase, Image, AlignLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

// ─── Types ───────────────────────────────────────────────────────
interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface ProposalSection {
  id: string;
  title: string;
  description: string;
  items: LineItem[];
}

interface Proposal {
  id: string;
  title: string;
  customer_id: string;
  customer_name: string;
  sections: ProposalSection[];
  notes: string;
  terms: string;
  valid_days: number;
  tax_rate: number;
  discount_percent: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  created_at: string;
}

// ─── Demo proposals ─────────────────────────────────────────────
function getDemoProposals(): Proposal[] {
  return [
    {
      id: 'p1',
      title: 'Complete Backyard Transformation',
      customer_id: '1',
      customer_name: 'Sarah Mitchell',
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
            { id: 'i7', description: 'Premium topsoil & amendment', quantity: 8, unit: 'cu yd', unit_price: 35, total: 280 },
          ],
        },
        {
          id: 's3', title: 'Irrigation', description: 'Smart irrigation system',
          items: [
            { id: 'i8', description: 'Drip irrigation zones (6 zones)', quantity: 6, unit: 'zones', unit_price: 185, total: 1110 },
            { id: 'i9', description: 'Smart Wi-Fi controller', quantity: 1, unit: 'each', unit_price: 289, total: 289 },
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
      id: 'p2',
      title: 'Commercial Grounds Maintenance',
      customer_id: '2',
      customer_name: 'Riverside Office Park',
      sections: [
        {
          id: 's4', title: 'Weekly Maintenance', description: 'Recurring grounds care',
          items: [
            { id: 'i10', description: 'Mowing & edging (85,000 sq ft)', quantity: 52, unit: 'visits', unit_price: 450, total: 23400 },
            { id: 'i11', description: 'Irrigation monitoring & adjustment', quantity: 12, unit: 'months', unit_price: 150, total: 1800 },
            { id: 'i12', description: 'Seasonal color rotation (4x/year)', quantity: 4, unit: 'rotations', unit_price: 1200, total: 4800 },
          ],
        },
        {
          id: 's5', title: 'Tree Care', description: 'Annual tree maintenance program',
          items: [
            { id: 'i13', description: 'Tree trimming (24 trees)', quantity: 2, unit: 'visits', unit_price: 1800, total: 3600 },
            { id: 'i14', description: 'Deep root fertilization', quantity: 24, unit: 'trees', unit_price: 45, total: 1080 },
          ],
        },
      ],
      notes: 'Annual maintenance contract. Services begin March 1, 2026. Includes emergency storm cleanup (up to 4 hours per event).',
      terms: 'Monthly billing: $2,890/month for 12 months. Net 30 payment terms. Auto-renewal with 60-day cancellation notice.',
      valid_days: 45,
      tax_rate: 8.25,
      discount_percent: 5,
      status: 'accepted',
      created_at: '2026-02-15T00:00:00Z',
    },
    {
      id: 'p3',
      title: 'Front Yard Xeriscape Conversion',
      customer_id: '4',
      customer_name: 'David Chen',
      sections: [
        {
          id: 's6', title: 'Removal & Prep', description: '',
          items: [
            { id: 'i15', description: 'Existing lawn removal', quantity: 2500, unit: 'sq ft', unit_price: 0.50, total: 1250 },
            { id: 'i16', description: 'Soil preparation & amendment', quantity: 6, unit: 'cu yd', unit_price: 40, total: 240 },
          ],
        },
        {
          id: 's7', title: 'Xeriscape Installation', description: '',
          items: [
            { id: 'i17', description: 'River rock ground cover', quantity: 4, unit: 'tons', unit_price: 280, total: 1120 },
            { id: 'i18', description: 'Drought-tolerant plants', quantity: 35, unit: 'plants', unit_price: 24, total: 840 },
            { id: 'i19', description: 'Drip irrigation system', quantity: 1, unit: 'system', unit_price: 950, total: 950 },
          ],
        },
      ],
      notes: 'Xeriscape design reduces water usage by up to 70%. All plants are established and require minimal watering after first season.',
      terms: 'Full payment due upon completion. Estimated timeline: 5-7 business days.',
      valid_days: 21,
      tax_rate: 8.25,
      discount_percent: 0,
      status: 'draft',
      created_at: '2026-03-08T00:00:00Z',
    },
  ];
}

// ─── Step type ───────────────────────────────────────────────────
type BuilderStep = 'details' | 'items' | 'terms' | 'preview';

const statusColors: Record<string, 'green' | 'sky' | 'amber' | 'red' | 'earth'> = {
  draft: 'earth', sent: 'sky', viewed: 'amber', accepted: 'green', declined: 'red',
};

export default function ProposalBuilderPage() {
  const { customers } = useData();
  const toast = useToast();

  const [proposals, setProposals] = useState<Proposal[]>(getDemoProposals);
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [builderStep, setBuilderStep] = useState<BuilderStep>('details');
  const [showPreview, setShowPreview] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder form state
  const [form, setForm] = useState({
    title: '',
    customer_id: '',
    notes: '',
    terms: 'Payment: 50% deposit upon acceptance, 50% upon completion.',
    valid_days: 30,
    tax_rate: 8.25,
    discount_percent: 0,
  });
  const [sections, setSections] = useState<ProposalSection[]>([
    { id: `s-${Date.now()}`, title: 'Services', description: '', items: [] },
  ]);

  // Computed totals
  const subtotal = useMemo(() =>
    sections.reduce((sum, s) => sum + s.items.reduce((si, item) => si + item.total, 0), 0),
  [sections]);
  const discountAmount = subtotal * (form.discount_percent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (form.tax_rate / 100);
  const grandTotal = taxableAmount + taxAmount;

  // Open builder for new proposal
  const startNew = () => {
    setForm({
      title: '', customer_id: '', notes: '',
      terms: 'Payment: 50% deposit upon acceptance, 50% upon completion.',
      valid_days: 30, tax_rate: 8.25, discount_percent: 0,
    });
    setSections([{ id: `s-${Date.now()}`, title: 'Services', description: '', items: [] }]);
    setBuilderStep('details');
    setShowBuilder(true);
    setActiveProposal(null);
  };

  // Edit existing
  const editProposal = (p: Proposal) => {
    setForm({
      title: p.title, customer_id: p.customer_id, notes: p.notes,
      terms: p.terms, valid_days: p.valid_days, tax_rate: p.tax_rate,
      discount_percent: p.discount_percent,
    });
    setSections(p.sections);
    setActiveProposal(p);
    setBuilderStep('details');
    setShowBuilder(true);
  };

  // Add line item
  const addItem = (sectionId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, items: [...s.items, { id: `i-${Date.now()}-${Math.random()}`, description: '', quantity: 1, unit: 'each', unit_price: 0, total: 0 }] }
        : s
    ));
  };

  // Update line item
  const updateItem = (sectionId: string, itemId: string, field: keyof LineItem, value: string | number) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? {
            ...s,
            items: s.items.map(item => {
              if (item.id !== itemId) return item;
              const updated = { ...item, [field]: value };
              if (field === 'quantity' || field === 'unit_price') {
                updated.total = Number(updated.quantity) * Number(updated.unit_price);
              }
              return updated;
            }),
          }
        : s
    ));
  };

  // Remove line item
  const removeItem = (sectionId: string, itemId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
    ));
  };

  // Add section
  const addSection = () => {
    setSections(prev => [...prev, { id: `s-${Date.now()}`, title: '', description: '', items: [] }]);
  };

  // Remove section
  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) return;
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  // Save proposal
  const saveProposal = () => {
    if (!form.title || !form.customer_id) {
      toast.error('Title and customer are required');
      return;
    }
    const customer = customers.find(c => c.id === form.customer_id);
    const proposal: Proposal = {
      id: activeProposal?.id || `p-${Date.now()}`,
      title: form.title,
      customer_id: form.customer_id,
      customer_name: customer?.name || 'Unknown',
      sections,
      notes: form.notes,
      terms: form.terms,
      valid_days: form.valid_days,
      tax_rate: form.tax_rate,
      discount_percent: form.discount_percent,
      status: activeProposal?.status || 'draft',
      created_at: activeProposal?.created_at || new Date().toISOString(),
    };

    setProposals(prev => {
      const existing = prev.findIndex(p => p.id === proposal.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = proposal;
        return updated;
      }
      return [proposal, ...prev];
    });
    toast.success(`Proposal "${form.title}" saved`);
    setShowBuilder(false);
  };

  // Send proposal
  const sendProposal = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'sent' } : p));
    toast.success('Proposal sent to customer');
  };

  // Duplicate
  const duplicateProposal = (p: Proposal) => {
    const dup: Proposal = {
      ...p,
      id: `p-${Date.now()}`,
      title: `${p.title} (Copy)`,
      status: 'draft',
      created_at: new Date().toISOString(),
    };
    setProposals(prev => [dup, ...prev]);
    toast.success('Proposal duplicated');
  };

  const steps: { key: BuilderStep; label: string; icon: typeof FileText }[] = [
    { key: 'details', label: 'Details', icon: AlignLeft },
    { key: 'items', label: 'Line Items', icon: DollarSign },
    { key: 'terms', label: 'Terms', icon: FileText },
    { key: 'preview', label: 'Preview', icon: Eye },
  ];

  const stepIndex = steps.findIndex(s => s.key === builderStep);

  // ─── Proposal list view ────────────────────────────────────────
  if (!showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-earth-100">Proposals</h2>
            <p className="text-sm text-earth-400">{proposals.length} proposals — Professional estimates for your clients</p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={startNew}>
            New Proposal
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {(['draft', 'sent', 'accepted', 'declined'] as const).map(status => {
            const count = proposals.filter(p => p.status === status).length;
            const total = proposals.filter(p => p.status === status).reduce((sum, p) =>
              sum + p.sections.reduce((s, sec) => s + sec.items.reduce((si, i) => si + i.total, 0), 0), 0);
            return (
              <Card key={status}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-earth-400 uppercase tracking-wider">{status}</p>
                    <Badge color={statusColors[status]}>{count}</Badge>
                  </div>
                  <p className="text-xl font-bold text-earth-100">${total.toLocaleString()}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Proposal List */}
        <div className="space-y-3">
          {proposals.map(p => {
            const total = p.sections.reduce((sum, s) => sum + s.items.reduce((si, i) => si + i.total, 0), 0);
            return (
              <Card key={p.id} hover onClick={() => { setActiveProposal(p); setShowPreview(true); }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-600/15 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-earth-100 truncate">{p.title}</p>
                      <Badge color={statusColors[p.status]}>{p.status}</Badge>
                    </div>
                    <p className="text-xs text-earth-400">{p.customer_name} — {format(new Date(p.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-lg font-bold text-earth-100 shrink-0">${total.toLocaleString()}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); editProposal(p); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); duplicateProposal(p); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {p.status === 'draft' && (
                      <Button size="sm" variant="primary" icon={<Send className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); sendProposal(p.id); }}>
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Preview Modal */}
        {showPreview && activeProposal && (
          <Modal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            title="Proposal Preview"
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowPreview(false)}>Close</Button>
                <Button variant="secondary" icon={<Copy className="w-4 h-4" />} onClick={() => { duplicateProposal(activeProposal); setShowPreview(false); }}>Duplicate</Button>
                <Button icon={<Send className="w-4 h-4" />} onClick={() => { sendProposal(activeProposal.id); setShowPreview(false); }}>Send to Client</Button>
              </>
            }
          >
            <ProposalPreview proposal={activeProposal} />
          </Modal>
        )}
      </div>
    );
  }

  // ─── Builder view ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowBuilder(false)}>
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <h2 className="text-lg font-semibold text-earth-100">
            {activeProposal ? 'Edit Proposal' : 'New Proposal'}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={saveProposal}>Save Draft</Button>
          <Button onClick={() => { saveProposal(); }}>Save & Close</Button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 bg-earth-900/60 border border-earth-800 rounded-lg p-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = builderStep === step.key;
          const isPast = i < stepIndex;
          return (
            <button
              key={step.key}
              onClick={() => setBuilderStep(step.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center cursor-pointer ${
                isActive
                  ? 'bg-green-600 text-white shadow-lg'
                  : isPast
                  ? 'text-green-400 hover:bg-earth-800/60'
                  : 'text-earth-400 hover:bg-earth-800/60'
              }`}
            >
              {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      {builderStep === 'details' && (
        <Card>
          <div className="space-y-4">
            <Input
              label="Proposal Title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Complete Backyard Transformation"
            />
            <Select
              label="Customer"
              options={[
                { value: '', label: 'Select customer...' },
                ...customers.map(c => ({ value: c.id, label: c.name })),
              ]}
              value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Valid For (days)"
                type="number"
                value={String(form.valid_days)}
                onChange={e => setForm(f => ({ ...f, valid_days: parseInt(e.target.value) || 30 }))}
              />
              <Input
                label="Tax Rate (%)"
                type="number"
                value={String(form.tax_rate)}
                onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
              />
              <Input
                label="Discount (%)"
                type="number"
                value={String(form.discount_percent)}
                onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </Card>
      )}

      {builderStep === 'items' && (
        <div className="space-y-4">
          {sections.map((section, sIdx) => (
            <Card key={section.id}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-earth-600 shrink-0" />
                  <input
                    type="text"
                    value={section.title}
                    onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                    className="flex-1 bg-transparent text-base font-semibold text-earth-100 border-none outline-none placeholder:text-earth-500"
                    placeholder="Section title..."
                  />
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(section.id)} className="text-earth-500 hover:text-red-400 cursor-pointer p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Line items table */}
                {section.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-earth-800">
                          <th className="text-left py-2 text-xs text-earth-400 font-semibold w-[40%]">Description</th>
                          <th className="text-right py-2 text-xs text-earth-400 font-semibold w-[12%]">Qty</th>
                          <th className="text-left py-2 text-xs text-earth-400 font-semibold w-[12%] pl-2">Unit</th>
                          <th className="text-right py-2 text-xs text-earth-400 font-semibold w-[15%]">Price</th>
                          <th className="text-right py-2 text-xs text-earth-400 font-semibold w-[15%]">Total</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map(item => (
                          <tr key={item.id} className="border-b border-earth-800/50">
                            <td className="py-2 pr-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={e => updateItem(section.id, item.id, 'description', e.target.value)}
                                className="w-full bg-earth-800/40 rounded px-2 py-1.5 text-sm text-earth-100 border border-earth-700/50 focus:border-green-500/50 outline-none"
                                placeholder="Item description..."
                              />
                            </td>
                            <td className="py-2 pr-1">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => updateItem(section.id, item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full bg-earth-800/40 rounded px-2 py-1.5 text-sm text-earth-100 text-right border border-earth-700/50 focus:border-green-500/50 outline-none"
                              />
                            </td>
                            <td className="py-2 pr-1 pl-1">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => updateItem(section.id, item.id, 'unit', e.target.value)}
                                className="w-full bg-earth-800/40 rounded px-2 py-1.5 text-sm text-earth-100 border border-earth-700/50 focus:border-green-500/50 outline-none"
                              />
                            </td>
                            <td className="py-2 pr-1">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={e => updateItem(section.id, item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-full bg-earth-800/40 rounded px-2 py-1.5 text-sm text-earth-100 text-right border border-earth-700/50 focus:border-green-500/50 outline-none"
                                step="0.01"
                              />
                            </td>
                            <td className="py-2 text-right font-medium text-earth-100 pr-1">
                              ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 text-center">
                              <button onClick={() => removeItem(section.id, item.id)} className="text-earth-500 hover:text-red-400 cursor-pointer p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => addItem(section.id)}>
                  Add Line Item
                </Button>

                {/* Section subtotal */}
                {section.items.length > 0 && (
                  <div className="flex justify-end pt-2 border-t border-earth-800/50">
                    <p className="text-sm text-earth-300">
                      Section total: <span className="font-semibold text-earth-100">${section.items.reduce((s, i) => s + i.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}

          <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={addSection}>
            Add Section
          </Button>

          {/* Running Total */}
          <Card className="bg-green-600/5 border-green-500/20">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-earth-300">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {form.discount_percent > 0 && (
                <div className="flex justify-between text-sm text-amber-400">
                  <span>Discount ({form.discount_percent}%)</span>
                  <span>-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-earth-300">
                <span>Tax ({form.tax_rate}%)</span>
                <span>${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-earth-50 pt-2 border-t border-green-500/20">
                <span>Total</span>
                <span>${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {builderStep === 'terms' && (
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-earth-200 mb-1.5">Notes & Scope</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-earth-800/40 rounded-lg px-3 py-2 text-sm text-earth-100 border border-earth-700/50 focus:border-green-500/50 outline-none resize-none h-32"
                  placeholder="Project scope, warranty information, special notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-earth-200 mb-1.5">Payment Terms</label>
                <textarea
                  value={form.terms}
                  onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  className="w-full bg-earth-800/40 rounded-lg px-3 py-2 text-sm text-earth-100 border border-earth-700/50 focus:border-green-500/50 outline-none resize-none h-32"
                  placeholder="Payment schedule, deposit requirements, timeline..."
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {builderStep === 'preview' && (
        <div className="space-y-4">
          <ProposalPreview
            proposal={{
              id: activeProposal?.id || 'preview',
              title: form.title || 'Untitled Proposal',
              customer_id: form.customer_id,
              customer_name: customers.find(c => c.id === form.customer_id)?.name || 'Select customer',
              sections,
              notes: form.notes,
              terms: form.terms,
              valid_days: form.valid_days,
              tax_rate: form.tax_rate,
              discount_percent: form.discount_percent,
              status: 'draft',
              created_at: new Date().toISOString(),
            }}
          />
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="secondary"
          icon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => setBuilderStep(steps[Math.max(0, stepIndex - 1)].key)}
          disabled={stepIndex === 0}
        >
          Previous
        </Button>
        {stepIndex < steps.length - 1 ? (
          <Button
            icon={<ChevronRight className="w-4 h-4" />}
            onClick={() => setBuilderStep(steps[stepIndex + 1].key)}
          >
            Next
          </Button>
        ) : (
          <Button icon={<Check className="w-4 h-4" />} onClick={saveProposal}>
            Save Proposal
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Preview Component ───────────────────────────────────────────
function ProposalPreview({ proposal }: { proposal: Proposal }) {
  const subtotal = proposal.sections.reduce((sum, s) => sum + s.items.reduce((si, i) => si + i.total, 0), 0);
  const discountAmount = subtotal * (proposal.discount_percent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (proposal.tax_rate / 100);
  const grandTotal = taxableAmount + taxAmount;

  return (
    <div className="bg-earth-950 rounded-xl border border-earth-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600/20 to-earth-900 p-6 border-b border-earth-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-earth-50">{proposal.title}</h3>
            <p className="text-sm text-earth-300 mt-1">Prepared for: <span className="text-earth-100 font-medium">{proposal.customer_name}</span></p>
            <p className="text-xs text-earth-400 mt-1">
              {format(new Date(proposal.created_at), 'MMMM d, yyyy')} — Valid for {proposal.valid_days} days
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-earth-400 uppercase tracking-wider">From</p>
            <p className="text-sm font-semibold text-earth-100">Maas Verde</p>
            <p className="text-xs text-earth-400">Landscape Restoration</p>
            <p className="text-xs text-earth-400">Austin, TX</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="p-6 space-y-6">
        {proposal.sections.map(section => (
          <div key={section.id}>
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-1">{section.title}</h4>
            {section.description && <p className="text-xs text-earth-400 mb-3">{section.description}</p>}
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
                    <td className="py-2 text-right font-medium text-earth-100">${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Totals */}
        <div className="border-t border-earth-700 pt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-earth-300">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {proposal.discount_percent > 0 && (
            <div className="flex justify-between text-sm text-amber-400">
              <span>Discount ({proposal.discount_percent}%)</span>
              <span>-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-earth-300">
            <span>Tax ({proposal.tax_rate}%)</span>
            <span>${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-earth-50 pt-2 border-t border-earth-700">
            <span>Total</span>
            <span className="text-green-400">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="mt-4 p-4 bg-earth-900/50 rounded-lg border border-earth-800/50">
            <p className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">Notes & Scope</p>
            <p className="text-sm text-earth-300 whitespace-pre-wrap">{proposal.notes}</p>
          </div>
        )}

        {/* Terms */}
        {proposal.terms && (
          <div className="p-4 bg-earth-900/50 rounded-lg border border-earth-800/50">
            <p className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
            <p className="text-sm text-earth-300 whitespace-pre-wrap">{proposal.terms}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-earth-900/80 border-t border-earth-800 flex items-center justify-between">
        <p className="text-xs text-earth-500">Maas Verde Landscape Restoration — (512) 555-0000 — info@maasverde.com</p>
        <Badge color={statusColors[proposal.status]}>{proposal.status}</Badge>
      </div>
    </div>
  );
}
