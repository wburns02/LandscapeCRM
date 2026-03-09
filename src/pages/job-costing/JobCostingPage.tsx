import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Briefcase, ArrowUpRight, ArrowDownRight,
  Filter,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/ui/SearchBar';
import Select from '../../components/ui/Select';
import clsx from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
} from 'recharts';

type SortKey = 'title' | 'revenue' | 'cost' | 'profit' | 'margin';

export default function JobCostingPage() {
  const { jobs, expenses } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Build job costing data by combining jobs with their expenses
  const jobCostingData = useMemo(() => {
    return jobs.map(job => {
      const jobExpenses = expenses.filter(e => e.job_id === job.id && e.status !== 'rejected');
      const estimatedLabor = job.labor_cost || 0;
      const estimatedMaterials = job.materials_cost || 0;
      const estimatedTotal = estimatedLabor + estimatedMaterials;

      // Categorize actual expenses
      const actualByCategory: Record<string, number> = {};
      let actualTotal = 0;
      for (const exp of jobExpenses) {
        actualByCategory[exp.category] = (actualByCategory[exp.category] || 0) + exp.amount;
        actualTotal += exp.amount;
      }

      // Use estimated costs as baseline when no expenses tracked
      const totalCost = actualTotal > 0 ? actualTotal : estimatedTotal;
      const revenue = job.total_price || 0;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const estimatedHours = job.estimated_hours || 0;
      const actualHours = job.actual_hours || 0;
      const hoursVariance = actualHours > 0 ? actualHours - estimatedHours : 0;
      const costVariance = actualTotal > 0 ? actualTotal - estimatedTotal : 0;

      return {
        id: job.id,
        title: job.title,
        customer: job.customer?.name || 'Unknown',
        status: job.status,
        type: job.type,
        crew: job.crew?.name,
        scheduledDate: job.scheduled_date,
        estimatedHours,
        actualHours,
        hoursVariance,
        estimatedLabor,
        estimatedMaterials,
        estimatedTotal,
        actualByCategory,
        actualTotal,
        totalCost,
        revenue,
        profit,
        margin,
        costVariance,
        expenses: jobExpenses,
        hasExpenses: jobExpenses.length > 0,
      };
    });
  }, [jobs, expenses]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = jobCostingData;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) || j.customer.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter(j => j.status === statusFilter);
    }
    // Sort
    result = [...result].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortBy) {
        case 'title': aVal = a.title; bVal = b.title; break;
        case 'revenue': aVal = a.revenue; bVal = b.revenue; break;
        case 'cost': aVal = a.totalCost; bVal = b.totalCost; break;
        case 'profit': aVal = a.profit; bVal = b.profit; break;
        case 'margin': aVal = a.margin; bVal = b.margin; break;
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });
    return result;
  }, [jobCostingData, search, statusFilter, sortBy, sortDir]);

  // KPI totals
  const totals = useMemo(() => {
    const activeJobs = jobCostingData.filter(j => j.status !== 'cancelled');
    const totalRevenue = activeJobs.reduce((s, j) => s + j.revenue, 0);
    const totalCost = activeJobs.reduce((s, j) => s + j.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = activeJobs.length > 0
      ? activeJobs.reduce((s, j) => s + j.margin, 0) / activeJobs.length
      : 0;
    const atRisk = activeJobs.filter(j => j.margin < 20 && j.revenue > 0).length;
    const profitable = activeJobs.filter(j => j.margin >= 40).length;
    return { totalRevenue, totalCost, totalProfit, avgMargin, atRisk, profitable };
  }, [jobCostingData]);

  // Chart data - top jobs by revenue
  const chartData = useMemo(() => {
    return [...jobCostingData]
      .filter(j => j.revenue > 0 && j.status !== 'cancelled')
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map(j => ({
        name: j.title.length > 20 ? j.title.slice(0, 20) + '...' : j.title,
        revenue: j.revenue,
        cost: j.totalCost,
        profit: j.profit,
      }));
  }, [jobCostingData]);

  // Margin distribution for pie chart
  const marginDistribution = useMemo(() => {
    const buckets = [
      { name: 'Loss (<0%)', value: 0, color: '#ef4444' },
      { name: 'Low (0-20%)', value: 0, color: '#f59e0b' },
      { name: 'Good (20-40%)', value: 0, color: '#3b82f6' },
      { name: 'Great (40%+)', value: 0, color: '#22c55e' },
    ];
    for (const j of jobCostingData.filter(j => j.revenue > 0 && j.status !== 'cancelled')) {
      if (j.margin < 0) buckets[0].value++;
      else if (j.margin < 20) buckets[1].value++;
      else if (j.margin < 40) buckets[2].value++;
      else buckets[3].value++;
    }
    return buckets.filter(b => b.value > 0);
  }, [jobCostingData]);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className={clsx('ml-1 text-[10px]', sortBy === col ? 'text-green-400' : 'text-earth-600')}>
      {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const categoryLabels: Record<string, string> = {
    materials: 'Materials',
    fuel: 'Fuel',
    equipment_rental: 'Equipment Rental',
    subcontractor: 'Subcontractor',
    supplies: 'Supplies',
    disposal: 'Disposal',
    permits: 'Permits',
    vehicle: 'Vehicle',
    other: 'Other',
  };

  const categoryColors: Record<string, string> = {
    materials: 'bg-sky-500/15 text-sky-400',
    fuel: 'bg-amber-500/15 text-amber-400',
    equipment_rental: 'bg-purple-500/15 text-purple-400',
    subcontractor: 'bg-red-500/15 text-red-400',
    supplies: 'bg-earth-500/15 text-earth-300',
    disposal: 'bg-earth-500/15 text-earth-300',
    permits: 'bg-green-500/15 text-green-400',
    vehicle: 'bg-amber-500/15 text-amber-400',
    other: 'bg-earth-500/15 text-earth-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Job Costing</h2>
          <p className="text-sm text-earth-400">Budget vs actual analysis across all jobs</p>
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={clsx(
            'sm:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors',
            showFilters
              ? 'bg-green-600/15 text-green-400 border-green-500/30'
              : 'text-earth-400 border-earth-700 hover:bg-earth-800'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${fmt(totals.totalRevenue)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Total Cost"
          value={`$${fmt(totals.totalCost)}`}
          icon={<BarChart3 className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Net Profit"
          value={`$${fmt(totals.totalProfit)}`}
          icon={totals.totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          color={totals.totalProfit >= 0 ? 'green' : 'red'}
          subtitle={`${totals.avgMargin.toFixed(1)}% avg margin`}
        />
        <StatCard
          title="Job Health"
          value={`${totals.profitable} healthy`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="sky"
          subtitle={totals.atRisk > 0 ? `${totals.atRisk} at risk` : 'All on track'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Cost Bar Chart */}
        <Card className="lg:col-span-2" header={<h3 className="text-sm font-semibold text-earth-200">Revenue vs Cost by Job</h3>}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d3930" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} stroke="#8a8578" fontSize={11} />
                <YAxis type="category" dataKey="name" width={130} stroke="#8a8578" fontSize={11} tick={{ fill: '#b5b1a5' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#292520', border: '1px solid #3d3930', borderRadius: '8px' }}
                  labelStyle={{ color: '#e8e6e1' }}
                  formatter={(value: number, name: string) => [`$${fmt(value)}`, name === 'revenue' ? 'Revenue' : name === 'cost' ? 'Cost' : 'Profit']}
                />
                <Legend formatter={v => v === 'revenue' ? 'Revenue' : v === 'cost' ? 'Cost' : 'Profit'} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="cost" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Margin Distribution Pie */}
        <Card header={<h3 className="text-sm font-semibold text-earth-200">Margin Distribution</h3>}>
          <div className="h-[280px] flex items-center justify-center">
            {marginDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={marginDistribution}
                    cx="50%"
                    cy="40%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {marginDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#292520', border: '1px solid #3d3930', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value} jobs`]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => <span style={{ color: '#b5b1a5', fontSize: '11px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-earth-500">No data</p>
            )}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className={clsx('flex flex-col sm:flex-row gap-3', !showFilters && 'hidden sm:flex')}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search jobs..." className="flex-1" />
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'on_hold', label: 'On Hold' },
          ]}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      {/* Job Costing Table */}
      <Card padding={false}>
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-3 border-b border-earth-800 text-xs font-medium text-earth-400 uppercase tracking-wider">
          <div className="col-span-3 cursor-pointer hover:text-earth-200" onClick={() => handleSort('title')}>
            Job <SortIcon col="title" />
          </div>
          <div className="col-span-2 text-center">Hours (Est / Act)</div>
          <div className="col-span-2 text-right cursor-pointer hover:text-earth-200" onClick={() => handleSort('revenue')}>
            Revenue <SortIcon col="revenue" />
          </div>
          <div className="col-span-2 text-right cursor-pointer hover:text-earth-200" onClick={() => handleSort('cost')}>
            Total Cost <SortIcon col="cost" />
          </div>
          <div className="col-span-2 text-right cursor-pointer hover:text-earth-200" onClick={() => handleSort('profit')}>
            Profit <SortIcon col="profit" />
          </div>
          <div className="col-span-1 text-right cursor-pointer hover:text-earth-200" onClick={() => handleSort('margin')}>
            Margin <SortIcon col="margin" />
          </div>
        </div>

        {/* Table Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-earth-400">
            <Briefcase className="w-10 h-10 mb-3 text-earth-600" />
            <p className="font-medium text-earth-300">No jobs match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search or status filter</p>
          </div>
        ) : (
          <div className="divide-y divide-earth-800/60">
            {filtered.map(job => {
              const isExpanded = expandedJob === job.id;
              const isProfitable = job.profit >= 0;
              const isAtRisk = job.margin < 20 && job.margin >= 0 && job.revenue > 0;

              return (
                <div key={job.id}>
                  {/* Main Row */}
                  <div
                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-2 px-4 py-3 cursor-pointer hover:bg-earth-800/30 transition-colors"
                  >
                    {/* Job Info */}
                    <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                      <div className="text-earth-500 shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-earth-100 truncate">{job.title}</p>
                          <StatusBadge status={job.status} />
                        </div>
                        <p className="text-xs text-earth-400 truncate">{job.customer} {job.crew ? `· ${job.crew}` : ''}</p>
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-center gap-2">
                      <span className="text-xs text-earth-500 lg:hidden">Hours:</span>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-earth-300">{job.estimatedHours}h</span>
                        <span className="text-earth-600">/</span>
                        <span className={clsx(
                          job.actualHours > 0 ? (job.hoursVariance > 0 ? 'text-red-400' : 'text-green-400') : 'text-earth-500'
                        )}>
                          {job.actualHours > 0 ? `${job.actualHours}h` : '—'}
                        </span>
                        {job.hoursVariance !== 0 && (
                          <span className={clsx('text-xs', job.hoursVariance > 0 ? 'text-red-400' : 'text-green-400')}>
                            ({job.hoursVariance > 0 ? '+' : ''}{job.hoursVariance.toFixed(1)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-end">
                      <span className="text-xs text-earth-500 lg:hidden">Revenue:</span>
                      <span className="text-sm font-medium text-earth-100">${fmt(job.revenue)}</span>
                    </div>

                    {/* Cost */}
                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-2">
                      <span className="text-xs text-earth-500 lg:hidden">Cost:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-earth-300">${fmt(job.totalCost)}</span>
                        {job.costVariance !== 0 && (
                          <span className={clsx('flex items-center text-xs', job.costVariance > 0 ? 'text-red-400' : 'text-green-400')}>
                            {job.costVariance > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            ${Math.abs(job.costVariance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-end">
                      <span className="text-xs text-earth-500 lg:hidden">Profit:</span>
                      <span className={clsx('text-sm font-semibold', isProfitable ? 'text-green-400' : 'text-red-400')}>
                        {isProfitable ? '' : '-'}${fmt(Math.abs(job.profit))}
                      </span>
                    </div>

                    {/* Margin */}
                    <div className="lg:col-span-1 flex items-center justify-between lg:justify-end gap-1.5">
                      <span className="text-xs text-earth-500 lg:hidden">Margin:</span>
                      <div className="flex items-center gap-1.5">
                        {isAtRisk && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        <span className={clsx(
                          'text-sm font-semibold',
                          job.margin >= 40 ? 'text-green-400' :
                          job.margin >= 20 ? 'text-sky-400' :
                          job.margin >= 0 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {job.revenue > 0 ? `${job.margin.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-earth-900/40 border-t border-earth-800/40">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-7">
                        {/* Budget Breakdown */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-earth-400 uppercase tracking-wider">Estimated Budget</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-earth-400">Labor</span>
                              <span className="text-earth-200">${fmt(job.estimatedLabor)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-earth-400">Materials</span>
                              <span className="text-earth-200">${fmt(job.estimatedMaterials)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium border-t border-earth-800 pt-2">
                              <span className="text-earth-300">Estimated Total</span>
                              <span className="text-earth-100">${fmt(job.estimatedTotal)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actual Expenses */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-earth-400 uppercase tracking-wider">Actual Expenses</h4>
                          {job.hasExpenses ? (
                            <div className="space-y-2">
                              {Object.entries(job.actualByCategory).map(([cat, amount]) => (
                                <div key={cat} className="flex items-center justify-between text-sm">
                                  <span className={clsx('px-1.5 py-0.5 rounded text-xs', categoryColors[cat] || categoryColors.other)}>
                                    {categoryLabels[cat] || cat}
                                  </span>
                                  <span className="text-earth-200">${fmt(amount)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm font-medium border-t border-earth-800 pt-2">
                                <span className="text-earth-300">Actual Total</span>
                                <span className={clsx(
                                  'font-semibold',
                                  job.costVariance > 0 ? 'text-red-400' : job.costVariance < 0 ? 'text-green-400' : 'text-earth-100'
                                )}>
                                  ${fmt(job.actualTotal)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-earth-500 italic">No expenses recorded yet</p>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-earth-400 uppercase tracking-wider">Job Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-earth-400">Status</span>
                              <StatusBadge status={job.status} />
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-earth-400">Type</span>
                              <Badge color="earth">{(job.type || 'general').replace('_', ' ')}</Badge>
                            </div>
                            {job.hoursVariance !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-earth-400">Hours Variance</span>
                                <span className={clsx(job.hoursVariance > 0 ? 'text-red-400' : 'text-green-400')}>
                                  {job.hoursVariance > 0 ? '+' : ''}{job.hoursVariance.toFixed(1)}h
                                </span>
                              </div>
                            )}
                            {job.costVariance !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-earth-400">Cost Variance</span>
                                <span className={clsx(job.costVariance > 0 ? 'text-red-400' : 'text-green-400')}>
                                  {job.costVariance > 0 ? '+' : '-'}${fmt(Math.abs(job.costVariance))}
                                </span>
                              </div>
                            )}
                            <div className="pt-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                                className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 cursor-pointer transition-colors"
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                                View Job Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Margin Bar */}
                      {job.revenue > 0 && (
                        <div className="mt-4 ml-7">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-earth-500 w-20 shrink-0">Margin</span>
                            <div className="flex-1 h-2 bg-earth-800 rounded-full overflow-hidden">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all duration-500',
                                  job.margin >= 40 ? 'bg-green-500' :
                                  job.margin >= 20 ? 'bg-sky-500' :
                                  job.margin >= 0 ? 'bg-amber-500' : 'bg-red-500'
                                )}
                                style={{ width: `${Math.max(0, Math.min(100, job.margin))}%` }}
                              />
                            </div>
                            <span className={clsx(
                              'text-xs font-medium w-12 text-right',
                              job.margin >= 40 ? 'text-green-400' :
                              job.margin >= 20 ? 'text-sky-400' :
                              job.margin >= 0 ? 'text-amber-400' : 'text-red-400'
                            )}>
                              {job.margin.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-earth-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-earth-500" />
          Hours: Estimated / Actual
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          Margin 40%+ (Great)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          Margin 20-40% (Good)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          Margin 0-20% (At Risk)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Loss (&lt;0%)
        </div>
      </div>
    </div>
  );
}
