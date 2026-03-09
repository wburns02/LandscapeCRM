import { useState, useMemo, useEffect } from 'react';
import {
  Clock, Play, Square, Plus, DollarSign, TrendingUp,
  Timer, CalendarDays, BarChart3,
} from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import type { TimeEntry, CrewMember } from '../../types';

// ─── Seeded pseudo-random for stable demo data ──────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Demo time entries ───────────────────────────────────────────
function getDemoTimeEntries(
  crews: ReturnType<typeof useData>['crews'],
  jobs: ReturnType<typeof useData>['jobs'],
): TimeEntry[] {
  const allMembers = crews.flatMap(c =>
    (c.members || []).map(m => ({ ...m, crew_id: c.id })),
  );
  const now = new Date();
  const entries: TimeEntry[] = [];
  let id = 1;
  const rand = seededRandom(42);

  // Collect weekdays from past 2 weeks
  const weekdays: Date[] = [];
  for (let day = 13; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    weekdays.push(date);
  }

  // Determine total hour budget per job based on status and estimated hours.
  // Completed jobs: 90-110% of estimated. In-progress: 40-70%. Scheduled/on_hold: 10-30%.
  const activeJobs = jobs.filter(j => j.status !== 'cancelled');
  const jobHourBudgets: Record<string, number> = {};
  for (const job of activeJobs) {
    const est = job.estimated_hours || 4;
    let fraction: number;
    if (job.status === 'completed') {
      fraction = 0.9 + rand() * 0.2; // 90-110%
    } else if (job.status === 'in_progress') {
      fraction = 0.4 + rand() * 0.3; // 40-70%
    } else {
      // scheduled, on_hold, pending
      fraction = 0.1 + rand() * 0.2; // 10-30%
    }
    jobHourBudgets[job.id] = parseFloat((est * fraction).toFixed(1));
  }

  // Track how many hours have been logged per job
  const jobHoursLogged: Record<string, number> = {};
  for (const job of activeJobs) {
    jobHoursLogged[job.id] = 0;
  }

  // For each crew, figure out which days to work each job.
  // We spread the work across the 2-week period, picking 1-2 jobs per day per crew.
  const crewIds = crews.map(c => c.id);

  for (const crewId of crewIds) {
    const crewMembers = allMembers.filter(m => m.crew_id === crewId);
    if (crewMembers.length === 0) continue;

    const crewJobs = activeJobs.filter(j => j.crew_id === crewId);
    if (crewJobs.length === 0) continue;

    // Sort jobs: completed first (they happened earlier), then in_progress, then scheduled
    const statusOrder: Record<string, number> = { completed: 0, in_progress: 1, scheduled: 2, on_hold: 3, pending: 4 };
    const sortedJobs = [...crewJobs].sort(
      (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5),
    );

    // Assign jobs to specific days. Each day a crew works on 1-2 jobs.
    for (let dayIdx = 0; dayIdx < weekdays.length; dayIdx++) {
      const date = weekdays[dayIdx];
      const isToday = dayIdx === weekdays.length - 1;

      // Pick 1-2 jobs for this day that still have budget remaining
      const availableJobs = sortedJobs.filter(
        j => (jobHourBudgets[j.id] - jobHoursLogged[j.id]) > 0.3,
      );
      if (availableJobs.length === 0) continue;

      const jobsToday = rand() > 0.6 && availableJobs.length > 1
        ? [availableJobs[0], availableJobs[1]]
        : [availableJobs[dayIdx % availableJobs.length]];

      let dayStartHour = 7 + Math.floor(rand() * 1); // 7:00 or 7:30ish start

      for (const job of jobsToday) {
        const remainingBudget = jobHourBudgets[job.id] - jobHoursLogged[job.id];
        if (remainingBudget <= 0.3) continue;

        // Total crew hours for this job today = remaining budget spread over days,
        // but capped so crew members each work a reasonable amount (1.5-4h per job per day).
        const maxPerMemberPerJob = 1.5 + rand() * 2.5; // 1.5-4.0 hours each
        const totalCrewHoursNeeded = Math.min(
          remainingBudget,
          crewMembers.length * maxPerMemberPerJob,
        );

        // Each member gets an equal-ish share of the job's hours for today
        const hoursPerMember = totalCrewHoursNeeded / crewMembers.length;

        for (const member of crewMembers) {
          const memberHours = parseFloat(
            Math.max(0.5, hoursPerMember * (0.85 + rand() * 0.3)).toFixed(1),
          );
          // Don't exceed the remaining budget
          const actualHours = parseFloat(
            Math.min(memberHours, jobHourBudgets[job.id] - jobHoursLogged[job.id]).toFixed(1),
          );
          if (actualHours <= 0) break;

          jobHoursLogged[job.id] += actualHours;

          const clockIn = new Date(date);
          clockIn.setHours(dayStartHour, Math.floor(rand() * 30), 0, 0);
          const clockOut = new Date(clockIn);
          clockOut.setHours(
            clockIn.getHours() + Math.floor(actualHours),
            clockIn.getMinutes() + Math.round((actualHours % 1) * 60),
            0,
            0,
          );

          // Today's foreman entries are still running (active timers)
          const isActiveTimer = isToday && member.role === 'foreman';
          const entryClockIn = isActiveTimer
            ? new Date(now.getTime() - (2 + rand()) * 3600000)
            : clockIn;

          entries.push({
            id: String(id++),
            crew_member_id: member.id,
            crew_member: member,
            job_id: job.id,
            job: job,
            clock_in: entryClockIn.toISOString(),
            clock_out: isActiveTimer ? undefined : clockOut.toISOString(),
            hours: isActiveTimer ? 0 : actualHours,
            break_minutes: rand() > 0.7 ? 30 : 0,
            notes: dayIdx % 3 === 0 ? 'Standard shift' : undefined,
            created_at: clockIn.toISOString(),
          });
        }

        dayStartHour += Math.ceil(hoursPerMember) + (rand() > 0.5 ? 1 : 0); // gap between jobs
      }
    }
  }

  return entries;
}

// ─── Live Timer Display ──────────────────────────────────────────
function LiveTimer({ clockIn }: { clockIn: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(clockIn);
  const totalSec = Math.max(0, differenceInSeconds(now, start));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <span className="font-mono text-green-400 font-bold tabular-nums">
      {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ─── Tab type ────────────────────────────────────────────────────
type TabKey = 'timers' | 'entries' | 'costing' | 'performance';

export default function TimeTrackingPage() {
  const { crews, jobs } = useData();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('timers');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);

  // Form state
  const [logForm, setLogForm] = useState({
    crew_member_id: '', job_id: '', hours: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });
  const [clockInForm, setClockInForm] = useState({
    crew_member_id: '', job_id: '',
  });

  // Initialize demo data
  useEffect(() => {
    if (crews.length > 0 && jobs.length > 0 && timeEntries.length === 0) {
      setTimeEntries(getDemoTimeEntries(crews, jobs));
    }
  }, [crews, jobs, timeEntries.length]);

  const allMembers = useMemo(() => crews.flatMap(c => (c.members || []).map(m => ({ ...m, crew_id: c.id, crew_name: c.name, crew_color: c.color }))), [crews]);

  // Active timers = entries with no clock_out
  const activeTimers = useMemo(() => timeEntries.filter(e => !e.clock_out), [timeEntries]);

  // Recent completed entries for KPIs
  const thisWeek = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 14);
    return timeEntries.filter(e => e.clock_out && new Date(e.clock_in) >= cutoff);
  }, [timeEntries]);

  // KPIs
  const totalHoursThisWeek = useMemo(() => thisWeek.reduce((sum, e) => sum + e.hours, 0), [thisWeek]);
  const totalLaborCostThisWeek = useMemo(() => {
    return thisWeek.reduce((sum, e) => {
      const rate = e.crew_member?.hourly_rate || 20;
      return sum + (e.hours * rate);
    }, 0);
  }, [thisWeek]);
  const avgHoursPerMember = useMemo(() => {
    const uniqueMembers = new Set(thisWeek.map(e => e.crew_member_id));
    return uniqueMembers.size > 0 ? totalHoursThisWeek / uniqueMembers.size : 0;
  }, [thisWeek, totalHoursThisWeek]);

  // Job costing data
  const jobCostingData = useMemo(() => {
    return jobs.filter(j => j.status !== 'cancelled').map(job => {
      const jobEntries = timeEntries.filter(e => e.job_id === job.id && e.clock_out);
      const actualHours = jobEntries.reduce((sum, e) => sum + e.hours, 0);
      const laborCost = jobEntries.reduce((sum, e) => sum + (e.hours * (e.crew_member?.hourly_rate || 20)), 0);
      const materialsCost = job.materials_cost || 0;
      const totalCost = laborCost + materialsCost;
      const revenue = job.total_price || 0;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: job.id,
        title: job.title,
        customer: job.customer?.name || 'Unknown',
        status: job.status,
        estimatedHours: job.estimated_hours || 0,
        actualHours,
        laborCost,
        materialsCost,
        totalCost,
        revenue,
        profit,
        margin,
        hoursVariance: actualHours - (job.estimated_hours || 0),
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [jobs, timeEntries]);

  // Crew performance data
  const crewPerformanceData = useMemo(() => {
    return crews.map(crew => {
      const crewEntries = timeEntries.filter(e => {
        const member = allMembers.find(m => m.id === e.crew_member_id);
        return member?.crew_id === crew.id && e.clock_out;
      });
      const totalHours = crewEntries.reduce((sum, e) => sum + e.hours, 0);
      const totalLabor = crewEntries.reduce((sum, e) => sum + (e.hours * (e.crew_member?.hourly_rate || 20)), 0);
      const crewJobs = jobs.filter(j => j.crew_id === crew.id);
      const completedJobs = crewJobs.filter(j => j.status === 'completed');
      const revenue = crewJobs.reduce((sum, j) => sum + (j.total_price || 0), 0);

      return {
        id: crew.id,
        name: crew.name,
        color: crew.color || '#22c55e',
        memberCount: (crew.members || []).length,
        totalHours,
        totalLabor,
        jobsCompleted: completedJobs.length,
        jobsTotal: crewJobs.length,
        revenue,
        avgHoursPerJob: crewJobs.length > 0 ? totalHours / crewJobs.length : 0,
        efficiency: (() => {
          const jobsWithTime = crewJobs.filter(j => {
            const actual = timeEntries.filter(e => e.job_id === j.id && e.clock_out).reduce((s, e) => s + e.hours, 0);
            return actual > 0 && (j.estimated_hours || 0) > 0;
          });
          if (jobsWithTime.length === 0) return 85; // default
          const avgRatio = jobsWithTime.reduce((sum, j) => {
            const estimated = j.estimated_hours || 1;
            const actual = timeEntries.filter(e => e.job_id === j.id && e.clock_out).reduce((s, e) => s + e.hours, 0);
            return sum + Math.min(estimated / actual, 1.5);
          }, 0) / jobsWithTime.length;
          return Math.round(avgRatio * 100);
        })(),
      };
    });
  }, [crews, jobs, timeEntries, allMembers]);

  // Hours by day chart data
  const hoursByDay = useMemo(() => {
    const days: Record<string, number> = {};
    thisWeek.forEach(e => {
      const day = format(new Date(e.clock_in), 'EEE');
      days[day] = (days[day] || 0) + e.hours;
    });
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => ({
      day,
      hours: parseFloat((days[day] || 0).toFixed(1)),
    }));
  }, [thisWeek]);

  // Clock In
  const handleClockIn = () => {
    if (!clockInForm.crew_member_id || !clockInForm.job_id) {
      toast.error('Select a crew member and job');
      return;
    }
    const member = allMembers.find(m => m.id === clockInForm.crew_member_id);
    const job = jobs.find(j => j.id === clockInForm.job_id);
    const entry: TimeEntry = {
      id: `te-${Date.now()}`,
      crew_member_id: clockInForm.crew_member_id,
      crew_member: member as CrewMember,
      job_id: clockInForm.job_id,
      job: job,
      clock_in: new Date().toISOString(),
      hours: 0,
      created_at: new Date().toISOString(),
    };
    setTimeEntries(prev => [entry, ...prev]);
    setShowClockInModal(false);
    setClockInForm({ crew_member_id: '', job_id: '' });
    toast.success(`${member?.name} clocked in to ${job?.title}`);
  };

  // Clock Out
  const handleClockOut = (entryId: string) => {
    setTimeEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      const clockOut = new Date().toISOString();
      const hours = parseFloat((differenceInMinutes(new Date(clockOut), new Date(e.clock_in)) / 60).toFixed(2));
      return { ...e, clock_out: clockOut, hours };
    }));
    toast.success('Timer stopped');
  };

  // Log manual entry
  const handleLogEntry = () => {
    if (!logForm.crew_member_id || !logForm.job_id || !logForm.hours) {
      toast.error('Fill in all required fields');
      return;
    }
    const member = allMembers.find(m => m.id === logForm.crew_member_id);
    const job = jobs.find(j => j.id === logForm.job_id);
    const hours = parseFloat(logForm.hours);
    const clockIn = new Date(logForm.date);
    clockIn.setHours(8, 0, 0, 0);
    const clockOut = new Date(clockIn);
    clockOut.setHours(clockIn.getHours() + Math.floor(hours), Math.round((hours % 1) * 60), 0, 0);

    const entry: TimeEntry = {
      id: `te-${Date.now()}`,
      crew_member_id: logForm.crew_member_id,
      crew_member: member as CrewMember,
      job_id: logForm.job_id,
      job: job,
      clock_in: clockIn.toISOString(),
      clock_out: clockOut.toISOString(),
      hours,
      notes: logForm.notes || undefined,
      created_at: new Date().toISOString(),
    };
    setTimeEntries(prev => [entry, ...prev]);
    setShowLogModal(false);
    setLogForm({ crew_member_id: '', job_id: '', hours: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    toast.success(`${hours}h logged for ${member?.name}`);
  };

  const tabs: { key: TabKey; label: string; icon: typeof Clock }[] = [
    { key: 'timers', label: 'Active Timers', icon: Timer },
    { key: 'entries', label: 'Time Entries', icon: CalendarDays },
    { key: 'costing', label: 'Job Costing', icon: DollarSign },
    { key: 'performance', label: 'Crew Performance', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Time Tracking & Job Costing</h2>
          <p className="text-sm text-earth-400">Track crew hours, monitor job costs, and analyze profitability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowLogModal(true)}>
            Log Time
          </Button>
          <Button icon={<Play className="w-4 h-4" />} onClick={() => setShowClockInModal(true)}>
            Clock In
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Timers"
          value={activeTimers.length}
          icon={<Timer className="w-5 h-5" />}
          color={activeTimers.length > 0 ? 'green' : 'earth'}
        />
        <StatCard
          title="Hours (Recent)"
          value={`${totalHoursThisWeek.toFixed(0)}h`}
          icon={<Clock className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          title="Labor Cost (Recent)"
          value={`$${totalLaborCostThisWeek.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Avg Hrs/Person"
          value={`${avgHoursPerMember.toFixed(1)}h`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-earth-800 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-earth-400 hover:text-earth-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'timers' && (
        <div className="space-y-6">
          {/* Active Timers */}
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-display text-earth-100">
                Running Timers ({activeTimers.length})
              </h3>
              {activeTimers.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
          }>
            {activeTimers.length === 0 ? (
              <div className="text-center py-8">
                <Timer className="w-10 h-10 text-earth-600 mx-auto mb-3" />
                <p className="text-sm text-earth-400">No active timers</p>
                <p className="text-xs text-earth-500 mt-1">Clock in a crew member to start tracking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTimers.map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 rounded-lg bg-green-600/5 border border-green-500/20">
                    <div className="w-10 h-10 rounded-full bg-green-600/15 flex items-center justify-center">
                      <Play className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-earth-100">{entry.crew_member?.name}</p>
                      <p className="text-xs text-earth-400 truncate">
                        {entry.job?.title} — Started {format(new Date(entry.clock_in), 'h:mm a')}
                      </p>
                    </div>
                    <LiveTimer clockIn={entry.clock_in} />
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Square className="w-3.5 h-3.5" />}
                      onClick={() => handleClockOut(entry.id)}
                    >
                      Stop
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hours by Day Chart */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Hours This Week</h3>}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis dataKey="day" stroke="#a68360" fontSize={12} />
                  <YAxis stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `${v}h`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }}
                    formatter={(value: unknown) => [`${Number(value).toFixed(1)}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {hoursByDay.map((_, i) => (
                      <Cell key={i} fill={i === hoursByDay.length - 1 ? '#22c55e' : '#657d1d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Today's Crew Activity */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Today's Crew Activity</h3>}>
            <div className="space-y-2">
              {crews.map(crew => {
                const crewMembers = allMembers.filter(m => m.crew_id === crew.id);
                const activeCount = crewMembers.filter(m => activeTimers.some(t => t.crew_member_id === m.id)).length;
                return (
                  <div key={crew.id} className="flex items-center gap-3 p-3 rounded-lg bg-earth-800/30">
                    <div
                      className="w-3 h-8 rounded-full"
                      style={{ backgroundColor: crew.color || '#22c55e' }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-earth-100">{crew.name}</p>
                      <p className="text-xs text-earth-400">{crewMembers.length} members</p>
                    </div>
                    <Badge color={activeCount > 0 ? 'green' : 'earth'}>
                      {activeCount > 0 ? `${activeCount} active` : 'Idle'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'entries' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-earth-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Crew Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Job</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider hidden lg:table-cell">Time</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Hours</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries
                  .filter(e => e.clock_out)
                  .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())
                  .slice(0, 50)
                  .map(entry => (
                    <tr key={entry.id} className="border-b border-earth-800/50 hover:bg-earth-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-earth-100">{entry.crew_member?.name}</p>
                        <p className="text-xs text-earth-400">{entry.crew_member?.role?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-earth-200 truncate max-w-[200px]">{entry.job?.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-earth-300">
                        {format(new Date(entry.clock_in), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-earth-300 text-xs">
                        {format(new Date(entry.clock_in), 'h:mm a')} — {entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-earth-100">
                        {entry.hours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-earth-200">
                        ${((entry.hours) * (entry.crew_member?.hourly_rate || 20)).toFixed(0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'costing' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="text-center">
                <p className="text-xs text-earth-400 uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-earth-50">
                  ${jobCostingData.reduce((s, j) => s + j.revenue, 0).toLocaleString()}
                </p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-xs text-earth-400 uppercase tracking-wider mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-amber-400">
                  ${jobCostingData.reduce((s, j) => s + j.totalCost, 0).toLocaleString()}
                </p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-xs text-earth-400 uppercase tracking-wider mb-1">Avg Margin</p>
                <p className="text-2xl font-bold text-green-400">
                  {(jobCostingData.reduce((s, j) => s + j.margin, 0) / Math.max(jobCostingData.length, 1)).toFixed(0)}%
                </p>
              </div>
            </Card>
          </div>

          {/* Job Costing Table */}
          <Card padding={false} header={
            <h3 className="text-base font-semibold font-display text-earth-100">Job Profitability</h3>
          }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-earth-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Job</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider hidden sm:table-cell">Est. Hours</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Actual</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider hidden md:table-cell">Labor</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider hidden lg:table-cell">Materials</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-earth-400 uppercase tracking-wider">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCostingData.map(job => (
                    <tr key={job.id} className="border-b border-earth-800/50 hover:bg-earth-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-earth-100 truncate max-w-[200px]">{job.title}</p>
                        <p className="text-xs text-earth-400">{job.customer}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-earth-300 hidden sm:table-cell">
                        {job.estimatedHours}h
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={job.hoursVariance > 2 ? 'text-red-400' : job.hoursVariance < -1 ? 'text-green-400' : 'text-earth-200'}>
                          {job.actualHours.toFixed(1)}h
                        </span>
                        {job.hoursVariance > 0 && (
                          <span className="text-xs text-red-400/70 ml-1">+{job.hoursVariance.toFixed(1)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-earth-300 hidden md:table-cell">
                        ${job.laborCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-earth-300 hidden lg:table-cell">
                        ${job.materialsCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-earth-100">
                        ${job.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge color={job.margin > 30 ? 'green' : job.margin > 15 ? 'amber' : 'red'}>
                          {job.margin.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Crew Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {crewPerformanceData.map(crew => (
              <Card key={crew.id} hover>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-10 rounded-full"
                      style={{ backgroundColor: crew.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-earth-100">{crew.name}</h3>
                      <p className="text-xs text-earth-400">{crew.memberCount} members</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-earth-800/40">
                      <p className="text-xs text-earth-400">Hours Logged</p>
                      <p className="text-lg font-bold text-earth-100">{crew.totalHours.toFixed(0)}h</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-earth-800/40">
                      <p className="text-xs text-earth-400">Labor Cost</p>
                      <p className="text-lg font-bold text-earth-100">${crew.totalLabor.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-earth-800/40">
                      <p className="text-xs text-earth-400">Jobs</p>
                      <p className="text-lg font-bold text-earth-100">
                        {crew.jobsCompleted}/{crew.jobsTotal}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-earth-800/40">
                      <p className="text-xs text-earth-400">Efficiency</p>
                      <p className={`text-lg font-bold ${crew.efficiency >= 90 ? 'text-green-400' : crew.efficiency >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                        {crew.efficiency.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-earth-400">Revenue Generated</span>
                    <span className="font-semibold text-earth-100">${crew.revenue.toLocaleString()}</span>
                  </div>

                  {/* Efficiency bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-earth-400">Avg hrs/job: {crew.avgHoursPerJob.toFixed(1)}h</span>
                    </div>
                    <div className="h-2 bg-earth-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(crew.efficiency, 100)}%`,
                          backgroundColor: crew.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Revenue by Crew Chart */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Revenue by Crew</h3>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={crewPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis type="number" stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#a68360" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }}
                    formatter={(value: unknown) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {crewPerformanceData.map((crew, i) => (
                      <Cell key={i} fill={crew.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Clock In Modal */}
      <Modal
        isOpen={showClockInModal}
        onClose={() => setShowClockInModal(false)}
        title="Clock In"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowClockInModal(false)}>Cancel</Button>
            <Button icon={<Play className="w-4 h-4" />} onClick={handleClockIn}>Start Timer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Crew Member"
            options={[
              { value: '', label: 'Select crew member...' },
              ...allMembers.map(m => ({ value: m.id, label: `${m.name} (${m.crew_name})` })),
            ]}
            value={clockInForm.crew_member_id}
            onChange={e => setClockInForm(f => ({ ...f, crew_member_id: e.target.value }))}
          />
          <Select
            label="Job"
            options={[
              { value: '', label: 'Select job...' },
              ...jobs
                .filter(j => j.status !== 'completed' && j.status !== 'cancelled')
                .map(j => ({ value: j.id, label: `${j.title} — ${j.customer?.name || 'Unknown'}` })),
            ]}
            value={clockInForm.job_id}
            onChange={e => setClockInForm(f => ({ ...f, job_id: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Log Time Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log Time Entry"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLogModal(false)}>Cancel</Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={handleLogEntry}>Log Entry</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Crew Member"
            options={[
              { value: '', label: 'Select crew member...' },
              ...allMembers.map(m => ({ value: m.id, label: `${m.name} (${m.crew_name})` })),
            ]}
            value={logForm.crew_member_id}
            onChange={e => setLogForm(f => ({ ...f, crew_member_id: e.target.value }))}
          />
          <Select
            label="Job"
            options={[
              { value: '', label: 'Select job...' },
              ...jobs.map(j => ({ value: j.id, label: `${j.title} — ${j.customer?.name || 'Unknown'}` })),
            ]}
            value={logForm.job_id}
            onChange={e => setLogForm(f => ({ ...f, job_id: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hours"
              type="number"
              value={logForm.hours}
              onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))}
              placeholder="4.5"
            />
            <Input
              label="Date"
              type="date"
              value={logForm.date}
              onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
          <Input
            label="Notes (optional)"
            value={logForm.notes}
            onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="What was done..."
          />
        </div>
      </Modal>
    </div>
  );
}
