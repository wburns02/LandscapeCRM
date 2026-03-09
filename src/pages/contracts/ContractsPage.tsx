import { useState, useMemo } from 'react';
import { Plus, FileSignature, DollarSign, Calendar, RefreshCw, Trash2, Play, XCircle, RotateCcw } from 'lucide-react';
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
import { format, addYears } from 'date-fns';
import type { Contract } from '../../types';

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'seasonal', label: 'Seasonal' },
];

const serviceTypeOptions = [
  { value: '', label: 'Select service type' },
  { value: 'lawn_maintenance', label: 'Lawn Maintenance' },
  { value: 'landscape_design', label: 'Landscape Design' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'tree_trimming', label: 'Tree Trimming' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'snow_removal', label: 'Snow Removal' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'other', label: 'Other' },
];

function getContractStatus(contract: Contract): string {
  if (contract.status) return contract.status;
  return contract.is_active ? 'active' : 'expired';
}

function getStatusBadgeColor(status: string): 'green' | 'amber' | 'red' | 'sky' | 'earth' | 'purple' {
  switch (status) {
    case 'active': return 'green';
    case 'draft': return 'sky';
    case 'terminated': return 'red';
    case 'expired': return 'earth';
    default: return 'earth';
  }
}

export default function ContractsPage() {
  const { contracts, customers, addContract, updateContract, deleteContract } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', customer_id: '', frequency: 'monthly', start_date: '', end_date: '', monthly_value: '',
  });

  // Edit modal state
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    customer_id: '',
    service_type: '',
    frequency: 'monthly',
    monthly_value: '',
    start_date: '',
    end_date: '',
    auto_renew: false,
    services_included: '',
    notes: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleSubmit = async () => {
    if (!formData.title || !formData.customer_id) {
      toast.error('Title and customer are required');
      return;
    }
    try {
      const customer = customers.find(c => c.id === formData.customer_id);
      const monthlyValue = parseFloat(formData.monthly_value) || 0;
      await addContract({
        title: formData.title,
        customer_id: formData.customer_id,
        customer,
        frequency: formData.frequency as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'seasonal',
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        end_date: formData.end_date || undefined,
        monthly_value: monthlyValue,
        total_value: monthlyValue * 12,
      });
      toast.success(`Contract "${formData.title}" created`);
      setShowAddModal(false);
      setFormData({ title: '', customer_id: '', frequency: 'monthly', start_date: '', end_date: '', monthly_value: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contract');
    }
  };

  const openEditModal = (contract: Contract) => {
    setEditContract(contract);
    const servicesArr = (contract.services ?? []).map(s =>
      typeof s === 'string' ? s : s.description ?? ''
    );
    setEditData({
      title: contract.title || '',
      customer_id: contract.customer_id || '',
      service_type: contract.contract_type || '',
      frequency: (contract.frequency || contract.visit_frequency || 'monthly'),
      monthly_value: String(contract.monthly_value ?? ''),
      start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
      end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
      auto_renew: contract.auto_renew ?? false,
      services_included: servicesArr.join(', '),
      notes: contract.notes || '',
    });
    setShowDeleteConfirm(false);
  };

  const closeEditModal = () => {
    setEditContract(null);
    setShowDeleteConfirm(false);
  };

  const handleEditSave = async () => {
    if (!editContract) return;
    if (!editData.title) {
      toast.error('Title is required');
      return;
    }
    try {
      const monthlyValue = parseFloat(editData.monthly_value) || 0;
      const servicesArr = editData.services_included
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const customer = customers.find(c => c.id === editData.customer_id);
      await updateContract(editContract.id, {
        title: editData.title,
        customer_id: editData.customer_id,
        customer,
        contract_type: editData.service_type || undefined,
        frequency: editData.frequency as Contract['frequency'],
        monthly_value: monthlyValue,
        total_value: monthlyValue * 12,
        start_date: editData.start_date || editContract.start_date,
        end_date: editData.end_date || undefined,
        auto_renew: editData.auto_renew,
        services: servicesArr,
        notes: editData.notes || undefined,
      });
      toast.success(`Contract "${editData.title}" updated`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update contract');
    }
  };

  const handleDelete = async () => {
    if (!editContract) return;
    try {
      await deleteContract(editContract.id);
      toast.success(`Contract "${editContract.title}" deleted`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contract');
    }
  };

  const handleTerminate = async () => {
    if (!editContract) return;
    try {
      await updateContract(editContract.id, { status: 'terminated', is_active: false });
      toast.success(`Contract "${editContract.title}" terminated`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to terminate contract');
    }
  };

  const handleRenew = async () => {
    if (!editContract) return;
    try {
      const currentEnd = editContract.end_date ? new Date(editContract.end_date) : new Date();
      const newEnd = addYears(currentEnd, 1);
      await updateContract(editContract.id, {
        status: 'active',
        is_active: true,
        end_date: newEnd.toISOString().split('T')[0],
      });
      toast.success(`Contract "${editContract.title}" renewed for 1 year`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to renew contract');
    }
  };

  const handleActivate = async () => {
    if (!editContract) return;
    try {
      await updateContract(editContract.id, { status: 'active', is_active: true });
      toast.success(`Contract "${editContract.title}" activated`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate contract');
    }
  };

  const contractStatus = editContract ? getContractStatus(editContract) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Contracts</h2>
          <p className="text-sm text-earth-400">{contracts.filter(c => c.is_active).length} active contracts</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>New Contract</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Monthly Recurring Revenue" value={`$${totalMonthly.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="Annual Contract Value" value={`$${totalAnnual.toLocaleString()}`} icon={<Calendar className="w-5 h-5" />} color="sky" />
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
            <div key={contract.id} onClick={() => openEditModal(contract)} className="cursor-pointer">
              <Card hover>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-earth-100">{contract.title}</h3>
                      <p className="text-sm text-earth-400">{contract.customer?.name}</p>
                    </div>
                    <Badge color={getStatusBadgeColor(getContractStatus(contract))} dot>
                      {getContractStatus(contract).charAt(0).toUpperCase() + getContractStatus(contract).slice(1)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(contract.services ?? []).map((s, i) => {
                      const label = typeof s === 'string' ? s : s.description ?? '';
                      return <Badge key={i} color="earth">{label.replace('_', ' ')}</Badge>;
                    })}
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
                        {format(new Date(contract.start_date), 'MMM d, yyyy')} - {contract.end_date ? format(new Date(contract.end_date), 'MMM d, yyyy') : '\u2014'}
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
            </div>
          ))}
        </div>
      )}

      {/* Add Contract Modal */}
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
          <Select label="Frequency" options={frequencyOptions} value={formData.frequency} onChange={e => setFormData(f => ({ ...f, frequency: e.target.value }))} />
          <Input label="Start Date" type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} />
          <Input label="End Date" type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} />
          <Input label="Monthly Value" type="number" value={formData.monthly_value} onChange={e => setFormData(f => ({ ...f, monthly_value: e.target.value }))} placeholder="0.00" />
        </div>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        isOpen={!!editContract}
        onClose={closeEditModal}
        title="Edit Contract"
        size="lg"
        footer={
          showDeleteConfirm ? (
            <>
              <p className="text-sm text-red-400 mr-auto self-center">Are you sure? This cannot be undone.</p>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Confirm Delete</Button>
            </>
          ) : (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto"
              >
                Delete
              </Button>
              <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </>
          )
        }
      >
        <div className="space-y-6">
          {/* Status management buttons */}
          {editContract && (
            <div className="flex items-center gap-3 pb-4 border-b border-earth-800/50">
              <span className="text-sm text-earth-400 mr-2">Status:</span>
              <Badge color={getStatusBadgeColor(contractStatus)} dot size="md">
                {contractStatus.charAt(0).toUpperCase() + contractStatus.slice(1)}
              </Badge>
              <div className="flex gap-2 ml-auto">
                {contractStatus === 'active' && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={handleTerminate}
                  >
                    Terminate
                  </Button>
                )}
                {contractStatus === 'expired' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={handleRenew}
                  >
                    Renew
                  </Button>
                )}
                {contractStatus === 'draft' && (
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Play className="w-4 h-4" />}
                    onClick={handleActivate}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Edit form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Contract Title"
                required
                value={editData.title}
                onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                placeholder="Weekly Lawn Maintenance"
              />
            </div>
            <Select
              label="Customer"
              options={[{ value: '', label: 'Select customer' }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
              value={editData.customer_id}
              onChange={e => setEditData(d => ({ ...d, customer_id: e.target.value }))}
            />
            <Select
              label="Service Type"
              options={serviceTypeOptions}
              value={editData.service_type}
              onChange={e => setEditData(d => ({ ...d, service_type: e.target.value }))}
            />
            <Select
              label="Frequency"
              options={frequencyOptions}
              value={editData.frequency}
              onChange={e => setEditData(d => ({ ...d, frequency: e.target.value }))}
            />
            <Input
              label="Monthly Value"
              type="number"
              value={editData.monthly_value}
              onChange={e => setEditData(d => ({ ...d, monthly_value: e.target.value }))}
              placeholder="0.00"
            />
            <Input
              label="Start Date"
              type="date"
              value={editData.start_date}
              onChange={e => setEditData(d => ({ ...d, start_date: e.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              value={editData.end_date}
              onChange={e => setEditData(d => ({ ...d, end_date: e.target.value }))}
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-renew-edit"
                checked={editData.auto_renew}
                onChange={e => setEditData(d => ({ ...d, auto_renew: e.target.checked }))}
                className="w-4 h-4 rounded border-earth-700 bg-earth-900 text-green-600 focus:ring-green-500/30 cursor-pointer"
              />
              <label htmlFor="auto-renew-edit" className="text-sm font-medium text-earth-200 cursor-pointer">
                Auto-Renew
              </label>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Services Included"
                value={editData.services_included}
                onChange={e => setEditData(d => ({ ...d, services_included: e.target.value }))}
                placeholder="Mowing, Edging, Leaf Removal (comma-separated)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-earth-200 mb-1.5">Notes</label>
              <textarea
                value={editData.notes}
                onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2.5 bg-earth-900 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-green-500 focus:ring-green-500/30 transition-colors resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
