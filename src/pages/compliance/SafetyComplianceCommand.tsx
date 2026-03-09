import { useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, CheckCircle2, Clock, Users, FileText,
  Calendar, Bell, ChevronDown, ChevronRight, RefreshCw, Search,
  Truck, Award, Flame, Droplets, Bug, Zap, HardHat, Heart,
  BadgeCheck, XCircle, Eye, Send, Download, Filter,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, addMonths, subDays, subMonths, differenceInDays } from 'date-fns';
import { useToast } from '../../components/ui/Toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface Certification {
  id: string;
  employeeId: string;
  employeeName: string;
  crew: string;
  type: string;
  category: 'pesticide' | 'driver' | 'safety' | 'equipment' | 'medical';
  issuer: string;
  licenseNumber: string;
  issueDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expiring_soon' | 'expired' | 'pending_renewal';
  icon: LucideIcon;
  renewalCost: number;
  notes?: string;
}

interface InspectionItem {
  id: string;
  asset: string;
  assetType: 'vehicle' | 'mower' | 'sprayer' | 'trailer' | 'chainsaw' | 'facility';
  lastInspection: Date;
  nextDue: Date;
  status: 'current' | 'due_soon' | 'overdue';
  inspector: string;
  items: { label: string; passed: boolean }[];
  notes?: string;
}

interface SafetyIncident {
  id: string;
  date: Date;
  type: 'injury' | 'near_miss' | 'property_damage' | 'equipment_failure';
  severity: 'minor' | 'moderate' | 'serious';
  employee: string;
  crew: string;
  description: string;
  resolution: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  daysOpen: number;
}

// ── Demo Data ──────────────────────────────────────────────────────────────
const now = new Date();

const certifications: Certification[] = [
  // Pesticide licenses
  { id: 'cert-1', employeeId: 'emp-1', employeeName: 'Mike Torres', crew: 'Chemical Team', type: 'Pesticide Applicator License', category: 'pesticide', issuer: 'Texas Dept of Agriculture', licenseNumber: 'TDA-42891', issueDate: subMonths(now, 10), expiryDate: addMonths(now, 2), status: 'valid', icon: Bug, renewalCost: 150, notes: 'Commercial applicator — categories 3A, 3B, 10' },
  { id: 'cert-2', employeeId: 'emp-2', employeeName: 'Carlos Mendez', crew: 'Alpha Crew', type: 'Pesticide Applicator License', category: 'pesticide', issuer: 'Texas Dept of Agriculture', licenseNumber: 'TDA-51023', issueDate: subMonths(now, 22), expiryDate: addDays(now, 18), status: 'expiring_soon', icon: Bug, renewalCost: 150, notes: 'Expires in 18 days — 5 CEU credits needed' },
  { id: 'cert-3', employeeId: 'emp-3', employeeName: 'Roberto Silva', crew: 'Charlie Crew', type: 'Pesticide Applicator License', category: 'pesticide', issuer: 'Texas Dept of Agriculture', licenseNumber: 'TDA-48372', issueDate: subMonths(now, 25), expiryDate: subDays(now, 12), status: 'expired', icon: Bug, renewalCost: 200, notes: 'EXPIRED — cannot apply chemicals. Renewal exam scheduled March 25.' },

  // Driver's licenses / CDL
  { id: 'cert-4', employeeId: 'emp-4', employeeName: 'Jake Williams', crew: 'Bravo Crew', type: 'Class B CDL', category: 'driver', issuer: 'Texas DPS', licenseNumber: 'CDL-2847291', issueDate: subMonths(now, 36), expiryDate: addMonths(now, 12), status: 'valid', icon: Truck, renewalCost: 75, notes: 'Tanker endorsement included' },
  { id: 'cert-5', employeeId: 'emp-1', employeeName: 'Mike Torres', crew: 'Chemical Team', type: 'Class C License + Hazmat', category: 'driver', issuer: 'Texas DPS', licenseNumber: 'DL-9182736', issueDate: subMonths(now, 8), expiryDate: addMonths(now, 16), status: 'valid', icon: Truck, renewalCost: 50 },

  // Safety certifications
  { id: 'cert-6', employeeId: 'emp-4', employeeName: 'Jake Williams', crew: 'Bravo Crew', type: 'OSHA 10-Hour Construction', category: 'safety', issuer: 'OSHA', licenseNumber: 'OSHA-10-284719', issueDate: subMonths(now, 18), expiryDate: addMonths(now, 6), status: 'valid', icon: HardHat, renewalCost: 85 },
  { id: 'cert-7', employeeId: 'emp-5', employeeName: 'Luis Ramirez', crew: 'Alpha Crew', type: 'OSHA 10-Hour Construction', category: 'safety', issuer: 'OSHA', licenseNumber: 'OSHA-10-391847', issueDate: subMonths(now, 30), expiryDate: addDays(now, 25), status: 'expiring_soon', icon: HardHat, renewalCost: 85, notes: 'Class available March 28 at ACC' },
  { id: 'cert-8', employeeId: 'emp-6', employeeName: 'David Park', crew: 'Bravo Crew', type: 'Confined Space Entry', category: 'safety', issuer: 'NSC', licenseNumber: 'CSE-47281', issueDate: subMonths(now, 11), expiryDate: addMonths(now, 1), status: 'valid', icon: Shield, renewalCost: 120 },

  // First Aid / CPR
  { id: 'cert-9', employeeId: 'emp-1', employeeName: 'Mike Torres', crew: 'Chemical Team', type: 'First Aid / CPR / AED', category: 'medical', issuer: 'American Red Cross', licenseNumber: 'ARC-8472910', issueDate: subMonths(now, 20), expiryDate: addDays(now, 45), status: 'expiring_soon', icon: Heart, renewalCost: 65 },
  { id: 'cert-10', employeeId: 'emp-4', employeeName: 'Jake Williams', crew: 'Bravo Crew', type: 'First Aid / CPR / AED', category: 'medical', issuer: 'American Red Cross', licenseNumber: 'ARC-9281047', issueDate: subMonths(now, 6), expiryDate: addMonths(now, 18), status: 'valid', icon: Heart, renewalCost: 65 },
  { id: 'cert-11', employeeId: 'emp-7', employeeName: 'Ana Martinez', crew: 'Alpha Crew', type: 'First Aid / CPR / AED', category: 'medical', issuer: 'American Red Cross', licenseNumber: 'ARC-1847293', issueDate: subMonths(now, 24), expiryDate: subDays(now, 5), status: 'expired', icon: Heart, renewalCost: 65, notes: 'EXPIRED — must renew before next field day' },

  // Equipment certs
  { id: 'cert-12', employeeId: 'emp-5', employeeName: 'Luis Ramirez', crew: 'Alpha Crew', type: 'Chainsaw Safety Certification', category: 'equipment', issuer: 'ISA', licenseNumber: 'ISA-CS-28471', issueDate: subMonths(now, 14), expiryDate: addMonths(now, 10), status: 'valid', icon: Zap, renewalCost: 95 },
  { id: 'cert-13', employeeId: 'emp-8', employeeName: 'Marcus Johnson', crew: 'Charlie Crew', type: 'Aerial Lift Certification', category: 'equipment', issuer: 'ANSI', licenseNumber: 'ANSI-AL-91827', issueDate: subMonths(now, 34), expiryDate: addDays(now, 8), status: 'expiring_soon', icon: Zap, renewalCost: 110, notes: 'Critical — needed for Hillcrest tree work' },
];

const inspections: InspectionItem[] = [
  {
    id: 'insp-1', asset: 'Truck #1 — Ford F-350', assetType: 'vehicle',
    lastInspection: subDays(now, 12), nextDue: addDays(now, 18), status: 'current',
    inspector: 'Jake Williams',
    items: [
      { label: 'Tires & wheels', passed: true }, { label: 'Brakes', passed: true },
      { label: 'Lights & signals', passed: true }, { label: 'Mirrors', passed: true },
      { label: 'Fluid levels', passed: true }, { label: 'Emergency kit', passed: true },
    ],
  },
  {
    id: 'insp-2', asset: 'Truck #2 — Chevy 2500HD', assetType: 'vehicle',
    lastInspection: subDays(now, 28), nextDue: addDays(now, 2), status: 'due_soon',
    inspector: 'Carlos Mendez',
    items: [
      { label: 'Tires & wheels', passed: true }, { label: 'Brakes', passed: true },
      { label: 'Lights & signals', passed: false }, { label: 'Mirrors', passed: true },
      { label: 'Fluid levels', passed: true }, { label: 'Emergency kit', passed: true },
    ],
    notes: 'Right turn signal bulb out — replace before next inspection',
  },
  {
    id: 'insp-3', asset: 'Spray Rig — 200gal Skid Sprayer', assetType: 'sprayer',
    lastInspection: subDays(now, 45), nextDue: subDays(now, 15), status: 'overdue',
    inspector: 'Mike Torres',
    items: [
      { label: 'Tank integrity', passed: true }, { label: 'Hoses & fittings', passed: false },
      { label: 'Nozzles calibrated', passed: true }, { label: 'Pressure gauge', passed: true },
      { label: 'Safety labels', passed: false }, { label: 'SDS binder current', passed: true },
    ],
    notes: 'OVERDUE — hose fitting leak detected. Safety labels faded. Schedule maintenance.',
  },
  {
    id: 'insp-4', asset: 'Trailer #1 — 16ft Landscape', assetType: 'trailer',
    lastInspection: subDays(now, 5), nextDue: addDays(now, 25), status: 'current',
    inspector: 'Jake Williams',
    items: [
      { label: 'Hitch & safety chains', passed: true }, { label: 'Tires & bearings', passed: true },
      { label: 'Ramp condition', passed: true }, { label: 'Lights & reflectors', passed: true },
      { label: 'Tie-down points', passed: true },
    ],
  },
  {
    id: 'insp-5', asset: 'Zero-Turn Mower — Scag V-Ride II', assetType: 'mower',
    lastInspection: subDays(now, 8), nextDue: addDays(now, 22), status: 'current',
    inspector: 'Carlos Mendez',
    items: [
      { label: 'Blades sharp', passed: true }, { label: 'Deck level', passed: true },
      { label: 'Belt tension', passed: false }, { label: 'Oil level', passed: true },
      { label: 'ROPS functional', passed: true }, { label: 'Kill switch', passed: true },
    ],
    notes: 'Belt showing wear — schedule replacement this weekend (belt broke on Bravo crew today)',
  },
];

const safetyIncidents: SafetyIncident[] = [
  {
    id: 'inc-1', date: subDays(now, 2), type: 'near_miss', severity: 'moderate',
    employee: 'Luis Ramirez', crew: 'Alpha Crew',
    description: 'Tree branch fell near crew member during trimming at 6742 Sunset Ridge. Branch was approximately 4" diameter, fell 15ft. No one was in the drop zone but client was nearby.',
    resolution: 'Reviewed drop zone protocols. Added client notification step to tree work checklist. Will brief all crews at Thursday safety meeting.',
    status: 'investigating', daysOpen: 2,
  },
  {
    id: 'inc-2', date: subDays(now, 8), type: 'equipment_failure', severity: 'minor',
    employee: 'Jake Williams', crew: 'Bravo Crew',
    description: 'Mower deck belt snapped during operation at 8900 Commerce Blvd. No injury. Belt fragments contained under deck guard.',
    resolution: 'Belt replaced on site. Added all mower belts to weekend inspection checklist. Ordered 3 spare belts.',
    status: 'resolved', daysOpen: 0,
  },
  {
    id: 'inc-3', date: subDays(now, 15), type: 'injury', severity: 'minor',
    employee: 'David Park', crew: 'Bravo Crew',
    description: 'Minor cut on left hand from broken irrigation head at 2400 Meadowbrook Pkwy. Employee was wearing gloves but sharp ceramic edge cut through.',
    resolution: 'First aid applied on site. Upgraded to cut-resistant gloves (Level A4) for irrigation work. Workers comp claim filed.',
    status: 'closed', daysOpen: 0,
  },
  {
    id: 'inc-4', date: subDays(now, 30), type: 'property_damage', severity: 'minor',
    employee: 'Marcus Johnson', crew: 'Charlie Crew',
    description: 'Sprinkler head broken by mower at 1200 Hillcrest Dr. Head was not marked/flagged.',
    resolution: 'Replaced sprinkler head ($12). Added flag requirement for all irrigation heads near mow paths. No customer charge.',
    status: 'closed', daysOpen: 0,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  valid: { bg: 'bg-green-500/15 border-green-500/25', text: 'text-green-400', label: 'Valid' },
  expiring_soon: { bg: 'bg-amber-500/15 border-amber-500/25', text: 'text-amber-400', label: 'Expiring Soon' },
  expired: { bg: 'bg-red-500/15 border-red-500/25', text: 'text-red-400', label: 'Expired' },
  pending_renewal: { bg: 'bg-sky-500/15 border-sky-500/25', text: 'text-sky-400', label: 'Pending Renewal' },
  current: { bg: 'bg-green-500/15 border-green-500/25', text: 'text-green-400', label: 'Current' },
  due_soon: { bg: 'bg-amber-500/15 border-amber-500/25', text: 'text-amber-400', label: 'Due Soon' },
  overdue: { bg: 'bg-red-500/15 border-red-500/25', text: 'text-red-400', label: 'Overdue' },
};

const categoryLabels: Record<string, string> = {
  pesticide: 'Pesticide', driver: 'Driving', safety: 'Safety', equipment: 'Equipment', medical: 'Medical',
};

const incidentTypeLabels: Record<string, string> = {
  injury: 'Injury', near_miss: 'Near Miss', property_damage: 'Property Damage', equipment_failure: 'Equipment Failure',
};

const severityColors: Record<string, string> = {
  minor: 'bg-earth-800/40 text-earth-400', moderate: 'bg-amber-500/15 text-amber-400', serious: 'bg-red-500/15 text-red-400',
};

function ComplianceScore({ score }: { score: number }) {
  const color = score >= 90 ? '#4ade80' : score >= 70 ? '#fbbf24' : '#f87171';
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative">
      <svg width={96} height={96} className="transform -rotate-90">
        <circle cx={48} cy={48} r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-earth-800/60" />
        <circle cx={48} cy={48} r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-earth-500">/ 100</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function SafetyComplianceCommand() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'certs' | 'inspections' | 'incidents'>('overview');
  const [certFilter, setCertFilter] = useState<string>('all');
  const [expandedCert, setExpandedCert] = useState<string | null>(null);
  const [expandedInspection, setExpandedInspection] = useState<string | null>(null);
  const [renewedCerts, setRenewedCerts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Computed stats
  const stats = useMemo(() => {
    const totalCerts = certifications.length;
    const expiredCerts = certifications.filter(c => c.status === 'expired' && !renewedCerts.has(c.id)).length;
    const expiringSoon = certifications.filter(c => c.status === 'expiring_soon').length;
    const validCerts = totalCerts - expiredCerts - expiringSoon;

    const overdueInspections = inspections.filter(i => i.status === 'overdue').length;
    const dueSoon = inspections.filter(i => i.status === 'due_soon').length;

    const openIncidents = safetyIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length;
    const daysSinceLastIncident = differenceInDays(now, safetyIncidents.reduce((latest, i) => i.date > latest ? i.date : latest, new Date(0)));

    // Compliance score calculation
    const certScore = ((validCerts) / totalCerts) * 40; // 40% weight
    const inspScore = ((inspections.length - overdueInspections) / inspections.length) * 30; // 30% weight
    const incidentScore = openIncidents === 0 ? 30 : openIncidents === 1 ? 20 : 10; // 30% weight
    const complianceScore = Math.round(certScore + inspScore + incidentScore);

    const renewalCosts = certifications.filter(c => c.status === 'expired' || c.status === 'expiring_soon').reduce((s, c) => s + c.renewalCost, 0);

    return { totalCerts, expiredCerts, expiringSoon, validCerts, overdueInspections, dueSoon, openIncidents, daysSinceLastIncident, complianceScore, renewalCosts };
  }, [renewedCerts]);

  const filteredCerts = useMemo(() => {
    let result = [...certifications];
    if (certFilter !== 'all') {
      if (certFilter === 'expired') result = result.filter(c => c.status === 'expired' && !renewedCerts.has(c.id));
      else if (certFilter === 'expiring') result = result.filter(c => c.status === 'expiring_soon');
      else result = result.filter(c => c.category === certFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.employeeName.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.licenseNumber.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      const priority = { expired: 0, expiring_soon: 1, pending_renewal: 2, valid: 3 };
      return (priority[a.status] || 3) - (priority[b.status] || 3);
    });
  }, [certFilter, searchQuery, renewedCerts]);

  const renewCert = (certId: string, name: string) => {
    setRenewedCerts(prev => { const n = new Set(prev); n.add(certId); return n; });
    addToast('success', `Renewal initiated for ${name}'s certification`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-sky-400" />
          <h2 className="text-2xl font-bold text-earth-100">Safety & Compliance</h2>
        </div>
        <p className="text-earth-400 text-sm">Certifications, inspections, and incident tracking — never get fined again</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-0.5 overflow-x-auto">
        {([
          { key: 'overview', label: 'Overview', icon: Eye },
          { key: 'certs', label: 'Certifications', icon: Award },
          { key: 'inspections', label: 'Inspections', icon: CheckCircle2 },
          { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              activeTab === tab.key ? 'bg-green-600/20 text-green-400' : 'text-earth-500 hover:text-earth-300'
            )}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Alerts */}
          {(stats.expiredCerts > 0 || stats.overdueInspections > 0) && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-300">Immediate Attention Required</div>
                <div className="text-xs text-earth-400 mt-0.5">
                  {stats.expiredCerts > 0 && <span className="text-red-400">{stats.expiredCerts} expired certification{stats.expiredCerts > 1 ? 's' : ''}</span>}
                  {stats.expiredCerts > 0 && stats.overdueInspections > 0 && ' · '}
                  {stats.overdueInspections > 0 && <span className="text-red-400">{stats.overdueInspections} overdue inspection{stats.overdueInspections > 1 ? 's' : ''}</span>}
                  {' — potential fines up to $10,000 per violation'}
                </div>
              </div>
            </div>
          )}

          {/* Score + Stats */}
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5 flex items-center gap-4">
              <ComplianceScore score={stats.complianceScore} />
              <div>
                <div className="text-sm font-semibold text-earth-200">Compliance Score</div>
                <div className="text-xs text-earth-500 mt-1">
                  {stats.complianceScore >= 90 ? 'Excellent — all systems green' :
                   stats.complianceScore >= 70 ? 'Good — minor items to address' :
                   'Needs attention — risk of fines'}
                </div>
              </div>
            </div>

            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-sky-400" />
                <span className="text-xs text-earth-500">Certifications</span>
              </div>
              <div className="text-2xl font-bold text-earth-100">{stats.totalCerts}</div>
              <div className="flex gap-2 mt-1 text-[10px]">
                <span className="text-green-400">{stats.validCerts} valid</span>
                {stats.expiringSoon > 0 && <span className="text-amber-400">{stats.expiringSoon} expiring</span>}
                {stats.expiredCerts > 0 && <span className="text-red-400">{stats.expiredCerts} expired</span>}
              </div>
            </div>

            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-earth-500">Equipment Inspections</span>
              </div>
              <div className="text-2xl font-bold text-earth-100">{inspections.length}</div>
              <div className="flex gap-2 mt-1 text-[10px]">
                <span className="text-green-400">{inspections.filter(i => i.status === 'current').length} current</span>
                {stats.dueSoon > 0 && <span className="text-amber-400">{stats.dueSoon} due soon</span>}
                {stats.overdueInspections > 0 && <span className="text-red-400">{stats.overdueInspections} overdue</span>}
              </div>
            </div>

            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs text-earth-500">Safety Record</span>
              </div>
              <div className="text-2xl font-bold text-earth-100">{stats.daysSinceLastIncident} days</div>
              <div className="text-[10px] text-earth-500 mt-1">since last incident</div>
              {stats.openIncidents > 0 && (
                <div className="text-[10px] text-amber-400 mt-0.5">{stats.openIncidents} open investigation{stats.openIncidents > 1 ? 's' : ''}</div>
              )}
            </div>
          </div>

          {/* Upcoming Renewals & Actions */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Expiring Soon */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Upcoming Renewals
              </h3>
              <div className="space-y-2">
                {certifications
                  .filter(c => c.status === 'expired' || c.status === 'expiring_soon')
                  .filter(c => !renewedCerts.has(c.id))
                  .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
                  .slice(0, 5)
                  .map(cert => {
                    const days = differenceInDays(cert.expiryDate, now);
                    const CIcon = cert.icon;
                    return (
                      <div key={cert.id} className={clsx(
                        'flex items-center gap-3 rounded-xl p-3 border',
                        cert.status === 'expired' ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/8 border-amber-500/20'
                      )}>
                        <CIcon className={clsx('w-4 h-4', cert.status === 'expired' ? 'text-red-400' : 'text-amber-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-earth-200 truncate">{cert.employeeName}</div>
                          <div className="text-[10px] text-earth-500 truncate">{cert.type}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={clsx('text-xs font-semibold', days < 0 ? 'text-red-400' : 'text-amber-400')}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                          </div>
                          <button
                            onClick={() => renewCert(cert.id, cert.employeeName)}
                            className="text-[10px] text-green-400 hover:text-green-300 cursor-pointer font-medium"
                          >Renew →</button>
                        </div>
                      </div>
                    );
                  })}
                {stats.expiredCerts === 0 && stats.expiringSoon === 0 && (
                  <div className="text-center py-4 text-earth-500 text-xs">All certifications current</div>
                )}
              </div>
              {stats.renewalCosts > 0 && (
                <div className="mt-3 pt-3 border-t border-earth-800/40 flex justify-between items-center">
                  <span className="text-xs text-earth-500">Total renewal costs:</span>
                  <span className="text-sm font-semibold text-amber-400">${stats.renewalCosts}</span>
                </div>
              )}
            </div>

            {/* Inspection Status */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" /> Inspection Status
              </h3>
              <div className="space-y-2">
                {inspections
                  .sort((a, b) => {
                    const p = { overdue: 0, due_soon: 1, current: 2 };
                    return (p[a.status] || 2) - (p[b.status] || 2);
                  })
                  .map(insp => {
                    const days = differenceInDays(insp.nextDue, now);
                    const st = statusStyles[insp.status];
                    return (
                      <div key={insp.id} className={clsx('flex items-center gap-3 rounded-xl p-3 border', st.bg)}>
                        <Truck className={clsx('w-4 h-4', st.text)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-earth-200 truncate">{insp.asset}</div>
                          <div className="text-[10px] text-earth-500">
                            Last: {format(insp.lastInspection, 'MMM d')} · Next: {format(insp.nextDue, 'MMM d')}
                          </div>
                        </div>
                        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full border', st.bg, st.text)}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : days <= 7 ? `${days}d` : st.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Crew Compliance Matrix */}
          <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Crew Compliance Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-earth-500">
                    <th className="text-left py-2 pr-4">Employee</th>
                    <th className="text-left py-2 px-2">Crew</th>
                    <th className="text-center py-2 px-2">Pesticide</th>
                    <th className="text-center py-2 px-2">Driving</th>
                    <th className="text-center py-2 px-2">Safety</th>
                    <th className="text-center py-2 px-2">Medical</th>
                    <th className="text-center py-2 px-2">Equipment</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(certifications.map(c => c.employeeName))).map(name => {
                    const empCerts = certifications.filter(c => c.employeeName === name);
                    const crew = empCerts[0]?.crew || '';
                    const getStatus = (cat: string) => {
                      const cert = empCerts.find(c => c.category === cat);
                      if (!cert) return 'none';
                      if (renewedCerts.has(cert.id)) return 'valid';
                      return cert.status;
                    };
                    const statusIcon = (s: string) => {
                      if (s === 'none') return <span className="text-earth-700">—</span>;
                      if (s === 'valid') return <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />;
                      if (s === 'expiring_soon') return <Clock className="w-4 h-4 text-amber-400 mx-auto" />;
                      if (s === 'expired') return <XCircle className="w-4 h-4 text-red-400 mx-auto" />;
                      return <RefreshCw className="w-4 h-4 text-sky-400 mx-auto" />;
                    };
                    return (
                      <tr key={name} className="border-t border-earth-800/40">
                        <td className="py-2 pr-4 font-medium text-earth-200">{name}</td>
                        <td className="py-2 px-2 text-earth-500">{crew}</td>
                        <td className="py-2 px-2 text-center">{statusIcon(getStatus('pesticide'))}</td>
                        <td className="py-2 px-2 text-center">{statusIcon(getStatus('driver'))}</td>
                        <td className="py-2 px-2 text-center">{statusIcon(getStatus('safety'))}</td>
                        <td className="py-2 px-2 text-center">{statusIcon(getStatus('medical'))}</td>
                        <td className="py-2 px-2 text-center">{statusIcon(getStatus('equipment'))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Certifications Tab ────────────────────────────────────────── */}
      {activeTab === 'certs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-600" />
              <input
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, cert type, license #..."
                className="w-full bg-earth-900/60 border border-earth-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-0.5 overflow-x-auto">
              {[
                { key: 'all', label: 'All' },
                { key: 'expired', label: 'Expired' },
                { key: 'expiring', label: 'Expiring' },
                { key: 'pesticide', label: 'Pesticide' },
                { key: 'safety', label: 'Safety' },
                { key: 'driver', label: 'Driving' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setCertFilter(f.key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    certFilter === f.key ? 'bg-green-600/20 text-green-400' : 'text-earth-500 hover:text-earth-300'
                  )}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Cert List */}
          <div className="space-y-2">
            {filteredCerts.map(cert => {
              const isExpanded = expandedCert === cert.id;
              const isRenewed = renewedCerts.has(cert.id);
              const days = differenceInDays(cert.expiryDate, now);
              const st = isRenewed ? statusStyles.valid : statusStyles[cert.status];
              const CIcon = cert.icon;

              return (
                <div key={cert.id} className={clsx('bg-earth-900/60 border rounded-xl overflow-hidden transition-all', isRenewed ? 'border-green-500/20' : 'border-earth-800/60')}>
                  <button
                    onClick={() => setExpandedCert(isExpanded ? null : cert.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-earth-900/80 transition-colors cursor-pointer"
                  >
                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', st.bg.split(' ')[0])}>
                      <CIcon className={clsx('w-4 h-4', st.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-earth-200">{cert.employeeName}</span>
                        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full border', st.bg, st.text)}>
                          {isRenewed ? 'Renewed' : st.label}
                        </span>
                      </div>
                      <div className="text-xs text-earth-500">{cert.type} · {cert.crew}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={clsx('text-xs font-semibold', isRenewed ? 'text-green-400' : days < 0 ? 'text-red-400' : days < 30 ? 'text-amber-400' : 'text-earth-300')}>
                        {isRenewed ? 'Renewed' : days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`}
                      </div>
                      <div className="text-[10px] text-earth-500">{format(cert.expiryDate, 'MMM d, yyyy')}</div>
                    </div>
                    <ChevronDown className={clsx('w-4 h-4 text-earth-500 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-earth-800/60 p-4 space-y-3">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-earth-500">License #</span>
                          <div className="font-mono text-earth-200 font-medium">{cert.licenseNumber}</div>
                        </div>
                        <div>
                          <span className="text-earth-500">Issuer</span>
                          <div className="text-earth-200">{cert.issuer}</div>
                        </div>
                        <div>
                          <span className="text-earth-500">Issue Date</span>
                          <div className="text-earth-200">{format(cert.issueDate, 'MMM d, yyyy')}</div>
                        </div>
                        <div>
                          <span className="text-earth-500">Renewal Cost</span>
                          <div className="text-earth-200">${cert.renewalCost}</div>
                        </div>
                      </div>
                      {cert.notes && (
                        <div className={clsx(
                          'rounded-lg px-3 py-2 text-xs',
                          cert.status === 'expired' ? 'bg-red-500/8 text-red-300' : cert.status === 'expiring_soon' ? 'bg-amber-500/8 text-amber-300' : 'bg-earth-800/30 text-earth-400'
                        )}>{cert.notes}</div>
                      )}
                      {!isRenewed && (cert.status === 'expired' || cert.status === 'expiring_soon') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => renewCert(cert.id, cert.employeeName)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600/15 border border-green-500/25 rounded-lg text-xs font-medium text-green-400 hover:bg-green-600/25 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Initiate Renewal
                          </button>
                          <button
                            onClick={() => addToast('info', `Reminder sent to ${cert.employeeName}`)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/15 border border-sky-500/25 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-500/25 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" /> Send Reminder
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Inspections Tab ───────────────────────────────────────────── */}
      {activeTab === 'inspections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-earth-200">Equipment & Vehicle Inspections</h3>
            <button
              onClick={() => addToast('success', 'Inspection report exported')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 border border-sky-500/25 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-500/25 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Report
            </button>
          </div>

          <div className="space-y-3">
            {inspections.map(insp => {
              const isExpanded = expandedInspection === insp.id;
              const st = statusStyles[insp.status];
              const days = differenceInDays(insp.nextDue, now);
              const passRate = insp.items.filter(i => i.passed).length;
              const totalItems = insp.items.length;

              return (
                <div key={insp.id} className={clsx('bg-earth-900/60 border rounded-2xl overflow-hidden', insp.status === 'overdue' ? 'border-red-500/25' : 'border-earth-800/60')}>
                  <button
                    onClick={() => setExpandedInspection(isExpanded ? null : insp.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-earth-900/80 transition-colors cursor-pointer"
                  >
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', st.bg.split(' ')[0])}>
                      <Truck className={clsx('w-5 h-5', st.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-earth-200 truncate">{insp.asset}</div>
                      <div className="text-xs text-earth-500">
                        Inspector: {insp.inspector} · {passRate}/{totalItems} items passed
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full border', st.bg, st.text)}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : days <= 7 ? `Due in ${days}d` : st.label}
                      </span>
                      <div className="text-[10px] text-earth-500 mt-1">Next: {format(insp.nextDue, 'MMM d')}</div>
                    </div>
                    <ChevronDown className={clsx('w-4 h-4 text-earth-500 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-earth-800/60 p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {insp.items.map((item, i) => (
                          <div key={i} className={clsx(
                            'flex items-center gap-2 rounded-lg p-2 text-xs border',
                            item.passed ? 'bg-green-500/8 border-green-500/15' : 'bg-red-500/8 border-red-500/15'
                          )}>
                            {item.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                            <span className={item.passed ? 'text-earth-300' : 'text-red-300'}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                      {insp.notes && (
                        <div className={clsx(
                          'rounded-lg px-3 py-2 text-xs',
                          insp.status === 'overdue' ? 'bg-red-500/8 text-red-300' : 'bg-amber-500/8 text-amber-300'
                        )}>{insp.notes}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToast('success', `Inspection scheduled for ${insp.asset}`)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600/15 border border-green-500/25 rounded-lg text-xs font-medium text-green-400 hover:bg-green-600/25 transition-colors cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Schedule Inspection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Incidents Tab ─────────────────────────────────────────────── */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-earth-200">Safety Incident Log</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-lg">
                <Shield className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-medium">{stats.daysSinceLastIncident} days since last incident</span>
              </div>
            </div>
          </div>

          {/* Incident Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Incidents', value: safetyIncidents.length, color: 'text-earth-200' },
              { label: 'Open/Investigating', value: stats.openIncidents, color: stats.openIncidents > 0 ? 'text-amber-400' : 'text-green-400' },
              { label: 'Near Misses', value: safetyIncidents.filter(i => i.type === 'near_miss').length, color: 'text-amber-400' },
              { label: 'Injuries (YTD)', value: safetyIncidents.filter(i => i.type === 'injury').length, color: 'text-earth-200' },
            ].map(s => (
              <div key={s.label} className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-3">
                <div className="text-xs text-earth-500">{s.label}</div>
                <div className={clsx('text-xl font-bold', s.color)}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Incident List */}
          <div className="space-y-3">
            {safetyIncidents.map(incident => {
              const typeLabel = incidentTypeLabels[incident.type];
              const sevColor = severityColors[incident.severity];
              const statusLabel = incident.status.replace('_', ' ');

              return (
                <div key={incident.id} className={clsx(
                  'bg-earth-900/60 border rounded-2xl p-5',
                  incident.status === 'investigating' ? 'border-amber-500/25' : 'border-earth-800/60'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx('text-[10px] font-medium uppercase px-2 py-0.5 rounded-full', sevColor)}>{incident.severity}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-earth-800/40 text-earth-400">{typeLabel}</span>
                    <span className={clsx(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                      incident.status === 'resolved' || incident.status === 'closed' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'
                    )}>{statusLabel}</span>
                    <span className="text-[10px] text-earth-500 ml-auto">{format(incident.date, 'MMM d, yyyy')}</span>
                  </div>

                  <p className="text-xs text-earth-300 mb-2">{incident.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-earth-500 mb-2">
                    <span>Employee: <span className="text-earth-300">{incident.employee}</span></span>
                    <span>Crew: <span className="text-earth-300">{incident.crew}</span></span>
                  </div>

                  <div className="bg-earth-800/30 rounded-lg p-3 border border-earth-800/40">
                    <div className="text-[10px] font-medium text-earth-500 mb-1">Resolution / Corrective Action</div>
                    <p className="text-xs text-earth-300">{incident.resolution}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
