import { useState, useMemo } from 'react';
import { Plus, FileSignature, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';

export default function ContractsPage() {
  const { contracts, customers } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', customer_id: '', frequency: 'monthly', start_date: '', end_date: '', monthly_value: '',
  });

  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.customer?.name.toLowerCase().includes(search.toLowerCase());
      const matchActive = activeFilter === 'all' || (activeFilter === 'active' ? c.is_active : !c.is_active);
      return matchSearch && matchActive;
    });
  }, [contracts, search, activeFilter]);

  const totalMonthly = contracts.filter(c => c.is_active).reduce((s, c) => s + (c.monthly_value ?? 0), 0);
  const totalAnnual = contracts.filter(c => c.is_active).reduce((s, c) => s + (c.total_value ?? 0), 0);

  const handleSubmit = () => {
    if (!formData.title || !formData.customer_id) {
      toast.error('Title and customer are required');
      return;
    }
    toast.success(`Contract "${formData.title}" created`);
    setShowAddModal(false);
    setFormData({ title: '', customer_id: '', frequency: 'monthly', start_date: '', end_date: '', monthly_value: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Contracts</h2>
          <p className="text-sm text-earth-400">{contracts.filter(c => c.is_active).length} active contracts</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>New Contract</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-600/15 text-green-400"><DollarSign className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-earth-400">Monthly Recurring Revenue</p>
              <p className="text-xl font-bold text-earth-50">${totalMonthly.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-600/15 text-sky-400"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-sm text-earth-400">Annual Contract Value</p>
              <p className="text-xl font-bold text-earth-50">${totalAnnual.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="flex gap-1">
          {(['all', 'active', 'expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer capitalize ${
                activeFilter === f
                  ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                  : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search contracts..." className="flex-1" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="w-10 h-10" />}
          title="No contracts found"
          description="Create recurring service contracts for your customers."
          actionLabel="New Contract"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(contract => (
            <Card key={contract.id} hover>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-earth-100">{contract.title}</h3>
                    <p className="text-sm text-earth-400">{contract.customer?.name}</p>
                  </div>
                  <Badge color={contract.is_active ? 'green' : 'earth'} dot>
                    {contract.is_active ? 'Active' : 'Expired'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(contract.services ?? []).map(s => <Badge key={s} color="earth">{s.replace('_', ' ')}</Badge>)}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-earth-800/50">
                  <div>
                    <p className="text-xs text-earth-400">Frequency</p>
                    <p className="text-sm text-earth-200 capitalize">{contract.frequency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-400">Monthly Value</p>
                    <p className="text-sm font-semibold text-earth-100">${(contract.monthly_value ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-400">Period</p>
                    <p className="text-xs text-earth-200">
                      {format(new Date(contract.start_date), 'MMM d, yyyy')} - {contract.end_date ? format(new Date(contract.end_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-400">Auto-Renew</p>
                    <p className="text-sm text-earth-200 flex items-center gap-1">
                      {contract.auto_renew && <RefreshCw className="w-3 h-3 text-green-400" />}
                      {contract.auto_renew ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="New Contract"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Contract</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Contract Title" required value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Weekly Lawn Maintenance" />
          </div>
          <Select label="Customer" options={[{ value: '', label: 'Select customer' }, ...customers.map(c => ({ value: c.id, label: c.name }))]} value={formData.customer_id} onChange={e => setFormData(f => ({ ...f, customer_id: e.target.value }))} />
          <Select label="Frequency" options={[
            { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Biweekly' },
            { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
            { value: 'annual', label: 'Annual' }, { value: 'seasonal', label: 'Seasonal' },
          ]} value={formData.frequency} onChange={e => setFormData(f => ({ ...f, frequency: e.target.value }))} />
          <Input label="Start Date" type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} />
          <Input label="End Date" type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} />
          <Input label="Monthly Value" type="number" value={formData.monthly_value} onChange={e => setFormData(f => ({ ...f, monthly_value: e.target.value }))} placeholder="0.00" />
        </div>
      </Modal>
    </div>
  );
}
