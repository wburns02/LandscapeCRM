import { useState, useMemo } from 'react';
import {
  MapPin, Trees, Droplets, Calendar, Camera, AlertTriangle, TrendingUp,
  Clock, DollarSign, ChevronRight, ArrowLeft, Search, Filter, Leaf,
  Shield, Thermometer, Sun, CloudRain, Snowflake, Flower2, Bug,
  CheckCircle2, XCircle, FileText, Phone, Send, Eye, Star,
  Ruler, Home, Fence, Sprout, Scissors, Hammer, Zap,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { format, subDays, subMonths, addDays, differenceInDays, subHours } from 'date-fns';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface PropertyZone {
  name: string;
  type: 'lawn' | 'beds' | 'hardscape' | 'trees' | 'irrigation' | 'lighting';
  sqft: number;
  icon: LucideIcon;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ChemicalApplication {
  id: string;
  date: Date;
  product: string;
  activeIngredient: string;
  rate: string;
  area: string;
  applicator: string;
  license: string;
  reentryHours: number;
  notes: string;
  weatherConditions: string;
}

interface ServiceVisit {
  id: string;
  date: Date;
  type: string;
  crew: string;
  duration: string;
  cost: number;
  notes: string;
  photos: { before?: string; after?: string };
  chemicals?: ChemicalApplication[];
  rating?: number;
}

interface SeasonalTask {
  task: string;
  month: string;
  lastDone?: Date;
  status: 'completed' | 'upcoming' | 'overdue' | 'not_needed';
  icon: LucideIcon;
  estimatedCost: number;
}

interface Property {
  id: string;
  customerId: string;
  customerName: string;
  address: string;
  city: string;
  type: 'residential' | 'commercial' | 'hoa';
  lotSize: number;
  zones: PropertyZone[];
  healthScore: number;
  lastService: Date;
  nextService: Date;
  totalRevenue: number;
  yearlyRevenue: number;
  visits: ServiceVisit[];
  chemicals: ChemicalApplication[];
  seasonalPlan: SeasonalTask[];
  specialNotes: string;
  gateCode?: string;
  irrigationSystem: boolean;
  petOnSite: boolean;
  features: string[];
}

// ── Demo Data ──────────────────────────────────────────────────────────────
const now = new Date();

const demoProperties: Property[] = [
  {
    id: 'prop-1',
    customerId: '1',
    customerName: 'Sarah Mitchell',
    address: '4521 Oakwood Trail',
    city: 'Austin, TX 78745',
    type: 'residential',
    lotSize: 12500,
    healthScore: 92,
    lastService: subDays(now, 3),
    nextService: addDays(now, 4),
    totalRevenue: 18450,
    yearlyRevenue: 6200,
    specialNotes: 'Customer prefers service before 10am. Dog in backyard — always check gate.',
    gateCode: '4521#',
    irrigationSystem: true,
    petOnSite: true,
    features: ['Pool', 'Outdoor Kitchen', 'Raised Beds', 'Drip Irrigation'],
    zones: [
      { name: 'Front Lawn', type: 'lawn', sqft: 3200, icon: Sprout, condition: 'excellent' },
      { name: 'Backyard', type: 'lawn', sqft: 4800, icon: Sprout, condition: 'good' },
      { name: 'Flower Beds', type: 'beds', sqft: 1200, icon: Flower2, condition: 'excellent' },
      { name: 'Oak Trees (4)', type: 'trees', sqft: 0, icon: Trees, condition: 'good' },
      { name: 'Patio & Walkways', type: 'hardscape', sqft: 1800, icon: Hammer, condition: 'excellent' },
      { name: 'Drip System', type: 'irrigation', sqft: 0, icon: Droplets, condition: 'good' },
    ],
    visits: [
      {
        id: 'v-1', date: subDays(now, 3), type: 'Weekly Mow & Edge',
        crew: 'Alpha Crew', duration: '1h 15m', cost: 85, rating: 5,
        notes: 'Lawn looking great. Adjusted mow height to 3" for spring growth.',
        photos: { before: '🌿', after: '✂️' },
      },
      {
        id: 'v-2', date: subDays(now, 10), type: 'Weekly Mow & Edge',
        crew: 'Alpha Crew', duration: '1h 10m', cost: 85,
        notes: 'Standard service. Noticed some brown spots near oak tree — possible grub activity.',
        photos: { before: '🌿', after: '✂️' },
      },
      {
        id: 'v-3', date: subDays(now, 14), type: 'Spring Fertilization',
        crew: 'Chemical Team', duration: '45m', cost: 175, rating: 5,
        notes: 'Applied spring pre-emergent and fertilizer. Soil test showed pH 6.2 — ideal range.',
        photos: { before: '🧪', after: '✅' },
        chemicals: [{
          id: 'chem-1', date: subDays(now, 14), product: 'Dimension 2EW Pre-Emergent',
          activeIngredient: 'Dithiopyr 24%', rate: '6 oz/1000 sqft', area: 'All turf areas (8,000 sqft)',
          applicator: 'Mike Torres', license: 'TDA-42891', reentryHours: 4,
          notes: 'Applied at 72°F, wind 5mph SW. Watered in within 24 hours.',
          weatherConditions: 'Sunny, 72°F, Wind 5mph',
        }],
      },
      {
        id: 'v-4', date: subMonths(now, 1), type: 'Irrigation Inspection',
        crew: 'Irrigation Team', duration: '1h 30m', cost: 150,
        notes: 'Replaced 3 broken heads in zone 2. Adjusted runtime for spring schedule. System pressure at 55 PSI — good.',
        photos: { before: '💧', after: '✅' },
      },
      {
        id: 'v-5', date: subMonths(now, 2), type: 'Tree Trimming',
        crew: 'Tree Crew', duration: '3h', cost: 450, rating: 4,
        notes: 'Raised canopy on all 4 oaks to 12ft clearance. Removed two dead branches on NE oak.',
        photos: { before: '🌳', after: '✂️' },
      },
      {
        id: 'v-6', date: subMonths(now, 3), type: 'Winter Cleanup',
        crew: 'Alpha Crew', duration: '2h 30m', cost: 225,
        notes: 'Full leaf cleanup, bed edging, pre-emergent application. Customer very happy.',
        photos: { before: '🍂', after: '✨' },
      },
    ],
    chemicals: [
      {
        id: 'chem-1', date: subDays(now, 14), product: 'Dimension 2EW Pre-Emergent',
        activeIngredient: 'Dithiopyr 24%', rate: '6 oz/1000 sqft', area: 'All turf areas (8,000 sqft)',
        applicator: 'Mike Torres', license: 'TDA-42891', reentryHours: 4,
        notes: 'Spring pre-emergent treatment', weatherConditions: 'Sunny, 72°F, Wind 5mph',
      },
      {
        id: 'chem-2', date: subMonths(now, 3), product: 'Prodiamine 65 WDG',
        activeIngredient: 'Prodiamine 65%', rate: '0.5 oz/1000 sqft', area: 'All beds (1,200 sqft)',
        applicator: 'Mike Torres', license: 'TDA-42891', reentryHours: 0,
        notes: 'Winter pre-emergent in beds', weatherConditions: 'Overcast, 55°F, Calm',
      },
      {
        id: 'chem-3', date: subMonths(now, 4), product: '24-5-11 Slow Release Fertilizer',
        activeIngredient: 'Nitrogen 24%', rate: '4 lbs/1000 sqft', area: 'All turf areas (8,000 sqft)',
        applicator: 'Carlos Mendez', license: 'TDA-51023', reentryHours: 0,
        notes: 'Fall fertilization — winterizer application', weatherConditions: 'Partly cloudy, 65°F',
      },
    ],
    seasonalPlan: [
      { task: 'Spring Pre-Emergent', month: 'Mar', lastDone: subDays(now, 14), status: 'completed', icon: Shield, estimatedCost: 175 },
      { task: 'Spring Fertilization', month: 'Mar', lastDone: subDays(now, 14), status: 'completed', icon: Sprout, estimatedCost: 125 },
      { task: 'Irrigation Startup', month: 'Mar', lastDone: subMonths(now, 1), status: 'completed', icon: Droplets, estimatedCost: 150 },
      { task: 'Mulch Refresh', month: 'Apr', status: 'upcoming', icon: Leaf, estimatedCost: 350 },
      { task: 'Grub Treatment', month: 'May', status: 'upcoming', icon: Bug, estimatedCost: 125 },
      { task: 'Summer Fertilization', month: 'Jun', status: 'upcoming', icon: Sun, estimatedCost: 125 },
      { task: 'Fall Aeration', month: 'Sep', status: 'upcoming', icon: Zap, estimatedCost: 200 },
      { task: 'Fall Overseeding', month: 'Oct', status: 'upcoming', icon: Sprout, estimatedCost: 250 },
      { task: 'Winterizer', month: 'Nov', status: 'upcoming', icon: Snowflake, estimatedCost: 125 },
      { task: 'Winter Cleanup', month: 'Dec', status: 'upcoming', icon: Scissors, estimatedCost: 225 },
    ],
  },
  {
    id: 'prop-2',
    customerId: '2',
    customerName: 'Robert Chen',
    address: '8900 Commerce Blvd, Suites A-F',
    city: 'Austin, TX 78758',
    type: 'commercial',
    lotSize: 45000,
    healthScore: 78,
    lastService: subDays(now, 7),
    nextService: addDays(now, 0),
    totalRevenue: 42800,
    yearlyRevenue: 14400,
    specialNotes: 'Service after 6pm or weekends only. Loading dock area needs special attention.',
    irrigationSystem: true,
    petOnSite: false,
    features: ['Loading Dock', 'Retention Pond', 'Parking Islands', 'Signage Beds'],
    zones: [
      { name: 'Front Entrance', type: 'beds', sqft: 2400, icon: Flower2, condition: 'good' },
      { name: 'Parking Islands (12)', type: 'beds', sqft: 3600, icon: Trees, condition: 'fair' },
      { name: 'Turf Areas', type: 'lawn', sqft: 18000, icon: Sprout, condition: 'good' },
      { name: 'Retention Pond', type: 'lawn', sqft: 8000, icon: Droplets, condition: 'fair' },
      { name: 'Commercial Irrigation', type: 'irrigation', sqft: 0, icon: Droplets, condition: 'good' },
    ],
    visits: [
      {
        id: 'v-10', date: subDays(now, 7), type: 'Weekly Maintenance',
        crew: 'Bravo Crew', duration: '3h', cost: 275,
        notes: 'Full property service. Retention pond area needs erosion repair — quoted separately.',
        photos: { before: '🏢', after: '✅' },
      },
      {
        id: 'v-11', date: subDays(now, 14), type: 'Weekly Maintenance',
        crew: 'Bravo Crew', duration: '2h 45m', cost: 275,
        notes: 'Standard service. Replaced dead annual in front bed.',
        photos: { before: '🏢', after: '✅' },
      },
    ],
    chemicals: [
      {
        id: 'chem-10', date: subDays(now, 21), product: 'Barricade 4FL',
        activeIngredient: 'Prodiamine 40.7%', rate: '1.5 fl oz/1000 sqft', area: 'All turf (18,000 sqft)',
        applicator: 'Mike Torres', license: 'TDA-42891', reentryHours: 0,
        notes: 'Commercial pre-emergent application', weatherConditions: 'Clear, 68°F',
      },
    ],
    seasonalPlan: [
      { task: 'Spring Pre-Emergent', month: 'Mar', lastDone: subDays(now, 21), status: 'completed', icon: Shield, estimatedCost: 425 },
      { task: 'Annual Color Install', month: 'Apr', status: 'upcoming', icon: Flower2, estimatedCost: 1800 },
      { task: 'Retention Pond Service', month: 'Apr', status: 'overdue', icon: Droplets, estimatedCost: 650 },
      { task: 'Tree Trimming', month: 'May', status: 'upcoming', icon: Trees, estimatedCost: 1200 },
      { task: 'Summer Fertilization', month: 'Jun', status: 'upcoming', icon: Sun, estimatedCost: 350 },
    ],
  },
  {
    id: 'prop-3',
    customerId: '3',
    customerName: 'Hillcrest HOA',
    address: '1200 Hillcrest Drive (Common Areas)',
    city: 'Austin, TX 78746',
    type: 'hoa',
    lotSize: 185000,
    healthScore: 65,
    lastService: subDays(now, 5),
    nextService: addDays(now, 2),
    totalRevenue: 89600,
    yearlyRevenue: 36000,
    specialNotes: 'Board approval required for any changes. Monthly report to HOA manager. No service during community events (check calendar).',
    irrigationSystem: true,
    petOnSite: false,
    features: ['Pool Area', 'Clubhouse', 'Walking Trails', 'Playground', 'Entry Monument', '2 Retention Ponds'],
    zones: [
      { name: 'Entry Monument', type: 'beds', sqft: 4500, icon: Flower2, condition: 'good' },
      { name: 'Common Turf', type: 'lawn', sqft: 85000, icon: Sprout, condition: 'fair' },
      { name: 'Walking Trails', type: 'hardscape', sqft: 12000, icon: Hammer, condition: 'good' },
      { name: 'Pool Landscape', type: 'beds', sqft: 3000, icon: Flower2, condition: 'excellent' },
      { name: 'Playground Area', type: 'lawn', sqft: 8000, icon: Sprout, condition: 'fair' },
      { name: 'Retention Ponds (2)', type: 'irrigation', sqft: 0, icon: Droplets, condition: 'poor' },
      { name: 'Tree Canopy (45+)', type: 'trees', sqft: 0, icon: Trees, condition: 'good' },
    ],
    visits: [
      {
        id: 'v-20', date: subDays(now, 5), type: 'Weekly Grounds Maintenance',
        crew: 'Charlie Crew', duration: '6h', cost: 850,
        notes: 'Full grounds service. Playground area turf thinning — recommend overseeding.',
        photos: { before: '🏘️', after: '✅' },
      },
    ],
    chemicals: [
      {
        id: 'chem-20', date: subMonths(now, 1), product: 'Merit 75 WSP',
        activeIngredient: 'Imidacloprid 75%', rate: '0.3 oz/1000 sqft', area: 'Common turf (85,000 sqft)',
        applicator: 'Mike Torres', license: 'TDA-42891', reentryHours: 12,
        notes: 'Preventative grub treatment — spring application', weatherConditions: 'Clear, 70°F',
      },
    ],
    seasonalPlan: [
      { task: 'Spring Pre-Emergent', month: 'Mar', lastDone: subMonths(now, 1), status: 'completed', icon: Shield, estimatedCost: 2200 },
      { task: 'Annual Color (Entry)', month: 'Mar', status: 'overdue', icon: Flower2, estimatedCost: 3500 },
      { task: 'Trail Edging', month: 'Apr', status: 'upcoming', icon: Hammer, estimatedCost: 800 },
      { task: 'Pond Maintenance', month: 'Apr', status: 'overdue', icon: Droplets, estimatedCost: 1500 },
      { task: 'Tree Canopy Raise', month: 'May', status: 'upcoming', icon: Trees, estimatedCost: 4500 },
    ],
  },
  {
    id: 'prop-4',
    customerId: '4',
    customerName: 'David & Maria Lopez',
    address: '3107 Ridgecrest Lane',
    city: 'Austin, TX 78749',
    type: 'residential',
    lotSize: 8500,
    healthScore: 45,
    lastService: subDays(now, 28),
    nextService: subDays(now, 7),
    totalRevenue: 4200,
    yearlyRevenue: 2100,
    specialNotes: 'New construction home. Landscape installed 6 months ago — needs establishment care.',
    irrigationSystem: true,
    petOnSite: true,
    features: ['New Construction', 'Sod Lawn', 'Foundation Plantings'],
    zones: [
      { name: 'Front Sod', type: 'lawn', sqft: 2200, icon: Sprout, condition: 'fair' },
      { name: 'Back Sod', type: 'lawn', sqft: 3500, icon: Sprout, condition: 'poor' },
      { name: 'Foundation Beds', type: 'beds', sqft: 800, icon: Flower2, condition: 'fair' },
      { name: 'New Irrigation', type: 'irrigation', sqft: 0, icon: Droplets, condition: 'fair' },
    ],
    visits: [
      {
        id: 'v-30', date: subDays(now, 28), type: 'Monthly Maintenance',
        crew: 'Alpha Crew', duration: '1h', cost: 75,
        notes: 'Sod still establishing. Back lawn has bare spots — needs reseeding. Irrigation running too much in zone 3.',
        photos: { before: '🌱', after: '⚠️' },
      },
    ],
    chemicals: [],
    seasonalPlan: [
      { task: 'Sod Establishment Fertilizer', month: 'Mar', status: 'overdue', icon: Sprout, estimatedCost: 95 },
      { task: 'Weed Control', month: 'Apr', status: 'upcoming', icon: Bug, estimatedCost: 85 },
      { task: 'Irrigation Adjustment', month: 'Apr', status: 'overdue', icon: Droplets, estimatedCost: 75 },
    ],
  },
  {
    id: 'prop-5',
    customerId: '5',
    customerName: 'Jennifer Walsh',
    address: '6742 Sunset Ridge Dr',
    city: 'Austin, TX 78731',
    type: 'residential',
    lotSize: 22000,
    healthScore: 88,
    lastService: subDays(now, 2),
    nextService: addDays(now, 5),
    totalRevenue: 32100,
    yearlyRevenue: 9800,
    specialNotes: 'Premium property. Customer expects perfection. Hosts outdoor events frequently.',
    gateCode: '6742',
    irrigationSystem: true,
    petOnSite: false,
    features: ['Outdoor Event Space', 'Japanese Garden', 'Koi Pond', 'Putting Green', 'Landscape Lighting'],
    zones: [
      { name: 'Front Estate Lawn', type: 'lawn', sqft: 6000, icon: Sprout, condition: 'excellent' },
      { name: 'Japanese Garden', type: 'beds', sqft: 3500, icon: Trees, condition: 'excellent' },
      { name: 'Putting Green', type: 'lawn', sqft: 1500, icon: Sprout, condition: 'excellent' },
      { name: 'Event Patio', type: 'hardscape', sqft: 2800, icon: Hammer, condition: 'excellent' },
      { name: 'Koi Pond', type: 'irrigation', sqft: 400, icon: Droplets, condition: 'good' },
      { name: 'Landscape Lighting', type: 'lighting', sqft: 0, icon: Zap, condition: 'excellent' },
    ],
    visits: [
      {
        id: 'v-40', date: subDays(now, 2), type: 'Premium Weekly Service',
        crew: 'Alpha Crew', duration: '2h 30m', cost: 195, rating: 5,
        notes: 'Full property detail. Japanese garden raked and pruned. Koi pond filter cleaned.',
        photos: { before: '🏡', after: '✨' },
      },
      {
        id: 'v-41', date: subDays(now, 9), type: 'Premium Weekly Service',
        crew: 'Alpha Crew', duration: '2h 15m', cost: 195, rating: 5,
        notes: 'Preparing for client event this Saturday. Extra detail on event patio area.',
        photos: { before: '🏡', after: '✨' },
      },
    ],
    chemicals: [
      {
        id: 'chem-40', date: subDays(now, 20), product: 'Acelepryn G Granular',
        activeIngredient: 'Chlorantraniliprole 0.2%', rate: '87 lbs/acre', area: 'Front lawn + putting green (7,500 sqft)',
        applicator: 'Mike Torres', license: 'TDA-42891', reentryHours: 0,
        notes: 'Season-long grub prevention — low toxicity, koi-safe', weatherConditions: 'Clear, 75°F',
      },
    ],
    seasonalPlan: [
      { task: 'Spring Pre-Emergent', month: 'Mar', lastDone: subDays(now, 25), status: 'completed', icon: Shield, estimatedCost: 325 },
      { task: 'Koi Pond Spring Service', month: 'Mar', lastDone: subDays(now, 15), status: 'completed', icon: Droplets, estimatedCost: 200 },
      { task: 'Japanese Garden Pruning', month: 'Apr', status: 'upcoming', icon: Scissors, estimatedCost: 450 },
      { task: 'Lighting Check', month: 'Apr', status: 'upcoming', icon: Zap, estimatedCost: 150 },
      { task: 'Putting Green Renovation', month: 'May', status: 'upcoming', icon: Sprout, estimatedCost: 800 },
    ],
  },
  {
    id: 'prop-6',
    customerId: '6',
    customerName: 'Meadowbrook Office Park',
    address: '2400 Meadowbrook Pkwy',
    city: 'Austin, TX 78759',
    type: 'commercial',
    lotSize: 62000,
    healthScore: 71,
    lastService: subDays(now, 4),
    nextService: addDays(now, 3),
    totalRevenue: 56400,
    yearlyRevenue: 19200,
    specialNotes: 'High visibility property. Building manager: Tom Richards. Emergency contact: 512-555-0147.',
    irrigationSystem: true,
    petOnSite: false,
    features: ['Water Feature', 'Courtyard', 'Parking Garage Planters', 'Rooftop Containers'],
    zones: [
      { name: 'Main Entrance', type: 'beds', sqft: 5200, icon: Flower2, condition: 'good' },
      { name: 'Courtyard', type: 'beds', sqft: 3800, icon: Trees, condition: 'good' },
      { name: 'Parking Areas', type: 'lawn', sqft: 22000, icon: Sprout, condition: 'fair' },
      { name: 'Water Feature', type: 'irrigation', sqft: 200, icon: Droplets, condition: 'fair' },
      { name: 'Rooftop Containers (24)', type: 'beds', sqft: 480, icon: Flower2, condition: 'good' },
    ],
    visits: [
      {
        id: 'v-50', date: subDays(now, 4), type: 'Bi-Weekly Maintenance',
        crew: 'Bravo Crew', duration: '4h', cost: 425,
        notes: 'Water feature pump making noise — scheduled repair. Rooftop containers need soil amendment.',
        photos: { before: '🏢', after: '✅' },
      },
    ],
    chemicals: [],
    seasonalPlan: [
      { task: 'Spring Color Rotation', month: 'Mar', status: 'overdue', icon: Flower2, estimatedCost: 2800 },
      { task: 'Water Feature Service', month: 'Apr', status: 'upcoming', icon: Droplets, estimatedCost: 450 },
      { task: 'Rooftop Soil Amendment', month: 'Apr', status: 'upcoming', icon: Sprout, estimatedCost: 600 },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const healthColor = (score: number) => {
  if (score >= 80) return { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400', ring: '#4ade80' };
  if (score >= 60) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', ring: '#fbbf24' };
  return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', ring: '#f87171' };
};

const conditionBadge = (c: string) => {
  const map: Record<string, string> = {
    excellent: 'bg-green-500/15 text-green-400 border-green-500/25',
    good: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    fair: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    poor: 'bg-red-500/15 text-red-400 border-red-500/25',
  };
  return map[c] || map.good;
};

const typeBadge = (t: string) => {
  const map: Record<string, { bg: string; label: string }> = {
    residential: { bg: 'bg-green-500/15 text-green-400', label: 'Residential' },
    commercial: { bg: 'bg-sky-500/15 text-sky-400', label: 'Commercial' },
    hoa: { bg: 'bg-purple-500/15 text-purple-400', label: 'HOA' },
  };
  return map[t] || map.residential;
};

function HealthRing({ score, size = 48 }: { score: number; size?: number }) {
  const { ring } = healthColor(score);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-earth-800/60" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={ring} strokeWidth="3"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={ring}
        className="text-xs font-bold transform rotate-90" style={{ transformOrigin: `${size/2}px ${size/2}px` }}
      >{score}</text>
    </svg>
  );
}

const seasonIcons: Record<string, LucideIcon> = { Mar: Sprout, Apr: Flower2, May: Sun, Jun: Thermometer, Jul: Sun, Aug: Thermometer, Sep: Leaf, Oct: Leaf, Nov: Snowflake, Dec: Snowflake };

// ── Component ──────────────────────────────────────────────────────────────
export default function PropertyIntelligence() {
  const { addToast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline' | 'chemicals' | 'seasonal'>('overview');
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  const filteredProperties = useMemo(() => {
    let result = [...demoProperties];
    if (filterType !== 'all') result = result.filter(p => p.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.customerName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const aOverdue = a.seasonalPlan.filter(t => t.status === 'overdue').length;
      const bOverdue = b.seasonalPlan.filter(t => t.status === 'overdue').length;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return a.healthScore - b.healthScore;
    });
  }, [searchQuery, filterType]);

  const portfolioStats = useMemo(() => {
    const total = demoProperties.length;
    const overdue = demoProperties.filter(p => p.seasonalPlan.some(t => t.status === 'overdue')).length;
    const healthy = demoProperties.filter(p => p.healthScore >= 80).length;
    const totalRevenue = demoProperties.reduce((s, p) => s + p.yearlyRevenue, 0);
    const totalChemicals = demoProperties.reduce((s, p) => s + p.chemicals.length, 0);
    return { total, overdue, healthy, totalRevenue, totalChemicals };
  }, []);

  // ── Portfolio View ─────────────────────────────────────────────────────
  if (!selectedProperty) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-earth-100">Property Intelligence</h2>
          <p className="text-earth-400 text-sm mt-1">Service memory, compliance tracking, and predictive maintenance for every property</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Properties', value: portfolioStats.total, icon: Home, color: 'text-green-400' },
            { label: 'Need Attention', value: portfolioStats.overdue, icon: AlertTriangle, color: 'text-amber-400' },
            { label: 'Healthy', value: portfolioStats.healthy, icon: CheckCircle2, color: 'text-green-400' },
            { label: 'Annual Revenue', value: `$${(portfolioStats.totalRevenue/1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-400' },
            { label: 'Chemical Apps', value: portfolioStats.totalChemicals, icon: Shield, color: 'text-sky-400' },
          ].map(s => (
            <div key={s.label} className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={clsx('w-4 h-4', s.color)} />
                <span className="text-xs text-earth-500">{s.label}</span>
              </div>
              <div className="text-xl font-bold text-earth-100">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Alerts Banner */}
        {portfolioStats.overdue > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-amber-300">{portfolioStats.overdue} properties have overdue seasonal tasks</span>
              <span className="text-xs text-amber-400/70 ml-2">— potential revenue being left on the table</span>
            </div>
            <button
              onClick={() => { setFilterType('all'); setSearchQuery(''); }}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >View All</button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-600" />
            <input
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties, addresses, customers..."
              className="w-full bg-earth-900/60 border border-earth-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
            />
          </div>
          <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-0.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'residential', label: 'Residential' },
              { key: 'commercial', label: 'Commercial' },
              { key: 'hoa', label: 'HOA' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  filterType === f.key ? 'bg-green-600/20 text-green-400' : 'text-earth-500 hover:text-earth-300'
                )}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map(prop => {
            const hc = healthColor(prop.healthScore);
            const tb = typeBadge(prop.type);
            const overdueCount = prop.seasonalPlan.filter(t => t.status === 'overdue').length;
            const daysUntilNext = differenceInDays(prop.nextService, now);
            const overduePotential = prop.seasonalPlan
              .filter(t => t.status === 'overdue')
              .reduce((s, t) => s + t.estimatedCost, 0);

            return (
              <button
                key={prop.id}
                onClick={() => { setSelectedProperty(prop); setDetailTab('overview'); }}
                className={clsx(
                  'bg-earth-900/60 border rounded-2xl p-5 text-left transition-all duration-200 cursor-pointer group',
                  'hover:bg-earth-900/80 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5',
                  overdueCount > 0 ? 'border-amber-500/25' : 'border-earth-800/60'
                )}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <HealthRing score={prop.healthScore} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', tb.bg)}>{tb.label}</span>
                      {overdueCount > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-earth-100 truncate">{prop.customerName}</h3>
                    <p className="text-xs text-earth-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {prop.address}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-earth-600 group-hover:text-green-400 transition-colors shrink-0 mt-1" />
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-earth-500">Lot Size</div>
                    <div className="text-sm font-semibold text-earth-200">{(prop.lotSize/1000).toFixed(0)}K sqft</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-earth-500">Annual Rev</div>
                    <div className="text-sm font-semibold text-green-400">${(prop.yearlyRevenue/1000).toFixed(1)}K</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-earth-500">Next Service</div>
                    <div className={clsx('text-sm font-semibold', daysUntilNext < 0 ? 'text-red-400' : daysUntilNext === 0 ? 'text-amber-400' : 'text-earth-200')}>
                      {daysUntilNext < 0 ? `${Math.abs(daysUntilNext)}d late` : daysUntilNext === 0 ? 'Today' : `${daysUntilNext}d`}
                    </div>
                  </div>
                </div>

                {/* Zones Strip */}
                <div className="flex gap-1 flex-wrap mb-3">
                  {prop.zones.slice(0, 4).map(z => (
                    <span key={z.name} className={clsx('text-[10px] px-2 py-0.5 rounded-full border', conditionBadge(z.condition))}>
                      {z.name.length > 15 ? z.name.slice(0, 15) + '...' : z.name}
                    </span>
                  ))}
                  {prop.zones.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-earth-800/40 text-earth-500">+{prop.zones.length - 4}</span>
                  )}
                </div>

                {/* Revenue Opportunity */}
                {overduePotential > 0 && (
                  <div className="flex items-center gap-2 bg-amber-500/8 rounded-lg px-3 py-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-300">${overduePotential.toLocaleString()} in overdue services</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Property Detail View ───────────────────────────────────────────────
  const prop = selectedProperty;
  const hc = healthColor(prop.healthScore);
  const tb = typeBadge(prop.type);
  const overdueCount = prop.seasonalPlan.filter(t => t.status === 'overdue').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedProperty(null)}
          className="p-2 text-earth-400 hover:text-earth-200 hover:bg-earth-800/60 rounded-lg cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', tb.bg)}>{tb.label}</span>
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', hc.bg, hc.text)}>
              Health: {prop.healthScore}/100
            </span>
            {overdueCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                {overdueCount} overdue tasks
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-earth-100">{prop.customerName}</h2>
          <p className="text-sm text-earth-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {prop.address}, {prop.city}
          </p>
        </div>
        <HealthRing score={prop.healthScore} size={56} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Schedule Service', icon: Calendar, action: () => addToast('success', `Service scheduled for ${prop.customerName}`) },
          { label: 'Create Quote', icon: FileText, action: () => addToast('success', `Quote draft created for ${prop.address}`) },
          { label: 'Send Report', icon: Send, action: () => addToast('success', `Property report sent to ${prop.customerName}`) },
          { label: 'Call Customer', icon: Phone, action: () => addToast('info', `Calling ${prop.customerName}...`) },
        ].map(a => (
          <button
            key={a.label}
            onClick={a.action}
            className="flex items-center gap-1.5 px-3 py-2 bg-earth-900/60 border border-earth-800/60 rounded-xl text-xs font-medium text-earth-300 hover:text-green-400 hover:border-green-500/30 transition-all cursor-pointer"
          >
            <a.icon className="w-3.5 h-3.5" /> {a.label}
          </button>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-0.5 overflow-x-auto">
        {([
          { key: 'overview', label: 'Overview', icon: Eye },
          { key: 'timeline', label: 'Service Timeline', icon: Clock },
          { key: 'chemicals', label: 'Chemical Log', icon: Shield },
          { key: 'seasonal', label: 'Seasonal Plan', icon: Calendar },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setDetailTab(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
              detailTab === tab.key ? 'bg-green-600/20 text-green-400' : 'text-earth-500 hover:text-earth-300'
            )}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────── */}
      {detailTab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Property Profile */}
          <div className="lg:col-span-2 space-y-4">
            {/* Property Info */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3">Property Profile</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-xs text-earth-500">Lot Size</span>
                  <div className="text-sm font-semibold text-earth-200 flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-earth-400" />
                    {prop.lotSize.toLocaleString()} sqft
                  </div>
                </div>
                <div>
                  <span className="text-xs text-earth-500">Total Revenue</span>
                  <div className="text-sm font-semibold text-green-400">${prop.totalRevenue.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-xs text-earth-500">Annual Revenue</span>
                  <div className="text-sm font-semibold text-green-400">${prop.yearlyRevenue.toLocaleString()}/yr</div>
                </div>
                <div>
                  <span className="text-xs text-earth-500">Last Service</span>
                  <div className="text-sm font-semibold text-earth-200">{format(prop.lastService, 'MMM d')}</div>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {prop.features.map(f => (
                  <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-earth-800/60 text-earth-400 border border-earth-700/50">{f}</span>
                ))}
                {prop.irrigationSystem && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/25">
                    <Droplets className="w-2.5 h-2.5 inline mr-0.5" />Irrigation
                  </span>
                )}
                {prop.petOnSite && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">Pet on Site</span>
                )}
              </div>

              {/* Special Notes */}
              {prop.specialNotes && (
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                  <div className="text-xs font-medium text-amber-400 mb-1">Special Instructions</div>
                  <p className="text-xs text-earth-300">{prop.specialNotes}</p>
                  {prop.gateCode && (
                    <p className="text-xs text-earth-400 mt-1">Gate Code: <span className="font-mono text-amber-300">{prop.gateCode}</span></p>
                  )}
                </div>
              )}
            </div>

            {/* Zones */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3">Property Zones</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {prop.zones.map(zone => {
                  const ZIcon = zone.icon;
                  return (
                    <div key={zone.name} className="flex items-center gap-3 bg-earth-800/30 rounded-xl p-3 border border-earth-800/40">
                      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', conditionBadge(zone.condition).split(' ')[0])}>
                        <ZIcon className={clsx('w-4 h-4', conditionBadge(zone.condition).split(' ')[1])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-earth-200 truncate">{zone.name}</div>
                        {zone.sqft > 0 && <div className="text-[10px] text-earth-500">{zone.sqft.toLocaleString()} sqft</div>}
                      </div>
                      <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize', conditionBadge(zone.condition))}>
                        {zone.condition}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Upcoming Tasks */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3">Upcoming & Overdue</h3>
              <div className="space-y-2">
                {prop.seasonalPlan
                  .filter(t => t.status === 'overdue' || t.status === 'upcoming')
                  .slice(0, 5)
                  .map((task, i) => {
                    const TIcon = task.icon;
                    return (
                      <div key={i} className={clsx(
                        'flex items-center gap-3 rounded-xl p-3 border',
                        task.status === 'overdue' ? 'bg-red-500/8 border-red-500/20' : 'bg-earth-800/30 border-earth-800/40'
                      )}>
                        <TIcon className={clsx('w-4 h-4', task.status === 'overdue' ? 'text-red-400' : 'text-earth-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-earth-200 truncate">{task.task}</div>
                          <div className="text-[10px] text-earth-500">{task.month} · ${task.estimatedCost}</div>
                        </div>
                        <button
                          onClick={() => addToast('success', `Scheduled: ${task.task}`)}
                          className={clsx(
                            'text-[10px] font-medium px-2 py-1 rounded-lg cursor-pointer transition-colors',
                            task.status === 'overdue'
                              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                              : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                          )}
                        >
                          {task.status === 'overdue' ? 'Schedule Now' : 'Schedule'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Revenue Insights */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3">Revenue Insights</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-earth-500">Revenue per sqft</span>
                  <span className="text-sm font-semibold text-green-400">
                    ${(prop.yearlyRevenue / prop.lotSize).toFixed(2)}/sqft
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-earth-500">Avg visit cost</span>
                  <span className="text-sm font-semibold text-earth-200">
                    ${prop.visits.length > 0 ? Math.round(prop.visits.reduce((s, v) => s + v.cost, 0) / prop.visits.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-earth-500">Total visits</span>
                  <span className="text-sm font-semibold text-earth-200">{prop.visits.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-earth-500">Chemical apps</span>
                  <span className="text-sm font-semibold text-sky-400">{prop.chemicals.length}</span>
                </div>
                {prop.visits.some(v => v.rating) && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-earth-500">Avg rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-semibold text-amber-400">
                        {(prop.visits.filter(v => v.rating).reduce((s, v) => s + (v.rating || 0), 0) / prop.visits.filter(v => v.rating).length).toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" /> Compliance Status
              </h3>
              {prop.chemicals.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-earth-300">{prop.chemicals.length} applications logged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-earth-300">All applicators licensed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-earth-300">Re-entry times documented</span>
                  </div>
                  <div className="text-xs text-earth-500 mt-2">
                    Last application: {format(prop.chemicals[0].date, 'MMM d, yyyy')}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-earth-500">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs">No chemical applications recorded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline Tab ──────────────────────────────────────────────── */}
      {detailTab === 'timeline' && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-earth-200 mb-4">Service History</h3>
          {prop.visits.length === 0 ? (
            <div className="text-center py-12 text-earth-500">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No service visits recorded yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-2 bottom-2 w-px bg-earth-800/60" />

              {prop.visits.map((visit, i) => {
                const isExpanded = expandedVisit === visit.id;
                return (
                  <div key={visit.id} className="relative pl-12 pb-4">
                    {/* Timeline dot */}
                    <div className={clsx(
                      'absolute left-3.5 top-3 w-3 h-3 rounded-full border-2',
                      i === 0 ? 'bg-green-400 border-green-400' : 'bg-earth-900 border-earth-600'
                    )} />

                    <button
                      onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}
                      className="w-full text-left bg-earth-900/60 border border-earth-800/60 rounded-xl p-4 hover:border-green-500/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-earth-200">{visit.type}</span>
                          {visit.rating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: visit.rating }).map((_, si) => (
                                <Star key={si} className="w-3 h-3 text-amber-400 fill-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-earth-500">{format(visit.date, 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-earth-500 mb-2">
                        <span>{visit.crew}</span>
                        <span>·</span>
                        <span>{visit.duration}</span>
                        <span>·</span>
                        <span className="text-green-400 font-medium">${visit.cost}</span>
                        {visit.chemicals && visit.chemicals.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-sky-400 flex items-center gap-0.5">
                              <Shield className="w-3 h-3" /> Chemical Applied
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-earth-400">{visit.notes}</p>

                      {/* Before/After */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-earth-800/60">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-earth-800/40 rounded-lg p-4 text-center">
                              <div className="text-2xl mb-1">{visit.photos.before}</div>
                              <span className="text-[10px] text-earth-500">Before</span>
                            </div>
                            <div className="bg-earth-800/40 rounded-lg p-4 text-center">
                              <div className="text-2xl mb-1">{visit.photos.after}</div>
                              <span className="text-[10px] text-earth-500">After</span>
                            </div>
                          </div>
                          {visit.chemicals && visit.chemicals.map(chem => (
                            <div key={chem.id} className="bg-sky-500/8 border border-sky-500/20 rounded-lg p-3 mt-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-3.5 h-3.5 text-sky-400" />
                                <span className="text-xs font-medium text-sky-300">{chem.product}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-earth-400">
                                <div>Active: {chem.activeIngredient}</div>
                                <div>Rate: {chem.rate}</div>
                                <div>Applicator: {chem.applicator}</div>
                                <div>License: {chem.license}</div>
                                <div>Re-entry: {chem.reentryHours}h</div>
                                <div>Weather: {chem.weatherConditions}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Chemical Log Tab ──────────────────────────────────────────── */}
      {detailTab === 'chemicals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-earth-200">Chemical Application Log</h3>
            <button
              onClick={() => addToast('success', 'Compliance report generated')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 border border-sky-500/25 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-500/25 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> Export Report
            </button>
          </div>

          {prop.chemicals.length === 0 ? (
            <div className="text-center py-12 bg-earth-900/60 border border-earth-800/60 rounded-2xl">
              <Shield className="w-10 h-10 mx-auto mb-3 text-earth-600" />
              <p className="text-sm text-earth-500">No chemical applications recorded</p>
              <p className="text-xs text-earth-600 mt-1">Chemical applications will appear here for compliance tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compliance Summary */}
              <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-green-300">Fully Compliant</div>
                  <div className="text-xs text-earth-400">{prop.chemicals.length} applications logged · All applicators licensed · Re-entry times documented</div>
                </div>
              </div>

              {prop.chemicals.map(chem => (
                <div key={chem.id} className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-sky-400" />
                      <span className="text-sm font-semibold text-earth-200">{chem.product}</span>
                    </div>
                    <span className="text-xs text-earth-500">{format(chem.date, 'MMM d, yyyy')}</span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-earth-500">Active Ingredient</span>
                      <div className="text-earth-300 font-medium">{chem.activeIngredient}</div>
                    </div>
                    <div>
                      <span className="text-earth-500">Application Rate</span>
                      <div className="text-earth-300 font-medium">{chem.rate}</div>
                    </div>
                    <div>
                      <span className="text-earth-500">Treatment Area</span>
                      <div className="text-earth-300 font-medium">{chem.area}</div>
                    </div>
                    <div>
                      <span className="text-earth-500">Applicator</span>
                      <div className="text-earth-300 font-medium">{chem.applicator}</div>
                    </div>
                    <div>
                      <span className="text-earth-500">License #</span>
                      <div className="text-sky-400 font-mono font-medium">{chem.license}</div>
                    </div>
                    <div>
                      <span className="text-earth-500">Re-entry Period</span>
                      <div className="text-earth-300 font-medium">{chem.reentryHours === 0 ? 'None required' : `${chem.reentryHours} hours`}</div>
                    </div>
                    <div className="col-span-2 lg:col-span-3">
                      <span className="text-earth-500">Weather Conditions</span>
                      <div className="text-earth-300 font-medium flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-earth-400" /> {chem.weatherConditions}
                      </div>
                    </div>
                    {chem.notes && (
                      <div className="col-span-2 lg:col-span-3">
                        <span className="text-earth-500">Notes</span>
                        <div className="text-earth-300">{chem.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Seasonal Plan Tab ─────────────────────────────────────────── */}
      {detailTab === 'seasonal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-earth-200">Seasonal Service Plan</h3>
            <div className="flex items-center gap-2 text-xs text-earth-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> Completed</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> Overdue</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-earth-400" /> Upcoming</span>
            </div>
          </div>

          {/* Revenue Opportunity */}
          {(() => {
            const overduePotential = prop.seasonalPlan.filter(t => t.status === 'overdue').reduce((s, t) => s + t.estimatedCost, 0);
            const upcomingPotential = prop.seasonalPlan.filter(t => t.status === 'upcoming').reduce((s, t) => s + t.estimatedCost, 0);
            return (
              <div className="grid grid-cols-2 gap-3">
                {overduePotential > 0 && (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
                    <div className="text-xs text-amber-400 mb-1">Overdue Revenue</div>
                    <div className="text-xl font-bold text-amber-300">${overduePotential.toLocaleString()}</div>
                    <button
                      onClick={() => addToast('success', `All overdue tasks scheduled for ${prop.customerName}`)}
                      className="text-[10px] font-medium text-amber-400 hover:text-amber-300 mt-2 cursor-pointer"
                    >Schedule All Overdue →</button>
                  </div>
                )}
                <div className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
                  <div className="text-xs text-earth-500 mb-1">Upcoming Revenue</div>
                  <div className="text-xl font-bold text-green-400">${upcomingPotential.toLocaleString()}</div>
                  <div className="text-[10px] text-earth-500 mt-2">{prop.seasonalPlan.filter(t => t.status === 'upcoming').length} services planned</div>
                </div>
              </div>
            );
          })()}

          {/* Task List */}
          <div className="space-y-2">
            {prop.seasonalPlan.map((task, i) => {
              const TIcon = task.icon;
              const statusStyles = {
                completed: 'bg-green-500/8 border-green-500/20',
                overdue: 'bg-red-500/8 border-red-500/20',
                upcoming: 'bg-earth-800/30 border-earth-800/40',
                not_needed: 'bg-earth-800/20 border-earth-800/30 opacity-50',
              };
              const statusIcons = {
                completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
                overdue: <AlertTriangle className="w-4 h-4 text-red-400" />,
                upcoming: <Calendar className="w-4 h-4 text-earth-400" />,
                not_needed: <XCircle className="w-4 h-4 text-earth-600" />,
              };

              return (
                <div key={i} className={clsx('flex items-center gap-3 rounded-xl p-4 border', statusStyles[task.status])}>
                  {statusIcons[task.status]}
                  <TIcon className="w-4 h-4 text-earth-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-earth-200">{task.task}</div>
                    <div className="text-xs text-earth-500">
                      Target: {task.month}
                      {task.lastDone && ` · Last done: ${format(task.lastDone, 'MMM d, yyyy')}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-earth-200">${task.estimatedCost}</div>
                    {task.status !== 'completed' && task.status !== 'not_needed' && (
                      <button
                        onClick={() => addToast('success', `Scheduled: ${task.task} for ${prop.customerName}`)}
                        className="text-[10px] font-medium text-green-400 hover:text-green-300 cursor-pointer"
                      >Schedule</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Annual Summary */}
          <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-earth-200 mb-2">Annual Service Value</h4>
            <div className="text-2xl font-bold text-green-400">
              ${prop.seasonalPlan.reduce((s, t) => s + t.estimatedCost, 0).toLocaleString()}
            </div>
            <div className="text-xs text-earth-500 mt-1">
              {prop.seasonalPlan.filter(t => t.status === 'completed').length} of {prop.seasonalPlan.length} tasks completed this year
            </div>
            <div className="w-full bg-earth-800/40 rounded-full h-2 mt-3">
              <div
                className="bg-green-500 rounded-full h-2 transition-all duration-700"
                style={{ width: `${(prop.seasonalPlan.filter(t => t.status === 'completed').length / prop.seasonalPlan.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
