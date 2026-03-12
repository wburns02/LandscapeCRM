import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Edit3, Copy, Tag, TrendingUp,
  ChevronDown, ChevronRight, DollarSign, Clock, BarChart3,
  Layers, Star, Package, Check, X, AlertCircle, ArrowRight,
  Filter, SlidersHorizontal, Leaf, TreePine, Droplets, Wrench,
  Snowflake, Zap, RefreshCw, Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

// ─── Types ─────────────────────────────────────────────────────────────────

type ServiceCategory =
  | 'lawn' | 'trees' | 'hardscape' | 'irrigation' | 'cleanup' | 'specialty' | 'snow';

type PricingUnit = 'per visit' | 'per sq ft' | 'per hour' | 'per tree' | 'flat rate' | 'per lb';

interface PriceTier {
  residential: number;
  commercial: number;
  premium: number;
}

interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  unit: PricingUnit;
  price: PriceTier;
  duration: number; // minutes
  popular: boolean;
  taxable: boolean;
  materials: string[];
  notes: string;
  lastUpdated: string;
  usageCount: number;
}

interface Package {
  id: string;
  name: string;
  description: string;
  services: string[]; // service IDs
  discount: number; // percent
  popular: boolean;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

const SERVICES: Service[] = [
  // Lawn Care
  {
    id: 'lawn-weekly',
    name: 'Lawn Mowing — Weekly',
    category: 'lawn',
    description: 'Full service mow, edge, blow. Includes sidewalk & driveway cleanup.',
    unit: 'per visit',
    price: { residential: 65, commercial: 95, premium: 85 },
    duration: 60,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Increase by $10 for lots over ½ acre',
    lastUpdated: '2026-02-15',
    usageCount: 247,
  },
  {
    id: 'lawn-biweekly',
    name: 'Lawn Mowing — Bi-Weekly',
    category: 'lawn',
    description: 'Full service mow every two weeks. Edge, trim, blow-out.',
    unit: 'per visit',
    price: { residential: 75, commercial: 110, premium: 95 },
    duration: 75,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Includes blade sharpening quarterly at no extra charge',
    lastUpdated: '2026-02-15',
    usageCount: 183,
  },
  {
    id: 'lawn-fertilize',
    name: 'Fertilization Program',
    category: 'lawn',
    description: '4-step annual fertilization. Granular slow-release, pet-safe formula.',
    unit: 'per visit',
    price: { residential: 85, commercial: 140, premium: 110 },
    duration: 45,
    popular: true,
    taxable: true,
    materials: ['Slow-release granular fertilizer (10-10-10)'],
    notes: 'Requires soil test on first application — add $25',
    lastUpdated: '2026-01-10',
    usageCount: 94,
  },
  {
    id: 'lawn-aeration',
    name: 'Core Aeration',
    category: 'lawn',
    description: 'Core aeration to improve water and nutrient absorption. Spring or fall.',
    unit: 'per visit',
    price: { residential: 120, commercial: 200, premium: 155 },
    duration: 90,
    popular: false,
    taxable: false,
    materials: [],
    notes: 'Best combined with overseeding — offer 15% bundle discount',
    lastUpdated: '2025-11-01',
    usageCount: 41,
  },
  {
    id: 'lawn-overseed',
    name: 'Overseeding',
    category: 'lawn',
    description: 'Premium grass seed blend applied post-aeration or broadcast seeding.',
    unit: 'per visit',
    price: { residential: 150, commercial: 250, premium: 185 },
    duration: 60,
    popular: false,
    taxable: true,
    materials: ['Premium fescue blend seed (50 lb bag)'],
    notes: 'Water daily for 3 weeks after — include care instructions',
    lastUpdated: '2025-10-12',
    usageCount: 28,
  },
  {
    id: 'lawn-weed',
    name: 'Weed Control',
    category: 'lawn',
    description: 'Pre and post-emergent herbicide treatment. Safe for established turf.',
    unit: 'per visit',
    price: { residential: 55, commercial: 90, premium: 70 },
    duration: 30,
    popular: true,
    taxable: true,
    materials: ['Pre-emergent herbicide', 'Post-emergent spot treatment'],
    notes: 'Licensed applicator required. Keep off 4–6 hours after application.',
    lastUpdated: '2026-01-20',
    usageCount: 112,
  },
  // Trees & Shrubs
  {
    id: 'tree-trim',
    name: 'Tree Trimming',
    category: 'trees',
    description: 'Shape and trim up to 20 ft. Debris removal included.',
    unit: 'per tree',
    price: { residential: 120, commercial: 175, premium: 150 },
    duration: 60,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Over 20 ft add $75/tree. Call for large oak/cedar pricing.',
    lastUpdated: '2026-01-15',
    usageCount: 89,
  },
  {
    id: 'shrub-trim',
    name: 'Shrub Trimming & Shaping',
    category: 'trees',
    description: 'Hand-trim all shrubs, remove dead wood, clean up clippings.',
    unit: 'per hour',
    price: { residential: 60, commercial: 85, premium: 75 },
    duration: 60,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Minimum 1 hour. Most residential properties = 2–3 hrs.',
    lastUpdated: '2025-12-01',
    usageCount: 134,
  },
  {
    id: 'tree-removal',
    name: 'Tree Removal',
    category: 'trees',
    description: 'Full removal including stump grinding. Debris hauled away.',
    unit: 'flat rate',
    price: { residential: 650, commercial: 950, premium: 800 },
    duration: 240,
    popular: false,
    taxable: false,
    materials: [],
    notes: 'Custom quote required for trees over 30 ft or near structures.',
    lastUpdated: '2025-09-01',
    usageCount: 15,
  },
  // Hardscape
  {
    id: 'mulch-install',
    name: 'Mulch Installation',
    category: 'hardscape',
    description: 'Premium double-shredded hardwood mulch, 3" depth application.',
    unit: 'per sq ft',
    price: { residential: 0.85, commercial: 1.20, premium: 1.05 },
    duration: 90,
    popular: true,
    taxable: true,
    materials: ['Double-shredded hardwood mulch (per yard)'],
    notes: 'Min 200 sq ft. Includes bed prep and edging.',
    lastUpdated: '2026-02-01',
    usageCount: 78,
  },
  {
    id: 'bed-cleanup',
    name: 'Landscape Bed Cleanup',
    category: 'hardscape',
    description: 'Remove weeds, dead plant material, edge beds, refresh mulch.',
    unit: 'per hour',
    price: { residential: 65, commercial: 90, premium: 80 },
    duration: 60,
    popular: true,
    taxable: false,
    materials: ['Mulch (if refreshing)'],
    notes: 'Spring cleanup — quote based on bed size. Avg 3–5 hrs.',
    lastUpdated: '2025-11-15',
    usageCount: 62,
  },
  {
    id: 'patio-install',
    name: 'Paver Patio Installation',
    category: 'hardscape',
    description: 'Concrete paver patio with compacted base, sand, polymeric jointing.',
    unit: 'per sq ft',
    price: { residential: 18, commercial: 24, premium: 22 },
    duration: 480,
    popular: false,
    taxable: true,
    materials: ['Concrete pavers', 'Compacted gravel base', 'Polymeric sand'],
    notes: 'Permits may be required. Custom quote for designs over 500 sq ft.',
    lastUpdated: '2025-08-01',
    usageCount: 8,
  },
  // Irrigation
  {
    id: 'irr-install',
    name: 'Irrigation System Install',
    category: 'irrigation',
    description: 'Full underground drip/spray system. Zones, timer, backflow preventer.',
    unit: 'flat rate',
    price: { residential: 2800, commercial: 4500, premium: 3400 },
    duration: 720,
    popular: false,
    taxable: true,
    materials: ['PVC pipe', 'Spray heads', 'Drip emitters', 'Smart timer'],
    notes: 'Permit required. Utility locate required before digging.',
    lastUpdated: '2025-07-15',
    usageCount: 6,
  },
  {
    id: 'irr-startup',
    name: 'Irrigation Startup / Winterization',
    category: 'irrigation',
    description: 'Spring startup or fall blowout. Check heads, adjust coverage.',
    unit: 'flat rate',
    price: { residential: 95, commercial: 150, premium: 120 },
    duration: 60,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Startup includes 12-point inspection. Repairs quoted separately.',
    lastUpdated: '2026-01-05',
    usageCount: 67,
  },
  // Seasonal
  {
    id: 'spring-cleanup',
    name: 'Spring Cleanup',
    category: 'cleanup',
    description: 'Leaf removal, bed cleanup, first mow, edge refresh, debris haul.',
    unit: 'flat rate',
    price: { residential: 275, commercial: 450, premium: 350 },
    duration: 240,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Best seller March–April. Book early — schedule fills fast.',
    lastUpdated: '2026-01-15',
    usageCount: 89,
  },
  {
    id: 'fall-cleanup',
    name: 'Fall Cleanup / Leaf Removal',
    category: 'cleanup',
    description: 'Complete leaf removal, bed cutback, final mow, prep for winter.',
    unit: 'flat rate',
    price: { residential: 250, commercial: 400, premium: 310 },
    duration: 210,
    popular: true,
    taxable: false,
    materials: [],
    notes: 'Bundle with aeration — save $40. Oct–Nov scheduling.',
    lastUpdated: '2025-10-01',
    usageCount: 74,
  },
  // Snow
  {
    id: 'snow-plow',
    name: 'Snow Plowing',
    category: 'snow',
    description: 'Driveway/lot plowing per event. Salt application included.',
    unit: 'per visit',
    price: { residential: 55, commercial: 120, premium: 70 },
    duration: 30,
    popular: false,
    taxable: false,
    materials: ['Road salt (as needed)'],
    notes: 'Trigger depth: 2". After-hours available, add $15.',
    lastUpdated: '2025-11-01',
    usageCount: 22,
  },
  // Specialty
  {
    id: 'landscape-design',
    name: 'Landscape Design Consultation',
    category: 'specialty',
    description: '2-hour site visit + digital design plan. Presented within 5 business days.',
    unit: 'flat rate',
    price: { residential: 350, commercial: 600, premium: 450 },
    duration: 120,
    popular: false,
    taxable: false,
    materials: [],
    notes: 'Design fee credited toward project if booked within 30 days.',
    lastUpdated: '2025-12-15',
    usageCount: 19,
  },
];

const PACKAGES: Package[] = [
  {
    id: 'pkg-annual',
    name: 'Annual Lawn Care Program',
    description: 'Weekly mowing + 4-step fertilization + 2x weed control. Full season coverage.',
    services: ['lawn-weekly', 'lawn-fertilize', 'lawn-weed'],
    discount: 12,
    popular: true,
  },
  {
    id: 'pkg-spring',
    name: 'Spring Revive Package',
    description: 'Spring cleanup + aeration + overseeding + fertilization. Get your lawn ready for summer.',
    services: ['spring-cleanup', 'lawn-aeration', 'lawn-overseed', 'lawn-fertilize'],
    discount: 15,
    popular: true,
  },
  {
    id: 'pkg-maintenance',
    name: 'Full Property Maintenance',
    description: 'Bi-weekly mowing + monthly shrub trim + quarterly bed cleanup.',
    services: ['lawn-biweekly', 'shrub-trim', 'bed-cleanup'],
    discount: 10,
    popular: false,
  },
  {
    id: 'pkg-commercial',
    name: 'Commercial Grounds Package',
    description: 'Weekly mow + bi-weekly trim + monthly fertilize + seasonal cleanups.',
    services: ['lawn-weekly', 'shrub-trim', 'lawn-fertilize', 'spring-cleanup', 'fall-cleanup'],
    discount: 18,
    popular: false,
  },
];

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ServiceCategory, {
  label: string;
  icon: typeof Leaf;
  color: string;
  bg: string;
}> = {
  lawn: { label: 'Lawn Care', icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/15' },
  trees: { label: 'Trees & Shrubs', icon: TreePine, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  hardscape: { label: 'Hardscape', icon: Layers, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  irrigation: { label: 'Irrigation', icon: Droplets, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  cleanup: { label: 'Seasonal Cleanup', icon: RefreshCw, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  specialty: { label: 'Specialty', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  snow: { label: 'Snow & Ice', icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-500/15' },
};

const TIER_LABELS = ['residential', 'commercial', 'premium'] as const;

// ─── Helper functions ────────────────────────────────────────────────────────

function formatPrice(price: number, unit: PricingUnit): string {
  if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
  if (price < 10) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(0)}`;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function calcMargin(price: number): number {
  if (!price || price <= 0) return 0;
  const cost = price * 0.45;
  return Math.round(((price - cost) / price) * 100);
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  service: Service | null;
  onClose: () => void;
  onSave: (s: Service) => void;
}

function EditModal({ service, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<Service>(
    service ?? {
      id: `svc-${Date.now()}`,
      name: '',
      category: 'lawn',
      description: '',
      unit: 'per visit',
      price: { residential: 0, commercial: 0, premium: 0 },
      duration: 60,
      popular: false,
      taxable: false,
      materials: [],
      notes: '',
      lastUpdated: new Date().toISOString().slice(0, 10),
      usageCount: 0,
    }
  );

  const isNew = !service;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-earth-900 border border-earth-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-800">
          <h2 className="text-lg font-bold font-display text-earth-50">
            {isNew ? 'Add Service' : 'Edit Service'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-earth-400 hover:text-earth-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-earth-400 mb-1.5 block">Service Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Weekly Lawn Mowing"
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder-earth-600 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-earth-400 mb-1.5 block">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ServiceCategory }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:outline-none focus:border-green-500"
              >
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-earth-400 mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="What's included in this service..."
              className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder-earth-600 focus:outline-none focus:border-green-500 resize-none"
            />
          </div>

          {/* Unit + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-earth-400 mb-1.5 block">Pricing Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value as PricingUnit }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:outline-none focus:border-green-500"
              >
                {(['per visit', 'per sq ft', 'per hour', 'per tree', 'flat rate', 'per lb'] as PricingUnit[]).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-earth-400 mb-1.5 block">Typical Duration (min)</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Pricing tiers */}
          <div>
            <label className="text-xs text-earth-400 mb-2 block">Pricing Tiers ($)</label>
            <div className="grid grid-cols-3 gap-3">
              {TIER_LABELS.map(tier => (
                <div key={tier}>
                  <label className="text-[10px] text-earth-500 mb-1 block capitalize">{tier}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price[tier]}
                    onChange={e => setForm(f => ({ ...f, price: { ...f.price, [tier]: Number(e.target.value) || 0 } }))}
                    className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes + flags */}
          <div>
            <label className="text-xs text-earth-400 mb-1.5 block">Internal Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Pricing notes, exceptions..."
              className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder-earth-600 focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.popular} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))}
                className="w-4 h-4 rounded border-earth-600 bg-earth-800 accent-green-500" />
              <span className="text-sm text-earth-300">Mark as popular</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.taxable} onChange={e => setForm(f => ({ ...f, taxable: e.target.checked }))}
                className="w-4 h-4 rounded border-earth-600 bg-earth-800 accent-green-500" />
              <span className="text-sm text-earth-300">Taxable</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-earth-800">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!form.name.trim()) return;
              onSave({ ...form, lastUpdated: new Date().toISOString().slice(0, 10) });
            }}
            icon={<Check className="w-4 h-4" />}
          >
            {isNew ? 'Add Service' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: Service;
  tier: 'residential' | 'commercial' | 'premium';
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onUseInQuote: () => void;
  onDelete: () => void;
}

function ServiceCard({ service, tier, expanded, onToggle, onEdit, onCopy, onUseInQuote, onDelete }: ServiceCardProps) {
  const catCfg = CATEGORY_CONFIG[service.category];
  const CatIcon = catCfg.icon;
  const price = service.price[tier];
  const margin = calcMargin(price);

  return (
    <div className={clsx(
      'bg-earth-900 border rounded-2xl overflow-hidden transition-all duration-200',
      expanded ? 'border-green-500/30' : 'border-earth-800 hover:border-earth-700'
    )}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
        onClick={onToggle}
      >
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', catCfg.bg)}>
          <CatIcon className={clsx('w-4.5 h-4.5', catCfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-earth-100 truncate">{service.name}</span>
            {service.popular && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full shrink-0">
                Popular
              </span>
            )}
            {service.taxable && (
              <span className="text-[10px] px-1.5 py-0.5 bg-earth-700 text-earth-500 rounded-full shrink-0">
                Tax
              </span>
            )}
          </div>
          <p className="text-[11px] text-earth-500 truncate">{service.description}</p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-earth-50">{formatPrice(price, service.unit)}</p>
          <p className="text-[10px] text-earth-600">{service.unit}</p>
        </div>

        {/* Duration */}
        <div className="text-right shrink-0 hidden sm:block w-12">
          <p className="text-xs text-earth-400">{formatDuration(service.duration)}</p>
        </div>

        {/* Margin */}
        <div className="w-12 text-right shrink-0 hidden lg:block">
          <p className={clsx('text-xs font-medium', margin >= 50 ? 'text-green-400' : margin >= 35 ? 'text-amber-400' : 'text-red-400')}>
            {margin}%
          </p>
          <p className="text-[10px] text-earth-600">margin</p>
        </div>

        <ChevronDown className={clsx('w-4 h-4 text-earth-600 shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-earth-800/60 px-4 py-4 space-y-4">
          {/* All pricing tiers */}
          <div className="grid grid-cols-3 gap-3">
            {TIER_LABELS.map(t => (
              <div key={t} className={clsx(
                'rounded-xl p-3 text-center border',
                t === tier ? 'bg-green-600/10 border-green-500/30' : 'bg-earth-800/40 border-earth-800'
              )}>
                <p className="text-xs font-semibold text-earth-50">{formatPrice(service.price[t], service.unit)}</p>
                <p className="text-[10px] text-earth-500 capitalize mt-0.5">{t}</p>
              </div>
            ))}
          </div>

          {/* Materials */}
          {service.materials.length > 0 && (
            <div>
              <p className="text-[10px] text-earth-500 uppercase tracking-wider mb-1.5">Materials Needed</p>
              <div className="flex flex-wrap gap-1.5">
                {service.materials.map(m => (
                  <span key={m} className="text-[11px] px-2 py-0.5 bg-earth-800 text-earth-400 rounded-md">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {service.notes && (
            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">{service.notes}</p>
            </div>
          )}

          {/* Stats + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-earth-600">
              <span>Used {service.usageCount}× in quotes</span>
              <span>Updated {service.lastUpdated}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={e => { e.stopPropagation(); onCopy(); }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-earth-400 hover:text-earth-200 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
                title="Copy price"
              >
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onEdit(); }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-earth-400 hover:text-earth-200 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
                title="Edit service"
              >
                <Edit3 className="w-3 h-3" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onUseInQuote(); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600/15 text-green-400 border border-green-500/25 hover:bg-green-600/25 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Use in Quote</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = 'catalog' | 'tiers' | 'packages';

export default function ServicePriceBook() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [pricingTier, setPricingTier] = useState<'residential' | 'commercial' | 'premium'>('residential');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editService, setEditService] = useState<Service | null | 'new'>(null);
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [packages] = useState<Package[]>(PACKAGES);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
      const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [services, categoryFilter, search]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<ServiceCategory | 'all', number>> = { all: services.length };
    for (const s of services) {
      counts[s.category] = (counts[s.category] ?? 0) + 1;
    }
    return counts;
  }, [services]);

  const handleSave = useCallback((updated: Service) => {
    setServices(prev => {
      const exists = prev.some(s => s.id === updated.id);
      return exists ? prev.map(s => s.id === updated.id ? updated : s) : [...prev, updated];
    });
    setEditService(null);
    addToast('success', `${updated.name} saved to price book`);
  }, [addToast]);

  const handleDelete = useCallback((id: string) => {
    const svc = services.find(s => s.id === id);
    setServices(prev => prev.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
    setExpandedId(null);
    addToast('info', `${svc?.name} removed from price book`);
  }, [services, addToast]);

  const handleCopy = useCallback((service: Service) => {
    const price = service.price[pricingTier];
    const text = `${service.name} — ${formatPrice(price, service.unit)} ${service.unit}`;
    navigator.clipboard.writeText(text).catch(() => {});
    addToast('success', `Copied: ${text}`);
  }, [pricingTier, addToast]);

  const handleUseInQuote = useCallback((service: Service) => {
    addToast('success', `${service.name} added to new quote — redirecting…`);
    // In real app: navigate to /quotes?service=id
  }, [addToast]);

  // Stats
  const avgMargin = Math.round(
    services.reduce((s, svc) => s + calcMargin(svc.price[pricingTier]), 0) / services.length
  );
  const totalUsage = services.reduce((s, svc) => s + svc.usageCount, 0);
  const popularCount = services.filter(s => s.popular).length;

  const CATEGORIES = [
    { key: 'all' as const, label: 'All Services' },
    ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ key: k as ServiceCategory, label: v.label })),
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold font-display text-earth-50">Service Price Book</h1>
          </div>
          <p className="text-sm text-earth-400 ml-12">Your master catalog of services & standard pricing</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setEditService('new')}
        >
          Add Service
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Services', value: services.length, icon: Tag, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Avg Margin', value: `${avgMargin}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Popular', value: popularCount, icon: Star, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Total Uses', value: totalUsage.toLocaleString(), icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-earth-900 border border-earth-800 rounded-2xl p-4 flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                <Icon className={clsx('w-5 h-5', stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold font-display text-earth-50">{stat.value}</p>
                <p className="text-xs text-earth-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {([
          { key: 'catalog' as Tab, label: 'Service Catalog', icon: BookOpen },
          { key: 'tiers' as Tab, label: 'Pricing Tiers', icon: DollarSign },
          { key: 'packages' as Tab, label: 'Packages', icon: Package },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                activeTab === tab.key
                  ? 'bg-green-600/15 text-green-400 border border-green-500/20'
                  : 'text-earth-400 hover:text-earth-200'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: Service Catalog ─────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Tier selector + search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Tier toggle */}
            <div className="flex gap-1 p-1 bg-earth-900 border border-earth-800 rounded-xl">
              {TIER_LABELS.map(tier => (
                <button
                  key={tier}
                  onClick={() => setPricingTier(tier)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer',
                    pricingTier === tier
                      ? 'bg-earth-700 text-earth-100'
                      : 'text-earth-500 hover:text-earth-300'
                  )}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search services..."
                className="w-full bg-earth-900 border border-earth-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-earth-100 placeholder-earth-600 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat.key] ?? 0;
              const cfg = cat.key !== 'all' ? CATEGORY_CONFIG[cat.key as ServiceCategory] : null;
              return (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                    categoryFilter === cat.key
                      ? 'bg-green-600/20 text-green-300 border border-green-500/30'
                      : 'bg-earth-800/40 text-earth-400 hover:text-earth-200 border border-earth-800'
                  )}
                >
                  {cfg && <cfg.icon className={clsx('w-3 h-3', cfg.color)} />}
                  {cat.label}
                  <span className="text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Service list */}
          <div className="space-y-2">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 text-earth-500">
                <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No services match your search</p>
              </div>
            ) : (
              filteredServices.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  tier={pricingTier}
                  expanded={expandedId === service.id}
                  onToggle={() => setExpandedId(expandedId === service.id ? null : service.id)}
                  onEdit={() => setEditService(service)}
                  onCopy={() => handleCopy(service)}
                  onUseInQuote={() => handleUseInQuote(service)}
                  onDelete={() => setShowDeleteConfirm(service.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Pricing Tiers ────────────────────────────────────────────── */}
      {activeTab === 'tiers' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-sky-500/8 border border-sky-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="text-sm text-sky-300">
              These are your standard price tiers. <strong>Residential</strong> = standard homeowner.{' '}
              <strong>Commercial</strong> = business/HOA properties. <strong>Premium</strong> = high-end or VIP clients.
            </p>
          </div>

          {/* Category breakdowns */}
          {Object.entries(CATEGORY_CONFIG).map(([catKey, catCfg]) => {
            const catServices = services.filter(s => s.category === catKey as ServiceCategory);
            if (catServices.length === 0) return null;
            const CatIcon = catCfg.icon;

            return (
              <Card
                key={catKey}
                header={
                  <div className="flex items-center gap-2">
                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', catCfg.bg)}>
                      <CatIcon className={clsx('w-3.5 h-3.5', catCfg.color)} />
                    </div>
                    <h3 className="text-sm font-semibold font-display text-earth-100">{catCfg.label}</h3>
                    <span className="text-xs text-earth-600">{catServices.length} services</span>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-earth-800">
                        <th className="text-left pb-2 text-xs font-semibold text-earth-500 pr-4">Service</th>
                        <th className="text-right pb-2 text-xs font-semibold text-earth-500 px-3">Unit</th>
                        <th className="text-right pb-2 text-xs font-semibold text-green-500 px-3">Residential</th>
                        <th className="text-right pb-2 text-xs font-semibold text-sky-500 px-3">Commercial</th>
                        <th className="text-right pb-2 text-xs font-semibold text-amber-500 px-3">Premium</th>
                        <th className="text-right pb-2 text-xs font-semibold text-earth-500 px-3">Margin</th>
                        <th className="pb-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-earth-800/50">
                      {catServices.map(svc => (
                        <tr key={svc.id} className="hover:bg-earth-800/20 transition-colors">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-earth-100 font-medium text-xs">{svc.name}</span>
                              {svc.popular && <Star className="w-3 h-3 text-amber-400" />}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-earth-500">{svc.unit}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-green-400">
                            {formatPrice(svc.price.residential, svc.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-sky-400">
                            {formatPrice(svc.price.commercial, svc.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-amber-400">
                            {formatPrice(svc.price.premium, svc.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={clsx('text-xs font-medium', calcMargin(svc.price.residential) >= 50 ? 'text-green-400' : 'text-amber-400')}>
                              {calcMargin(svc.price.residential)}%
                            </span>
                          </td>
                          <td className="py-2.5">
                            <button
                              onClick={() => setEditService(svc)}
                              className="p-1 text-earth-600 hover:text-earth-300 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── TAB: Packages ────────────────────────────────────────────────── */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map(pkg => {
              const pkgServices = pkg.services
                .map(id => services.find(s => s.id === id))
                .filter(Boolean) as Service[];

              const totalResidential = pkgServices.reduce((s, svc) => s + svc.price.residential, 0);
              const discounted = totalResidential * (1 - pkg.discount / 100);

              return (
                <div
                  key={pkg.id}
                  className={clsx(
                    'bg-earth-900 border rounded-2xl p-5',
                    pkg.popular ? 'border-green-500/30' : 'border-earth-800'
                  )}
                >
                  {/* Package header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-earth-50">{pkg.name}</h3>
                        {pkg.popular && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded-full">
                            Best Seller
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-earth-400 mt-0.5">{pkg.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-earth-600 line-through">${totalResidential.toFixed(0)}</p>
                      <p className="text-base font-bold text-green-400">${discounted.toFixed(0)}</p>
                      <p className="text-[10px] text-green-600">Save {pkg.discount}%</p>
                    </div>
                  </div>

                  {/* Included services */}
                  <div className="space-y-1.5 mb-4">
                    {pkgServices.map(svc => {
                      const cfg = CATEGORY_CONFIG[svc.category];
                      const Icon = cfg.icon;
                      return (
                        <div key={svc.id} className="flex items-center gap-2">
                          <Icon className={clsx('w-3.5 h-3.5 shrink-0', cfg.color)} />
                          <span className="text-xs text-earth-300 flex-1">{svc.name}</span>
                          <span className="text-xs text-earth-600">${svc.price.residential}/visit</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Discount banner */}
                  <div className="flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-xl px-3 py-2 mb-4">
                    <Tag className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-green-300">{pkg.discount}% bundle discount applied automatically</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs border border-earth-700"
                      icon={<Copy className="w-3 h-3" />}
                      onClick={() => {
                        navigator.clipboard.writeText(`${pkg.name} — $${discounted.toFixed(0)}`).catch(() => {});
                        addToast('success', `Package price copied`);
                      }}
                    >
                      Copy Price
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs"
                      icon={<ArrowRight className="w-3 h-3" />}
                      onClick={() => addToast('success', `${pkg.name} added to new quote`)}
                    >
                      Use in Quote
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick upsell guide */}
          <Card header={<h3 className="text-sm font-semibold font-display text-earth-100">Upsell Guidance</h3>}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { trigger: 'Customer asks for mowing', suggest: 'Annual Lawn Care Program', lift: '+$240/yr', icon: Leaf },
                { trigger: 'Spring booking', suggest: 'Spring Revive Package', lift: '+$120', icon: RefreshCw },
                { trigger: 'Commercial property', suggest: 'Commercial Grounds Package', lift: '+$680/yr', icon: Wrench },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.trigger} className="bg-earth-800/40 border border-earth-800 rounded-xl p-3">
                    <p className="text-[10px] text-earth-500 mb-1">When customer asks for…</p>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="w-3.5 h-3.5 text-earth-400" />
                      <p className="text-xs text-earth-200">{item.trigger}</p>
                    </div>
                    <p className="text-[10px] text-earth-500 mb-0.5">Offer:</p>
                    <p className="text-xs font-semibold text-green-400">{item.suggest}</p>
                    <p className="text-[10px] text-green-600 mt-0.5">{item.lift} avg revenue lift</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editService !== null && (
        <EditModal
          service={editService === 'new' ? null : editService}
          onClose={() => setEditService(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative z-10 bg-earth-900 border border-earth-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-earth-100">Remove Service</p>
                <p className="text-xs text-earth-500">This can't be undone</p>
              </div>
            </div>
            <p className="text-sm text-earth-300 mb-5">
              Remove <strong>{services.find(s => s.id === showDeleteConfirm)?.name}</strong> from your price book?
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" size="sm" className="flex-1" onClick={() => handleDelete(showDeleteConfirm)}>Remove</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
