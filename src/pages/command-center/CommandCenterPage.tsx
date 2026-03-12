import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, CloudSun, CloudRain, Cloud, Zap,
  Play, CheckCircle, PauseCircle, Clock, DollarSign,
  AlertTriangle, TrendingUp, ChevronRight, Send,
  Wrench, Package, FileSignature, Target, ArrowRight,
  Users, Briefcase, Receipt, Timer, Star, Calendar,
  CircleDot,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import clsx from 'clsx';
import { format, isBefore, addDays, differenceInDays, parseISO } from 'date-fns';

// ——— Types ———
interface ActionItem {
  id: string;
  type: 'overdue_invoice' | 'cold_lead' | 'maintenance_due' | 'low_stock' | 'expiring_contract' | 'stale_quote' | 'follow_up';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  value?: string;
  icon: typeof AlertTriangle;
  color: string;
  action: { label: string; onClick: () => void };
}

interface CrewDispatch {
  crew: { id: string; name: string; color: string; members: { name: string; role: string }[] };
  todayJobs: { id: string; title: string; customer: string; address: string; time: string; status: string; value: number; estimatedHours: number }[];
  status: 'idle' | 'en_route' | 'on_site' | 'completed';
  revenueToday: number;
  hoursWorked: number;
  hoursRemaining: number;
}

// ——— Weather simulation ———
const weatherConditions = [
  { icon: Sun, label: 'Clear & Sunny', temp: 82, impact: 'perfect', color: 'text-amber-400', advice: 'Perfect conditions — full schedule ahead.' },
  { icon: CloudSun, label: 'Partly Cloudy', temp: 78, impact: 'good', color: 'text-amber-300', advice: 'Great working weather. UV index moderate.' },
  { icon: Cloud, label: 'Overcast', temp: 72, impact: 'good', color: 'text-earth-400', advice: 'Cool and comfortable. Ideal for hardscape work.' },
  { icon: CloudRain, label: 'Rain Expected', temp: 68, impact: 'warning', color: 'text-sky-400', advice: 'Rain at 2 PM — move outdoor installs to morning.' },
];

// ——— Greeting helper ———
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTimeOfDayEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '';
  if (hour < 12) return '';
  if (hour < 18) return '';
  return '';
}

// ——— Animated counter ———
function AnimatedNumber({ value, prefix = '', duration = 1000 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = 0;
    const end = value;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <span>{prefix}{display.toLocaleString()}</span>;
}

// ——— Progress ring ———
function ProgressRing({ progress, size = 48, stroke = 4, color = '#22c55e' }: { progress: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#3d3027" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

// ——— Pulse dot ———
function PulseDot({ color = 'bg-green-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)} />
      <span className={clsx('relative inline-flex rounded-full h-2.5 w-2.5', color)} />
    </span>
  );
}

// ——— Main Component ———
export default function CommandCenterPage() {
  const {
    jobs, customers, crews, invoices, quotes, leads, contracts,
    equipment, inventory, recurringServices, expenses,
    updateJobStatus, isLoading, settings,
  } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [weather] = useState(() => weatherConditions[Math.floor(Math.random() * 2)]); // bias toward good weather
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedCrew, setExpandedCrew] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [animateIn, setAnimateIn] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // ——— Derived Data ———
  // In demo mode, treat all scheduled/in_progress jobs as "today's board"
  // In production, this would filter by actual date
  const todaysJobs = useMemo(() =>
    jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress'),
    [jobs]
  );

  const completedToday = useMemo(() =>
    jobs.filter(j => j.status === 'completed').length,
    [jobs]
  );

  const todaysRevenue = useMemo(() =>
    todaysJobs.reduce((sum, j) => sum + ((j as any).total_cost ?? j.labor_cost ?? 0), 0),
    [todaysJobs]
  );

  const totalScheduledRevenue = useMemo(() =>
    jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress')
      .reduce((sum, j) => sum + ((j as any).total_cost ?? j.labor_cost ?? 0), 0),
    [jobs]
  );

  const overdueInvoices = useMemo(() =>
    invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && isBefore(parseISO(i.due_date), new Date()))),
    [invoices]
  );

  const overdueTotal = useMemo(() =>
    overdueInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.amount_paid || 0)), 0),
    [overdueInvoices]
  );

  const paidToday = useMemo(() =>
    invoices.filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0),
    [invoices]
  );

  const pendingQuotes = useMemo(() =>
    quotes.filter(q => q.status === 'sent' || q.status === 'draft'),
    [quotes]
  );

  const pendingQuoteValue = useMemo(() =>
    pendingQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
    [pendingQuotes]
  );

  // ——— Crew Dispatch Board Data ———
  const crewDispatches: CrewDispatch[] = useMemo(() => {
    return crews.map(crew => {
      const crewJobs = jobs.filter(j =>
        j.crew_id === crew.id && j.status !== 'cancelled' && j.status !== 'completed'
      );
      const completedCrewJobs = jobs.filter(j => j.crew_id === crew.id && j.status === 'completed');
      const inProgressJob = crewJobs.find(j => j.status === 'in_progress');

      let status: CrewDispatch['status'] = 'idle';
      if (inProgressJob) status = 'on_site';
      else if (crewJobs.length > 0) status = 'en_route';
      if (crewJobs.length === 0 && completedCrewJobs.length > 0) status = 'completed';

      return {
        crew: {
          id: crew.id,
          name: crew.name,
          color: crew.color || '#22c55e',
          members: (crew.members || []).map(m => ({ name: m.name, role: m.role })),
        },
        todayJobs: [...crewJobs, ...completedCrewJobs].map(j => ({
          id: j.id,
          title: j.title,
          customer: j.customer?.name || 'Unknown Customer',
          address: j.address || j.customer?.address || '',
          time: j.scheduled_time || '8:00 AM',
          status: j.status,
          value: (j as any).total_cost ?? j.labor_cost ?? 0,
          estimatedHours: j.estimated_hours || 2,
        })),
        status,
        revenueToday: [...crewJobs, ...completedCrewJobs].reduce((s, j) => s + ((j as any).total_cost ?? j.labor_cost ?? 0), 0),
        hoursWorked: completedCrewJobs.reduce((s, j) => s + (j.actual_hours || j.estimated_hours || 0), 0),
        hoursRemaining: crewJobs.reduce((s, j) => s + (j.estimated_hours || 2), 0),
      };
    });
  }, [crews, jobs]);

  // ——— Smart Action Items ———
  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];

    // Overdue invoices
    overdueInvoices.forEach(inv => {
      items.push({
        id: `inv-${inv.id}`,
        type: 'overdue_invoice',
        priority: 'urgent',
        title: `Invoice ${inv.invoice_number || inv.id} overdue`,
        subtitle: inv.customer?.name || 'Unknown customer',
        value: `$${((inv.total || 0) - (inv.amount_paid || 0)).toLocaleString()}`,
        icon: Receipt,
        color: 'text-red-400',
        action: {
          label: 'Send Reminder',
          onClick: () => {
            toast.success(`Payment reminder sent for ${inv.invoice_number || 'invoice'}`);
            setCompletedActions(prev => new Set(prev).add(`inv-${inv.id}`));
          },
        },
      });
    });

    // Cold leads (no follow-up in 7+ days)
    leads.filter(l => l.status !== 'won' && l.status !== 'lost').forEach(lead => {
      const daysSince = lead.follow_up_date
        ? differenceInDays(new Date(), parseISO(lead.follow_up_date))
        : 14;
      if (daysSince >= 7 || lead.status === 'new') {
        items.push({
          id: `lead-${lead.id}`,
          type: 'cold_lead',
          priority: daysSince > 14 ? 'high' : 'medium',
          title: `${lead.name} — follow up needed`,
          subtitle: `${lead.service_interest || 'Landscaping'} · Est. $${(lead.estimated_value || 0).toLocaleString()}`,
          value: daysSince > 0 ? `${daysSince}d overdue` : 'Due today',
          icon: Target,
          color: 'text-amber-400',
          action: {
            label: 'Call Now',
            onClick: () => {
              toast.success(`Calling ${lead.name}... (${lead.phone || 'No phone'})`);
              setCompletedActions(prev => new Set(prev).add(`lead-${lead.id}`));
            },
          },
        });
      }
    });

    // Equipment maintenance due
    equipment.filter(e => e.status === 'maintenance' || (e.next_maintenance && isBefore(parseISO(e.next_maintenance), addDays(new Date(), 7)))).forEach(eq => {
      items.push({
        id: `equip-${eq.id}`,
        type: 'maintenance_due',
        priority: eq.status === 'maintenance' ? 'high' : 'medium',
        title: `${eq.name} — maintenance ${eq.status === 'maintenance' ? 'needed' : 'due soon'}`,
        subtitle: eq.serial_number ? `S/N: ${eq.serial_number}` : eq.type || 'Equipment',
        icon: Wrench,
        color: 'text-amber-400',
        action: {
          label: 'Schedule Service',
          onClick: () => {
            toast.success(`Service scheduled for ${eq.name}`);
            setCompletedActions(prev => new Set(prev).add(`equip-${eq.id}`));
          },
        },
      });
    });

    // Low stock items
    inventory.filter(i => (i.quantity ?? 0) <= (i.min_stock ?? 0) && (i.min_stock ?? 0) > 0).forEach(item => {
      items.push({
        id: `stock-${item.id}`,
        type: 'low_stock',
        priority: item.quantity === 0 ? 'urgent' : 'medium',
        title: `${item.name} — ${item.quantity === 0 ? 'OUT OF STOCK' : 'low stock'}`,
        subtitle: `${item.quantity} ${item.unit || 'units'} remaining (min: ${item.min_stock})`,
        icon: Package,
        color: item.quantity === 0 ? 'text-red-400' : 'text-amber-400',
        action: {
          label: 'Reorder',
          onClick: () => {
            toast.success(`Reorder placed for ${item.name} from ${item.supplier || 'supplier'}`);
            setCompletedActions(prev => new Set(prev).add(`stock-${item.id}`));
          },
        },
      });
    });

    // Expiring contracts (within 30 days)
    contracts.filter(c => c.is_active && c.end_date).forEach(contract => {
      const daysUntil = differenceInDays(parseISO(contract.end_date!), new Date());
      if (daysUntil >= 0 && daysUntil <= 30) {
        items.push({
          id: `contract-${contract.id}`,
          type: 'expiring_contract',
          priority: daysUntil <= 7 ? 'high' : 'medium',
          title: `${contract.title || contract.customer?.name} — contract expiring`,
          subtitle: `$${(contract.monthly_value || 0).toLocaleString()}/mo · ${daysUntil} days left`,
          icon: FileSignature,
          color: 'text-amber-400',
          action: {
            label: 'Renew',
            onClick: () => {
              toast.success(`Renewal proposal sent for ${contract.title || 'contract'}`);
              setCompletedActions(prev => new Set(prev).add(`contract-${contract.id}`));
            },
          },
        });
      }
    });

    // Stale quotes (sent > 5 days ago)
    quotes.filter(q => q.status === 'sent' && q.sent_at).forEach(quote => {
      const daysSince = differenceInDays(new Date(), parseISO(quote.sent_at!));
      if (daysSince >= 5) {
        items.push({
          id: `quote-${quote.id}`,
          type: 'stale_quote',
          priority: daysSince > 10 ? 'high' : 'medium',
          title: `Quote for ${quote.customer?.name || 'customer'} — no response`,
          subtitle: `$${(quote.total || 0).toLocaleString()} · Sent ${daysSince} days ago`,
          icon: Send,
          color: 'text-sky-400',
          action: {
            label: 'Follow Up',
            onClick: () => {
              toast.success(`Follow-up sent for quote to ${quote.customer?.name || 'customer'}`);
              setCompletedActions(prev => new Set(prev).add(`quote-${quote.id}`));
            },
          },
        });
      }
    });

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items.filter(item => !completedActions.has(item.id));
  }, [overdueInvoices, leads, equipment, inventory, contracts, quotes, completedActions, toast]);

  // ——— Morning Briefing Text ———
  const briefing = useMemo(() => {
    const parts: string[] = [];
    const jobCount = todaysJobs.length + completedToday;
    if (jobCount > 0) {
      parts.push(`${jobCount} job${jobCount !== 1 ? 's' : ''} on the board worth $${todaysRevenue.toLocaleString()}`);
    } else {
      parts.push('No jobs scheduled — time to fill the pipeline');
    }

    const activeCrew = crewDispatches.filter(c => c.status !== 'idle');
    if (activeCrew.length > 0) {
      parts.push(`${activeCrew.length} crew${activeCrew.length !== 1 ? 's' : ''} active`);
    }

    if (overdueTotal > 0) {
      parts.push(`$${overdueTotal.toLocaleString()} overdue`);
    }

    if (actionItems.length > 0) {
      const urgentCount = actionItems.filter(a => a.priority === 'urgent').length;
      if (urgentCount > 0) {
        parts.push(`${urgentCount} urgent action${urgentCount !== 1 ? 's' : ''} needed`);
      }
    }

    return parts.join(' · ');
  }, [todaysJobs, completedToday, todaysRevenue, crewDispatches, overdueTotal, actionItems]);

  // ——— Skeleton Loader ———
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="rounded-2xl bg-earth-900/40 h-32 border border-earth-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-earth-900/40 h-64 border border-earth-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-earth-900/40 h-48 border border-earth-800" />
          <div className="rounded-xl bg-earth-900/40 h-48 border border-earth-800" />
        </div>
      </div>
    );
  }

  const dayProgress = Math.min(100, Math.round(((new Date().getHours() - 6) / 12) * 100));
  const WeatherIcon = weather.icon;

  const handleStartJob = async (jobId: string, jobTitle: string) => {
    try {
      await updateJobStatus(jobId, 'in_progress');
      toast.success(`Started: ${jobTitle}`);
    } catch {
      toast.error('Failed to start job');
    }
  };

  const handleCompleteJob = async (jobId: string, jobTitle: string) => {
    try {
      await updateJobStatus(jobId, 'completed');
      toast.success(`Completed: ${jobTitle} — nice work!`);
    } catch {
      toast.error('Failed to complete job');
    }
  };

  return (
    <div className={clsx('space-y-6 transition-all duration-700', animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>

      {/* ==================== MORNING BRIEFING ==================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900/30 via-earth-900/60 to-earth-950 border border-green-800/30 p-6 lg:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold font-display text-earth-50">
                {getGreeting()}{getTimeOfDayEmoji() ? ` ${getTimeOfDayEmoji()}` : ''}
              </h1>
              <span className="text-sm text-earth-400 font-medium">
                {format(currentTime, 'EEEE, MMMM d')}
              </span>
            </div>
            <p className="text-earth-300 text-sm lg:text-base max-w-2xl">
              {briefing}
            </p>
          </div>

          {/* Weather compact */}
          <div className="flex items-center gap-3 bg-earth-900/50 rounded-xl px-4 py-3 border border-earth-800/60 shrink-0">
            <WeatherIcon className={clsx('w-8 h-8', weather.color)} />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-earth-50">{weather.temp}°F</span>
                <span className="text-xs text-earth-400">{weather.label}</span>
              </div>
              <p className="text-xs text-earth-400 max-w-[200px]">{weather.advice}</p>
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Today's Jobs", value: todaysJobs.length + completedToday, icon: Briefcase, accent: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Expected Revenue', value: `$${todaysRevenue.toLocaleString()}`, icon: DollarSign, accent: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Actions Needed', value: actionItems.length, icon: AlertTriangle, accent: actionItems.some(a => a.priority === 'urgent') ? 'text-red-400' : 'text-amber-400', bg: actionItems.some(a => a.priority === 'urgent') ? 'bg-red-500/10' : 'bg-amber-500/10' },
            { label: 'Pipeline Value', value: `$${pendingQuoteValue.toLocaleString()}`, icon: TrendingUp, accent: 'text-sky-400', bg: 'bg-sky-500/10' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 bg-earth-900/40 rounded-xl px-4 py-3 border border-earth-800/40">
              <div className={clsx('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={clsx('w-4 h-4', stat.accent)} />
              </div>
              <div>
                <p className="text-xs text-earth-400">{stat.label}</p>
                <p className="text-lg font-bold font-display text-earth-50">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== CREW DISPATCH BOARD ==================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-display text-earth-100">Crew Dispatch</h2>
            <PulseDot color="bg-green-500" />
            <span className="text-xs text-earth-500 uppercase tracking-wide">Live</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-earth-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{format(currentTime, 'h:mm a')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {crewDispatches.map((dispatch, idx) => {
            const isExpanded = expandedCrew === dispatch.crew.id;
            const statusColors = {
              idle: { bg: 'bg-earth-700/40', text: 'text-earth-400', label: 'Idle', dot: 'bg-earth-500' },
              en_route: { bg: 'bg-sky-600/20', text: 'text-sky-400', label: 'En Route', dot: 'bg-sky-500' },
              on_site: { bg: 'bg-green-600/20', text: 'text-green-400', label: 'On Site', dot: 'bg-green-500' },
              completed: { bg: 'bg-amber-600/20', text: 'text-amber-400', label: 'Day Complete', dot: 'bg-amber-500' },
            };
            const sc = statusColors[dispatch.status];
            const totalHours = dispatch.hoursWorked + dispatch.hoursRemaining;
            const progress = totalHours > 0 ? Math.round((dispatch.hoursWorked / totalHours) * 100) : 0;

            return (
              <div
                key={dispatch.crew.id}
                className={clsx(
                  'rounded-xl border bg-earth-900/60 overflow-hidden transition-all duration-300',
                  isExpanded ? 'border-green-700/50 shadow-lg shadow-green-900/20' : 'border-earth-800 hover:border-earth-700',
                )}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Crew Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedCrew(isExpanded ? null : dispatch.crew.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dispatch.crew.color }} />
                      <h3 className="font-semibold text-earth-100">{dispatch.crew.name}</h3>
                    </div>
                    <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', sc.bg, sc.text)}>
                      <PulseDot color={sc.dot} />
                      {sc.label}
                    </div>
                  </div>

                  {/* Crew members */}
                  <div className="flex items-center gap-1 mb-3">
                    {dispatch.crew.members.slice(0, 4).map((m, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-earth-700 border-2 border-earth-900 flex items-center justify-center text-[10px] font-bold text-earth-300 -ml-1 first:ml-0"
                        title={`${m.name} (${m.role})`}
                      >
                        {m.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                    <span className="text-xs text-earth-500 ml-1">{dispatch.crew.members.length} members</span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-earth-400">{dispatch.todayJobs.length} jobs</span>
                        <span className="text-earth-400">${dispatch.revenueToday.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%`, backgroundColor: dispatch.crew.color }}
                        />
                      </div>
                    </div>
                    <ProgressRing progress={progress} size={36} stroke={3} color={dispatch.crew.color} />
                  </div>
                </div>

                {/* Expanded: Today's Jobs */}
                {isExpanded && (
                  <div className="border-t border-earth-800 bg-earth-950/40">
                    {dispatch.todayJobs.length === 0 ? (
                      <div className="p-4 text-center text-sm text-earth-500">
                        No jobs assigned today
                      </div>
                    ) : (
                      <div className="divide-y divide-earth-800/60">
                        {dispatch.todayJobs.map(job => (
                          <div key={job.id} className="p-3 hover:bg-earth-800/20 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                                  {job.status === 'in_progress' && <Play className="w-4 h-4 text-amber-400 shrink-0" />}
                                  {job.status === 'scheduled' && <CircleDot className="w-4 h-4 text-sky-400 shrink-0" />}
                                  {job.status === 'on_hold' && <PauseCircle className="w-4 h-4 text-earth-400 shrink-0" />}
                                  <p className={clsx('text-sm font-medium truncate', job.status === 'completed' ? 'text-earth-500 line-through' : 'text-earth-100')}>
                                    {job.title}
                                  </p>
                                </div>
                                <p className="text-xs text-earth-400 mt-0.5 ml-6">{job.customer}</p>
                                <div className="flex items-center gap-3 mt-1 ml-6">
                                  <span className="text-xs text-earth-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />{job.time}
                                  </span>
                                  <span className="text-xs text-earth-500 flex items-center gap-1">
                                    <Timer className="w-3 h-3" />{job.estimatedHours}h
                                  </span>
                                  <span className="text-xs text-green-400 font-medium">${job.value.toLocaleString()}</span>
                                </div>
                              </div>

                              {/* One-click actions */}
                              {job.status === 'scheduled' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStartJob(job.id, job.title); }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 text-xs font-medium rounded-lg hover:bg-green-600/30 transition-colors cursor-pointer shrink-0"
                                >
                                  <Play className="w-3 h-3" />
                                  Start
                                </button>
                              )}
                              {job.status === 'in_progress' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCompleteJob(job.id, job.title); }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-600/30 transition-colors cursor-pointer shrink-0"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== MONEY PULSE + ACTION ITEMS ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Money Pulse */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold font-display text-earth-100 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Money Pulse
          </h2>
          <Card>
            <div className="space-y-4">
              {/* Revenue gauge */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-earth-400 uppercase tracking-wide">Expected Today</p>
                  <p className="text-3xl font-bold font-display text-green-400">
                    <AnimatedNumber value={todaysRevenue} prefix="$" />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-earth-400">Pipeline</p>
                  <p className="text-lg font-semibold text-earth-200">${totalScheduledRevenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="h-px bg-earth-800" />

              {/* Financial line items */}
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between p-3 rounded-lg bg-green-600/10 border border-green-800/30 cursor-pointer hover:bg-green-600/15 transition-colors"
                  onClick={() => navigate('/invoices')}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-earth-200">Payments Collected</span>
                  </div>
                  <span className="text-sm font-bold text-green-400">${paidToday.toLocaleString()}</span>
                </div>

                {overdueTotal > 0 && (
                  <div
                    className="flex items-center justify-between p-3 rounded-lg bg-red-600/10 border border-red-800/30 cursor-pointer hover:bg-red-600/15 transition-colors"
                    onClick={() => navigate('/invoices')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-earth-200">Overdue ({overdueInvoices.length})</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">${overdueTotal.toLocaleString()}</span>
                  </div>
                )}

                <div
                  className="flex items-center justify-between p-3 rounded-lg bg-sky-600/10 border border-sky-800/30 cursor-pointer hover:bg-sky-600/15 transition-colors"
                  onClick={() => navigate('/quotes')}
                >
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4 text-sky-400" />
                    <span className="text-sm text-earth-200">Pending Quotes ({pendingQuotes.length})</span>
                  </div>
                  <span className="text-sm font-bold text-sky-400">${pendingQuoteValue.toLocaleString()}</span>
                </div>

                <div
                  className="flex items-center justify-between p-3 rounded-lg bg-earth-800/30 border border-earth-700/30 cursor-pointer hover:bg-earth-800/40 transition-colors"
                  onClick={() => navigate('/leads')}
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-earth-200">Hot Leads</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">
                    {leads.filter(l => l.status === 'new' || l.status === 'contacted').length} active
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Smart Action Queue */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display text-earth-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Action Queue
              {actionItems.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-600/20 text-amber-400">
                  {actionItems.length}
                </span>
              )}
            </h2>
            {completedActions.size > 0 && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {completedActions.size} resolved
              </span>
            )}
          </div>

          {actionItems.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-600/15 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-earth-100 mb-1">All clear!</h3>
                <p className="text-sm text-earth-400">No urgent actions needed. Your business is running smoothly.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {actionItems.slice(0, 6).map((item, idx) => (
                <div
                  key={item.id}
                  className={clsx(
                    'flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-300 group',
                    item.priority === 'urgent'
                      ? 'bg-red-900/10 border-red-800/30 hover:border-red-700/50'
                      : item.priority === 'high'
                      ? 'bg-amber-900/10 border-amber-800/20 hover:border-amber-700/40'
                      : 'bg-earth-900/40 border-earth-800 hover:border-earth-700',
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={clsx(
                    'p-2 rounded-lg shrink-0',
                    item.priority === 'urgent' ? 'bg-red-600/15' : item.priority === 'high' ? 'bg-amber-600/15' : 'bg-earth-800/50'
                  )}>
                    <item.icon className={clsx('w-4 h-4', item.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-earth-100 truncate">{item.title}</p>
                      {item.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-red-600/20 text-red-400 shrink-0">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-earth-400 truncate">{item.subtitle}</p>
                  </div>

                  {item.value && (
                    <span className={clsx('text-sm font-semibold shrink-0', item.color)}>
                      {item.value}
                    </span>
                  )}

                  <button
                    onClick={item.action.onClick}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer shrink-0',
                      'opacity-80 group-hover:opacity-100',
                      item.priority === 'urgent'
                        ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                        : item.priority === 'high'
                        ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                        : 'bg-earth-700/40 text-earth-300 hover:bg-earth-700/60'
                    )}
                  >
                    {item.action.label}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {actionItems.length > 6 && (
                <button className="w-full py-2.5 text-center text-sm text-earth-400 hover:text-earth-200 transition-colors cursor-pointer">
                  View {actionItems.length - 6} more actions...
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== QUICK ACCESS BAR ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'New Job', icon: Briefcase, path: '/jobs', color: 'from-green-600/20 to-green-800/10 border-green-700/30 hover:border-green-600/50', iconColor: 'text-green-400' },
          { label: 'Create Invoice', icon: Receipt, path: '/invoices', color: 'from-sky-600/20 to-sky-800/10 border-sky-700/30 hover:border-sky-600/50', iconColor: 'text-sky-400' },
          { label: 'View Schedule', icon: Calendar, path: '/schedule', color: 'from-amber-600/20 to-amber-800/10 border-amber-700/30 hover:border-amber-600/50', iconColor: 'text-amber-400' },
          { label: 'Team Status', icon: Users, path: '/crews', color: 'from-earth-600/20 to-earth-700/10 border-earth-600/30 hover:border-earth-500/50', iconColor: 'text-earth-300' },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={clsx(
              'flex items-center gap-3 px-5 py-4 rounded-xl border bg-gradient-to-br transition-all duration-200 cursor-pointer',
              'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
              item.color
            )}
          >
            <item.icon className={clsx('w-5 h-5', item.iconColor)} />
            <span className="text-sm font-medium text-earth-100">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-earth-500 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
