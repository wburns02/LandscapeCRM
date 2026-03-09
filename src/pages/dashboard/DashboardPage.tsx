import {
  Briefcase, DollarSign, FileText, AlertCircle, UsersRound,
  Package, Target, Calendar, Clock, CheckCircle, UserPlus, TrendingUp,
  CloudSun, Leaf,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import { useData } from '../../context/DataContext';
import { format } from 'date-fns';

const PIE_COLORS = ['#38bdf8', '#fbbf24', '#22c55e', '#a68360', '#ef4444'];

const activityIcons: Record<string, typeof CheckCircle> = {
  job_completed: CheckCircle,
  invoice_paid: DollarSign,
  quote_accepted: FileText,
  lead_created: Target,
  customer_added: UserPlus,
};

export default function DashboardPage() {
  const { dashboard, jobs, quotes, crews, inventory, leads, isLoading } = useData();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-earth-800 bg-earth-900/40 p-5 space-y-3">
              <div className="h-3 w-20 bg-earth-800 rounded" />
              <div className="h-7 w-28 bg-earth-800 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-earth-800 bg-earth-900/40 h-80" />
          <div className="rounded-xl border border-earth-800 bg-earth-900/40 h-80" />
        </div>
      </div>
    );
  }

  // Derive data from context when API returns simple KPIs
  const upcomingJobs = Array.isArray(dashboard.upcoming_jobs)
    ? dashboard.upcoming_jobs
    : jobs.filter(j => j.status === 'scheduled').slice(0, 5);

  const pendingQuotes = dashboard.pending_quotes ?? quotes.filter(q => q.status === 'sent' || q.status === 'draft').length;
  const activeCrews = dashboard.active_crews ?? crews.filter(c => c.is_active).length;
  const lowStockItems = dashboard.low_stock_items ?? dashboard.low_stock_count ?? 0;
  const newLeads = dashboard.new_leads ?? leads.filter(l => l.status === 'new').length;

  const revenueByMonth = dashboard.revenue_by_month ?? [
    { month: 'Jan', revenue: 28000, expenses: 18000 },
    { month: 'Feb', revenue: 32000, expenses: 20000 },
    { month: 'Mar', revenue: 12450, expenses: 8000 },
  ];

  // Derive job status distribution from jobs data
  const jobStatusDistribution = dashboard.job_status_distribution ?? (() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const label = j.status === 'in_progress' ? 'In Progress' : j.status.charAt(0).toUpperCase() + j.status.slice(1);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  })();

  const recentActivity = dashboard.recent_activity ?? [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Jobs" value={dashboard.active_jobs} icon={<Briefcase className="w-5 h-5" />} color="green" change={12} />
        <StatCard title="Revenue MTD" value={`$${dashboard.revenue_mtd.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="green" change={8} />
        <StatCard title="Revenue YTD" value={`$${dashboard.revenue_ytd.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} color="sky" />
        <StatCard title="Pending Quotes" value={pendingQuotes} icon={<FileText className="w-5 h-5" />} color="amber" />
        <StatCard title="Overdue Invoices" value={dashboard.overdue_invoices} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard title="Active Crews" value={activeCrews} icon={<UsersRound className="w-5 h-5" />} color="earth" />
        <StatCard title="Low Stock Items" value={lowStockItems} icon={<Package className="w-5 h-5" />} color="amber" />
        <StatCard title="New Leads" value={newLeads} icon={<Target className="w-5 h-5" />} color="sky" change={25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2" header={<h3 className="text-base font-semibold font-display text-earth-100">Monthly Revenue & Expenses</h3>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                <XAxis dataKey="month" stroke="#a68360" fontSize={12} />
                <YAxis stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }}
                  formatter={(value: unknown) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#a68360" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Job Status Distribution */}
        <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Job Status</h3>}>
          <div className="h-72">
            {jobStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jobStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={4}
                    label={({ name, value }: { name?: string; value?: number }) => `${name || ''}: ${value || 0}`}
                    labelLine={false}
                  >
                    {jobStatusDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }} />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => <span className="text-earth-300 text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-earth-400 py-4 text-center">No job data available</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Jobs */}
        <Card className="lg:col-span-2" header={
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold font-display text-earth-100">Upcoming Jobs</h3>
            <Calendar className="w-4 h-4 text-earth-400" />
          </div>
        }>
          <div className="space-y-3">
            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-earth-400 py-4 text-center">No upcoming jobs scheduled</p>
            ) : (
              upcomingJobs.map(job => (
                <div key={job.id} className="flex items-center gap-4 p-3 rounded-lg bg-earth-800/30 hover:bg-earth-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-green-600/15 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-earth-100 truncate">{job.title}</p>
                    <p className="text-xs text-earth-400 truncate">{job.customer?.name} - {job.address || job.customer?.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-earth-200">
                      {job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d') : '—'}
                    </p>
                    <p className="text-xs text-earth-400">{job.scheduled_time || '8:00 AM'}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Right column: Activity + Weather + Seasonal */}
        <div className="space-y-6">
          {/* Weather */}
          <Card header={
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold font-display text-earth-100">Weather</h3>
            </div>
          }>
            <div className="flex items-center gap-4">
              <CloudSun className="w-12 h-12 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-earth-50">78F</p>
                <p className="text-sm text-earth-300">Partly Cloudy</p>
                <p className="text-xs text-earth-400">Austin, TX - Good working conditions</p>
              </div>
            </div>
          </Card>

          {/* Seasonal */}
          <Card header={
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-400" />
              <h3 className="text-base font-semibold font-display text-earth-100">Season</h3>
            </div>
          }>
            <div className="space-y-2">
              <p className="text-sm text-green-400 font-medium">Spring Season Active</p>
              <p className="text-xs text-earth-300">Peak landscaping and planting season. Schedule pre-emergent applications and spring cleanups.</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-green-600/15 text-green-400 text-xs rounded-full">Pre-emergent</span>
                <span className="px-2 py-1 bg-green-600/15 text-green-400 text-xs rounded-full">Spring Cleanup</span>
                <span className="px-2 py-1 bg-green-600/15 text-green-400 text-xs rounded-full">Mulching</span>
              </div>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Recent Activity</h3>}>
            <div className="space-y-3">
              {recentActivity.length > 0 ? recentActivity.map(activity => {
                const Icon = activityIcons[activity.type] || Clock;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-earth-800/50 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-earth-200">{activity.message}</p>
                      <p className="text-[10px] text-earth-500 mt-0.5">
                        {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-earth-400 text-center py-2">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
