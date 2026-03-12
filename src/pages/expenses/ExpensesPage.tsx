import { useState, useMemo } from 'react';
import {
  Plus, DollarSign, TrendingUp, Receipt, Fuel, Truck, Wrench,
  HardHat, TreePine, FileCheck, Car, Package, Trash2, Check,
  X, Clock, Filter, ArrowUpDown,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import type { Expense, ExpenseCategory, ExpenseStatus } from '../../types';

type Tab = 'all' | 'overview' | 'by-job';

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  materials: { label: 'Materials', icon: <Package className="w-4 h-4" />, color: '#22c55e' },
  fuel: { label: 'Fuel', icon: <Fuel className="w-4 h-4" />, color: '#f59e0b' },
  equipment_rental: { label: 'Equipment Rental', icon: <Wrench className="w-4 h-4" />, color: '#3b82f6' },
  subcontractor: { label: 'Subcontractor', icon: <HardHat className="w-4 h-4" />, color: '#8b5cf6' },
  supplies: { label: 'Supplies', icon: <Package className="w-4 h-4" />, color: '#06b6d4' },
  disposal: { label: 'Disposal', icon: <Truck className="w-4 h-4" />, color: '#ef4444' },
  permits: { label: 'Permits', icon: <FileCheck className="w-4 h-4" />, color: '#ec4899' },
  vehicle: { label: 'Vehicle', icon: <Car className="w-4 h-4" />, color: '#64748b' },
  other: { label: 'Other', icon: <Receipt className="w-4 h-4" />, color: '#a68360' },
};

const STATUS_CONFIG: Record<ExpenseStatus, { color: 'amber' | 'green' | 'sky' | 'red'; label: string }> = {
  pending: { color: 'amber', label: 'Pending' },
  approved: { color: 'sky', label: 'Approved' },
  paid: { color: 'green', label: 'Paid' },
  rejected: { color: 'red', label: 'Rejected' },
};

const categoryOptions: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'Materials' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'disposal', label: 'Disposal' },
  { value: 'permits', label: 'Permits' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];

export default function ExpensesPage() {
  const { expenses, jobs, crews, addExpense, updateExpense, deleteExpense } = useData();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ExpenseStatus>('');
  const [categoryFilter, setCategoryFilter] = useState<'' | ExpenseCategory>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    title: '', category: 'materials' as ExpenseCategory, amount: '',
    vendor: '', receipt_number: '', date: new Date().toISOString().split('T')[0],
    job_id: '', crew_id: '', notes: '',
  });

  // KPIs
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonthExpenses = expenses.filter(e =>
    e.status !== 'rejected' && isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })
  );
  const lastMonthExpenses = expenses.filter(e =>
    e.status !== 'rejected' && isWithinInterval(new Date(e.date), { start: lastMonthStart, end: lastMonthEnd })
  );

  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalLastMonth = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const pendingTotal = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  // Filtered and sorted expenses
  const filtered = useMemo(() => {
    let result = [...expenses];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.vendor?.toLowerCase().includes(q) ||
        e.job?.title.toLowerCase().includes(q) ||
        e.crew?.name.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter(e => e.status === statusFilter);
    if (categoryFilter) result = result.filter(e => e.category === categoryFilter);

    result.sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'date') return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
      return mult * (a.amount - b.amount);
    });

    return result;
  }, [expenses, search, statusFilter, categoryFilter, sortBy, sortDir]);

  // Charts data
  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    thisMonthExpenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries()).map(([cat, amount]) => ({
      name: CATEGORY_CONFIG[cat].label,
      value: Math.round(amount * 100) / 100,
      color: CATEGORY_CONFIG[cat].color,
    })).sort((a, b) => b.value - a.value);
  }, [thisMonthExpenses]);

  const monthlyTrend = useMemo(() => {
    const months: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const total = expenses
        .filter(e => e.status !== 'rejected' && isWithinInterval(new Date(e.date), { start: ms, end: me }))
        .reduce((s, e) => s + e.amount, 0);
      months.push({ month: format(d, 'MMM'), total: Math.round(total) });
    }
    return months;
  }, [expenses, now]);

  // By-job breakdown
  const jobExpenses = useMemo(() => {
    const map = new Map<string, { jobTitle: string; customer: string; budget: number; actual: number; expenses: Expense[] }>();
    expenses.filter(e => e.job_id && e.status !== 'rejected').forEach(e => {
      const key = e.job_id!;
      const existing = map.get(key);
      if (existing) {
        existing.actual += e.amount;
        existing.expenses.push(e);
      } else {
        const job = jobs.find(j => j.id === key);
        map.set(key, {
          jobTitle: job?.title || e.job?.title || 'Unknown Job',
          customer: job?.customer?.name || e.job?.customer?.name || '',
          budget: (job?.materials_cost || 0) + (job?.labor_cost || 0) || job?.total_price || 0,
          actual: e.amount,
          expenses: [e],
        });
      }
    });
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.actual - a.actual);
  }, [expenses, jobs]);

  const resetForm = () => {
    setFormData({ title: '', category: 'materials', amount: '', vendor: '', receipt_number: '', date: new Date().toISOString().split('T')[0], job_id: '', crew_id: '', notes: '' });
    setEditingExpense(null);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.amount) {
      toast.error('Title and amount are required');
      return;
    }
    const expenseData: Partial<Expense> = {
      title: formData.title,
      category: formData.category,
      amount: parseFloat(formData.amount),
      vendor: formData.vendor || undefined,
      receipt_number: formData.receipt_number || undefined,
      date: formData.date,
      job_id: formData.job_id || undefined,
      job: formData.job_id ? jobs.find(j => j.id === formData.job_id) : undefined,
      crew_id: formData.crew_id || undefined,
      crew: formData.crew_id ? crews.find(c => c.id === formData.crew_id) : undefined,
      notes: formData.notes || undefined,
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData);
      toast.success('Expense updated');
    } else {
      await addExpense(expenseData);
      toast.success('Expense added');
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleApprove = async (expense: Expense) => {
    await updateExpense(expense.id, { status: 'approved', approved_by: 'Demo User', approved_at: new Date().toISOString() });
    toast.success(`"${expense.title}" approved`);
  };

  const handleReject = async (expense: Expense) => {
    await updateExpense(expense.id, { status: 'rejected' });
    toast.success(`"${expense.title}" rejected`);
  };

  const handleMarkPaid = async (expense: Expense) => {
    await updateExpense(expense.id, { status: 'paid', paid_at: new Date().toISOString() });
    toast.success(`"${expense.title}" marked as paid`);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      vendor: expense.vendor || '',
      receipt_number: expense.receipt_number || '',
      date: expense.date,
      job_id: expense.job_id || '',
      crew_id: expense.crew_id || '',
      notes: expense.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (expense: Expense) => {
    await deleteExpense(expense.id);
    toast.success(`"${expense.title}" deleted`);
  };

  const toggleSort = (col: 'date' | 'amount') => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const formatMoney = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All Expenses' },
    { id: 'overview', label: 'Overview' },
    { id: 'by-job', label: 'Budget vs Actual' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Expenses</h2>
          <p className="text-sm text-earth-400">{expenses.length} total expenses</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowAddModal(true); }}>
          Add Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="This Month"
          value={formatMoney(totalThisMonth)}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          change={totalLastMonth > 0 ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100) : undefined}
        />
        <StatCard
          title="Pending Approval"
          value={formatMoney(pendingTotal)}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Top Category"
          value={categoryBreakdown[0]?.name || '—'}
          icon={<Receipt className="w-5 h-5" />}
          color="earth"
        />
        <StatCard
          title="Avg per Job"
          value={jobExpenses.length > 0 ? formatMoney(jobExpenses.reduce((s, j) => s + j.actual, 0) / jobExpenses.length) : '$0.00'}
          icon={<Receipt className="w-5 h-5" />}
          color="sky"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All Expenses Tab */}
      {tab === 'all' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} placeholder="Search expenses, vendors, jobs..." />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as '' | ExpenseStatus)}
                className="py-2.5 px-3 bg-earth-900 border border-earth-700 rounded-lg text-earth-100 text-sm min-h-[44px]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as '' | ExpenseCategory)}
                className="py-2.5 px-3 bg-earth-900 border border-earth-700 rounded-lg text-earth-100 text-sm min-h-[44px]"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expense Table */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-10 h-10" />}
              title="No expenses found"
              description={search || statusFilter || categoryFilter ? 'Try adjusting your search or filters' : 'Add your first expense to start tracking costs'}
              actionLabel="Add Expense"
              onAction={() => { resetForm(); setShowAddModal(true); }}
            />
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-earth-800">
                      <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase cursor-pointer" onClick={() => toggleSort('date')}>
                        <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase">Expense</th>
                      <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden md:table-cell">Category</th>
                      <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden lg:table-cell">Job</th>
                      <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden lg:table-cell">Vendor</th>
                      <th className="p-3 text-right text-xs font-medium text-earth-400 uppercase cursor-pointer" onClick={() => toggleSort('amount')}>
                        <div className="flex items-center gap-1 justify-end">Amount <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden sm:table-cell">Status</th>
                      <th className="p-3 text-right text-xs font-medium text-earth-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(expense => {
                      const catConf = CATEGORY_CONFIG[expense.category];
                      const statusConf = STATUS_CONFIG[expense.status];
                      return (
                        <tr key={expense.id} className="border-b border-earth-800/50 hover:bg-earth-800/20 transition-colors">
                          <td className="p-3 text-sm text-earth-300 whitespace-nowrap">
                            {format(new Date(expense.date), 'MMM d')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-md bg-earth-800/50" style={{ color: catConf.color }}>
                                {catConf.icon}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-earth-100">{expense.title}</p>
                                {expense.crew && (
                                  <p className="text-xs text-earth-400 flex items-center gap-1 mt-0.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: expense.crew.color }} />
                                    {expense.crew.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <Badge color="earth">{catConf.label}</Badge>
                          </td>
                          <td className="p-3 text-sm text-earth-300 hidden lg:table-cell">
                            {expense.job?.title || '—'}
                          </td>
                          <td className="p-3 hidden lg:table-cell">
                            <div>
                              <p className="text-sm text-earth-200">{expense.vendor || '—'}</p>
                              {expense.receipt_number && <p className="text-xs text-earth-500">{expense.receipt_number}</p>}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm font-semibold text-earth-100">{formatMoney(expense.amount)}</span>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <Badge color={statusConf.color}>{statusConf.label}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              {expense.status === 'pending' && (
                                <>
                                  <button onClick={() => handleApprove(expense)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded cursor-pointer" title="Approve">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleReject(expense)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer" title="Reject">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {expense.status === 'approved' && (
                                <button onClick={() => handleMarkPaid(expense)} className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded cursor-pointer" title="Mark Paid">
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleEdit(expense)} className="p-1.5 text-earth-400 hover:bg-earth-700/50 rounded cursor-pointer" title="Edit">
                                <Receipt className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(expense)} className="p-1.5 text-red-400/60 hover:bg-red-500/10 rounded cursor-pointer" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-earth-800 text-right">
                <span className="text-sm text-earth-400">Total shown: </span>
                <span className="text-sm font-bold text-earth-100">
                  {formatMoney(filtered.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Monthly Expenses (6 months)</h3>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <XAxis dataKey="month" tick={{ fill: '#a68360', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a68360', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1510', border: '1px solid #3d3228', borderRadius: '8px' }}
                    labelStyle={{ color: '#d4c4a8' }}
                    formatter={((value: number) => [formatMoney(value), 'Total']) as any}
                  />
                  <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Category Breakdown (This Month)</h3>}>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-earth-400 text-center py-12">No expenses this month</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value: string) => <span className="text-xs text-earth-300">{value}</span>}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1510', border: '1px solid #3d3228', borderRadius: '8px' }}
                      formatter={((value: number) => [formatMoney(value), 'Amount']) as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Top Vendors */}
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Top Vendors (This Month)</h3>}>
            <div className="space-y-3">
              {(() => {
                const vendorMap = new Map<string, number>();
                thisMonthExpenses.forEach(e => {
                  if (e.vendor) vendorMap.set(e.vendor, (vendorMap.get(e.vendor) || 0) + e.amount);
                });
                const vendors = Array.from(vendorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
                const max = vendors[0]?.[1] || 1;
                return vendors.length === 0 ? (
                  <p className="text-sm text-earth-400 text-center py-8">No vendors this month</p>
                ) : vendors.map(([name, amount]) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-earth-200">{name}</span>
                      <span className="font-medium text-earth-100">{formatMoney(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${(amount / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>

          {/* Crew Spending */}
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Crew Spending (This Month)</h3>}>
            <div className="space-y-3">
              {(() => {
                const crewMap = new Map<string, { name: string; color: string; total: number }>();
                thisMonthExpenses.forEach(e => {
                  if (e.crew_id && e.crew) {
                    const existing = crewMap.get(e.crew_id);
                    if (existing) existing.total += e.amount;
                    else crewMap.set(e.crew_id, { name: e.crew.name, color: e.crew.color || '#a68360', total: e.amount });
                  }
                });
                const crewData = Array.from(crewMap.values()).sort((a, b) => b.total - a.total);
                const max = crewData[0]?.total || 1;
                return crewData.length === 0 ? (
                  <p className="text-sm text-earth-400 text-center py-8">No crew expenses this month</p>
                ) : crewData.map(crew => (
                  <div key={crew.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-earth-200">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: crew.color }} />
                        {crew.name}
                      </span>
                      <span className="font-medium text-earth-100">{formatMoney(crew.total)}</span>
                    </div>
                    <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(crew.total / max) * 100}%`, backgroundColor: crew.color }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* Budget vs Actual Tab */}
      {tab === 'by-job' && (
        <div className="space-y-4">
          {jobExpenses.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-10 h-10" />}
              title="No job expenses yet"
              description="Link expenses to jobs to see budget vs actual comparisons"
            />
          ) : (
            jobExpenses.map(({ id, jobTitle, customer, budget, actual, expenses: jobExps }) => {
              const variance = budget - actual;
              const pct = budget > 0 ? (actual / budget) * 100 : 0;
              const overBudget = pct > 100;

              return (
                <Card key={id}>
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-earth-100">{jobTitle}</h3>
                        {customer && <p className="text-xs text-earth-400">{customer}</p>}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-xs text-earth-400">Budget</p>
                          <p className="font-semibold text-earth-200">{formatMoney(budget)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-earth-400">Actual</p>
                          <p className={`font-semibold ${overBudget ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(actual)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-earth-400">Variance</p>
                          <p className={`font-semibold ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {variance >= 0 ? '+' : ''}{formatMoney(variance)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-earth-400 mb-1">
                        <span>{Math.round(pct)}% of budget spent</span>
                        <span>{budget > 0 ? formatMoney(budget - actual) + ' remaining' : 'No budget set'}</span>
                      </div>
                      <div className="h-2 bg-earth-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="space-y-1.5">
                      {jobExps.map(e => (
                        <div key={e.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-earth-800/20">
                          <div className="flex items-center gap-2">
                            <span style={{ color: CATEGORY_CONFIG[e.category].color }}>{CATEGORY_CONFIG[e.category].icon}</span>
                            <span className="text-earth-200">{e.title}</span>
                            {e.vendor && <span className="text-xs text-earth-500">({e.vendor})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge color={STATUS_CONFIG[e.status].color}>{STATUS_CONFIG[e.status].label}</Badge>
                            <span className="font-medium text-earth-100">{formatMoney(e.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingExpense ? 'Save Changes' : 'Add Expense'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Expense Title"
              required
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Mulch delivery, Fuel refill"
            />
          </div>
          <Select
            label="Category"
            options={categoryOptions}
            value={formData.category}
            onChange={e => setFormData(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
          />
          <Input
            label="Amount"
            type="number"
            required
            value={formData.amount}
            onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            prefix="$"
          />
          <Input
            label="Vendor"
            value={formData.vendor}
            onChange={e => setFormData(f => ({ ...f, vendor: e.target.value }))}
            placeholder="e.g., Home Depot, Sunbelt Rentals"
          />
          <Input
            label="Receipt / Invoice #"
            value={formData.receipt_number}
            onChange={e => setFormData(f => ({ ...f, receipt_number: e.target.value }))}
            placeholder="e.g., INV-12345"
          />
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
          />
          <Select
            label="Link to Job"
            options={[{ value: '', label: 'No job (overhead)' }, ...jobs.map(j => ({ value: j.id, label: j.title }))]}
            value={formData.job_id}
            onChange={e => setFormData(f => ({ ...f, job_id: e.target.value }))}
          />
          <Select
            label="Crew"
            options={[{ value: '', label: 'No crew' }, ...crews.map(c => ({ value: c.id, label: c.name }))]}
            value={formData.crew_id}
            onChange={e => setFormData(f => ({ ...f, crew_id: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Input
              label="Notes"
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
