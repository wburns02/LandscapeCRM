import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Zap, ArrowRight,
  AlertTriangle, CheckCircle, Clock, Users, Briefcase, Receipt,
  Star, ChevronRight, RefreshCw, Send, Phone, FileText, Sparkles,
  Award, BarChart3, PieChart as PieChartIcon, ArrowUpRight, Percent,
  Wallet, CreditCard, Calendar, ShieldCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import clsx from 'clsx';
import { format, differenceInDays, parseISO, subMonths } from 'date-fns';

// ——— Animated Number ———
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 800 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const end = value;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ——— Revenue Gauge ———
function RevenueGauge({ current, goal, label }: { current: number; goal: number; label: string }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 100 ? '#22c55e' : pct >= 70 ? '#22c55e' : pct >= 40 ? '#fbbf24' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#3d3027"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1500 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
        {/* Percentage text */}
        <text x="100" y="80" textAnchor="middle" className="fill-earth-50 text-2xl font-bold" style={{ fontSize: '28px', fontWeight: 700 }}>
          {pct}%
        </text>
        <text x="100" y="100" textAnchor="middle" className="fill-earth-400" style={{ fontSize: '11px' }}>
          {label}
        </text>
      </svg>
      <div className="flex items-center gap-4 mt-2">
        <div className="text-center">
          <p className="text-xs text-earth-500">Current</p>
          <p className="text-lg font-bold text-earth-100">${current.toLocaleString()}</p>
        </div>
        <div className="h-8 w-px bg-earth-800" />
        <div className="text-center">
          <p className="text-xs text-earth-500">Goal</p>
          <p className="text-lg font-bold text-earth-400">${goal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// ——— Smart Action Card ———
function SmartAction({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  impact,
  impactColor,
  actionLabel,
  onAction,
  completed,
  index,
}: {
  icon: typeof DollarSign;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  impact: string;
  impactColor: string;
  actionLabel: string;
  onAction: () => void;
  completed: boolean;
  index: number;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-4 p-4 rounded-xl border transition-all duration-300',
        completed
          ? 'bg-green-900/10 border-green-800/30 opacity-60'
          : 'bg-earth-900/40 border-earth-800 hover:border-earth-700 hover:bg-earth-900/60',
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={clsx('p-2.5 rounded-xl shrink-0', iconBg)}>
        {completed ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <Icon className={clsx('w-5 h-5', iconColor)} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={clsx('text-sm font-medium truncate', completed ? 'text-earth-500 line-through' : 'text-earth-100')}>
            {title}
          </p>
        </div>
        <p className="text-xs text-earth-400 mt-0.5 truncate">{description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={clsx('text-sm font-bold', impactColor)}>{impact}</span>
        {!completed && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 text-xs font-medium rounded-lg hover:bg-green-600/30 transition-colors cursor-pointer"
          >
            {actionLabel}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ——— Pie chart colors ———
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ——— Recharts tooltip style ———
const tooltipStyle = { backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' };

// ——— Main Component ———
export default function BusinessInsightsPage() {
  const {
    jobs, invoices, quotes, leads, contracts, recurringServices, expenses,
    crews, customers, dashboard, isLoading,
  } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [monthlyGoal, setMonthlyGoal] = useState(35000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('35000');
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [animateIn, setAnimateIn] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'profit' | 'forecast'>('overview');

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // ——— Revenue Calculations ———
  const revenue = useMemo(() => {
    const mtd = dashboard?.revenue_mtd || 12450;
    const ytd = dashboard?.revenue_ytd || 87320;
    const prevMonth = 32400; // Feb revenue from dashboard data
    const monthlyGrowth = mtd > 0 && prevMonth > 0 ? Math.round(((mtd / prevMonth) - 1) * 100) : 0;

    const collected = invoices
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + (i.total || 0), 0);

    const outstanding = invoices
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);

    const overdue = invoices
      .filter(i => i.status === 'overdue')
      .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);

    return { mtd, ytd, collected, outstanding, overdue, monthlyGrowth, prevMonth };
  }, [invoices, dashboard]);

  // ——— Profit Analysis ———
  const profitAnalysis = useMemo(() => {
    const jobProfits = jobs
      .filter(j => j.total_price && j.total_price > 0)
      .map(j => {
        const revenue = j.total_price || 0;
        const costs = (j.materials_cost || 0) + (j.labor_cost || 0);
        const profit = revenue - costs;
        const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
        return { ...j, profit, margin, costs };
      });

    // By job type
    const byType: Record<string, { revenue: number; costs: number; count: number }> = {};
    jobProfits.forEach(j => {
      const type = j.type || 'other';
      if (!byType[type]) byType[type] = { revenue: 0, costs: 0, count: 0 };
      byType[type].revenue += j.total_price || 0;
      byType[type].costs += j.costs;
      byType[type].count++;
    });

    const typeBreakdown = Object.entries(byType)
      .map(([type, data]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
        revenue: data.revenue,
        costs: data.costs,
        profit: data.revenue - data.costs,
        margin: data.revenue > 0 ? Math.round(((data.revenue - data.costs) / data.revenue) * 100) : 0,
        count: data.count,
      }))
      .sort((a, b) => b.margin - a.margin);

    // By crew
    const byCrew: Record<string, { revenue: number; costs: number; count: number; crewName: string; color: string }> = {};
    jobProfits.forEach(j => {
      const crewId = j.crew_id || 'unassigned';
      const crew = crews.find(c => c.id === crewId);
      if (!byCrew[crewId]) byCrew[crewId] = { revenue: 0, costs: 0, count: 0, crewName: crew?.name || 'Unassigned', color: crew?.color || '#666' };
      byCrew[crewId].revenue += j.total_price || 0;
      byCrew[crewId].costs += j.costs;
      byCrew[crewId].count++;
    });

    const crewBreakdown = Object.entries(byCrew)
      .map(([_, data]) => ({
        name: data.crewName,
        revenue: data.revenue,
        profit: data.revenue - data.costs,
        margin: data.revenue > 0 ? Math.round(((data.revenue - data.costs) / data.revenue) * 100) : 0,
        count: data.count,
        color: data.color,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = jobProfits.reduce((s, j) => s + (j.total_price || 0), 0);
    const totalCosts = jobProfits.reduce((s, j) => s + j.costs, 0);
    const avgMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalCosts) / totalRevenue) * 100) : 0;

    return { jobProfits, typeBreakdown, crewBreakdown, totalRevenue, totalCosts, avgMargin };
  }, [jobs, crews]);

  // ——— Recurring Revenue ———
  const recurringRevenue = useMemo(() => {
    const activeServices = recurringServices.filter(s => s.status === 'active');
    let monthlyRecurring = 0;
    activeServices.forEach(s => {
      const perVisit = s.price_per_visit || 0;
      switch (s.frequency) {
        case 'weekly': monthlyRecurring += perVisit * 4.33; break;
        case 'biweekly': monthlyRecurring += perVisit * 2.17; break;
        case 'monthly': monthlyRecurring += perVisit; break;
        case 'quarterly': monthlyRecurring += perVisit / 3; break;
      }
    });

    const activeContracts = contracts.filter(c => c.is_active);
    const contractMonthly = activeContracts.reduce((s, c) => s + (c.monthly_value || 0), 0);

    return {
      serviceMonthly: Math.round(monthlyRecurring),
      contractMonthly,
      totalMonthly: Math.round(monthlyRecurring + contractMonthly),
      annualized: Math.round((monthlyRecurring + contractMonthly) * 12),
      activeServices: activeServices.length,
      activeContracts: activeContracts.length,
    };
  }, [recurringServices, contracts]);

  // ——— Pipeline ———
  const pipeline = useMemo(() => {
    const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
    const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
    const pendingQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft');
    const quotesValue = pendingQuotes.reduce((s, q) => s + (q.total || 0), 0);
    const wonValue = leads.filter(l => l.status === 'won').reduce((s, l) => s + (l.estimated_value || 0), 0);

    return { activeLeads: activeLeads.length, pipelineValue, pendingQuotes: pendingQuotes.length, quotesValue, wonValue };
  }, [leads, quotes]);

  // ——— Cash Flow Data ———
  const cashFlowData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenueByMonth = dashboard?.revenue_by_month || [
      { month: 'Jan', revenue: 28500, expenses: 18200 },
      { month: 'Feb', revenue: 32400, expenses: 19800 },
      { month: 'Mar', revenue: 12450, expenses: 8100 },
    ];

    // Forecast next 3 months based on recurring + trend
    const avgGrowth = 1.05;
    const lastRevenue = revenueByMonth[revenueByMonth.length - 1]?.revenue || 12450;
    const lastExpenses = revenueByMonth[revenueByMonth.length - 1]?.expenses || 8100;

    const forecast = revenueByMonth.map(m => ({ ...m, forecast: false }));
    for (let i = 0; i < 3; i++) {
      const projected = Math.round(lastRevenue * Math.pow(avgGrowth, i + 1) + recurringRevenue.totalMonthly * 0.4);
      const projExpense = Math.round(lastExpenses * Math.pow(1.02, i + 1));
      forecast.push({
        month: months[revenueByMonth.length + i] || `M${revenueByMonth.length + i + 1}`,
        revenue: projected,
        expenses: projExpense,
        forecast: true,
      });
    }

    return forecast;
  }, [dashboard, recurringRevenue]);

  // ——— Revenue Breakdown Pie ———
  const revenueBreakdown = useMemo(() => {
    const completedJobRevenue = jobs
      .filter(j => j.status === 'completed')
      .reduce((s, j) => s + (j.total_price || 0), 0);
    const scheduledRevenue = jobs
      .filter(j => j.status === 'scheduled' || j.status === 'in_progress')
      .reduce((s, j) => s + (j.total_price || 0), 0);

    return [
      { name: 'Completed Jobs', value: completedJobRevenue },
      { name: 'In Progress', value: scheduledRevenue },
      { name: 'Recurring (Monthly)', value: recurringRevenue.serviceMonthly },
      { name: 'Contracts (Monthly)', value: recurringRevenue.contractMonthly },
      { name: 'Pipeline Quotes', value: pipeline.quotesValue },
    ].filter(d => d.value > 0);
  }, [jobs, recurringRevenue, pipeline]);

  // ——— Smart Recommendations ———
  const recommendations = useMemo(() => {
    const recs: {
      id: string;
      icon: typeof DollarSign;
      iconColor: string;
      iconBg: string;
      title: string;
      description: string;
      impact: string;
      impactColor: string;
      actionLabel: string;
      path: string;
    }[] = [];

    // 1. Overdue invoices
    const overdueInvs = invoices.filter(i => i.status === 'overdue');
    if (overdueInvs.length > 0) {
      const total = overdueInvs.reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
      recs.push({
        id: 'overdue-invoices',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        iconBg: 'bg-red-600/15',
        title: `Collect $${total.toLocaleString()} in overdue invoices`,
        description: `${overdueInvs.length} invoice${overdueInvs.length > 1 ? 's' : ''} past due — send reminders now`,
        impact: `+$${total.toLocaleString()}`,
        impactColor: 'text-red-400',
        actionLabel: 'Chase',
        path: '/invoices',
      });
    }

    // 2. Highest-value pending quote
    const topQuote = quotes
      .filter(q => q.status === 'sent')
      .sort((a, b) => (b.total || 0) - (a.total || 0))[0];
    if (topQuote) {
      recs.push({
        id: 'top-quote',
        icon: FileText,
        iconColor: 'text-sky-400',
        iconBg: 'bg-sky-600/15',
        title: `Follow up on $${(topQuote.total || 0).toLocaleString()} quote`,
        description: `${topQuote.customer?.name || 'Customer'} — sent ${topQuote.sent_date ? differenceInDays(new Date(), parseISO(topQuote.sent_date)) + ' days ago' : 'recently'}`,
        impact: `+$${(topQuote.total || 0).toLocaleString()}`,
        impactColor: 'text-sky-400',
        actionLabel: 'Follow Up',
        path: '/quotes',
      });
    }

    // 3. Hot leads to convert
    const hotLeads = leads.filter(l => l.status === 'qualified' || l.status === 'quoted');
    if (hotLeads.length > 0) {
      const topLead = hotLeads.sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))[0];
      recs.push({
        id: 'hot-lead',
        icon: Target,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-600/15',
        title: `Close ${topLead.name} — ${topLead.status} lead`,
        description: `$${(topLead.estimated_value || 0).toLocaleString()} potential • ${topLead.source} source`,
        impact: `+$${(topLead.estimated_value || 0).toLocaleString()}`,
        impactColor: 'text-amber-400',
        actionLabel: 'Convert',
        path: '/leads',
      });
    }

    // 4. Best margin job type
    const bestType = profitAnalysis.typeBreakdown[0];
    if (bestType && bestType.margin > 30) {
      recs.push({
        id: 'best-margin',
        icon: TrendingUp,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-600/15',
        title: `${bestType.type} jobs earn ${bestType.margin}% margin — book more`,
        description: `${bestType.count} jobs at avg $${Math.round(bestType.revenue / bestType.count).toLocaleString()} each`,
        impact: `${bestType.margin}% margin`,
        impactColor: 'text-green-400',
        actionLabel: 'View',
        path: '/job-costing',
      });
    }

    // 5. Recurring revenue opportunity
    const pausedServices = recurringServices.filter(s => s.status === 'paused');
    if (pausedServices.length > 0) {
      const value = pausedServices.reduce((s, svc) => s + (svc.price_per_visit || 0), 0);
      recs.push({
        id: 'paused-services',
        icon: RefreshCw,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-600/15',
        title: `Reactivate ${pausedServices.length} paused service${pausedServices.length > 1 ? 's' : ''}`,
        description: `$${value.toLocaleString()}/visit in paused recurring revenue`,
        impact: `+$${(value * 4).toLocaleString()}/mo`,
        impactColor: 'text-green-400',
        actionLabel: 'Reactivate',
        path: '/recurring-services',
      });
    }

    // 6. New leads to contact
    const newLeads = leads.filter(l => l.status === 'new');
    if (newLeads.length > 0) {
      const totalValue = newLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
      recs.push({
        id: 'new-leads',
        icon: Phone,
        iconColor: 'text-sky-400',
        iconBg: 'bg-sky-600/15',
        title: `Contact ${newLeads.length} new lead${newLeads.length > 1 ? 's' : ''} worth $${totalValue.toLocaleString()}`,
        description: `First contact increases close rate by 3x`,
        impact: `$${totalValue.toLocaleString()} potential`,
        impactColor: 'text-sky-400',
        actionLabel: 'Call',
        path: '/leads',
      });
    }

    // 7. Revenue gap to goal
    const gap = monthlyGoal - revenue.mtd;
    if (gap > 0) {
      const jobsNeeded = Math.ceil(gap / (profitAnalysis.totalRevenue / Math.max(jobs.length, 1)));
      recs.push({
        id: 'revenue-gap',
        icon: Target,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-600/15',
        title: `$${gap.toLocaleString()} to monthly goal — book ${jobsNeeded} more jobs`,
        description: `Average job value: $${Math.round(profitAnalysis.totalRevenue / Math.max(jobs.length, 1)).toLocaleString()}`,
        impact: `$${gap.toLocaleString()} gap`,
        impactColor: 'text-amber-400',
        actionLabel: 'Plan',
        path: '/route-planner',
      });
    }

    return recs;
  }, [invoices, quotes, leads, profitAnalysis, recurringServices, monthlyGoal, revenue, jobs]);

  const handleActionComplete = useCallback((id: string, path: string) => {
    setCompletedActions(prev => new Set(prev).add(id));
    toast.success('Opening action...');
    setTimeout(() => navigate(path), 500);
  }, [navigate, toast]);

  const handleSaveGoal = useCallback(() => {
    const val = parseInt(goalInput);
    if (val > 0) {
      setMonthlyGoal(val);
      setEditingGoal(false);
      toast.success(`Monthly goal set to $${val.toLocaleString()}`);
    }
  }, [goalInput, toast]);

  // ——— Skeleton ———
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-earth-900/40 border border-earth-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-xl bg-earth-900/40 border border-earth-800" />
          <div className="lg:col-span-2 h-64 rounded-xl bg-earth-900/40 border border-earth-800" />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { key: 'profit' as const, label: 'Profit Analysis', icon: PieChartIcon },
    { key: 'forecast' as const, label: 'Forecast', icon: TrendingUp },
  ];

  return (
    <div className={clsx('space-y-6 transition-all duration-700', animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>

      {/* ========== HEADER WITH TABS ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-earth-50 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-green-400" />
            Business Intelligence
          </h1>
          <p className="text-sm text-earth-400 mt-1">Revenue insights, profit analysis, and smart recommendations</p>
        </div>
        <div className="flex items-center gap-1 bg-earth-900/60 border border-earth-800 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer',
                selectedTab === tab.key
                  ? 'bg-green-600/20 text-green-400 border border-green-700/40'
                  : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/60',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== OVERVIEW TAB ========== */}
      {selectedTab === 'overview' && (
        <>
          {/* Revenue Goal + KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Goal Gauge */}
            <Card className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-earth-100">Monthly Revenue Goal</h3>
                {!editingGoal ? (
                  <button
                    onClick={() => { setEditingGoal(true); setGoalInput(monthlyGoal.toString()); }}
                    className="text-[10px] text-earth-500 hover:text-earth-300 cursor-pointer"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      className="w-20 px-2 py-0.5 text-xs bg-earth-800 border border-earth-700 rounded text-earth-100"
                      onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                    />
                    <button onClick={handleSaveGoal} className="text-xs text-green-400 cursor-pointer">Save</button>
                  </div>
                )}
              </div>
              <RevenueGauge current={revenue.mtd} goal={monthlyGoal} label="of monthly target" />
            </Card>

            {/* KPI Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'Revenue MTD', value: `$${revenue.mtd.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', change: revenue.monthlyGrowth, sublabel: 'vs last month' },
                { label: 'Revenue YTD', value: `$${revenue.ytd.toLocaleString()}`, icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                { label: 'Avg Profit Margin', value: `${profitAnalysis.avgMargin}%`, icon: Percent, color: profitAnalysis.avgMargin >= 30 ? 'text-green-400' : 'text-amber-400', bg: profitAnalysis.avgMargin >= 30 ? 'bg-green-500/10' : 'bg-amber-500/10' },
                { label: 'Recurring Monthly', value: `$${recurringRevenue.totalMonthly.toLocaleString()}`, icon: RefreshCw, color: 'text-green-400', bg: 'bg-green-500/10', sublabel: `${recurringRevenue.annualized.toLocaleString()} ARR` },
                { label: 'Outstanding', value: `$${revenue.outstanding.toLocaleString()}`, icon: Receipt, color: revenue.overdue > 0 ? 'text-red-400' : 'text-amber-400', bg: revenue.overdue > 0 ? 'bg-red-500/10' : 'bg-amber-500/10', sublabel: revenue.overdue > 0 ? `$${revenue.overdue.toLocaleString()} overdue` : undefined },
                { label: 'Pipeline Value', value: `$${pipeline.pipelineValue.toLocaleString()}`, icon: Target, color: 'text-sky-400', bg: 'bg-sky-500/10', sublabel: `${pipeline.activeLeads} leads, ${pipeline.pendingQuotes} quotes` },
              ].map(kpi => (
                <div key={kpi.label} className="bg-earth-900/60 border border-earth-800 rounded-xl p-4 hover:border-earth-700 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx('p-1.5 rounded-lg', kpi.bg)}>
                      <kpi.icon className={clsx('w-3.5 h-3.5', kpi.color)} />
                    </div>
                    <p className="text-[10px] text-earth-500 uppercase tracking-wide">{kpi.label}</p>
                  </div>
                  <p className="text-xl font-bold font-display text-earth-100">{kpi.value}</p>
                  {kpi.change !== undefined && (
                    <div className={clsx('flex items-center gap-1 mt-1 text-xs', kpi.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {kpi.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpi.change)}% {kpi.sublabel}
                    </div>
                  )}
                  {kpi.sublabel && kpi.change === undefined && (
                    <p className="text-[10px] text-earth-500 mt-1">{kpi.sublabel}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Smart Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-earth-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Smart Recommendations
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-600/20 text-amber-400">
                  {recommendations.filter(r => !completedActions.has(r.id)).length}
                </span>
              </h2>
              {completedActions.size > 0 && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {completedActions.size} actioned
                </span>
              )}
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <SmartAction
                  key={rec.id}
                  icon={rec.icon}
                  iconColor={rec.iconColor}
                  iconBg={rec.iconBg}
                  title={rec.title}
                  description={rec.description}
                  impact={rec.impact}
                  impactColor={rec.impactColor}
                  actionLabel={rec.actionLabel}
                  onAction={() => handleActionComplete(rec.id, rec.path)}
                  completed={completedActions.has(rec.id)}
                  index={idx}
                />
              ))}
            </div>
          </div>

          {/* Revenue Breakdown + Cash Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Sources Pie */}
            <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Revenue Sources</h3>}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ name, value }: { name?: string; value?: number }) => `$${(value || 0).toLocaleString()}`}
                      labelLine={false}
                    >
                      {revenueBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, '']} />
                    <Legend formatter={(value: string) => <span className="text-earth-300 text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Revenue Trend */}
            <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Revenue vs Expenses</h3>}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData.slice(0, 3)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                    <XAxis dataKey="month" stroke="#a68360" fontSize={12} />
                    <YAxis stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, '']} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="#a68360" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ========== PROFIT ANALYSIS TAB ========== */}
      {selectedTab === 'profit' && (
        <>
          {/* Profit Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `$${profitAnalysis.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Total Costs', value: `$${profitAnalysis.totalCosts.toLocaleString()}`, icon: CreditCard, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Net Profit', value: `$${(profitAnalysis.totalRevenue - profitAnalysis.totalCosts).toLocaleString()}`, icon: Wallet, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Avg Margin', value: `${profitAnalysis.avgMargin}%`, icon: Percent, color: profitAnalysis.avgMargin >= 30 ? 'text-green-400' : 'text-amber-400', bg: profitAnalysis.avgMargin >= 30 ? 'bg-green-500/10' : 'bg-amber-500/10' },
            ].map(stat => (
              <div key={stat.label} className="bg-earth-900/60 border border-earth-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx('p-1.5 rounded-lg', stat.bg)}>
                    <stat.icon className={clsx('w-4 h-4', stat.color)} />
                  </div>
                  <p className="text-xs text-earth-500 uppercase tracking-wide">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold font-display text-earth-100">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Margin by Job Type */}
            <Card header={
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-green-400" />
                <h3 className="text-base font-semibold font-display text-earth-100">Profit by Job Type</h3>
              </div>
            }>
              <div className="space-y-3">
                {profitAnalysis.typeBreakdown.map((type, idx) => (
                  <div key={type.type} className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      <span className="text-xs font-bold text-earth-400">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-earth-100">{type.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-earth-400">${type.revenue.toLocaleString()}</span>
                          <span className={clsx(
                            'text-sm font-bold',
                            type.margin >= 40 ? 'text-green-400' : type.margin >= 25 ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {type.margin}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-earth-800 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-1000',
                            type.margin >= 40 ? 'bg-green-500' : type.margin >= 25 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${type.margin}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Crew Performance */}
            <Card header={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-semibold font-display text-earth-100">Revenue by Crew</h3>
              </div>
            }>
              <div className="space-y-4">
                {profitAnalysis.crewBreakdown.map(crew => (
                  <div key={crew.name} className="bg-earth-800/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: crew.color }} />
                        <span className="text-sm font-medium text-earth-100">{crew.name}</span>
                      </div>
                      <span className="text-sm font-bold text-green-400">${crew.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-earth-400">
                      <span>{crew.count} jobs</span>
                      <span>Profit: ${crew.profit.toLocaleString()}</span>
                      <span className={clsx(
                        'font-bold',
                        crew.margin >= 30 ? 'text-green-400' : 'text-amber-400'
                      )}>
                        {crew.margin}% margin
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Per-Job Profitability Table */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Job-Level Profitability</h3>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-earth-800">
                    <th className="text-left py-2 px-3 text-xs font-medium text-earth-500 uppercase">Job</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-earth-500 uppercase">Revenue</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-earth-500 uppercase">Materials</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-earth-500 uppercase">Labor</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-earth-500 uppercase">Profit</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-earth-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {profitAnalysis.jobProfits.sort((a, b) => b.margin - a.margin).map(job => (
                    <tr key={job.id} className="border-b border-earth-800/50 hover:bg-earth-800/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="text-earth-100 font-medium">{job.title}</p>
                        <p className="text-[10px] text-earth-500">{job.customer?.name}</p>
                      </td>
                      <td className="text-right py-2.5 px-3 text-earth-200">${(job.total_price || 0).toLocaleString()}</td>
                      <td className="text-right py-2.5 px-3 text-earth-400">${(job.materials_cost || 0).toLocaleString()}</td>
                      <td className="text-right py-2.5 px-3 text-earth-400">${(job.labor_cost || 0).toLocaleString()}</td>
                      <td className="text-right py-2.5 px-3 text-green-400 font-medium">${job.profit.toLocaleString()}</td>
                      <td className="text-right py-2.5 px-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-bold',
                          job.margin >= 40 ? 'bg-green-600/20 text-green-400' :
                          job.margin >= 25 ? 'bg-amber-600/20 text-amber-400' :
                          'bg-red-600/20 text-red-400'
                        )}>
                          {job.margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ========== FORECAST TAB ========== */}
      {selectedTab === 'forecast' && (
        <>
          {/* Forecast Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Recurring Revenue', value: `$${recurringRevenue.totalMonthly.toLocaleString()}/mo`, icon: RefreshCw, color: 'text-green-400', bg: 'bg-green-500/10', sub: `${recurringRevenue.activeServices} services + ${recurringRevenue.activeContracts} contracts` },
              { label: 'Annualized (ARR)', value: `$${recurringRevenue.annualized.toLocaleString()}`, icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-500/10', sub: 'Based on current recurring' },
              { label: 'Pipeline Potential', value: `$${pipeline.pipelineValue.toLocaleString()}`, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10', sub: `${pipeline.activeLeads} active leads` },
              { label: 'Weighted Forecast', value: `$${Math.round(pipeline.pipelineValue * 0.3).toLocaleString()}`, icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10', sub: '30% close rate estimate' },
            ].map(stat => (
              <div key={stat.label} className="bg-earth-900/60 border border-earth-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx('p-1.5 rounded-lg', stat.bg)}>
                    <stat.icon className={clsx('w-4 h-4', stat.color)} />
                  </div>
                  <p className="text-[10px] text-earth-500 uppercase tracking-wide">{stat.label}</p>
                </div>
                <p className="text-xl font-bold font-display text-earth-100">{stat.value}</p>
                <p className="text-[10px] text-earth-500 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Revenue Forecast Chart */}
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-display text-earth-100">Revenue Forecast (6 months)</h3>
              <div className="flex items-center gap-3 text-xs text-earth-500">
                <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-green-500" /> Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-green-500/40" /> Projected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-earth-500" /> Expenses</span>
              </div>
            </div>
          }>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis dataKey="month" stroke="#a68360" fontSize={12} />
                  <YAxis stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, '']} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#a68360"
                    fill="#a68360"
                    fillOpacity={0.05}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recurring Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header={
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-green-400" />
                <h3 className="text-base font-semibold font-display text-earth-100">Recurring Services</h3>
              </div>
            }>
              <div className="space-y-3">
                {recurringServices.filter(s => s.status === 'active').map(svc => {
                  let monthly = svc.price_per_visit || 0;
                  switch (svc.frequency) {
                    case 'weekly': monthly *= 4.33; break;
                    case 'biweekly': monthly *= 2.17; break;
                    case 'quarterly': monthly /= 3; break;
                  }
                  return (
                    <div key={svc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-earth-800/30">
                      <div>
                        <p className="text-sm font-medium text-earth-100">{svc.title}</p>
                        <p className="text-xs text-earth-500">{svc.customer?.name} • {svc.frequency}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">${Math.round(monthly).toLocaleString()}/mo</p>
                        <p className="text-[10px] text-earth-500">${(svc.price_per_visit || 0).toLocaleString()}/visit</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card header={
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-semibold font-display text-earth-100">Active Contracts</h3>
              </div>
            }>
              <div className="space-y-3">
                {contracts.filter(c => c.is_active).map(contract => (
                  <div key={contract.id} className="flex items-center justify-between p-2.5 rounded-lg bg-earth-800/30">
                    <div>
                      <p className="text-sm font-medium text-earth-100">{contract.title}</p>
                      <p className="text-xs text-earth-500">{contract.customer?.name} • {contract.frequency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">${(contract.monthly_value || 0).toLocaleString()}/mo</p>
                      {contract.end_date && (
                        <p className="text-[10px] text-earth-500">
                          Ends {format(parseISO(contract.end_date), 'MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
