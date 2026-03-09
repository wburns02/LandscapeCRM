import { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import {
  Play, Square, CheckCircle2, Clock, MapPin, Phone, Camera, ChevronRight,
  Wrench, Droplets, Sun, Cloud, CloudRain, AlertTriangle, Navigation,
  User, Briefcase, Timer, DollarSign, Truck, MessageSquare, ChevronDown,
  ChevronUp, Package, StickyNote, Thermometer, Wind, Zap, Award,
  ArrowRight, PhoneCall, Hash, Shield, Star, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { format, isToday, isTomorrow, addHours, differenceInMinutes } from 'date-fns';

// ─── Types ───
interface CrewMember {
  id: string;
  name: string;
  role: 'foreman' | 'crew_member' | 'apprentice';
  avatar?: string;
  clockedIn: boolean;
  clockInTime?: Date;
}

interface FieldJob {
  id: string;
  title: string;
  customer: string;
  address: string;
  phone: string;
  type: string;
  scheduledTime: string;
  estimatedHours: number;
  price: number;
  status: 'upcoming' | 'en_route' | 'in_progress' | 'completed' | 'skipped';
  routeOrder: number;
  driveMinutes: number;
  specialInstructions?: string;
  gateCode?: string;
  materials: MaterialItem[];
  photos: { type: 'before' | 'after'; url: string; timestamp: Date }[];
  notes: string[];
  startedAt?: Date;
  completedAt?: Date;
  customerRating?: number;
}

interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  used: boolean;
}

interface DailyWeather {
  temp: number;
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain';
  windMph: number;
  humidity: number;
  advisory?: string;
}

// ─── Demo Data Generator ───
function generateTodaysJobs(): FieldJob[] {
  return [
    {
      id: 'fj-1',
      title: 'Weekly Lawn Maintenance',
      customer: 'Sarah Mitchell',
      address: '1425 Oak Hollow Dr, Austin TX',
      phone: '(512) 555-0101',
      type: 'mowing',
      scheduledTime: '08:00',
      estimatedHours: 1.5,
      price: 175,
      status: 'completed',
      routeOrder: 1,
      driveMinutes: 0,
      specialInstructions: 'Use back gate. Dog is friendly but will follow you around.',
      gateCode: '4521',
      materials: [
        { id: 'm1', name: 'Fuel (2-cycle mix)', quantity: 1, unit: 'gal', used: true },
        { id: 'm2', name: 'Trimmer line', quantity: 50, unit: 'ft', used: true },
        { id: 'm3', name: 'Lawn bags', quantity: 4, unit: 'bags', used: true },
      ],
      photos: [
        { type: 'before', url: '', timestamp: new Date(new Date().setHours(8, 2)) },
        { type: 'after', url: '', timestamp: new Date(new Date().setHours(9, 28)) },
      ],
      notes: ['Edged along driveway — customer requested last week', 'Noticed brown patch near sprinkler head #3 — may need adjustment'],
      startedAt: new Date(new Date().setHours(8, 0)),
      completedAt: new Date(new Date().setHours(9, 30)),
    },
    {
      id: 'fj-2',
      title: 'Spring Mulch & Bed Refresh',
      customer: 'Robert Chen',
      address: '892 Willow Creek Blvd, Austin TX',
      phone: '(512) 555-0202',
      type: 'mulching',
      scheduledTime: '10:00',
      estimatedHours: 3,
      price: 650,
      status: 'in_progress',
      routeOrder: 2,
      driveMinutes: 12,
      specialInstructions: 'Customer wants dark brown hardwood mulch, 3" depth. Avoid mulch against tree trunks.',
      materials: [
        { id: 'm4', name: 'Hardwood mulch (dark brown)', quantity: 8, unit: 'cu yd', used: true },
        { id: 'm5', name: 'Landscape fabric', quantity: 200, unit: 'sq ft', used: true },
        { id: 'm6', name: 'Garden staples', quantity: 50, unit: 'pcs', used: false },
        { id: 'm7', name: 'Pre-emergent herbicide', quantity: 2, unit: 'lbs', used: false },
        { id: 'm8', name: 'Edge trimming', quantity: 120, unit: 'lin ft', used: true },
      ],
      photos: [
        { type: 'before', url: '', timestamp: new Date(new Date().setHours(10, 5)) },
      ],
      notes: ['Front beds done — moving to backyard', 'Customer brought out water bottles — great client'],
      startedAt: new Date(new Date().setHours(10, 0)),
    },
    {
      id: 'fj-3',
      title: 'Irrigation System Check',
      customer: 'Jennifer Wallace',
      address: '3210 Sunset Ridge Ln, Austin TX',
      phone: '(512) 555-0303',
      type: 'irrigation',
      scheduledTime: '13:30',
      estimatedHours: 2,
      price: 350,
      status: 'upcoming',
      routeOrder: 3,
      driveMinutes: 18,
      specialInstructions: 'Check zones 1-8. Zone 3 reported low pressure last month. Main shutoff is in garage.',
      gateCode: '7890',
      materials: [
        { id: 'm9', name: 'Sprinkler heads (pop-up)', quantity: 4, unit: 'pcs', used: false },
        { id: 'm10', name: 'PVC pipe (3/4")', quantity: 10, unit: 'ft', used: false },
        { id: 'm11', name: 'Teflon tape', quantity: 1, unit: 'roll', used: false },
        { id: 'm12', name: 'PVC cement', quantity: 1, unit: 'can', used: false },
      ],
      photos: [],
      notes: [],
    },
    {
      id: 'fj-4',
      title: 'Tree Trimming — Live Oaks',
      customer: 'David & Maria Lopez',
      address: '4567 Heritage Oak Ct, Austin TX',
      phone: '(512) 555-0404',
      type: 'tree_service',
      scheduledTime: '16:00',
      estimatedHours: 2.5,
      price: 850,
      status: 'upcoming',
      routeOrder: 4,
      driveMinutes: 22,
      specialInstructions: 'Three live oaks in front yard need crown lifting to 12ft clearance. Stack brush at curb for city pickup Thursday.',
      materials: [
        { id: 'm13', name: 'Chain (fresh)', quantity: 1, unit: 'chain', used: false },
        { id: 'm14', name: 'Bar oil', quantity: 1, unit: 'qt', used: false },
        { id: 'm15', name: 'Wound sealant', quantity: 1, unit: 'can', used: false },
      ],
      photos: [],
      notes: [],
    },
    {
      id: 'fj-5',
      title: 'Patio Pavers Installation',
      customer: 'Thompson Family',
      address: '1890 Creekside Dr, Austin TX',
      phone: '(512) 555-0505',
      type: 'hardscape',
      scheduledTime: '—',
      estimatedHours: 0,
      price: 4200,
      status: 'skipped',
      routeOrder: 5,
      driveMinutes: 25,
      specialInstructions: 'Postponed — concrete base needs 48hr cure time from yesterday\'s pour.',
      materials: [],
      photos: [],
      notes: ['Rescheduled to Wednesday per office'],
    },
  ];
}

function generateCrewMembers(): CrewMember[] {
  return [
    { id: 'cm-1', name: 'Carlos Ramirez', role: 'foreman', clockedIn: true, clockInTime: new Date(new Date().setHours(7, 45)) },
    { id: 'cm-2', name: 'Jake Wilson', role: 'crew_member', clockedIn: true, clockInTime: new Date(new Date().setHours(7, 50)) },
    { id: 'cm-3', name: 'Tyrone Brooks', role: 'crew_member', clockedIn: true, clockInTime: new Date(new Date().setHours(7, 48)) },
  ];
}

function getTodaysWeather(): DailyWeather {
  return {
    temp: 78,
    condition: 'partly_cloudy',
    windMph: 8,
    humidity: 45,
    advisory: undefined,
  };
}

// ─── Helper Components ───
const weatherIcons: Record<string, LucideIcon> = {
  sunny: Sun,
  partly_cloudy: Cloud,
  cloudy: Cloud,
  rain: CloudRain,
};

function WeatherBadge({ weather }: { weather: DailyWeather }) {
  const Icon = weatherIcons[weather.condition] || Sun;
  return (
    <div className="flex items-center gap-2 bg-earth-800/60 rounded-lg px-3 py-1.5">
      <Icon className="w-4 h-4 text-amber-400" />
      <span className="text-sm font-medium text-earth-200">{weather.temp}°F</span>
      <Wind className="w-3 h-3 text-earth-400 ml-1" />
      <span className="text-xs text-earth-400">{weather.windMph}mph</span>
    </div>
  );
}

function StatusPill({ status }: { status: FieldJob['status'] }) {
  const config = {
    upcoming: { bg: 'bg-earth-700/60', text: 'text-earth-300', label: 'Upcoming' },
    en_route: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'En Route' },
    in_progress: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'In Progress' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
    skipped: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Skipped' },
  }[status];
  return (
    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  );
}

function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-earth-800" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={4}
        className={clsx(percent >= 75 ? 'text-green-500' : percent >= 50 ? 'text-amber-500' : 'text-earth-500')}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="fill-earth-100 text-sm font-bold" transform={`rotate(90 ${size/2} ${size/2})`}>
        {percent}%
      </text>
    </svg>
  );
}

function LiveTimer({ startTime }: { startTime: Date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = differenceInMinutes(now, startTime);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const s = Math.floor((now.getTime() - startTime.getTime()) / 1000) % 60;

  return (
    <span className="font-mono text-lg font-bold text-green-400 tabular-nums">
      {h}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ─── Job Type Icons ───
const jobTypeIcons: Record<string, LucideIcon> = {
  mowing: Wrench,
  mulching: Package,
  irrigation: Droplets,
  tree_service: Wrench,
  hardscape: Wrench,
  landscape_design: Star,
  cleanup: Wrench,
  lighting: Zap,
};

// ─── Main Component ───
export default function CrewFieldHub() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<FieldJob[]>(generateTodaysJobs);
  const [crew] = useState<CrewMember[]>(generateCrewMembers);
  const [weather] = useState<DailyWeather>(getTodaysWeather);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'route' | 'crew' | 'summary'>('route');
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showMaterials, setShowMaterials] = useState<string | null>(null);

  // ─── Computed Stats ───
  const stats = useMemo(() => {
    const completed = jobs.filter(j => j.status === 'completed');
    const inProgress = jobs.filter(j => j.status === 'in_progress');
    const upcoming = jobs.filter(j => j.status === 'upcoming');
    const skipped = jobs.filter(j => j.status === 'skipped');
    const totalJobs = jobs.filter(j => j.status !== 'skipped').length;
    const completedCount = completed.length;
    const revenueEarned = completed.reduce((s, j) => s + j.price, 0);
    const revenueRemaining = [...inProgress, ...upcoming].reduce((s, j) => s + j.price, 0);
    const hoursWorked = completed.reduce((s, j) => {
      if (j.startedAt && j.completedAt) {
        return s + differenceInMinutes(j.completedAt, j.startedAt) / 60;
      }
      return s + j.estimatedHours;
    }, 0);
    const hoursRemaining = [...inProgress, ...upcoming].reduce((s, j) => s + j.estimatedHours, 0);
    const progressPercent = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0;
    const allClockedIn = crew.every(m => m.clockedIn);
    const totalDriveMinutes = upcoming.reduce((s, j) => s + j.driveMinutes, 0);

    return {
      completed: completedCount, totalJobs, revenueEarned, revenueRemaining,
      hoursWorked: Math.round(hoursWorked * 10) / 10,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      progressPercent, allClockedIn, skippedCount: skipped.length,
      inProgressCount: inProgress.length, upcomingCount: upcoming.length,
      totalDriveMinutes,
    };
  }, [jobs, crew]);

  // ─── Actions ───
  const startJob = (jobId: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: 'in_progress' as const, startedAt: new Date() } : j
    ));
    const job = jobs.find(j => j.id === jobId);
    addToast('success', `Started: ${job?.title}`);
  };

  const completeJob = (jobId: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: 'completed' as const, completedAt: new Date() } : j
    ));
    const job = jobs.find(j => j.id === jobId);
    addToast('success', `Completed: ${job?.title}`);
  };

  const enRouteJob = (jobId: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: 'en_route' as const } : j
    ));
    addToast('info', 'Marked as en route');
  };

  const toggleMaterial = (jobId: string, materialId: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? {
        ...j,
        materials: j.materials.map(m =>
          m.id === materialId ? { ...m, used: !m.used } : m
        ),
      } : j
    ));
  };

  const addNote = (jobId: string) => {
    if (!noteText.trim()) return;
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, notes: [...j.notes, noteText.trim()] } : j
    ));
    setNoteText('');
    setShowNoteInput(null);
    addToast('success', 'Note added');
  };

  const addPhoto = (jobId: string, type: 'before' | 'after') => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? {
        ...j,
        photos: [...j.photos, { type, url: '', timestamp: new Date() }],
      } : j
    ));
    addToast('success', `${type === 'before' ? 'Before' : 'After'} photo captured`);
  };

  // ─── Current Job (in progress) ───
  const currentJob = jobs.find(j => j.status === 'in_progress');
  const nextJob = jobs.find(j => j.status === 'upcoming');

  // ─── Render ───
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ═══ Hero: Daily Briefing ═══ */}
      <div className="bg-gradient-to-br from-green-600/20 via-earth-900/60 to-earth-900/60 border border-green-500/20 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-earth-50">
              Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, Alpha Crew
            </h1>
            <p className="text-sm text-earth-400 mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <WeatherBadge weather={weather} />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <ProgressRing percent={stats.progressPercent} size={52} />
            <p className="text-[10px] text-earth-400 mt-1">Progress</p>
          </div>
          <div className="text-center bg-earth-800/40 rounded-xl py-2">
            <p className="text-lg font-bold text-earth-100">{stats.completed}/{stats.totalJobs}</p>
            <p className="text-[10px] text-earth-400">Jobs Done</p>
          </div>
          <div className="text-center bg-earth-800/40 rounded-xl py-2">
            <p className="text-lg font-bold text-green-400">${stats.revenueEarned.toLocaleString()}</p>
            <p className="text-[10px] text-earth-400">Earned</p>
          </div>
          <div className="text-center bg-earth-800/40 rounded-xl py-2">
            <p className="text-lg font-bold text-earth-200">{stats.hoursWorked}h</p>
            <p className="text-[10px] text-earth-400">Hours</p>
          </div>
        </div>

        {/* Weather Advisory */}
        {weather.advisory && (
          <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">{weather.advisory}</p>
          </div>
        )}
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {[
          { key: 'route' as const, label: 'Today\'s Route', icon: Navigation, count: stats.totalJobs },
          { key: 'crew' as const, label: 'Crew', icon: User, count: crew.length },
          { key: 'summary' as const, label: 'Day Summary', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
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

      {/* ═══ Active Job Banner ═══ */}
      {currentJob && activeTab !== 'route' && (
        <button
          onClick={() => { setActiveTab('route'); setExpandedJob(currentJob.id); }}
          className="w-full flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 cursor-pointer group"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-amber-300">{currentJob.title}</p>
            <p className="text-xs text-earth-400">{currentJob.customer}</p>
          </div>
          <LiveTimer startTime={currentJob.startedAt!} />
          <ChevronRight className="w-4 h-4 text-earth-500 group-hover:text-earth-300 transition-colors" />
        </button>
      )}

      {/* ═══ TAB: Today's Route ═══ */}
      {activeTab === 'route' && (
        <div className="space-y-3">
          {/* Remaining drive time */}
          {stats.totalDriveMinutes > 0 && (
            <div className="flex items-center gap-2 text-xs text-earth-400 px-1">
              <Truck className="w-3.5 h-3.5" />
              <span>~{stats.totalDriveMinutes} min remaining drive time</span>
              <span className="text-earth-600">•</span>
              <span>{stats.upcomingCount} stops left</span>
            </div>
          )}

          {jobs.map((job, idx) => {
            const isExpanded = expandedJob === job.id;
            const JobIcon = jobTypeIcons[job.type] || Briefcase;
            const isActive = job.status === 'in_progress';
            const materialsUsed = job.materials.filter(m => m.used).length;

            return (
              <div
                key={job.id}
                className={clsx(
                  'border rounded-2xl overflow-hidden transition-all duration-200',
                  isActive
                    ? 'bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20'
                    : job.status === 'completed'
                    ? 'bg-green-500/5 border-green-500/20'
                    : job.status === 'skipped'
                    ? 'bg-earth-900/40 border-earth-800/60 opacity-60'
                    : 'bg-earth-900/60 border-earth-800 hover:border-earth-700'
                )}
              >
                {/* Job Card Header */}
                <button
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  className="w-full flex items-start gap-3 p-4 cursor-pointer text-left"
                >
                  {/* Route Number */}
                  <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold',
                    job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    isActive ? 'bg-amber-500/20 text-amber-400' :
                    job.status === 'skipped' ? 'bg-red-500/20 text-red-400 line-through' :
                    'bg-earth-800 text-earth-300'
                  )}>
                    {job.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      job.routeOrder
                    )}
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={clsx(
                        'font-semibold text-sm truncate',
                        job.status === 'skipped' ? 'text-earth-500 line-through' : 'text-earth-100'
                      )}>
                        {job.title}
                      </h3>
                      <StatusPill status={job.status} />
                    </div>
                    <p className="text-xs text-earth-400 mt-0.5">{job.customer}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-earth-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.scheduledTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {job.estimatedHours}h est.
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${job.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Live timer for active job */}
                  {isActive && job.startedAt && (
                    <div className="text-right shrink-0">
                      <LiveTimer startTime={job.startedAt} />
                      <p className="text-[10px] text-earth-500 mt-0.5">elapsed</p>
                    </div>
                  )}

                  {/* Expand indicator */}
                  {!isActive && (
                    <div className="shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-earth-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-earth-500" />
                      )}
                    </div>
                  )}
                </button>

                {/* Drive time between jobs */}
                {idx > 0 && job.driveMinutes > 0 && !isExpanded && job.status !== 'completed' && job.status !== 'skipped' && (
                  <div className="px-4 pb-2 -mt-1">
                    <span className="text-[10px] text-earth-600 flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5" />
                      {job.driveMinutes} min drive from previous
                    </span>
                  </div>
                )}

                {/* ═══ Expanded Job Detail ═══ */}
                {(isExpanded || isActive) && (
                  <div className="border-t border-earth-800/60 px-4 pb-4 space-y-4">
                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-3">
                      {job.status === 'upcoming' && (
                        <>
                          <button
                            onClick={() => enRouteJob(job.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer"
                          >
                            <Navigation className="w-4 h-4" />
                            En Route
                          </button>
                          <button
                            onClick={() => startJob(job.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer"
                          >
                            <Play className="w-4 h-4" />
                            Start Job
                          </button>
                        </>
                      )}
                      {job.status === 'en_route' && (
                        <button
                          onClick={() => startJob(job.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl py-3 text-sm font-medium transition-colors cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          Arrived — Start Job
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button
                          onClick={() => completeJob(job.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl py-3.5 text-sm font-bold transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Complete Job
                        </button>
                      )}
                    </div>

                    {/* Address + Contact */}
                    <div className="space-y-2">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-earth-800/40 hover:bg-earth-800/60 rounded-xl px-3 py-2.5 transition-colors group"
                      >
                        <MapPin className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="text-sm text-earth-200 flex-1">{job.address}</span>
                        <ArrowRight className="w-4 h-4 text-earth-600 group-hover:text-green-400 transition-colors" />
                      </a>
                      <div className="flex gap-2">
                        <a
                          href={`tel:${job.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-earth-800/40 hover:bg-earth-800/60 rounded-xl px-3 py-2.5 transition-colors"
                        >
                          <PhoneCall className="w-4 h-4 text-sky-400" />
                          <span className="text-sm text-earth-300">Call Customer</span>
                        </a>
                        {job.gateCode && (
                          <div className="flex items-center gap-2 bg-earth-800/40 rounded-xl px-3 py-2.5">
                            <Hash className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-mono text-amber-300">{job.gateCode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Special Instructions */}
                    {job.specialInstructions && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">Special Instructions</p>
                            <p className="text-sm text-earth-200 leading-relaxed">{job.specialInstructions}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Materials Checklist */}
                    {job.materials.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowMaterials(showMaterials === job.id ? null : job.id)}
                          className="flex items-center justify-between w-full text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-earth-400" />
                            <span className="text-sm font-medium text-earth-200">Materials</span>
                            <span className="text-xs text-earth-500">
                              {materialsUsed}/{job.materials.length} used
                            </span>
                          </div>
                          {showMaterials === job.id ? (
                            <ChevronUp className="w-4 h-4 text-earth-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-earth-500" />
                          )}
                        </button>
                        {showMaterials === job.id && (
                          <div className="mt-2 space-y-1">
                            {job.materials.map(mat => (
                              <button
                                key={mat.id}
                                onClick={() => toggleMaterial(job.id, mat.id)}
                                className={clsx(
                                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors cursor-pointer text-left',
                                  mat.used ? 'bg-green-500/10' : 'bg-earth-800/40 hover:bg-earth-800/60'
                                )}
                              >
                                <div className={clsx(
                                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                                  mat.used
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-earth-600'
                                )}>
                                  {mat.used && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <span className={clsx(
                                  'text-sm flex-1',
                                  mat.used ? 'text-earth-400 line-through' : 'text-earth-200'
                                )}>
                                  {mat.name}
                                </span>
                                <span className="text-xs text-earth-500">{mat.quantity} {mat.unit}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    {job.status !== 'skipped' && (
                      <div>
                        <p className="text-sm font-medium text-earth-200 mb-2 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-earth-400" />
                          Photos
                          {job.photos.length > 0 && (
                            <span className="text-xs text-earth-500">{job.photos.length} taken</span>
                          )}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addPhoto(job.id, 'before')}
                            className="flex-1 flex items-center justify-center gap-2 bg-earth-800/40 hover:bg-earth-800/60 border border-dashed border-earth-700 rounded-xl py-3 text-sm text-earth-300 transition-colors cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            Before
                            {job.photos.filter(p => p.type === 'before').length > 0 && (
                              <span className="text-green-400 text-xs">({job.photos.filter(p => p.type === 'before').length})</span>
                            )}
                          </button>
                          <button
                            onClick={() => addPhoto(job.id, 'after')}
                            className="flex-1 flex items-center justify-center gap-2 bg-earth-800/40 hover:bg-earth-800/60 border border-dashed border-earth-700 rounded-xl py-3 text-sm text-earth-300 transition-colors cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            After
                            {job.photos.filter(p => p.type === 'after').length > 0 && (
                              <span className="text-green-400 text-xs">({job.photos.filter(p => p.type === 'after').length})</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <p className="text-sm font-medium text-earth-200 mb-2 flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-earth-400" />
                        Field Notes
                        {job.notes.length > 0 && (
                          <span className="text-xs text-earth-500">{job.notes.length}</span>
                        )}
                      </p>
                      {job.notes.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {job.notes.map((note, i) => (
                            <div key={i} className="bg-earth-800/40 rounded-lg px-3 py-2 text-sm text-earth-300">
                              {note}
                            </div>
                          ))}
                        </div>
                      )}
                      {showNoteInput === job.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addNote(job.id)}
                            placeholder="Type a note..."
                            className="flex-1 bg-earth-800/60 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
                            autoFocus
                          />
                          <button
                            onClick={() => addNote(job.id)}
                            className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium cursor-pointer hover:bg-green-600/30 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowNoteInput(job.id); setNoteText(''); }}
                          className="text-xs text-earth-500 hover:text-green-400 transition-colors cursor-pointer"
                        >
                          + Add note
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Next up indicator */}
          {nextJob && !currentJob && (
            <div className="text-center py-4">
              <p className="text-sm text-earth-400">
                Next up: <span className="text-earth-200 font-medium">{nextJob.title}</span>
              </p>
              <p className="text-xs text-earth-500 mt-0.5">
                {nextJob.scheduledTime} • {nextJob.driveMinutes} min drive
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Crew ═══ */}
      {activeTab === 'crew' && (
        <div className="space-y-4">
          {/* Crew Status */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-earth-200">Alpha Crew</h2>
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  stats.allClockedIn ? 'bg-green-400' : 'bg-amber-400'
                )} />
                <span className="text-xs text-earth-400">
                  {crew.filter(m => m.clockedIn).length}/{crew.length} clocked in
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {crew.map(member => (
                <div key={member.id} className="flex items-center gap-3 bg-earth-800/40 rounded-xl px-3 py-2.5">
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold',
                    member.role === 'foreman' ? 'bg-amber-500/20 text-amber-400' :
                    member.role === 'apprentice' ? 'bg-sky-500/20 text-sky-400' :
                    'bg-earth-700 text-earth-300'
                  )}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-earth-200">{member.name}</p>
                      <span className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        member.role === 'foreman' ? 'bg-amber-500/20 text-amber-400' :
                        member.role === 'apprentice' ? 'bg-sky-500/20 text-sky-400' :
                        'bg-earth-700 text-earth-400'
                      )}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </div>
                    {member.clockedIn && member.clockInTime && (
                      <p className="text-xs text-earth-500 mt-0.5">
                        Clocked in at {format(member.clockInTime, 'h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className={clsx(
                    'w-3 h-3 rounded-full',
                    member.clockedIn ? 'bg-green-400' : 'bg-earth-600'
                  )} />
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle & Equipment */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-earth-200 mb-3">Vehicle & Equipment</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-earth-800/40 rounded-xl px-3 py-2.5">
                <Truck className="w-5 h-5 text-earth-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-earth-200">2024 Ford F-250 #101</p>
                  <p className="text-xs text-earth-500">Fuel: 3/4 tank • Oil change: 2,100 mi</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              {[
                { name: 'Exmark Lazer Z 60"', status: 'Ready', condition: 'good' },
                { name: 'STIHL FS 131 Trimmer', status: 'Ready', condition: 'good' },
                { name: 'STIHL BR 800 Blower', status: 'Ready', condition: 'good' },
                { name: 'STIHL MS 271 Chainsaw', status: 'Ready', condition: 'good' },
              ].map((equip, i) => (
                <div key={i} className="flex items-center gap-3 bg-earth-800/40 rounded-xl px-3 py-2.5">
                  <Wrench className="w-4 h-4 text-earth-500" />
                  <span className="text-sm text-earth-300 flex-1">{equip.name}</span>
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Safety Checklist */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Daily Safety Checklist
            </h2>
            <div className="space-y-1">
              {[
                'PPE inspection complete',
                'Equipment pre-check done',
                'First aid kit verified',
                'Vehicle walk-around complete',
                'Hazard assessment reviewed',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-green-500/5 rounded-lg">
                  <div className="w-5 h-5 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-earth-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Day Summary ═══ */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Performance Card */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-earth-200 mb-4">Today's Performance</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-earth-800/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">${stats.revenueEarned.toLocaleString()}</p>
                <p className="text-xs text-earth-400 mt-0.5">Revenue Earned</p>
              </div>
              <div className="bg-earth-800/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-earth-200">${stats.revenueRemaining.toLocaleString()}</p>
                <p className="text-xs text-earth-400 mt-0.5">Remaining</p>
              </div>
              <div className="bg-earth-800/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-earth-100">{stats.hoursWorked}h</p>
                <p className="text-xs text-earth-400 mt-0.5">Hours Worked</p>
              </div>
              <div className="bg-earth-800/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-earth-300">{stats.hoursRemaining}h</p>
                <p className="text-xs text-earth-400 mt-0.5">Hours Left</p>
              </div>
            </div>
          </div>

          {/* Job Breakdown */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-earth-200 mb-3">Job Breakdown</h2>
            <div className="space-y-2">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center gap-3 bg-earth-800/40 rounded-xl px-3 py-2.5">
                  <div className={clsx(
                    'w-2 h-2 rounded-full shrink-0',
                    job.status === 'completed' ? 'bg-green-400' :
                    job.status === 'in_progress' ? 'bg-amber-400 animate-pulse' :
                    job.status === 'skipped' ? 'bg-red-400' :
                    'bg-earth-600'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'text-sm truncate',
                      job.status === 'skipped' ? 'text-earth-500 line-through' : 'text-earth-200'
                    )}>
                      {job.title}
                    </p>
                    <p className="text-xs text-earth-500">{job.customer}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-earth-200">${job.price.toLocaleString()}</p>
                    {job.startedAt && job.completedAt && (
                      <p className="text-xs text-earth-500">
                        {Math.round(differenceInMinutes(job.completedAt, job.startedAt) / 60 * 10) / 10}h actual
                      </p>
                    )}
                    {job.status === 'in_progress' && job.startedAt && (
                      <p className="text-xs text-amber-400">In progress</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Efficiency Metrics */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Crew Efficiency
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Revenue per Hour', value: stats.hoursWorked > 0 ? `$${Math.round(stats.revenueEarned / stats.hoursWorked)}` : '$0', color: 'text-green-400' },
                { label: 'Estimated Completion', value: stats.hoursRemaining > 0 ? format(addHours(new Date(), stats.hoursRemaining), 'h:mm a') : 'Done!', color: 'text-earth-200' },
                { label: 'On-Time Rate', value: '100%', color: 'text-green-400' },
                { label: 'Materials Efficiency', value: '92%', color: 'text-green-400' },
              ].map((metric, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-earth-400">{metric.label}</span>
                  <span className={clsx('text-sm font-semibold', metric.color)}>{metric.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Notes (all jobs combined) */}
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-earth-200 mb-3">All Field Notes Today</h2>
            {jobs.some(j => j.notes.length > 0) ? (
              <div className="space-y-2">
                {jobs.filter(j => j.notes.length > 0).map(job => (
                  <div key={job.id}>
                    <p className="text-xs text-earth-500 mb-1">{job.customer} — {job.title}</p>
                    {job.notes.map((note, i) => (
                      <div key={i} className="bg-earth-800/40 rounded-lg px-3 py-2 text-sm text-earth-300 mb-1">
                        {note}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-earth-500">No notes yet today</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ Bottom Quick Actions (Fixed) ═══ */}
      {activeTab === 'route' && currentJob && (
        <div className="sticky bottom-4 bg-earth-950/95 backdrop-blur border border-earth-800 rounded-2xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-earth-400 truncate">Current: {currentJob.title}</p>
            <div className="flex items-center gap-2">
              <LiveTimer startTime={currentJob.startedAt!} />
              <span className="text-xs text-earth-500">• {currentJob.customer}</span>
            </div>
          </div>
          <button
            onClick={() => completeJob(currentJob.id)}
            className="shrink-0 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Done
          </button>
        </div>
      )}
    </div>
  );
}
