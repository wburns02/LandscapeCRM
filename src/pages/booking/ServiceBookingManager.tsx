import { useState, useMemo, useEffect } from 'react';
import {
  CalendarPlus, Search, Filter, ChevronDown, Check, X, Clock, User,
  MapPin, Phone, Mail, MessageSquare, Star, Briefcase, FileText,
  TrendingUp, AlertCircle, CheckCircle, Eye, ArrowRight, Copy,
  Globe, Zap, BarChart3, Plus, Home, Building2, Trees, Wrench,
  Droplets, Scissors, Leaf, RefreshCw, ExternalLink, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { format, subDays, differenceInHours } from 'date-fns';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'new' | 'reviewing' | 'quoted' | 'scheduled' | 'declined';
type ServiceCategory = 'lawn_maintenance' | 'landscape_design' | 'hardscape' | 'tree_service' |
  'irrigation' | 'cleanup' | 'fertilization' | 'pest_control' | 'other';
type PropertyType = 'residential' | 'commercial' | 'hoa';

interface ServiceRequest {
  id: string;
  submitted_at: string;
  status: RequestStatus;
  // Contact
  name: string;
  email: string;
  phone: string;
  // Property
  address: string;
  city: string;
  property_type: PropertyType;
  property_size: string;
  // Service
  service_category: ServiceCategory;
  service_description: string;
  preferred_dates: string;
  urgency: 'flexible' | 'within_week' | 'asap';
  budget_range: string;
  // Internal
  notes: string;
  assigned_to: string | null;
  est_value: number;
  source: 'website' | 'google' | 'referral' | 'portal' | 'phone';
  is_existing_customer: boolean;
  response_sent: boolean;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const today = new Date('2026-03-12');
const dt = (daysAgo: number, time: string) => `${format(subDays(today, daysAgo), 'yyyy-MM-dd')}T${time}Z`;

const REQUESTS: ServiceRequest[] = [
  {
    id: 'req-001',
    submitted_at: dt(0, '09:14:00'),
    status: 'new',
    name: 'Marcus & Linda Webb',
    email: 'mwebb@email.com',
    phone: '(512) 847-3291',
    address: '4821 Shoal Creek Blvd',
    city: 'Austin, TX 78756',
    property_type: 'residential',
    property_size: '1/4 acre',
    service_category: 'landscape_design',
    service_description: 'Looking to completely redo our front yard. Currently all rock/gravel, want native plants, stone walkway, and low-maintenance design. We have 2 dogs so need durable materials.',
    preferred_dates: 'April–May 2026',
    urgency: 'flexible',
    budget_range: '$8,000–$15,000',
    notes: '',
    assigned_to: null,
    est_value: 11500,
    source: 'website',
    is_existing_customer: false,
    response_sent: false,
  },
  {
    id: 'req-002',
    submitted_at: dt(0, '07:44:00'),
    status: 'new',
    name: 'Riverstone HOA',
    email: 'mgr@riverstonehoa.com',
    phone: '(512) 904-2117',
    address: '200 Riverstone Dr (common areas)',
    city: 'Cedar Park, TX 78613',
    property_type: 'hoa',
    property_size: '12 acres (common areas)',
    service_category: 'lawn_maintenance',
    service_description: 'Need weekly maintenance for all common areas including 3 ponds, walking trails, and 2 entry monuments. Current vendor contract ends April 1.',
    preferred_dates: 'Starting April 1, 2026',
    urgency: 'within_week',
    budget_range: '$4,000–$6,000/month',
    notes: '',
    assigned_to: null,
    est_value: 5200,
    source: 'google',
    is_existing_customer: false,
    response_sent: false,
  },
  {
    id: 'req-003',
    submitted_at: dt(1, '14:22:00'),
    status: 'reviewing',
    name: 'Derek Fontaine',
    email: 'derek.f@gmail.com',
    phone: '(737) 512-8834',
    address: '1602 Barton Hills Dr',
    city: 'Austin, TX 78704',
    property_type: 'residential',
    property_size: '1/3 acre',
    service_category: 'tree_service',
    service_description: 'Have a large live oak (~40ft) with some dead limbs overhanging the house. Need assessment and trimming. Also interested in a general yard cleanup while crew is there.',
    preferred_dates: 'Flexible, prefer weekday',
    urgency: 'within_week',
    budget_range: '$500–$1,200',
    notes: 'Called and confirmed. Scheduling site visit Fri 3/14.',
    assigned_to: 'Alpha Crew',
    est_value: 875,
    source: 'referral',
    is_existing_customer: false,
    response_sent: true,
  },
  {
    id: 'req-004',
    submitted_at: dt(1, '10:05:00'),
    status: 'quoted',
    name: 'Pflugerville Medical Plaza',
    email: 'facilities@pflugmed.com',
    phone: '(512) 278-4400',
    address: '1450 W Pecan St',
    city: 'Pflugerville, TX 78660',
    property_type: 'commercial',
    property_size: '2.4 acres',
    service_category: 'lawn_maintenance',
    service_description: 'Seeking weekly lawn service for our medical office complex. Includes mowing, edging, blowing, and seasonal color rotations at 3 entry beds.',
    preferred_dates: 'ASAP, start next week if possible',
    urgency: 'asap',
    budget_range: '$1,800–$2,500/month',
    notes: 'Sent quote #QT-2026-031 for $2,240/mo. Awaiting approval.',
    assigned_to: 'Bravo Crew',
    est_value: 2240,
    source: 'website',
    is_existing_customer: false,
    response_sent: true,
  },
  {
    id: 'req-005',
    submitted_at: dt(2, '16:48:00'),
    status: 'scheduled',
    name: 'Sarah Mitchell',
    email: 'sarah.m@outlook.com',
    phone: '(512) 301-7654',
    address: '8821 Balcones Club Dr',
    city: 'Austin, TX 78750',
    property_type: 'residential',
    property_size: '0.45 acres',
    service_category: 'irrigation',
    service_description: 'Irrigation system not working after winter — multiple zones not responding. Also some heads need replacing. Want a full spring startup inspection.',
    preferred_dates: 'Week of March 16',
    urgency: 'within_week',
    budget_range: '$300–$600',
    notes: 'Scheduled for Mon 3/16, Alpha Crew 9am.',
    assigned_to: 'Alpha Crew',
    est_value: 450,
    source: 'portal',
    is_existing_customer: true,
    response_sent: true,
  },
  {
    id: 'req-006',
    submitted_at: dt(2, '11:30:00'),
    status: 'scheduled',
    name: 'Travis County Parks Dept',
    email: 'parks.ops@traviscountytx.gov',
    phone: '(512) 854-7275',
    address: 'Govalle Neighborhood Park',
    city: 'Austin, TX 78702',
    property_type: 'commercial',
    property_size: '6 acres',
    service_category: 'cleanup',
    service_description: 'Spring cleanup needed for park grounds: remove dead annuals, prep beds for spring planting, mulch all beds, prune shrubs. This is a recurring annual contract.',
    preferred_dates: 'March 20–28',
    urgency: 'flexible',
    budget_range: '$3,000–$5,000',
    notes: 'Confirmed. Job scheduled 3/20, Charlie Crew.',
    assigned_to: 'Charlie Crew',
    est_value: 4200,
    source: 'referral',
    is_existing_customer: true,
    response_sent: true,
  },
  {
    id: 'req-007',
    submitted_at: dt(3, '13:15:00'),
    status: 'declined',
    name: 'Rapid Prop LLC',
    email: 'flips@rapidprop.com',
    phone: '(512) 999-1234',
    address: 'Multiple (30+ properties)',
    city: 'Austin Metro',
    property_type: 'commercial',
    property_size: '30+ units',
    service_category: 'lawn_maintenance',
    service_description: 'Need weekly mowing for 30+ flip properties. Turnaround 48hrs each, photos required. Pay net-30.',
    preferred_dates: 'Immediate',
    urgency: 'asap',
    budget_range: '$50/property',
    notes: 'Declined: pricing well below market ($50/unit), net-30 terms, high turnover work not aligned with our service model.',
    assigned_to: null,
    est_value: 0,
    source: 'website',
    is_existing_customer: false,
    response_sent: true,
  },
  {
    id: 'req-008',
    submitted_at: dt(4, '08:55:00'),
    status: 'quoted',
    name: 'Oakwood Estates HOA',
    email: 'board@oakwoodestates.org',
    phone: '(512) 443-7821',
    address: '12 Oakwood Estates Drive',
    city: 'Round Rock, TX 78665',
    property_type: 'hoa',
    property_size: '8 acres',
    service_category: 'landscape_design',
    service_description: 'Board approved $25k budget to renovate our community entrance and 4 pocket parks. Looking for full design and installation including irrigation.',
    preferred_dates: 'April–June 2026',
    urgency: 'flexible',
    budget_range: '$20,000–$28,000',
    notes: 'Proposal sent 3/10. Meeting with board Thurs 3/14 at 6pm.',
    assigned_to: null,
    est_value: 24500,
    source: 'referral',
    is_existing_customer: false,
    response_sent: true,
  },
  {
    id: 'req-009',
    submitted_at: dt(5, '15:20:00'),
    status: 'reviewing',
    name: 'Juan & Maria Delgado',
    email: 'jdelgado@icloud.com',
    phone: '(737) 225-9901',
    address: '3340 Tarry Town Dr',
    city: 'Austin, TX 78703',
    property_type: 'residential',
    property_size: '0.22 acres',
    service_category: 'fertilization',
    service_description: 'Lawn has large brown patches and grassy weeds taking over. Want a spring fertilization program with pre-emergent and maybe soil aeration. Can we get on a monthly plan?',
    preferred_dates: 'ASAP',
    urgency: 'asap',
    budget_range: '$150–$300 monthly',
    notes: 'Texted back, awaiting photo of lawn.',
    assigned_to: null,
    est_value: 225,
    source: 'google',
    is_existing_customer: false,
    response_sent: true,
  },
  {
    id: 'req-010',
    submitted_at: dt(6, '09:01:00'),
    status: 'scheduled',
    name: 'Lakewood HOA',
    email: 'mgmt@lakewoodhoa.com',
    phone: '(512) 288-7700',
    address: 'Lakewood Community — All Common Areas',
    city: 'Austin, TX 78748',
    property_type: 'hoa',
    property_size: '20 acres',
    service_category: 'lawn_maintenance',
    service_description: 'Annual renewal for full-property maintenance contract. Please prepare a proposal for 2026–2027 season including any price adjustments.',
    preferred_dates: 'Continue existing schedule',
    urgency: 'flexible',
    budget_range: 'Existing contract ~$7,200/mo',
    notes: 'Existing customer. Contract renewal meeting 3/18.',
    assigned_to: 'Alpha Crew',
    est_value: 86400,
    source: 'portal',
    is_existing_customer: true,
    response_sent: true,
  },
  {
    id: 'req-011',
    submitted_at: dt(7, '14:37:00'),
    status: 'quoted',
    name: 'Dr. Patricia Okafor',
    email: 'dr.okafor@aol.com',
    phone: '(512) 739-4412',
    address: '9021 Great Hills Trail',
    city: 'Austin, TX 78759',
    property_type: 'residential',
    property_size: '0.6 acres',
    service_category: 'hardscape',
    service_description: 'Want a flagstone patio (~600 sqft) with a built-in firepit, pergola, and outdoor kitchen stub-out. Also need retaining wall along back fence line.',
    preferred_dates: 'May–July 2026',
    urgency: 'flexible',
    budget_range: '$35,000–$55,000',
    notes: 'Design consultation done 3/8. Quote $47,200 sent via proposal.',
    assigned_to: null,
    est_value: 47200,
    source: 'referral',
    is_existing_customer: false,
    response_sent: true,
  },
  {
    id: 'req-012',
    submitted_at: dt(8, '11:09:00'),
    status: 'scheduled',
    name: 'Tom & Erin Bradley',
    email: 'tbradley@att.net',
    phone: '(512) 291-6604',
    address: '605 Bluebonnet Trl',
    city: 'Austin, TX 78704',
    property_type: 'residential',
    property_size: '0.3 acres',
    service_category: 'cleanup',
    service_description: 'Spring cleanup: remove dead ornamental grasses, cut back perennials, edge all beds, top-dress with compost, fresh mulch (~12 yards). Also prune crepe myrtles — 4 large ones.',
    preferred_dates: 'March 15–20',
    urgency: 'within_week',
    budget_range: '$800–$1,400',
    notes: 'Scheduled Sat 3/15, Charlie Crew. Customer confirmed.',
    assigned_to: 'Charlie Crew',
    est_value: 1150,
    source: 'portal',
    is_existing_customer: true,
    response_sent: true,
  },
];

const BOOKING_LINK = 'https://maas-verde.com/book';

// ─── Helper: status config ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: 'green' | 'amber' | 'red' | 'sky' | 'earth'; icon: React.ElementType }> = {
  new: { label: 'New', color: 'green', icon: AlertCircle },
  reviewing: { label: 'Reviewing', color: 'amber', icon: Eye },
  quoted: { label: 'Quoted', color: 'sky', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'green', icon: CheckCircle },
  declined: { label: 'Declined', color: 'red', icon: X },
};

const SERVICE_LABELS: Record<ServiceCategory, string> = {
  lawn_maintenance: 'Lawn Maintenance',
  landscape_design: 'Landscape Design',
  hardscape: 'Hardscape / Pavers',
  tree_service: 'Tree Service',
  irrigation: 'Irrigation',
  cleanup: 'Cleanup / Mulching',
  fertilization: 'Fertilization / Weed',
  pest_control: 'Pest & Disease',
  other: 'Other',
};

const SERVICE_ICONS: Partial<Record<ServiceCategory, React.ElementType>> = {
  lawn_maintenance: Scissors,
  landscape_design: Trees,
  hardscape: Home,
  tree_service: Trees,
  irrigation: Droplets,
  cleanup: Leaf,
  fertilization: Droplets,
  pest_control: AlertCircle,
};

const URGENCY_CONFIG = {
  flexible: { label: 'Flexible', color: 'earth' as const },
  within_week: { label: 'Within a Week', color: 'amber' as const },
  asap: { label: 'ASAP', color: 'red' as const },
};

const SOURCE_LABELS: Record<ServiceRequest['source'], string> = {
  website: '🌐 Website',
  google: '🔍 Google',
  referral: '🤝 Referral',
  portal: '🏠 Client Portal',
  phone: '📞 Phone',
};

function timeAgo(iso: string): string {
  const h = differenceInHours(new Date(), new Date(iso));
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Booking Form Preview ─────────────────────────────────────────────────────

function BookingFormPreview({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    property_type: 'residential', service_category: 'lawn_maintenance',
    description: '', preferred_dates: '', urgency: 'flexible', budget: '',
  });

  const serviceOptions: { value: ServiceCategory; label: string; icon: React.ElementType }[] = [
    { value: 'lawn_maintenance', label: 'Lawn Maintenance', icon: Scissors },
    { value: 'landscape_design', label: 'Landscape Design', icon: Trees },
    { value: 'hardscape', label: 'Hardscape / Pavers', icon: Home },
    { value: 'tree_service', label: 'Tree Service', icon: Trees },
    { value: 'irrigation', label: 'Irrigation', icon: Droplets },
    { value: 'cleanup', label: 'Spring/Fall Cleanup', icon: Leaf },
    { value: 'fertilization', label: 'Fertilization & Weed Control', icon: Droplets },
    { value: 'other', label: 'Other / Not Sure', icon: Wrench },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-earth-950 border border-earth-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-earth-50">Book a Service — Maas Verde</h3>
              <p className="text-xs text-earth-400">Customer-facing booking form preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-green-600/10 border border-green-600/20 text-green-400 rounded-full">Preview</span>
            <button onClick={onClose} className="p-1.5 text-earth-400 hover:text-earth-200 cursor-pointer rounded-lg hover:bg-earth-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  step >= s ? 'bg-green-600 text-white' : 'bg-earth-800 text-earth-500'
                )}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <div className={clsx('text-xs font-medium', step >= s ? 'text-earth-200' : 'text-earth-500')}>
                  {s === 1 ? 'Contact' : s === 2 ? 'Property & Service' : 'Details'}
                </div>
                {s < 3 && <div className={clsx('flex-1 h-px', step > s ? 'bg-green-600' : 'bg-earth-800')} />}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {step === 1 && (
            <>
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-earth-50">Get a Free Estimate</h2>
                <p className="text-sm text-earth-400 mt-1">Tell us about your property — we'll respond within 2 hours during business hours.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-earth-400 mb-1.5 block">Your Name *</label>
                  <input
                    className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50"
                    placeholder="John & Jane Smith"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-earth-400 mb-1.5 block">Phone *</label>
                  <input
                    className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50"
                    placeholder="(512) 555-0000"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-earth-400 mb-1.5 block">Email Address *</label>
                <input
                  className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50"
                  placeholder="you@email.com"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-earth-400 mb-1.5 block">Property Address *</label>
                <input
                  className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50"
                  placeholder="1234 Oak Street, Austin, TX 78701"
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-earth-400 mb-1.5 block">Property Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['residential', 'Residential', Home], ['commercial', 'Commercial', Building2], ['hoa', 'HOA / Multi-Unit', Building2]] as [string, string, React.ElementType][]).map(([val, label, Icon]) => (
                    <button
                      key={val}
                      onClick={() => setFormData(p => ({ ...p, property_type: val }))}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer',
                        formData.property_type === val
                          ? 'border-green-500/40 bg-green-600/10 text-green-400'
                          : 'border-earth-700 bg-earth-900 text-earth-400 hover:border-earth-600'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-earth-50">What Do You Need?</h2>
                <p className="text-sm text-earth-400 mt-1">Select the service that best matches your project.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFormData(p => ({ ...p, service_category: value }))}
                    className={clsx(
                      'flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left cursor-pointer',
                      formData.service_category === value
                        ? 'border-green-500/40 bg-green-600/10 text-green-400'
                        : 'border-earth-700 bg-earth-900 text-earth-300 hover:border-earth-600 hover:text-earth-100'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-earth-400 mb-1.5 block">How Soon Do You Need This?</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['flexible', 'Flexible', 'No rush'], ['within_week', 'This Week', 'Within 7 days'], ['asap', 'ASAP', 'Urgent']] as [string, string, string][]).map(([val, label, sub]) => (
                    <button
                      key={val}
                      onClick={() => setFormData(p => ({ ...p, urgency: val }))}
                      className={clsx(
                        'flex flex-col items-center p-2.5 rounded-xl border text-sm transition-all cursor-pointer',
                        formData.urgency === val
                          ? 'border-green-500/40 bg-green-600/10 text-green-400'
                          : 'border-earth-700 bg-earth-900 text-earth-400 hover:border-earth-600'
                      )}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-[10px] opacity-70 mt-0.5">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-earth-50">Almost Done!</h2>
                <p className="text-sm text-earth-400 mt-1">Give us a bit more detail so we can prepare an accurate estimate.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-earth-400 mb-1.5 block">Describe Your Project *</label>
                <textarea
                  className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50 resize-none"
                  rows={4}
                  placeholder="Tell us about your yard, what you'd like done, any special requirements..."
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-earth-400 mb-1.5 block">Preferred Dates</label>
                  <input
                    className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50"
                    placeholder="e.g., Weekday mornings, March–April"
                    value={formData.preferred_dates}
                    onChange={e => setFormData(p => ({ ...p, preferred_dates: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-earth-400 mb-1.5 block">Budget Range (optional)</label>
                  <input
                    className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:border-green-600/50"
                    placeholder="e.g., $500–$1,500"
                    value={formData.budget}
                    onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))}
                  />
                </div>
              </div>
              <div className="bg-green-600/5 border border-green-600/20 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-300">We'll respond within 2 hours</p>
                  <p className="text-xs text-earth-400 mt-0.5">Mon–Fri, 7am–6pm CST. After hours? We'll get back to you first thing.</p>
                </div>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 px-4 py-2.5 bg-earth-800 hover:bg-earth-700 text-earth-200 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              onClick={() => step < 3 ? setStep(s => s + 1) : onClose()}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {step < 3 ? (
                <><span>Next Step</span><ArrowRight className="w-4 h-4" /></>
              ) : (
                <><Check className="w-4 h-4" /><span>Submit Request</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Request Detail Drawer ─────────────────────────────────────────────────────

function RequestDrawer({ request, onClose, onAction }: {
  request: ServiceRequest;
  onClose: () => void;
  onAction: (id: string, action: string) => void;
}) {
  const [notes, setNotes] = useState(request.notes);
  const { addToast } = useToast();
  const Icon = SERVICE_ICONS[request.service_category] ?? Briefcase;
  const status = STATUS_CONFIG[request.status];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="ml-auto relative z-10 w-full max-w-lg bg-earth-950 border-l border-earth-800 h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-earth-800 sticky top-0 bg-earth-950 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge color={status.color}>{status.label}</Badge>
              <span className="text-xs text-earth-500">{timeAgo(request.submitted_at)}</span>
              {request.is_existing_customer && (
                <Badge color="sky">Existing Customer</Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-earth-50 truncate">{request.name}</h2>
            <p className="text-sm text-earth-400">{request.address}, {request.city}</p>
          </div>
          <button onClick={onClose} className="p-2 text-earth-400 hover:text-earth-200 cursor-pointer rounded-lg hover:bg-earth-800 shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Contact info */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="w-4 h-4 text-earth-500 shrink-0" />
              <a href={`tel:${request.phone}`} className="text-earth-200 hover:text-green-400 transition-colors">{request.phone}</a>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="w-4 h-4 text-earth-500 shrink-0" />
              <a href={`mailto:${request.email}`} className="text-earth-200 hover:text-green-400 transition-colors">{request.email}</a>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-earth-500 shrink-0" />
              <span className="text-earth-300">{request.address}, {request.city}</span>
            </div>
          </div>

          {/* Service details */}
          <div>
            <h3 className="text-xs font-semibold text-earth-500 uppercase tracking-wider mb-3">Service Request</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-600/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-earth-100">{SERVICE_LABELS[request.service_category]}</p>
                  <p className="text-xs text-earth-400">{request.property_type} • {request.property_size}</p>
                </div>
              </div>
              <div className="bg-earth-900/40 border border-earth-800/60 rounded-lg p-3">
                <p className="text-sm text-earth-300 leading-relaxed">{request.service_description}</p>
              </div>
            </div>
          </div>

          {/* Timing & Budget */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-earth-900/40 border border-earth-800/60 rounded-lg p-3">
              <p className="text-xs text-earth-500 mb-1">Urgency</p>
              <Badge color={URGENCY_CONFIG[request.urgency].color}>{URGENCY_CONFIG[request.urgency].label}</Badge>
            </div>
            <div className="bg-earth-900/40 border border-earth-800/60 rounded-lg p-3">
              <p className="text-xs text-earth-500 mb-1">Budget</p>
              <p className="text-xs font-medium text-earth-200">{request.budget_range}</p>
            </div>
            <div className="bg-earth-900/40 border border-earth-800/60 rounded-lg p-3">
              <p className="text-xs text-earth-500 mb-1">Est. Value</p>
              <p className="text-xs font-bold text-green-400">${request.est_value.toLocaleString()}</p>
            </div>
          </div>

          {/* Preferred dates */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-earth-500" />
            <span className="text-earth-400">Preferred: </span>
            <span className="text-earth-200">{request.preferred_dates}</span>
          </div>

          {/* Source */}
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-earth-500" />
            <span className="text-earth-400">Source: </span>
            <span className="text-earth-200">{SOURCE_LABELS[request.source]}</span>
          </div>

          {/* Assigned crew */}
          {request.assigned_to && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-earth-500" />
              <span className="text-earth-400">Assigned: </span>
              <span className="text-earth-200">{request.assigned_to}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="text-xs font-semibold text-earth-500 uppercase tracking-wider mb-2">Internal Notes</h3>
            <textarea
              className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-600/50 resize-none"
              rows={3}
              placeholder="Add internal notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-earth-500 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onAction(request.id, 'create_lead'); addToast('success', `Lead created for ${request.name}`); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-green-400" />
                <span>Create Lead</span>
              </button>
              <button
                onClick={() => { onAction(request.id, 'create_quote'); addToast('success', `Quote started for ${request.name}`); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Create Quote</span>
              </button>
              <button
                onClick={() => { onAction(request.id, 'schedule_job'); addToast('success', `Job scheduled for ${request.name}`); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4 text-amber-400" />
                <span>Schedule Job</span>
              </button>
              <button
                onClick={() => { onAction(request.id, 'send_response'); addToast('success', `Response sent to ${request.name}`); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 text-purple-400" />
                <span>Send Response</span>
              </button>
            </div>

            {request.status !== 'declined' && (
              <button
                onClick={() => { onAction(request.id, 'decline'); addToast('info', `Request from ${request.name} declined`); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors cursor-pointer mt-1"
              >
                <X className="w-4 h-4" />
                <span>Decline Request</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type TabKey = 'queue' | 'analytics' | 'settings';

export default function ServiceBookingManager() {
  const { addToast } = useToast();
  const { addLead } = useData();

  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const [requests, setRequests] = useState<ServiceRequest[]>(REQUESTS);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showBookingPreview, setShowBookingPreview] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [autoRespond, setAutoRespond] = useState(true);
  const [respondMsg, setRespondMsg] = useState(
    `Hi {{name}},\n\nThank you for reaching out to Maas Verde Landscape Restoration! We received your request for {{service}} and will have an estimate ready within 24 hours.\n\nWe'll contact you at {{phone}} to schedule a free site visit at your earliest convenience.\n\nBest,\nMaas Verde Team\n(512) 555-0100`
  );

  // ── Computed stats ──
  const newCount = requests.filter(r => r.status === 'new').length;
  const reviewingCount = requests.filter(r => r.status === 'reviewing').length;
  const conversionRate = useMemo(() => {
    const closed = requests.filter(r => ['scheduled', 'declined'].includes(r.status)).length;
    const won = requests.filter(r => r.status === 'scheduled').length;
    return closed > 0 ? Math.round((won / closed) * 100) : 0;
  }, [requests]);
  const totalPipelineValue = requests
    .filter(r => !['declined'].includes(r.status))
    .reduce((s, r) => s + r.est_value, 0);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = [...requests];
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(r => r.service_category === filterCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.service_description.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      // New first, then by date
      if (a.status === 'new' && b.status !== 'new') return -1;
      if (b.status === 'new' && a.status !== 'new') return 1;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
  }, [requests, filterStatus, filterCategory, searchQuery]);

  // ── Actions ──
  const handleAction = (id: string, action: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (action === 'decline') return { ...r, status: 'declined' as const };
      if (action === 'create_lead') return { ...r, status: 'reviewing' as const, response_sent: true };
      if (action === 'create_quote') return { ...r, status: 'quoted' as const, response_sent: true };
      if (action === 'schedule_job') return { ...r, status: 'scheduled' as const, response_sent: true };
      if (action === 'send_response') return { ...r, response_sent: true, status: r.status === 'new' ? 'reviewing' as const : r.status };
      return r;
    }));
  };

  const handleMarkReviewing = (id: string) => {
    setRequests(prev => prev.map(r =>
      r.id === id && r.status === 'new' ? { ...r, status: 'reviewing' as const } : r
    ));
    addToast('info', 'Request marked as reviewing');
  };

  const copyLink = () => {
    setLinkCopied(true);
    addToast('success', 'Booking link copied to clipboard!');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Analytics data ──
  const byCategory = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    requests.forEach(r => {
      if (!counts[r.service_category]) counts[r.service_category] = { count: 0, value: 0 };
      counts[r.service_category].count++;
      counts[r.service_category].value += r.est_value;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([cat, data]) => ({ cat: cat as ServiceCategory, ...data }));
  }, [requests]);

  const bySource = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.source] = (counts[r.source] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-earth-50 flex items-center gap-2">
            <CalendarPlus className="w-6 h-6 text-green-400" />
            Service Requests
          </h1>
          <p className="text-sm text-earth-400 mt-0.5">
            Manage incoming booking requests and convert them to jobs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBookingPreview(true)}
            className="flex items-center gap-2 px-3 py-2 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview Form</span>
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3 py-2 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer"
          >
            {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{linkCopied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => addToast('info', 'Manual request entry coming soon')}>
            Add Request
          </Button>
        </div>
      </div>

      {/* Alert banner for new requests */}
      {newCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <p className="text-sm text-amber-300 font-medium">
              {newCount} new request{newCount > 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <button
            onClick={() => { setFilterStatus('new'); setActiveTab('queue'); }}
            className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            View now →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="New Requests"
          value={newCount}
          icon={<AlertCircle className="w-5 h-5" />}
          color={newCount > 0 ? 'amber' : 'earth'}
        />
        <StatCard
          title="Pipeline Value"
          value={`$${(totalPipelineValue / 1000).toFixed(0)}k`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<BarChart3 className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          title="Total Requests"
          value={requests.length}
          icon={<CalendarPlus className="w-5 h-5" />}
          color="earth"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {([
          { key: 'queue', label: 'Request Queue', icon: Briefcase, count: filtered.length },
          { key: 'analytics', label: 'Analytics', icon: BarChart3, count: null },
          { key: 'settings', label: 'Settings', icon: Zap, count: null },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
              activeTab === t.key
                ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                : 'text-earth-400 hover:text-earth-200'
            )}
          >
            <t.icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">{t.label}</span>
            {t.count !== null && t.count > 0 && (
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded-full shrink-0',
                activeTab === t.key ? 'bg-green-600/30 text-green-300' : 'bg-earth-700 text-earth-400'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ QUEUE TAB ═══ */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
              <input
                className="w-full bg-earth-900 border border-earth-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-600/50"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="bg-earth-900 border border-earth-800 rounded-xl px-3 py-2.5 text-sm text-earth-300 focus:outline-none cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as RequestStatus | 'all')}
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="quoted">Quoted</option>
              <option value="scheduled">Scheduled</option>
              <option value="declined">Declined</option>
            </select>
            <select
              className="bg-earth-900 border border-earth-800 rounded-xl px-3 py-2.5 text-sm text-earth-300 focus:outline-none cursor-pointer"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as ServiceCategory | 'all')}
            >
              <option value="all">All Services</option>
              {Object.entries(SERVICE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Request list */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <CalendarPlus className="w-10 h-10 text-earth-600 mx-auto mb-3" />
                  <p className="text-earth-400 font-medium">No requests match your filters</p>
                  <p className="text-earth-500 text-sm mt-1">Try adjusting the status or category filter</p>
                </div>
              </Card>
            )}

            {filtered.map(req => {
              const status = STATUS_CONFIG[req.status];
              const StatusIcon = status.icon;
              const SvcIcon = SERVICE_ICONS[req.service_category] ?? Briefcase;
              const urgency = URGENCY_CONFIG[req.urgency];

              return (
                <div
                  key={req.id}
                  className={clsx(
                    'bg-earth-900/60 border rounded-xl p-4 cursor-pointer transition-all hover:border-earth-600 hover:bg-earth-900',
                    req.status === 'new' ? 'border-amber-500/30 bg-amber-500/5' : 'border-earth-800'
                  )}
                  onClick={() => setSelectedRequest(req)}
                >
                  <div className="flex items-start gap-3">
                    {/* Service icon */}
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      req.status === 'new' ? 'bg-amber-500/10' : 'bg-earth-800'
                    )}>
                      <SvcIcon className={clsx('w-5 h-5', req.status === 'new' ? 'text-amber-400' : 'text-earth-400')} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-earth-100 text-sm">{req.name}</span>
                          {req.is_existing_customer && (
                            <span className="text-xs px-1.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">Existing</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge color={status.color}>{status.label}</Badge>
                          <span className="text-xs text-earth-600">{timeAgo(req.submitted_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-earth-500 mb-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {req.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <SvcIcon className="w-3 h-3" />
                          {SERVICE_LABELS[req.service_category]}
                        </span>
                        <span>{SOURCE_LABELS[req.source]}</span>
                      </div>

                      <p className="text-xs text-earth-400 line-clamp-2 mb-3">{req.service_description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge color={urgency.color}>{urgency.label}</Badge>
                          {req.est_value > 0 && (
                            <span className="text-xs font-semibold text-green-400">
                              ~${req.est_value.toLocaleString()}
                            </span>
                          )}
                          {req.budget_range && (
                            <span className="text-xs text-earth-500">{req.budget_range}</span>
                          )}
                        </div>

                        {/* Quick action */}
                        {req.status === 'new' && (
                          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                handleMarkReviewing(req.id);
                                if (autoRespond) {
                                  setRequests(prev => prev.map(r =>
                                    r.id === req.id ? { ...r, response_sent: true, status: 'reviewing' as const } : r
                                  ));
                                  addToast('success', `Auto-response sent to ${req.name}`);
                                }
                              }}
                              className="text-xs px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition-colors cursor-pointer"
                            >
                              {autoRespond ? '✓ Respond + Review' : 'Mark Reviewing'}
                            </button>
                          </div>
                        )}
                        {req.status === 'reviewing' && (
                          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { handleAction(req.id, 'create_quote'); addToast('success', `Quote started for ${req.name}`); }}
                              className="text-xs px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-lg transition-colors cursor-pointer"
                            >
                              Send Quote
                            </button>
                          </div>
                        )}
                        {req.status === 'quoted' && (
                          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { handleAction(req.id, 'schedule_job'); addToast('success', `Job scheduled for ${req.name}`); }}
                              className="text-xs px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors cursor-pointer"
                            >
                              Schedule
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Pipeline funnel */}
          <Card>
            <h3 className="text-sm font-semibold text-earth-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Request Pipeline Funnel
            </h3>
            <div className="space-y-2.5">
              {(['new', 'reviewing', 'quoted', 'scheduled', 'declined'] as RequestStatus[]).map((status, idx) => {
                const count = requests.filter(r => r.status === status).length;
                const value = requests.filter(r => r.status === status).reduce((s, r) => s + r.est_value, 0);
                const pct = Math.round((count / requests.length) * 100);
                const cfg = STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;
                const colors = ['bg-amber-500', 'bg-sky-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500'];

                return (
                  <div key={status} className="flex items-center gap-3">
                    <StatusIcon className="w-4 h-4 text-earth-500 shrink-0" />
                    <div className="w-24 text-xs text-earth-400">{cfg.label}</div>
                    <div className="flex-1 bg-earth-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', colors[idx])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-6 text-xs text-earth-200 text-right">{count}</div>
                    {value > 0 && (
                      <div className="w-20 text-xs text-green-400 text-right">${(value / 1000).toFixed(1)}k</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* By service category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-earth-200 mb-4">Requests by Service</h3>
              <div className="space-y-2.5">
                {byCategory.map(({ cat, count, value }) => {
                  const pct = Math.round((count / requests.length) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-earth-400 truncate">{SERVICE_LABELS[cat]}</div>
                      <div className="flex-1 bg-earth-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-6 text-xs text-earth-300">{count}</div>
                      <div className="w-16 text-xs text-green-400 text-right">${(value / 1000).toFixed(0)}k</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-earth-200 mb-4">Requests by Source</h3>
              <div className="space-y-3">
                {bySource.map(([source, count]) => {
                  const pct = Math.round((count / requests.length) * 100);
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-earth-400">{SOURCE_LABELS[source as ServiceRequest['source']]}</div>
                      <div className="flex-1 bg-earth-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-sky-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-6 text-xs text-earth-300">{count}</div>
                      <div className="w-10 text-xs text-earth-500 text-right">{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-earth-800 grid grid-cols-2 gap-3">
                <div className="bg-earth-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-400">{conversionRate}%</p>
                  <p className="text-xs text-earth-500 mt-0.5">Conversion Rate</p>
                </div>
                <div className="bg-earth-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-400">2.4h</p>
                  <p className="text-xs text-earth-500 mt-0.5">Avg Response Time</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Top opportunities */}
          <Card>
            <h3 className="text-sm font-semibold text-earth-200 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Highest Value Open Requests
            </h3>
            <div className="space-y-3">
              {requests
                .filter(r => !['declined', 'scheduled'].includes(r.status))
                .sort((a, b) => b.est_value - a.est_value)
                .slice(0, 5)
                .map(req => {
                  const cfg = STATUS_CONFIG[req.status];
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 py-2 border-b border-earth-800/60 last:border-0 cursor-pointer hover:bg-earth-800/20 rounded-lg px-2 -mx-2 transition-colors"
                      onClick={() => { setActiveTab('queue'); setSelectedRequest(req); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-earth-100 truncate">{req.name}</p>
                        <p className="text-xs text-earth-500">{SERVICE_LABELS[req.service_category]}</p>
                      </div>
                      <Badge color={cfg.color}>{cfg.label}</Badge>
                      <span className="text-sm font-bold text-green-400 shrink-0">${req.est_value.toLocaleString()}</span>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <Card>
            <h3 className="text-sm font-semibold text-earth-200 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-400" />
              Booking Link
            </h3>
            <div className="flex gap-2">
              <div className="flex-1 bg-earth-950 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-400 font-mono flex items-center">
                {BOOKING_LINK}
              </div>
              <button
                onClick={copyLink}
                className="px-4 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer flex items-center gap-2"
              >
                {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span>Copy</span>
              </button>
              <button
                onClick={() => setShowBookingPreview(true)}
                className="px-4 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 rounded-xl text-sm text-earth-200 transition-colors cursor-pointer flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Preview</span>
              </button>
            </div>
            <p className="text-xs text-earth-500 mt-2">Add this link to your website, Google Business Profile, email signature, and social media.</p>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-earth-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Auto-Response Settings
            </h3>
            <div className="flex items-center justify-between p-3 bg-earth-800/40 rounded-xl mb-4">
              <div>
                <p className="text-sm font-medium text-earth-100">Auto-respond to new requests</p>
                <p className="text-xs text-earth-400 mt-0.5">Send instant confirmation when a request is submitted</p>
              </div>
              <button
                onClick={() => {
                  setAutoRespond(v => !v);
                  addToast('success', `Auto-response ${!autoRespond ? 'enabled' : 'disabled'}`);
                }}
                className={clsx(
                  'w-11 h-6 rounded-full transition-all duration-200 relative cursor-pointer shrink-0',
                  autoRespond ? 'bg-green-600' : 'bg-earth-700'
                )}
              >
                <div className={clsx(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
                  autoRespond ? 'left-6' : 'left-1'
                )} />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-earth-400 mb-2 block">Auto-Response Message Template</label>
              <textarea
                className="w-full bg-earth-900 border border-earth-700 rounded-xl px-3 py-2.5 text-sm text-earth-200 focus:outline-none focus:border-green-600/50 resize-none font-mono"
                rows={8}
                value={respondMsg}
                onChange={e => setRespondMsg(e.target.value)}
              />
              <p className="text-xs text-earth-500 mt-1.5">
                Variables: <code className="text-green-400">{'{{name}}'}</code>, <code className="text-green-400">{'{{service}}'}</code>, <code className="text-green-400">{'{{phone}}'}</code>
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => addToast('success', 'Auto-response settings saved')}>Save Settings</Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-earth-200 mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sky-400" />
              Integrations
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Google Business Profile', desc: 'Show booking link on your Google listing', icon: '🔍', status: 'Active' },
                { name: 'Facebook / Instagram', desc: 'Add booking CTA to social profiles', icon: '📱', status: 'Not connected' },
                { name: 'Website Widget', desc: 'Embed a booking button on your website', icon: '🌐', status: 'Available' },
                { name: 'Nextdoor', desc: 'Link your Nextdoor business page', icon: '🏘️', status: 'Not connected' },
              ].map(i => (
                <div key={i.name} className="flex items-center justify-between p-3 bg-earth-900/50 border border-earth-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{i.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-earth-100">{i.name}</p>
                      <p className="text-xs text-earth-500">{i.desc}</p>
                    </div>
                  </div>
                  <span className={clsx(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    i.status === 'Active' ? 'bg-green-600/10 text-green-400' : 'bg-earth-700 text-earth-400'
                  )}>
                    {i.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Booking form preview */}
      {showBookingPreview && <BookingFormPreview onClose={() => setShowBookingPreview(false)} />}

      {/* Request detail drawer */}
      {selectedRequest && (
        <RequestDrawer
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={(id, action) => {
            handleAction(id, action);
            if (action !== 'decline') setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}
