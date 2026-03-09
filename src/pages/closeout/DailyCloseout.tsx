import { useState, useMemo } from 'react';
import {
  CheckCircle2, Clock, DollarSign, AlertTriangle, Users, Briefcase,
  TrendingUp, TrendingDown, ChevronDown, ChevronRight, Send, Star,
  Camera, MessageSquare, ArrowRight, Zap, Sun, Moon, Coffee,
  ThumbsUp, ThumbsDown, Flag, FileText, Calendar, Timer,
  Truck, Wrench, CloudRain, MapPin, Phone, Eye, XCircle,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { format, subHours, differenceInMinutes } from 'date-fns';
import { useToast } from '../../components/ui/Toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface CrewDay {
  id: string;
  name: string;
  lead: string;
  members: number;
  jobsPlanned: number;
  jobsCompleted: number;
  hoursLogged: number;
  hoursEstimated: number;
  revenue: number;
  laborCost: number;
  status: 'all_complete' | 'partial' | 'issues';
  timesheetApproved: boolean;
  jobs: CrewJobSummary[];
  issues: string[];
  photo?: string;
}

interface CrewJobSummary {
  id: string;
  customer: string;
  address: string;
  type: string;
  status: 'completed' | 'in_progress' | 'skipped' | 'partial';
  estimatedHours: number;
  actualHours: number;
  revenue: number;
  notes: string;
  rating?: number;
  photosCount: number;
  clientNotified: boolean;
}

interface DailyIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: 'equipment' | 'customer' | 'schedule' | 'quality' | 'weather' | 'safety';
  title: string;
  detail: string;
  crew: string;
  jobAddress: string;
  status: 'open' | 'resolved' | 'escalated';
  icon: LucideIcon;
}

interface TomorrowJob {
  id: string;
  customer: string;
  address: string;
  type: string;
  crew: string;
  estimatedHours: number;
  revenue: number;
  confirmed: boolean;
  notes?: string;
}

// ── Demo Data ──────────────────────────────────────────────────────────────
const now = new Date();
const today = format(now, 'EEEE, MMMM d');

const crewDays: CrewDay[] = [
  {
    id: 'crew-1',
    name: 'Alpha Crew',
    lead: 'Carlos Mendez',
    members: 4,
    jobsPlanned: 6,
    jobsCompleted: 6,
    hoursLogged: 28.5,
    hoursEstimated: 30,
    revenue: 2340,
    laborCost: 920,
    status: 'all_complete',
    timesheetApproved: false,
    issues: [],
    jobs: [
      { id: 'j-1', customer: 'Sarah Mitchell', address: '4521 Oakwood Trail', type: 'Weekly Mow & Edge', status: 'completed', estimatedHours: 1.25, actualHours: 1.15, revenue: 85, notes: 'Lawn looking great. Raised mow height for spring.', rating: 5, photosCount: 4, clientNotified: false },
      { id: 'j-2', customer: 'Jennifer Walsh', address: '6742 Sunset Ridge Dr', type: 'Premium Weekly Service', status: 'completed', estimatedHours: 2.5, actualHours: 2.75, revenue: 195, notes: 'Japanese garden detail. Koi pond filter cleaned. Extra time on event patio prep.', rating: 5, photosCount: 8, clientNotified: true },
      { id: 'j-3', customer: 'Tom Harrison', address: '892 Live Oak Ct', type: 'Weekly Mow & Edge', status: 'completed', estimatedHours: 1.0, actualHours: 0.85, revenue: 75, notes: 'Quick job. Customer happy.', photosCount: 2, clientNotified: false },
      { id: 'j-4', customer: 'Baker Family', address: '1503 Elm Street', type: 'Shrub Trimming + Mow', status: 'completed', estimatedHours: 2.0, actualHours: 2.25, revenue: 165, notes: 'Heavy growth on boxwoods. Extra 15 min.', photosCount: 3, clientNotified: false },
      { id: 'j-5', customer: 'Maria Torres', address: '3218 Pecan Way', type: 'Weekly Mow & Edge', status: 'completed', estimatedHours: 1.25, actualHours: 1.0, revenue: 85, notes: 'Adjusted sprinkler head in zone 2.', photosCount: 2, clientNotified: false },
      { id: 'j-6', customer: 'David & Maria Lopez', address: '3107 Ridgecrest Ln', type: 'Monthly Maintenance', status: 'completed', estimatedHours: 1.5, actualHours: 1.5, revenue: 95, notes: 'Sod establishment check. Back lawn improving. Applied spot treatment.', photosCount: 5, clientNotified: false },
    ],
  },
  {
    id: 'crew-2',
    name: 'Bravo Crew',
    lead: 'Jake Williams',
    members: 3,
    jobsPlanned: 4,
    jobsCompleted: 3,
    hoursLogged: 18.5,
    hoursEstimated: 22,
    revenue: 1825,
    laborCost: 680,
    status: 'partial',
    timesheetApproved: false,
    issues: ['Mower deck belt broke at Commerce Blvd job — needed 30 min repair'],
    jobs: [
      { id: 'j-10', customer: 'Robert Chen', address: '8900 Commerce Blvd', type: 'Weekly Maintenance', status: 'completed', estimatedHours: 3.0, actualHours: 3.5, revenue: 275, notes: 'Mower belt broke. Fixed on site. 30 min delay. Retention pond area needs erosion quote.', photosCount: 3, clientNotified: false },
      { id: 'j-11', customer: 'Meadowbrook Office Park', address: '2400 Meadowbrook Pkwy', type: 'Bi-Weekly Service', status: 'completed', estimatedHours: 4.0, actualHours: 3.75, revenue: 425, notes: 'Full service. Water feature pump still making noise. Rooftop containers refreshed.', rating: 4, photosCount: 6, clientNotified: true },
      { id: 'j-12', customer: 'Clearview Dental', address: '1100 Research Blvd #200', type: 'Weekly Maintenance', status: 'completed', estimatedHours: 2.0, actualHours: 1.75, revenue: 150, notes: 'Standard service. Parking island looks sharp.', photosCount: 2, clientNotified: false },
      { id: 'j-13', customer: 'Ridgetop Church', address: '5500 Ridge Rd', type: 'Grounds Maintenance', status: 'skipped', estimatedHours: 3.0, actualHours: 0, revenue: 0, notes: 'Skipped — rain started at 3:45pm. Rescheduled to Thursday.', photosCount: 0, clientNotified: true },
    ],
  },
  {
    id: 'crew-3',
    name: 'Charlie Crew',
    lead: 'Mike Torres',
    members: 5,
    jobsPlanned: 3,
    jobsCompleted: 2,
    hoursLogged: 24,
    hoursEstimated: 26,
    revenue: 2650,
    laborCost: 1050,
    status: 'issues',
    timesheetApproved: false,
    issues: [
      'Hillcrest HOA playground turf severely thinning — needs immediate overseeding',
      'Customer complaint: Mrs. Rodriguez says crew left debris on driveway',
    ],
    jobs: [
      { id: 'j-20', customer: 'Hillcrest HOA', address: '1200 Hillcrest Dr', type: 'Weekly Grounds', status: 'completed', estimatedHours: 6.0, actualHours: 6.5, revenue: 850, notes: 'Full grounds. Playground area critical — turf down to 40%. Board meeting next week.', photosCount: 12, clientNotified: false },
      { id: 'j-21', customer: 'Sunset Mall', address: '4800 Sunset Blvd', type: 'Commercial Maintenance', status: 'completed', estimatedHours: 5.0, actualHours: 4.5, revenue: 550, notes: 'Full service. New seasonal color install in planters. Mall manager signed off.', rating: 5, photosCount: 8, clientNotified: true },
      { id: 'j-22', customer: 'Patricia Rodriguez', address: '2901 Canyon Creek Dr', type: 'Spring Cleanup', status: 'partial', estimatedHours: 3.0, actualHours: 2.0, revenue: 0, notes: 'Rain cut service short. 70% complete — beds done, leaf cleanup remaining. Customer called about debris.', photosCount: 3, clientNotified: false },
    ],
  },
];

const dailyIssues: DailyIssue[] = [
  { id: 'iss-1', severity: 'high', category: 'customer', title: 'Customer Complaint: Debris on Driveway', detail: 'Mrs. Rodriguez at 2901 Canyon Creek called about leaf debris left on driveway. Service was cut short by rain. Need to send crew back to finish.', crew: 'Charlie Crew', jobAddress: '2901 Canyon Creek Dr', status: 'open', icon: Phone },
  { id: 'iss-2', severity: 'high', category: 'quality', title: 'Hillcrest HOA Turf Critical', detail: 'Playground turf down to 40% coverage. HOA board meeting next week. Recommend emergency overseeding + topdressing before meeting.', crew: 'Charlie Crew', jobAddress: '1200 Hillcrest Dr', status: 'open', icon: AlertTriangle },
  { id: 'iss-3', severity: 'medium', category: 'equipment', title: 'Bravo Crew Mower Belt Replaced', detail: 'Primary mower deck belt broke on site. Jake fixed it in 30 min. Belt was at end of life — check all mower belts this weekend.', crew: 'Bravo Crew', jobAddress: '8900 Commerce Blvd', status: 'resolved', icon: Wrench },
  { id: 'iss-4', severity: 'medium', category: 'schedule', title: 'Rain Delay: 2 Jobs Rescheduled', detail: 'Rain at 3:45pm forced Ridgetop Church skip and Rodriguez partial. Both rescheduled to Thursday.', crew: 'Bravo/Charlie', jobAddress: 'Multiple', status: 'resolved', icon: CloudRain },
  { id: 'iss-5', severity: 'low', category: 'equipment', title: 'Water Feature Pump Noise', detail: 'Meadowbrook Office Park water feature pump making grinding noise. Schedule repair before it fails.', crew: 'Bravo Crew', jobAddress: '2400 Meadowbrook Pkwy', status: 'open', icon: Wrench },
];

const tomorrowJobs: TomorrowJob[] = [
  { id: 'tj-1', customer: 'Lakeside HOA', address: '700 Lakeside Dr', type: 'Weekly Grounds', crew: 'Charlie Crew', estimatedHours: 5.0, revenue: 750, confirmed: true },
  { id: 'tj-2', customer: 'Sarah Mitchell', address: '4521 Oakwood Trail', type: 'Mulch Delivery + Install', crew: 'Alpha Crew', estimatedHours: 3.0, revenue: 350, confirmed: true, notes: 'Customer requested before noon' },
  { id: 'tj-3', customer: 'Ridgetop Church', address: '5500 Ridge Rd', type: 'Grounds Maintenance (Reschedule)', crew: 'Bravo Crew', estimatedHours: 3.0, revenue: 275, confirmed: false, notes: 'Rescheduled from today — rain' },
  { id: 'tj-4', customer: 'Patricia Rodriguez', address: '2901 Canyon Creek Dr', type: 'Spring Cleanup (Finish)', crew: 'Alpha Crew', estimatedHours: 1.5, revenue: 225, confirmed: false, notes: 'Priority — finish cleanup, address debris complaint' },
  { id: 'tj-5', customer: 'Austin Wellness Center', address: '3300 Wellness Way', type: 'Bi-Weekly Service', crew: 'Bravo Crew', estimatedHours: 2.5, revenue: 200, confirmed: true },
  { id: 'tj-6', customer: 'The Hendersons', address: '1882 Willow Bend', type: 'Weekly Mow & Edge', crew: 'Alpha Crew', estimatedHours: 1.25, revenue: 85, confirmed: true },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>;
}

const severityStyles: Record<string, string> = {
  high: 'bg-red-500/15 border-red-500/25 text-red-400',
  medium: 'bg-amber-500/15 border-amber-500/25 text-amber-400',
  low: 'bg-earth-800/40 border-earth-700/50 text-earth-400',
};

const statusEmoji: Record<string, string> = {
  completed: '✓',
  in_progress: '⏳',
  skipped: '⏭',
  partial: '½',
};

// ── Component ──────────────────────────────────────────────────────────────
export default function DailyCloseout() {
  const { addToast } = useToast();
  const [expandedCrew, setExpandedCrew] = useState<string | null>(crewDays[0].id);
  const [approvedTimesheets, setApprovedTimesheets] = useState<Set<string>>(new Set());
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set(['iss-3', 'iss-4']));
  const [notifiedClients, setNotifiedClients] = useState<Set<string>>(new Set());
  const [confirmedJobs, setConfirmedJobs] = useState<Set<string>>(new Set(['tj-1', 'tj-2', 'tj-5', 'tj-6']));
  const [closeoutStep, setCloseoutStep] = useState(0); // 0=review, 1=approve, 2=issues, 3=tomorrow, 4=done
  const [dayLocked, setDayLocked] = useState(false);

  // Computed stats
  const stats = useMemo(() => {
    const totalPlanned = crewDays.reduce((s, c) => s + c.jobsPlanned, 0);
    const totalCompleted = crewDays.reduce((s, c) => s + c.jobsCompleted, 0);
    const totalRevenue = crewDays.reduce((s, c) => s + c.revenue, 0);
    const totalLabor = crewDays.reduce((s, c) => s + c.laborCost, 0);
    const totalHours = crewDays.reduce((s, c) => s + c.hoursLogged, 0);
    const totalEstimated = crewDays.reduce((s, c) => s + c.hoursEstimated, 0);
    const materialsCost = 285; // today's materials
    const fuelCost = 145; // today's fuel
    const totalCost = totalLabor + materialsCost + fuelCost;
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const efficiency = totalEstimated > 0 ? (totalHours / totalEstimated) * 100 : 0;
    const openIssues = dailyIssues.filter(i => !resolvedIssues.has(i.id)).length;
    const allTimesheetsApproved = crewDays.every(c => approvedTimesheets.has(c.id));
    return { totalPlanned, totalCompleted, totalRevenue, totalLabor, materialsCost, fuelCost, totalCost, profit, margin, totalHours, totalEstimated, efficiency, openIssues, allTimesheetsApproved };
  }, [approvedTimesheets, resolvedIssues]);

  const approveTimesheet = (crewId: string) => {
    setApprovedTimesheets(prev => { const n = new Set(prev); n.add(crewId); return n; });
    const crew = crewDays.find(c => c.id === crewId);
    addToast('success', `${crew?.name} timesheet approved — ${crew?.hoursLogged}h`);
  };

  const approveAllTimesheets = () => {
    setApprovedTimesheets(new Set(crewDays.map(c => c.id)));
    addToast('success', `All ${crewDays.length} crew timesheets approved`);
  };

  const resolveIssue = (issueId: string) => {
    setResolvedIssues(prev => { const n = new Set(prev); n.add(issueId); return n; });
    addToast('success', 'Issue resolved');
  };

  const escalateIssue = (issueId: string) => {
    setResolvedIssues(prev => { const n = new Set(prev); n.add(issueId); return n; });
    addToast('info', 'Issue escalated to tomorrow\'s action queue');
  };

  const notifyClient = (jobId: string, customer: string) => {
    setNotifiedClients(prev => { const n = new Set(prev); n.add(jobId); return n; });
    addToast('success', `Completion report sent to ${customer}`);
  };

  const notifyAllClients = () => {
    const unnotified = crewDays.flatMap(c => c.jobs).filter(j => j.status === 'completed' && !j.clientNotified && !notifiedClients.has(j.id));
    unnotified.forEach(j => setNotifiedClients(prev => { const n = new Set(prev); n.add(j.id); return n; }));
    addToast('success', `Completion reports sent to ${unnotified.length} clients`);
  };

  const confirmJob = (jobId: string) => {
    setConfirmedJobs(prev => { const n = new Set(prev); n.add(jobId); return n; });
    addToast('success', 'Job confirmed for tomorrow');
  };

  const lockDay = () => {
    setDayLocked(true);
    setCloseoutStep(4);
    addToast('success', `Day closed out! $${stats.profit.toLocaleString()} profit, ${stats.totalCompleted}/${stats.totalPlanned} jobs complete.`);
  };

  const completionRate = stats.totalPlanned > 0 ? (stats.totalCompleted / stats.totalPlanned) * 100 : 0;
  const unnotifiedCount = crewDays.flatMap(c => c.jobs).filter(j => j.status === 'completed' && !j.clientNotified && !notifiedClients.has(j.id)).length;

  // Progress steps
  const steps = [
    { label: 'Review Crews', done: expandedCrew !== null || dayLocked },
    { label: 'Approve Time', done: stats.allTimesheetsApproved },
    { label: 'Resolve Issues', done: stats.openIssues === 0 },
    { label: 'Prep Tomorrow', done: tomorrowJobs.every(j => confirmedJobs.has(j.id)) },
    { label: 'Close Day', done: dayLocked },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-bold text-earth-100">Daily Closeout</h2>
          </div>
          <p className="text-earth-400 text-sm">{today} — Close your day in 5 minutes</p>
        </div>
        {!dayLocked ? (
          <button
            onClick={lockDay}
            disabled={stats.openIssues > 0 && !stats.allTimesheetsApproved}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer',
              stats.allTimesheetsApproved && stats.openIssues === 0
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'
                : 'bg-earth-800/60 text-earth-500 hover:bg-earth-800'
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            Close Day
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/15 border border-green-500/25 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Day Closed</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                step.done
                  ? 'bg-green-600/20 border-green-500 text-green-400'
                  : i === closeoutStep
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                    : 'bg-earth-800/40 border-earth-700 text-earth-500'
              )}>
                {step.done ? '✓' : i + 1}
              </div>
              <span className={clsx(
                'text-xs font-medium whitespace-nowrap',
                step.done ? 'text-green-400' : i === closeoutStep ? 'text-indigo-400' : 'text-earth-500'
              )}>{step.label}</span>
              {i < steps.length - 1 && (
                <div className={clsx('w-8 h-px', step.done ? 'bg-green-500/50' : 'bg-earth-700')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Day Closed Summary */}
      {dayLocked && (
        <div className="bg-green-500/8 border border-green-500/20 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-green-300 mb-2">Day Successfully Closed</h3>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div><span className="text-earth-400">Jobs: </span><span className="font-semibold text-earth-200">{stats.totalCompleted}/{stats.totalPlanned}</span></div>
            <div><span className="text-earth-400">Revenue: </span><span className="font-semibold text-green-400">${stats.totalRevenue.toLocaleString()}</span></div>
            <div><span className="text-earth-400">Profit: </span><span className="font-semibold text-green-400">${stats.profit.toLocaleString()}</span></div>
            <div><span className="text-earth-400">Hours: </span><span className="font-semibold text-earth-200">{stats.totalHours}h</span></div>
            <div><span className="text-earth-400">Margin: </span><span className="font-semibold text-green-400">{stats.margin.toFixed(0)}%</span></div>
          </div>
        </div>
      )}

      {/* Scorecard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="w-4 h-4 text-green-400" />
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full',
              completionRate >= 90 ? 'bg-green-500/15 text-green-400' : completionRate >= 70 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
            )}>{completionRate.toFixed(0)}%</span>
          </div>
          <div className="text-2xl font-bold text-earth-100">{stats.totalCompleted}/{stats.totalPlanned}</div>
          <div className="text-xs text-earth-500">Jobs Completed</div>
        </div>

        <div className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400"><AnimatedNumber value={stats.totalRevenue} prefix="$" /></div>
          <div className="text-xs text-earth-500">Today's Revenue</div>
        </div>

        <div className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full',
              stats.margin >= 40 ? 'bg-green-500/15 text-green-400' : stats.margin >= 25 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
            )}>{stats.margin.toFixed(0)}% margin</span>
          </div>
          <div className="text-2xl font-bold text-green-400"><AnimatedNumber value={stats.profit} prefix="$" /></div>
          <div className="text-xs text-earth-500">Today's Profit</div>
        </div>

        <div className="bg-earth-900/60 border border-earth-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full',
              stats.efficiency <= 105 ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'
            )}>{stats.efficiency.toFixed(0)}% of estimate</span>
          </div>
          <div className="text-2xl font-bold text-earth-100">{stats.totalHours}h</div>
          <div className="text-xs text-earth-500">Hours Logged ({stats.totalEstimated}h est)</div>
        </div>
      </div>

      {/* Daily P&L */}
      <div className="bg-earth-900/60 border border-earth-800/60 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" /> Daily P&L
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-green-500/8 rounded-xl p-3 text-center">
            <div className="text-xs text-earth-500 mb-1">Revenue</div>
            <div className="text-lg font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3 text-center">
            <div className="text-xs text-earth-500 mb-1">Labor</div>
            <div className="text-lg font-bold text-red-400">-${stats.totalLabor.toLocaleString()}</div>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3 text-center">
            <div className="text-xs text-earth-500 mb-1">Materials</div>
            <div className="text-lg font-bold text-red-400">-${stats.materialsCost}</div>
          </div>
          <div className="bg-red-500/8 rounded-xl p-3 text-center">
            <div className="text-xs text-earth-500 mb-1">Fuel</div>
            <div className="text-lg font-bold text-red-400">-${stats.fuelCost}</div>
          </div>
          <div className={clsx('rounded-xl p-3 text-center border-2', stats.profit > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30')}>
            <div className="text-xs text-earth-500 mb-1">Net Profit</div>
            <div className={clsx('text-lg font-bold', stats.profit > 0 ? 'text-green-400' : 'text-red-400')}>
              ${stats.profit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Crew Review */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-earth-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Crew Review
          </h3>
          <div className="flex gap-2">
            {unnotifiedCount > 0 && (
              <button
                onClick={notifyAllClients}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 border border-sky-500/25 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-500/25 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" /> Notify {unnotifiedCount} Clients
              </button>
            )}
            {!stats.allTimesheetsApproved && (
              <button
                onClick={approveAllTimesheets}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/25 rounded-lg text-xs font-medium text-green-400 hover:bg-green-500/25 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve All Timesheets
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {crewDays.map(crew => {
            const isExpanded = expandedCrew === crew.id;
            const isApproved = approvedTimesheets.has(crew.id);
            const crewProfit = crew.revenue - crew.laborCost;

            return (
              <div key={crew.id} className="bg-earth-900/60 border border-earth-800/60 rounded-2xl overflow-hidden">
                {/* Crew Header */}
                <button
                  onClick={() => setExpandedCrew(isExpanded ? null : crew.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-earth-900/80 transition-colors cursor-pointer"
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    crew.status === 'all_complete' ? 'bg-green-500/15' : crew.status === 'partial' ? 'bg-amber-500/15' : 'bg-red-500/15'
                  )}>
                    <Users className={clsx('w-5 h-5',
                      crew.status === 'all_complete' ? 'text-green-400' : crew.status === 'partial' ? 'text-amber-400' : 'text-red-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-earth-100">{crew.name}</span>
                      <span className="text-xs text-earth-500">({crew.lead})</span>
                      {isApproved && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Approved</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-earth-500 mt-0.5">
                      <span>{crew.jobsCompleted}/{crew.jobsPlanned} jobs</span>
                      <span>·</span>
                      <span>{crew.hoursLogged}h logged</span>
                      <span>·</span>
                      <span className="text-green-400 font-medium">${crew.revenue.toLocaleString()}</span>
                      {crew.issues.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-red-400">{crew.issues.length} issue{crew.issues.length > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={clsx('w-4 h-4 text-earth-500 transition-transform', isExpanded && 'rotate-180')} />
                </button>

                {/* Expanded Crew Detail */}
                {isExpanded && (
                  <div className="border-t border-earth-800/60 p-4 space-y-3">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-earth-800/30 rounded-lg p-2 text-center">
                        <div className="text-xs text-earth-500">Revenue</div>
                        <div className="text-sm font-bold text-green-400">${crew.revenue.toLocaleString()}</div>
                      </div>
                      <div className="bg-earth-800/30 rounded-lg p-2 text-center">
                        <div className="text-xs text-earth-500">Labor Cost</div>
                        <div className="text-sm font-bold text-red-400">${crew.laborCost.toLocaleString()}</div>
                      </div>
                      <div className="bg-earth-800/30 rounded-lg p-2 text-center">
                        <div className="text-xs text-earth-500">Profit</div>
                        <div className="text-sm font-bold text-green-400">${crewProfit.toLocaleString()}</div>
                      </div>
                      <div className="bg-earth-800/30 rounded-lg p-2 text-center">
                        <div className="text-xs text-earth-500">Efficiency</div>
                        <div className="text-sm font-bold text-earth-200">{((crew.hoursEstimated / Math.max(crew.hoursLogged, 1)) * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    {/* Job List */}
                    <div className="space-y-1.5">
                      {crew.jobs.map(job => (
                        <div key={job.id} className={clsx(
                          'flex items-center gap-3 rounded-xl p-3 border',
                          job.status === 'completed' ? 'bg-earth-800/20 border-earth-800/30' :
                          job.status === 'skipped' ? 'bg-amber-500/5 border-amber-500/15' :
                          'bg-red-500/5 border-red-500/15'
                        )}>
                          <span className={clsx(
                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            job.status === 'skipped' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          )}>{statusEmoji[job.status]}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-earth-200 truncate">{job.customer}</span>
                              {job.rating && (
                                <div className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  <span className="text-[10px] text-amber-400">{job.rating}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-earth-500 truncate">{job.type} — {job.address}</div>
                            {job.notes && <div className="text-[10px] text-earth-400 mt-0.5 truncate">{job.notes}</div>}
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <div className="text-xs font-semibold text-green-400">${job.revenue}</div>
                              <div className="text-[10px] text-earth-500">{job.actualHours}h / {job.estimatedHours}h</div>
                            </div>
                            {job.photosCount > 0 && (
                              <span className="text-[10px] text-earth-500 flex items-center gap-0.5">
                                <Camera className="w-3 h-3" />{job.photosCount}
                              </span>
                            )}
                            {job.status === 'completed' && !job.clientNotified && !notifiedClients.has(job.id) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); notifyClient(job.id, job.customer); }}
                                className="text-[10px] px-2 py-1 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 cursor-pointer transition-colors"
                              >Send</button>
                            )}
                            {(job.clientNotified || notifiedClients.has(job.id)) && (
                              <span className="text-[10px] text-green-400">Sent</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Approve Button */}
                    {!isApproved ? (
                      <button
                        onClick={() => approveTimesheet(crew.id)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600/15 border border-green-500/25 rounded-xl text-sm font-medium text-green-400 hover:bg-green-600/25 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Timesheet — {crew.hoursLogged}h ({crew.members} crew members)
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2.5 bg-green-500/8 border border-green-500/20 rounded-xl text-sm font-medium text-green-400">
                        <CheckCircle2 className="w-4 h-4" /> Timesheet Approved
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues */}
      <div>
        <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Issues & Flags
          {stats.openIssues > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{stats.openIssues} open</span>
          )}
        </h3>

        <div className="space-y-2">
          {dailyIssues.map(issue => {
            const isResolved = resolvedIssues.has(issue.id);
            const IIcon = issue.icon;
            return (
              <div key={issue.id} className={clsx(
                'flex items-start gap-3 rounded-xl p-4 border transition-all',
                isResolved ? 'bg-earth-800/20 border-earth-800/30 opacity-60' : severityStyles[issue.severity]
              )}>
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  isResolved ? 'bg-green-500/15' : issue.severity === 'high' ? 'bg-red-500/15' : 'bg-amber-500/15'
                )}>
                  {isResolved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <IIcon className={clsx('w-4 h-4', issue.severity === 'high' ? 'text-red-400' : 'text-amber-400')} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={clsx('text-xs font-medium uppercase px-1.5 py-0.5 rounded', severityStyles[issue.severity])}>{issue.severity}</span>
                    <span className="text-xs font-semibold text-earth-200">{issue.title}</span>
                  </div>
                  <p className="text-xs text-earth-400 mb-1">{issue.detail}</p>
                  <div className="flex items-center gap-3 text-[10px] text-earth-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{issue.crew}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.jobAddress}</span>
                  </div>
                </div>
                {!isResolved && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => resolveIssue(issue.id)}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 cursor-pointer transition-colors font-medium"
                    >Resolve</button>
                    <button
                      onClick={() => escalateIssue(issue.id)}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 cursor-pointer transition-colors font-medium"
                    >Tomorrow</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tomorrow's Prep */}
      <div>
        <h3 className="text-sm font-semibold text-earth-200 mb-3 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          Tomorrow's Dispatch
          <span className="text-xs text-earth-500">
            ({confirmedJobs.size}/{tomorrowJobs.length} confirmed)
          </span>
        </h3>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tomorrowJobs.map(job => {
            const isConfirmed = confirmedJobs.has(job.id);
            return (
              <div key={job.id} className={clsx(
                'bg-earth-900/60 border rounded-xl p-4 transition-all',
                isConfirmed ? 'border-green-500/20' : 'border-amber-500/25'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className={clsx(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    isConfirmed ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'
                  )}>{isConfirmed ? 'Confirmed' : 'Unconfirmed'}</span>
                  <span className="text-xs font-semibold text-green-400">${job.revenue}</span>
                </div>
                <div className="text-xs font-medium text-earth-200 mb-0.5">{job.customer}</div>
                <div className="text-[10px] text-earth-500 mb-1">{job.type}</div>
                <div className="text-[10px] text-earth-500 flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3" />{job.address}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-earth-500 flex items-center gap-2">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job.crew}</span>
                    <span>{job.estimatedHours}h</span>
                  </div>
                  {!isConfirmed && (
                    <button
                      onClick={() => confirmJob(job.id)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 cursor-pointer transition-colors font-medium"
                    >Confirm</button>
                  )}
                </div>
                {job.notes && (
                  <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/8 rounded-lg px-2 py-1">{job.notes}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tomorrow Summary */}
        <div className="mt-3 bg-earth-900/60 border border-earth-800/60 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-6 text-xs">
            <div><span className="text-earth-500">Jobs: </span><span className="font-semibold text-earth-200">{tomorrowJobs.length}</span></div>
            <div><span className="text-earth-500">Hours: </span><span className="font-semibold text-earth-200">{tomorrowJobs.reduce((s, j) => s + j.estimatedHours, 0)}h</span></div>
            <div><span className="text-earth-500">Revenue: </span><span className="font-semibold text-green-400">${tomorrowJobs.reduce((s, j) => s + j.revenue, 0).toLocaleString()}</span></div>
          </div>
          <button
            onClick={() => { tomorrowJobs.forEach(j => setConfirmedJobs(prev => { const n = new Set(prev); n.add(j.id); return n; })); addToast('success', 'All jobs confirmed for tomorrow'); }}
            className="text-xs px-3 py-1.5 bg-green-500/15 border border-green-500/25 rounded-lg text-green-400 hover:bg-green-500/25 cursor-pointer transition-colors font-medium"
          >Confirm All</button>
        </div>
      </div>
    </div>
  );
}
