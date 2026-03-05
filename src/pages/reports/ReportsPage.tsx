import { useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';

type ReportTab = 'revenue' | 'jobs' | 'crews' | 'customers';

export default function ReportsPage() {
  const { dashboard, jobs, crews, customers, invoices } = useData();
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');

  const revenueData = dashboard?.revenue_by_month || [];

  const jobsByType = (() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const type = j.type.replace('_', ' ');
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const crewPerf = crews.map(crew => {
    const crewJobs = jobs.filter(j => j.crew_id === crew.id);
    const completed = crewJobs.filter(j => j.status === 'completed');
    const revenue = crewJobs.reduce((s, j) => s + j.total_price, 0);
    return { name: crew.name, jobs: crewJobs.length, completed: completed.length, revenue };
  });

  const topCustomers = customers.map(c => {
    const custInvoices = invoices.filter(i => i.customer_id === c.id);
    const totalSpent = custInvoices.reduce((s, i) => s + i.amount_paid, 0);
    const totalJobs = jobs.filter(j => j.customer_id === c.id).length;
    return { name: c.name, totalSpent, totalJobs, type: c.type };
  }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

  const tabs: { key: ReportTab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'jobs', label: 'Job Analysis', icon: BarChart3 },
    { key: 'crews', label: 'Crew Performance', icon: Users },
    { key: 'customers', label: 'Customer Value', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-earth-100">Reports</h2>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                  : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Revenue YTD" value={`$${(dashboard?.revenue_ytd || 0).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="green" change={15} />
            <StatCard title="Avg Monthly" value={`$${Math.round((dashboard?.revenue_ytd || 0) / 3).toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} color="sky" />
            <StatCard title="Profit Margin" value="42%" icon={<BarChart3 className="w-5 h-5" />} color="green" />
          </div>
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Revenue vs Expenses</h3>}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis dataKey="month" stroke="#a68360" fontSize={12} />
                  <YAxis stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }} formatter={(value: unknown) => [`$${Number(value).toLocaleString()}`, '']} />
                  <Legend formatter={(value: string) => <span className="text-earth-300 text-xs">{value}</span>} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#a68360" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Profit Trend</h3>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData.filter(d => d.revenue > 0).map(d => ({ ...d, profit: d.revenue - d.expenses }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis dataKey="month" stroke="#a68360" fontSize={12} />
                  <YAxis stroke="#a68360" fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }} formatter={(value: unknown) => [`$${Number(value).toLocaleString()}`, '']} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="Profit" />
                  <Line type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8' }} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Jobs by Type</h3>}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis type="number" stroke="#a68360" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#a68360" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }} />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} name="Jobs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Total Jobs" value={jobs.length} icon={<BarChart3 className="w-5 h-5" />} color="green" />
            <StatCard title="Completed" value={jobs.filter(j => j.status === 'completed').length} icon={<BarChart3 className="w-5 h-5" />} color="green" />
            <StatCard title="In Progress" value={jobs.filter(j => j.status === 'in_progress').length} icon={<BarChart3 className="w-5 h-5" />} color="amber" />
            <StatCard title="Avg Job Value" value={`$${Math.round(jobs.reduce((s, j) => s + j.total_price, 0) / (jobs.length || 1)).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="sky" />
          </div>
        </div>
      )}

      {activeTab === 'crews' && (
        <div className="space-y-4">
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Crew Performance</h3>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={crewPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4d3c30" />
                  <XAxis dataKey="name" stroke="#a68360" fontSize={12} />
                  <YAxis stroke="#a68360" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid #5e4838', borderRadius: 8, color: '#f0ebe3' }} />
                  <Legend formatter={(value: string) => <span className="text-earth-300 text-xs">{value}</span>} />
                  <Bar dataKey="jobs" fill="#38bdf8" name="Total Jobs" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {crewPerf.map(crew => (
            <Card key={crew.name} hover>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-earth-100">{crew.name}</h4>
                  <p className="text-xs text-earth-400">{crew.jobs} jobs assigned, {crew.completed} completed</p>
                </div>
                <p className="text-lg font-bold text-green-400">${crew.revenue.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-4">
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Top Customers by Revenue</h3>} padding={false}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-earth-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-earth-400">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-earth-400">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-earth-400">Jobs</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-earth-400">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-800/50">
                {topCustomers.map((c, i) => (
                  <tr key={c.name} className="hover:bg-earth-800/30">
                    <td className="px-4 py-3 text-sm">
                      <span className="text-earth-400 mr-2">#{i + 1}</span>
                      <span className="text-earth-100 font-medium">{c.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-earth-300 capitalize">{c.type}</td>
                    <td className="px-4 py-3 text-sm text-earth-300 text-right">{c.totalJobs}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-400">${c.totalSpent.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
