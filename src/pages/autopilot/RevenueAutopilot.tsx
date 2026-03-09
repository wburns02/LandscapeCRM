import { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import {
  Zap, DollarSign, TrendingUp, Users, Calendar, ChevronRight, ChevronDown,
  ChevronUp, Send, Phone, Clock, Star, Target, Sparkles, ArrowRight,
  Leaf, Droplets, Sun, Snowflake, TreePine, Flower2, Shovel, Lightbulb,
  Award, BarChart3, PieChart, Filter, Search, RefreshCw, CheckCircle2,
  XCircle, Eye, ThumbsUp, ThumbsDown, Flame, Gem, Crown, Rocket,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, subMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

// ─── Types ───
type Season = 'spring' | 'summer' | 'fall' | 'winter';
type OpportunityStatus = 'new' | 'contacted' | 'proposal_sent' | 'won' | 'lost' | 'deferred';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface Opportunity {
  id: string;
  customerId: string;
  customerName: string;
  customerType: string;
  address: string;
  phone: string;
  email: string;
  propertySize: number;
  service: string;
  serviceCategory: string;
  icon: LucideIcon;
  estimatedValue: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  reason: string;
  reasonDetail: string;
  seasonalTiming: Season;
  urgency: 'now' | 'this_week' | 'this_month' | 'next_month';
  status: OpportunityStatus;
  lastService?: string;
  lastServiceDate?: string;
  comparableSpend?: number;
  tags: string[];
  createdAt: Date;
}

interface SeasonalService {
  name: string;
  icon: LucideIcon;
  season: Season;
  avgValue: number;
  winRate: number;
  bestMonth: string;
  description: string;
}

interface CustomerInsight {
  customerId: string;
  name: string;
  type: string;
  lifetimeValue: number;
  annualSpend: number;
  potentialSpend: number;
  growthPercent: number;
  servicesUsed: number;
  totalServices: number;
  topOpportunity: string;
  topOpportunityValue: number;
}

// ─── Seasonal Service Definitions ───
const SEASONAL_SERVICES: SeasonalService[] = [
  { name: 'Spring Cleanup', icon: Flower2, season: 'spring', avgValue: 350, winRate: 78, bestMonth: 'March', description: 'Debris removal, bed prep, first mow' },
  { name: 'Mulch & Bed Refresh', icon: Shovel, season: 'spring', avgValue: 550, winRate: 72, bestMonth: 'March', description: 'Fresh mulch, edge trimming, weed barrier' },
  { name: 'Fertilization Program', icon: Leaf, season: 'spring', avgValue: 435, winRate: 65, bestMonth: 'April', description: '4-app program: spring, early summer, fall, winterizer' },
  { name: 'Irrigation Startup', icon: Droplets, season: 'spring', avgValue: 275, winRate: 82, bestMonth: 'March', description: 'System activation, head check, zone test' },
  { name: 'Tree Trimming', icon: TreePine, season: 'spring', avgValue: 750, winRate: 58, bestMonth: 'February', description: 'Crown lifting, dead wood removal, shaping' },
  { name: 'Lawn Aeration', icon: Leaf, season: 'spring', avgValue: 225, winRate: 70, bestMonth: 'April', description: 'Core aeration + overseeding' },
  { name: 'Landscape Design', icon: Sparkles, season: 'spring', avgValue: 3500, winRate: 42, bestMonth: 'March', description: 'Full property redesign consultation' },
  { name: 'Patio/Hardscape', icon: Shovel, season: 'summer', avgValue: 4200, winRate: 38, bestMonth: 'May', description: 'Pavers, retaining walls, fire pits' },
  { name: 'Irrigation Repair', icon: Droplets, season: 'summer', avgValue: 350, winRate: 75, bestMonth: 'June', description: 'Zone repair, head replacement, leak fix' },
  { name: 'Mosquito Treatment', icon: Sun, season: 'summer', avgValue: 299, winRate: 68, bestMonth: 'May', description: 'Monthly barrier spray program' },
  { name: 'Fall Cleanup', icon: Leaf, season: 'fall', avgValue: 400, winRate: 74, bestMonth: 'November', description: 'Leaf removal, bed cutback, gutter cleaning' },
  { name: 'Winterization', icon: Snowflake, season: 'fall', avgValue: 225, winRate: 80, bestMonth: 'October', description: 'Irrigation blowout, equipment prep' },
  { name: 'Holiday Lighting', icon: Sparkles, season: 'fall', avgValue: 1200, winRate: 55, bestMonth: 'October', description: 'Design, install, removal in January' },
  { name: 'Snow Removal Contract', icon: Snowflake, season: 'winter', avgValue: 1800, winRate: 60, bestMonth: 'October', description: 'Seasonal contract for driveway/walks' },
];

// ─── Demo Opportunity Generator ───
function generateOpportunities(): Opportunity[] {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0=Jan
  const currentSeason: Season = currentMonth < 3 ? 'winter' : currentMonth < 6 ? 'spring' : currentMonth < 9 ? 'summer' : 'fall';

  return [
    {
      id: 'opp-1',
      customerId: '1',
      customerName: 'Sarah Mitchell',
      customerType: 'residential',
      address: '1425 Oak Hollow Dr, Austin TX',
      phone: '(512) 555-0101',
      email: 'sarah@example.com',
      propertySize: 12000,
      service: 'Spring Mulch & Bed Refresh',
      serviceCategory: 'Mulch & Bed Refresh',
      icon: Shovel,
      estimatedValue: 650,
      confidence: 'high',
      confidenceScore: 92,
      reason: 'Annual service — booked every March for 3 years',
      reasonDetail: 'Sarah has had mulch refresh done in March 2023, 2024, and 2025. She always chooses dark brown hardwood, 3" depth. Her property has 14 bed areas totaling ~2,200 sq ft.',
      seasonalTiming: 'spring',
      urgency: 'now',
      status: 'new',
      lastService: 'Mulch Refresh',
      lastServiceDate: 'Mar 2025',
      comparableSpend: 580,
      tags: ['repeat client', 'premium', 'always approves'],
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'opp-2',
      customerId: '2',
      customerName: 'Robert Chen',
      customerType: 'residential',
      address: '892 Willow Creek Blvd, Austin TX',
      phone: '(512) 555-0202',
      email: 'robert.chen@example.com',
      propertySize: 18500,
      service: 'Fertilization Program (4-Application)',
      serviceCategory: 'Fertilization Program',
      icon: Leaf,
      estimatedValue: 585,
      confidence: 'high',
      confidenceScore: 88,
      reason: 'Large property, no fert program — losing lawn quality',
      reasonDetail: 'Robert\'s property is 18,500 sq ft but has never signed up for a fertilization program. His lawn care crew noted brown patches and thinning grass last visit. Comparable properties this size spend $500-650/year on fertilization.',
      seasonalTiming: 'spring',
      urgency: 'now',
      status: 'new',
      lastService: 'Mowing (weekly)',
      lastServiceDate: 'Ongoing',
      comparableSpend: 1250,
      tags: ['large property', 'growth potential', 'lawn issue noted'],
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    },
    {
      id: 'opp-3',
      customerId: '3',
      customerName: 'Hillcrest HOA',
      customerType: 'hoa',
      address: '100 Hillcrest Commons, Austin TX',
      phone: '(512) 555-0303',
      email: 'management@hillcresthoa.com',
      propertySize: 125000,
      service: 'Irrigation System Audit & Upgrade',
      serviceCategory: 'Irrigation Repair',
      icon: Droplets,
      estimatedValue: 4800,
      confidence: 'high',
      confidenceScore: 85,
      reason: 'Water bill up 40% — irrigation system is 8 years old',
      reasonDetail: 'Hillcrest HOA mentioned during last board meeting that water costs are rising sharply. Their irrigation system was installed in 2018. Smart controller upgrade + zone optimization typically saves 25-35% on water bills for properties this age.',
      seasonalTiming: 'spring',
      urgency: 'this_week',
      status: 'new',
      lastService: 'Common Area Mowing',
      lastServiceDate: 'Ongoing',
      comparableSpend: 8500,
      tags: ['hoa', 'high value', 'cost savings angle'],
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
    {
      id: 'opp-4',
      customerId: '4',
      customerName: 'David & Maria Lopez',
      customerType: 'residential',
      address: '4567 Heritage Oak Ct, Austin TX',
      phone: '(512) 555-0404',
      email: 'lopez.family@example.com',
      propertySize: 15000,
      service: 'Outdoor Lighting Package',
      serviceCategory: 'Landscape Design',
      icon: Lightbulb,
      estimatedValue: 3200,
      confidence: 'medium',
      confidenceScore: 68,
      reason: 'Recently completed hardscape — perfect time for lighting',
      reasonDetail: 'The Lopez family just had a $4,200 patio paver installation completed. Properties that add hardscape have a 65% conversion rate on landscape lighting within 60 days. Their oak trees would look stunning with uplighting.',
      seasonalTiming: 'spring',
      urgency: 'this_week',
      status: 'new',
      lastService: 'Patio Pavers Installation',
      lastServiceDate: 'Feb 2026',
      comparableSpend: 2800,
      tags: ['recent project', 'cross-sell', 'high lifetime value'],
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
    {
      id: 'opp-5',
      customerId: '5',
      customerName: 'Jennifer Wallace',
      customerType: 'residential',
      address: '3210 Sunset Ridge Ln, Austin TX',
      phone: '(512) 555-0505',
      email: 'jwallace@example.com',
      propertySize: 22000,
      service: 'Complete Landscape Redesign',
      serviceCategory: 'Landscape Design',
      icon: Sparkles,
      estimatedValue: 15000,
      confidence: 'medium',
      confidenceScore: 62,
      reason: 'New homeowner (6 months) — property needs full refresh',
      reasonDetail: 'Jennifer purchased her home 6 months ago. The existing landscaping is outdated (installed ~2010). She\'s already spent $2,400 on maintenance, suggesting she values her property appearance. New homeowners convert on redesigns at 2.5x the normal rate in their first year.',
      seasonalTiming: 'spring',
      urgency: 'this_month',
      status: 'new',
      lastService: 'Irrigation Check',
      lastServiceDate: 'Feb 2026',
      comparableSpend: 4500,
      tags: ['new homeowner', 'whale opportunity', 'high property value'],
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      id: 'opp-6',
      customerId: '6',
      customerName: 'Thompson Family',
      customerType: 'residential',
      address: '1890 Creekside Dr, Austin TX',
      phone: '(512) 555-0606',
      email: 'thompson.j@example.com',
      propertySize: 9500,
      service: 'Mosquito Treatment Program',
      serviceCategory: 'Mosquito Treatment',
      icon: Sun,
      estimatedValue: 299,
      confidence: 'medium',
      confidenceScore: 65,
      reason: 'Near creek — high mosquito risk, family with kids',
      reasonDetail: 'The Thompson property backs up to Barton Creek. Properties within 200ft of water have 3x mosquito complaints. Their profile notes "family with young children" — health-conscious families convert at 72% on mosquito programs vs 45% average.',
      seasonalTiming: 'spring',
      urgency: 'this_month',
      status: 'new',
      lastService: 'Spring Cleanup',
      lastServiceDate: 'Mar 2026',
      tags: ['family', 'health angle', 'creek proximity'],
      createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
    },
    {
      id: 'opp-7',
      customerId: '7',
      customerName: 'Oakwood Business Park',
      customerType: 'commercial',
      address: '500 Commerce Dr, Austin TX',
      phone: '(512) 555-0707',
      email: 'facilities@oakwoodbp.com',
      propertySize: 85000,
      service: 'Annual Maintenance Contract Upgrade',
      serviceCategory: 'Fertilization Program',
      icon: Crown,
      estimatedValue: 12500,
      confidence: 'medium',
      confidenceScore: 60,
      reason: 'Current contract expires in 45 days — upgrade to premium tier',
      reasonDetail: 'Oakwood BP\'s maintenance contract renews April 15. They\'re currently on the Basic tier ($8,200/yr). Upgrading to Premium adds irrigation management, seasonal color rotations, and snow removal for $12,500/yr. Their tenant satisfaction scores correlate with grounds quality.',
      seasonalTiming: 'spring',
      urgency: 'this_month',
      status: 'contacted',
      lastService: 'Weekly Grounds Maintenance',
      lastServiceDate: 'Ongoing',
      comparableSpend: 12500,
      tags: ['commercial', 'contract renewal', 'tier upgrade'],
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
    {
      id: 'opp-8',
      customerId: '8',
      customerName: 'Patricia Anderson',
      customerType: 'residential',
      address: '7720 Live Oak Ln, Austin TX',
      phone: '(512) 555-0808',
      email: 'patricia.a@example.com',
      propertySize: 14000,
      service: 'Holiday Lighting Design & Install',
      serviceCategory: 'Holiday Lighting',
      icon: Sparkles,
      estimatedValue: 1800,
      confidence: 'low',
      confidenceScore: 45,
      reason: 'Premium customer — neighbors have lighting, she doesn\'t',
      reasonDetail: 'Patricia is a top-10 customer by lifetime value ($18,400). Three of her neighbors on Live Oak Ln are lighting customers. Social proof drives 60% of holiday lighting signups. Best pitched in September for November install.',
      seasonalTiming: 'fall',
      urgency: 'next_month',
      status: 'new',
      lastService: 'Landscape Design',
      lastServiceDate: 'Jan 2026',
      comparableSpend: 6200,
      tags: ['premium client', 'neighbor effect', 'seasonal - fall pitch'],
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
    },
    {
      id: 'opp-9',
      customerId: '2',
      customerName: 'Robert Chen',
      customerType: 'residential',
      address: '892 Willow Creek Blvd, Austin TX',
      phone: '(512) 555-0202',
      email: 'robert.chen@example.com',
      propertySize: 18500,
      service: 'Lawn Aeration & Overseeding',
      serviceCategory: 'Lawn Aeration',
      icon: Leaf,
      estimatedValue: 375,
      confidence: 'high',
      confidenceScore: 80,
      reason: 'Compacted soil from heavy foot traffic — crew noted thin turf',
      reasonDetail: 'Robert\'s backyard gets heavy use (noted pool + playset area). Crew reported compacted soil and thin grass in Nov 2025. Spring aeration with overseeding would address this. Pairs perfectly with the fertilization program for maximum lawn recovery.',
      seasonalTiming: 'spring',
      urgency: 'now',
      status: 'new',
      lastService: 'Mowing (weekly)',
      lastServiceDate: 'Ongoing',
      tags: ['pairs with fert', 'crew recommendation', 'lawn health'],
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    {
      id: 'opp-10',
      customerId: '1',
      customerName: 'Sarah Mitchell',
      customerType: 'residential',
      address: '1425 Oak Hollow Dr, Austin TX',
      phone: '(512) 555-0101',
      email: 'sarah@example.com',
      propertySize: 12000,
      service: 'Irrigation Startup & System Check',
      serviceCategory: 'Irrigation Startup',
      icon: Droplets,
      estimatedValue: 275,
      confidence: 'high',
      confidenceScore: 90,
      reason: 'Annual irrigation startup — scheduled every March',
      reasonDetail: 'Sarah has had irrigation startup service done in March for the past 3 years. Her system has 8 zones. Last year we replaced 2 heads in zone 3. This is a nearly guaranteed close — she usually approves within hours of the quote.',
      seasonalTiming: 'spring',
      urgency: 'now',
      status: 'proposal_sent',
      lastService: 'Irrigation Startup',
      lastServiceDate: 'Mar 2025',
      tags: ['repeat service', 'quick close', 'annual'],
      createdAt: new Date(now.getTime() - 96 * 60 * 60 * 1000),
    },
    {
      id: 'opp-11',
      customerId: '5',
      customerName: 'Jennifer Wallace',
      customerType: 'residential',
      address: '3210 Sunset Ridge Ln, Austin TX',
      phone: '(512) 555-0505',
      email: 'jwallace@example.com',
      propertySize: 22000,
      service: 'Tree Trimming — 5 Live Oaks',
      serviceCategory: 'Tree Trimming',
      icon: TreePine,
      estimatedValue: 1250,
      confidence: 'medium',
      confidenceScore: 58,
      reason: 'Mature oaks untrimmed 3+ years — safety & aesthetics',
      reasonDetail: 'Jennifer\'s property has 5 mature live oaks. Our arborist noted during the irrigation check that branches are encroaching on the roof line and low-hanging over the driveway. Safety concerns plus aesthetics make this an easy pitch.',
      seasonalTiming: 'spring',
      urgency: 'this_month',
      status: 'new',
      lastService: 'Irrigation Check',
      lastServiceDate: 'Feb 2026',
      tags: ['safety concern', 'arborist referral', 'curb appeal'],
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
    },
    {
      id: 'opp-12',
      customerId: '3',
      customerName: 'Hillcrest HOA',
      customerType: 'hoa',
      address: '100 Hillcrest Commons, Austin TX',
      phone: '(512) 555-0303',
      email: 'management@hillcresthoa.com',
      propertySize: 125000,
      service: 'Seasonal Color Installation (Spring)',
      serviceCategory: 'Fertilization Program',
      icon: Flower2,
      estimatedValue: 3200,
      confidence: 'high',
      confidenceScore: 78,
      reason: 'Board requested color upgrades for community entrance',
      reasonDetail: 'Hillcrest HOA board member mentioned at the January meeting that residents want more color at the entrance and clubhouse. Spring annuals (petunias, marigolds, begonias) in 12 bed areas. This is practically pre-sold.',
      seasonalTiming: 'spring',
      urgency: 'now',
      status: 'new',
      lastService: 'Common Area Mowing',
      lastServiceDate: 'Ongoing',
      comparableSpend: 8500,
      tags: ['board approved', 'recurring potential', 'high volume'],
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
  ];
}

// ─── Customer Insights Generator ───
function generateCustomerInsights(): CustomerInsight[] {
  return [
    { customerId: '1', name: 'Sarah Mitchell', type: 'residential', lifetimeValue: 8400, annualSpend: 2800, potentialSpend: 4200, growthPercent: 50, servicesUsed: 4, totalServices: 8, topOpportunity: 'Fertilization Program', topOpportunityValue: 435 },
    { customerId: '2', name: 'Robert Chen', type: 'residential', lifetimeValue: 3200, annualSpend: 1600, potentialSpend: 4500, growthPercent: 181, servicesUsed: 1, totalServices: 8, topOpportunity: 'Fertilization + Aeration Bundle', topOpportunityValue: 960 },
    { customerId: '3', name: 'Hillcrest HOA', type: 'hoa', lifetimeValue: 42000, annualSpend: 14000, potentialSpend: 28000, growthPercent: 100, servicesUsed: 3, totalServices: 10, topOpportunity: 'Irrigation Upgrade', topOpportunityValue: 4800 },
    { customerId: '4', name: 'David & Maria Lopez', type: 'residential', lifetimeValue: 12800, annualSpend: 4800, potentialSpend: 8000, growthPercent: 67, servicesUsed: 5, totalServices: 8, topOpportunity: 'Outdoor Lighting', topOpportunityValue: 3200 },
    { customerId: '5', name: 'Jennifer Wallace', type: 'residential', lifetimeValue: 4500, annualSpend: 2400, potentialSpend: 18000, growthPercent: 650, servicesUsed: 2, totalServices: 8, topOpportunity: 'Landscape Redesign', topOpportunityValue: 15000 },
    { customerId: '6', name: 'Thompson Family', type: 'residential', lifetimeValue: 2100, annualSpend: 1200, potentialSpend: 2800, growthPercent: 133, servicesUsed: 2, totalServices: 8, topOpportunity: 'Mosquito Treatment', topOpportunityValue: 299 },
    { customerId: '7', name: 'Oakwood Business Park', type: 'commercial', lifetimeValue: 24600, annualSpend: 8200, potentialSpend: 15000, growthPercent: 83, servicesUsed: 2, totalServices: 6, topOpportunity: 'Premium Contract Upgrade', topOpportunityValue: 4300 },
    { customerId: '8', name: 'Patricia Anderson', type: 'residential', lifetimeValue: 18400, annualSpend: 6200, potentialSpend: 8500, growthPercent: 37, servicesUsed: 6, totalServices: 8, topOpportunity: 'Holiday Lighting', topOpportunityValue: 1800 },
  ];
}

// ─── Helper Components ───
function ConfidenceBadge({ level, score }: { level: ConfidenceLevel; score: number }) {
  const config = {
    high: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
    medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    low: { bg: 'bg-earth-700/40', text: 'text-earth-400', border: 'border-earth-700' },
  }[level];
  return (
    <div className={clsx('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border', config.bg, config.text, config.border)}>
      <div className={clsx('w-1.5 h-1.5 rounded-full', level === 'high' ? 'bg-green-400' : level === 'medium' ? 'bg-amber-400' : 'bg-earth-500')} />
      {score}%
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: Opportunity['urgency'] }) {
  const config = {
    now: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Act Now', icon: Flame },
    this_week: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'This Week', icon: Clock },
    this_month: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'This Month', icon: Calendar },
    next_month: { bg: 'bg-earth-700/40', text: 'text-earth-400', label: 'Next Month', icon: Calendar },
  }[urgency];
  const Icon = config.icon;
  return (
    <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', config.bg, config.text)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: OpportunityStatus }) {
  const config: Record<OpportunityStatus, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'New' },
    contacted: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Contacted' },
    proposal_sent: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Proposal Sent' },
    won: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Won' },
    lost: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Lost' },
    deferred: { bg: 'bg-earth-700/40', text: 'text-earth-400', label: 'Deferred' },
  };
  const c = config[status];
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', c.bg, c.text)}>{c.label}</span>
  );
}

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

function GrowthBar({ current, potential }: { current: number; potential: number }) {
  const total = Math.max(current, potential);
  const currentPct = (current / total) * 100;
  const gapPct = ((potential - current) / total) * 100;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-earth-800 rounded-full overflow-hidden flex">
        <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${currentPct}%` }} />
        <div className="h-full bg-green-500/30 rounded-r-full" style={{ width: `${gapPct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function RevenueAutopilot() {
  const { addToast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>(generateOpportunities);
  const [customerInsights] = useState<CustomerInsight[]>(generateCustomerInsights);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'insights' | 'seasonal'>('opportunities');
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'confidence' | 'urgency'>('confidence');

  // ─── Computed Stats ───
  const stats = useMemo(() => {
    const active = opportunities.filter(o => !['won', 'lost', 'deferred'].includes(o.status));
    const totalValue = active.reduce((s, o) => s + o.estimatedValue, 0);
    const highConf = active.filter(o => o.confidence === 'high');
    const highConfValue = highConf.reduce((s, o) => s + o.estimatedValue, 0);
    const actNow = active.filter(o => o.urgency === 'now');
    const actNowValue = actNow.reduce((s, o) => s + o.estimatedValue, 0);
    const wonThisMonth = opportunities.filter(o => o.status === 'won');
    const wonValue = wonThisMonth.reduce((s, o) => s + o.estimatedValue, 0);
    const avgConfidence = active.length > 0 ? Math.round(active.reduce((s, o) => s + o.confidenceScore, 0) / active.length) : 0;

    // Customer growth potential
    const totalGrowth = customerInsights.reduce((s, c) => s + (c.potentialSpend - c.annualSpend), 0);

    return {
      totalValue, highConfValue, actNowCount: actNow.length, actNowValue,
      activeCount: active.length, wonValue, avgConfidence, totalGrowth,
      highConfCount: highConf.length,
    };
  }, [opportunities, customerInsights]);

  // ─── Filtered & Sorted Opportunities ───
  const filteredOpps = useMemo(() => {
    let result = opportunities.filter(o => !['won', 'lost', 'deferred'].includes(o.status));

    if (filterUrgency !== 'all') {
      result = result.filter(o => o.urgency === filterUrgency);
    }
    if (filterConfidence !== 'all') {
      result = result.filter(o => o.confidence === filterConfidence);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.customerName.toLowerCase().includes(q) ||
        o.service.toLowerCase().includes(q) ||
        o.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'value') return b.estimatedValue - a.estimatedValue;
      if (sortBy === 'confidence') return b.confidenceScore - a.confidenceScore;
      const urgencyOrder = { now: 0, this_week: 1, this_month: 2, next_month: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });

    return result;
  }, [opportunities, filterUrgency, filterConfidence, searchQuery, sortBy]);

  // ─── Actions ───
  const sendProposal = (oppId: string) => {
    setOpportunities(prev => prev.map(o =>
      o.id === oppId ? { ...o, status: 'proposal_sent' as const } : o
    ));
    const opp = opportunities.find(o => o.id === oppId);
    addToast('success', `Proposal sent to ${opp?.customerName} for ${opp?.service}`);
  };

  const markContacted = (oppId: string) => {
    setOpportunities(prev => prev.map(o =>
      o.id === oppId ? { ...o, status: 'contacted' as const } : o
    ));
    addToast('success', 'Marked as contacted');
  };

  const markWon = (oppId: string) => {
    setOpportunities(prev => prev.map(o =>
      o.id === oppId ? { ...o, status: 'won' as const } : o
    ));
    const opp = opportunities.find(o => o.id === oppId);
    addToast('success', `Won! $${opp?.estimatedValue.toLocaleString()} — ${opp?.service}`);
  };

  const markLost = (oppId: string) => {
    setOpportunities(prev => prev.map(o =>
      o.id === oppId ? { ...o, status: 'lost' as const } : o
    ));
    addToast('info', 'Opportunity marked as lost');
  };

  const deferOpp = (oppId: string) => {
    setOpportunities(prev => prev.map(o =>
      o.id === oppId ? { ...o, status: 'deferred' as const } : o
    ));
    addToast('info', 'Deferred to next month');
  };

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* ═══ Hero Stats ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-xs text-earth-400 font-medium">Pipeline Value</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            <AnimatedCounter value={stats.totalValue} prefix="$" />
          </p>
          <p className="text-xs text-earth-500 mt-1">{stats.activeCount} active opportunities</p>
        </div>

        <div className="bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-earth-400 font-medium">Act Now</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            <AnimatedCounter value={stats.actNowValue} prefix="$" />
          </p>
          <p className="text-xs text-earth-500 mt-1">{stats.actNowCount} hot opportunities</p>
        </div>

        <div className="bg-gradient-to-br from-sky-600/20 to-sky-600/5 border border-sky-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-sky-400" />
            <span className="text-xs text-earth-400 font-medium">High Confidence</span>
          </div>
          <p className="text-2xl font-bold text-sky-400">
            <AnimatedCounter value={stats.highConfValue} prefix="$" />
          </p>
          <p className="text-xs text-earth-500 mt-1">{stats.highConfCount} likely wins ({stats.avgConfidence}% avg)</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-earth-400 font-medium">Growth Potential</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">
            <AnimatedCounter value={stats.totalGrowth} prefix="$" />
          </p>
          <p className="text-xs text-earth-500 mt-1">Across {customerInsights.length} customers</p>
        </div>
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {[
          { key: 'opportunities' as const, label: 'Opportunities', icon: Zap, count: stats.activeCount },
          { key: 'insights' as const, label: 'Customer Growth', icon: Users, count: customerInsights.length },
          { key: 'seasonal' as const, label: 'Seasonal Playbook', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
              activeTab === tab.key
                ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                : 'text-earth-400 hover:text-earth-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-green-500/20 text-green-400' : 'bg-earth-800 text-earth-500'
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Opportunities ═══ */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers, services, tags..."
                className="w-full bg-earth-900/60 border border-earth-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="bg-earth-900/60 border border-earth-800 rounded-xl px-3 py-2.5 text-sm text-earth-300 focus:outline-none focus:border-green-500/50 cursor-pointer"
            >
              <option value="all">All Urgency</option>
              <option value="now">Act Now</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="next_month">Next Month</option>
            </select>
            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
              className="bg-earth-900/60 border border-earth-800 rounded-xl px-3 py-2.5 text-sm text-earth-300 focus:outline-none focus:border-green-500/50 cursor-pointer"
            >
              <option value="all">All Confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-earth-900/60 border border-earth-800 rounded-xl px-3 py-2.5 text-sm text-earth-300 focus:outline-none focus:border-green-500/50 cursor-pointer"
            >
              <option value="confidence">Sort: Confidence</option>
              <option value="value">Sort: Value</option>
              <option value="urgency">Sort: Urgency</option>
            </select>
          </div>

          {/* Opportunity Cards */}
          <div className="space-y-3">
            {filteredOpps.map(opp => {
              const isExpanded = expandedOpp === opp.id;
              const Icon = opp.icon;

              return (
                <div
                  key={opp.id}
                  className={clsx(
                    'border rounded-2xl overflow-hidden transition-all duration-200',
                    opp.urgency === 'now'
                      ? 'bg-earth-900/80 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-earth-900/60 border-earth-800 hover:border-earth-700'
                  )}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedOpp(isExpanded ? null : opp.id)}
                    className="w-full flex items-start gap-3 p-4 cursor-pointer text-left"
                  >
                    {/* Service Icon */}
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      opp.confidence === 'high' ? 'bg-green-500/15 text-green-400' :
                      opp.confidence === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-earth-800 text-earth-400'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-earth-100 truncate">{opp.service}</h3>
                        <UrgencyBadge urgency={opp.urgency} />
                        <StatusBadge status={opp.status} />
                      </div>
                      <p className="text-xs text-earth-400 mt-0.5">{opp.customerName} • {opp.customerType}</p>
                      <p className="text-xs text-earth-500 mt-1 line-clamp-1">{opp.reason}</p>
                    </div>

                    {/* Value + Confidence */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-400">${opp.estimatedValue.toLocaleString()}</p>
                      <ConfidenceBadge level={opp.confidence} score={opp.confidenceScore} />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-earth-800/60 px-4 pb-4 space-y-4">
                      {/* AI Analysis */}
                      <div className="mt-3 bg-earth-800/30 rounded-xl px-4 py-3">
                        <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          Why This Opportunity
                        </p>
                        <p className="text-sm text-earth-200 leading-relaxed">{opp.reasonDetail}</p>
                      </div>

                      {/* Context Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {opp.lastService && (
                          <div className="bg-earth-800/40 rounded-xl px-3 py-2">
                            <p className="text-[10px] text-earth-500 uppercase">Last Service</p>
                            <p className="text-sm text-earth-200 font-medium">{opp.lastService}</p>
                            {opp.lastServiceDate && <p className="text-xs text-earth-500">{opp.lastServiceDate}</p>}
                          </div>
                        )}
                        <div className="bg-earth-800/40 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-earth-500 uppercase">Property</p>
                          <p className="text-sm text-earth-200 font-medium">{(opp.propertySize / 1000).toFixed(1)}k sq ft</p>
                          <p className="text-xs text-earth-500">{opp.customerType}</p>
                        </div>
                        {opp.comparableSpend && (
                          <div className="bg-earth-800/40 rounded-xl px-3 py-2">
                            <p className="text-[10px] text-earth-500 uppercase">Annual Spend</p>
                            <p className="text-sm text-earth-200 font-medium">${opp.comparableSpend.toLocaleString()}/yr</p>
                            <p className="text-xs text-earth-500">current customer</p>
                          </div>
                        )}
                        <div className="bg-earth-800/40 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-earth-500 uppercase">Confidence</p>
                          <p className="text-sm text-earth-200 font-medium">{opp.confidenceScore}%</p>
                          <p className="text-xs text-earth-500">{opp.confidence} likelihood</p>
                        </div>
                      </div>

                      {/* Tags */}
                      {opp.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {opp.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-earth-800/60 border border-earth-700/60 rounded-full text-[10px] text-earth-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {opp.status === 'new' && (
                          <>
                            <button
                              onClick={() => sendProposal(opp.id)}
                              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              Send Proposal
                            </button>
                            <button
                              onClick={() => markContacted(opp.id)}
                              className="flex items-center gap-2 bg-earth-800/60 hover:bg-earth-800 border border-earth-700 text-earth-300 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                            >
                              <Phone className="w-4 h-4" />
                              Call First
                            </button>
                            <button
                              onClick={() => deferOpp(opp.id)}
                              className="flex items-center gap-2 text-earth-500 hover:text-earth-300 rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer"
                            >
                              <Clock className="w-4 h-4" />
                              Defer
                            </button>
                          </>
                        )}
                        {opp.status === 'contacted' && (
                          <>
                            <button
                              onClick={() => sendProposal(opp.id)}
                              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              Send Proposal
                            </button>
                            <button
                              onClick={() => markLost(opp.id)}
                              className="flex items-center gap-2 text-earth-500 hover:text-red-400 rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              Not Interested
                            </button>
                          </>
                        )}
                        {opp.status === 'proposal_sent' && (
                          <>
                            <button
                              onClick={() => markWon(opp.id)}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Won
                            </button>
                            <button
                              onClick={() => markLost(opp.id)}
                              className="flex items-center gap-2 bg-earth-800/60 hover:bg-red-500/20 border border-earth-700 text-earth-400 hover:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              Lost
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredOpps.length === 0 && (
              <div className="text-center py-12 bg-earth-900/60 border border-earth-800 rounded-2xl">
                <Zap className="w-10 h-10 text-earth-600 mx-auto mb-3" />
                <p className="text-earth-400 font-medium">No matching opportunities</p>
                <p className="text-sm text-earth-500 mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB: Customer Growth ═══ */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {/* Growth Summary */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-earth-200 mb-1">Customer Revenue Growth Map</h2>
            <p className="text-xs text-earth-500 mb-4">
              Current annual spend vs. potential spend based on property size, type, and comparable customers
            </p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-earth-200">
                  ${customerInsights.reduce((s, c) => s + c.annualSpend, 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-earth-500 uppercase">Current Annual</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">
                  ${customerInsights.reduce((s, c) => s + c.potentialSpend, 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-earth-500 uppercase">Potential Annual</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-purple-400">
                  ${stats.totalGrowth.toLocaleString()}
                </p>
                <p className="text-[10px] text-earth-500 uppercase">Growth Gap</p>
              </div>
            </div>
          </div>

          {/* Customer Cards */}
          <div className="space-y-2">
            {[...customerInsights]
              .sort((a, b) => (b.potentialSpend - b.annualSpend) - (a.potentialSpend - a.annualSpend))
              .map(customer => {
                const gap = customer.potentialSpend - customer.annualSpend;
                return (
                  <div key={customer.customerId} className="bg-earth-900/60 border border-earth-800 rounded-xl p-4 hover:border-earth-700 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        customer.type === 'hoa' ? 'bg-sky-500/20 text-sky-400' :
                        customer.type === 'commercial' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-earth-700 text-earth-300'
                      )}>
                        {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-earth-100">{customer.name}</h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-earth-800 text-earth-400">{customer.type}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-earth-500">
                          <span>LTV: <span className="text-earth-300 font-medium">${customer.lifetimeValue.toLocaleString()}</span></span>
                          <span>Services: <span className="text-earth-300 font-medium">{customer.servicesUsed}/{customer.totalServices}</span></span>
                        </div>

                        {/* Growth Bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-earth-500">
                              ${customer.annualSpend.toLocaleString()}/yr
                            </span>
                            <span className="text-green-400 font-medium">
                              +${gap.toLocaleString()} potential
                            </span>
                          </div>
                          <GrowthBar current={customer.annualSpend} potential={customer.potentialSpend} />
                        </div>
                      </div>

                      {/* Growth Badge */}
                      <div className="text-right shrink-0">
                        <div className={clsx(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold',
                          customer.growthPercent > 100 ? 'bg-green-500/15 text-green-400' :
                          customer.growthPercent > 50 ? 'bg-amber-500/15 text-amber-400' :
                          'bg-earth-800 text-earth-300'
                        )}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{customer.growthPercent}%
                        </div>
                        <p className="text-[10px] text-earth-500 mt-1">Top: {customer.topOpportunity}</p>
                        <p className="text-xs text-green-400 font-medium">${customer.topOpportunityValue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ═══ TAB: Seasonal Playbook ═══ */}
      {activeTab === 'seasonal' && (
        <div className="space-y-4">
          {/* Season Selector */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-earth-200 mb-1">Seasonal Revenue Playbook</h2>
            <p className="text-xs text-earth-500 mb-4">
              Proven upsell opportunities ranked by win rate and seasonal timing
            </p>

            {/* Season pills */}
            <div className="flex gap-2">
              {([
                { key: 'spring', label: 'Spring', icon: Flower2, color: 'text-green-400 bg-green-500/15 border-green-500/30' },
                { key: 'summer', label: 'Summer', icon: Sun, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
                { key: 'fall', label: 'Fall', icon: Leaf, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
                { key: 'winter', label: 'Winter', icon: Snowflake, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
              ] as const).map(season => {
                const services = SEASONAL_SERVICES.filter(s => s.season === season.key);
                const totalPotential = services.reduce((s, svc) => s + svc.avgValue, 0);
                return (
                  <div key={season.key} className={clsx('flex-1 border rounded-xl p-3 text-center', season.color)}>
                    <season.icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-sm font-semibold">{season.label}</p>
                    <p className="text-xs opacity-70">{services.length} services</p>
                    <p className="text-xs font-medium mt-1">${totalPotential.toLocaleString()} avg</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service Cards by Season */}
          {(['spring', 'summer', 'fall', 'winter'] as Season[]).map(season => {
            const services = SEASONAL_SERVICES.filter(s => s.season === season);
            if (services.length === 0) return null;

            const seasonConfig = {
              spring: { label: 'Spring', icon: Flower2, textColor: 'text-green-400' },
              summer: { label: 'Summer', icon: Sun, textColor: 'text-amber-400' },
              fall: { label: 'Fall', icon: Leaf, textColor: 'text-orange-400' },
              winter: { label: 'Winter', icon: Snowflake, textColor: 'text-sky-400' },
            }[season];

            const SeasonIcon = seasonConfig.icon;

            return (
              <div key={season}>
                <h3 className={clsx('text-sm font-semibold mb-2 flex items-center gap-2', seasonConfig.textColor)}>
                  <SeasonIcon className="w-4 h-4" />
                  {seasonConfig.label} Services
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.sort((a, b) => b.winRate - a.winRate).map(svc => {
                    const Icon = svc.icon;
                    return (
                      <div key={svc.name} className="bg-earth-900/60 border border-earth-800 rounded-xl p-4 hover:border-earth-700 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-earth-800 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-earth-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-earth-200">{svc.name}</h4>
                            <p className="text-xs text-earth-500 mt-0.5">{svc.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span className="text-earth-400">
                                Avg: <span className="text-green-400 font-medium">${svc.avgValue.toLocaleString()}</span>
                              </span>
                              <span className="text-earth-400">
                                Win: <span className={clsx('font-medium', svc.winRate >= 70 ? 'text-green-400' : svc.winRate >= 50 ? 'text-amber-400' : 'text-earth-300')}>{svc.winRate}%</span>
                              </span>
                              <span className="text-earth-400">
                                Best: <span className="text-earth-300">{svc.bestMonth}</span>
                              </span>
                            </div>
                            {/* Win Rate Bar */}
                            <div className="mt-2 h-1.5 bg-earth-800 rounded-full overflow-hidden">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all duration-500',
                                  svc.winRate >= 70 ? 'bg-green-500' : svc.winRate >= 50 ? 'bg-amber-500' : 'bg-earth-600'
                                )}
                                style={{ width: `${svc.winRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Pro Tips */}
          <div className="bg-gradient-to-br from-green-600/10 to-earth-900/60 border border-green-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Revenue Autopilot Pro Tips
            </h3>
            <div className="space-y-3">
              {[
                { tip: 'Bundle spring cleanup + mulch + fertilization for 15% higher close rates', stat: '+15% win rate' },
                { tip: 'Pitch irrigation upgrades using water bill savings — "pays for itself in 18 months"', stat: '82% close rate' },
                { tip: 'New homeowners are 2.5x more likely to approve a landscape redesign in year 1', stat: '2.5x conversion' },
                { tip: 'Send seasonal proposals 3-4 weeks before the season starts for best results', stat: 'Best practice' },
                { tip: 'Properties near water features convert 72% on mosquito programs vs 45% average', stat: '+27% conversion' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-earth-200">{item.tip}</p>
                  </div>
                  <span className="text-xs text-green-400 font-medium shrink-0">{item.stat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
