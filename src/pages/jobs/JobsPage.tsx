import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, Calendar, Clock, DollarSign } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import type { JobStatus, JobType } from '../../types';

const statusTabs: { key: '' | JobStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'cancelled', label: 'Cancelled' },
];

const jobTypeOptions: { value: JobType; label: string }[] = [
  { value: 'mowing', label: 'Mowing' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'tree_service', label: 'Tree Service' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'planting', label: 'Planting' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'fertilization', label: 'Fertilization' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'snow_removal', label: 'Snow Removal' },
  { value: 'design', label: 'Design' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export default function JobsPage() {
  const { jobs, customers, crews } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | JobStatus>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', customer_id: '', type: 'mowing' as JobType, crew_id: '',
    scheduled_date: '', estimated_hours: '2', total_price: '',
  });

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        j.crew?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || j.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobs, search, statusFilter]);

  const handleSubmit = () => {
    if (!formData.title || !formData.customer_id || !formData.scheduled_date) {
      toast.error('Title, customer, and date are required');
      return;
    }
    toast.success(`Job "${formData.title}" created`);
    setShowAddModal(false);
    setFormData({ title: '', customer_id: '', type: 'mowing', crew_id: '', scheduled_date: '', estimated_hours: '2', total_price: '' });
  };

  const typeColor: Record<string, string> = {
    mowing: 'text-green-400', landscaping: 'text-green-300', hardscape: 'text-earth-300',
    tree_service: 'text-amber-400', irrigation: 'text-sky-400', planting: 'text-green-400',
    cleanup: 'text-earth-300', fertilization: 'text-amber-300', pest_control: 'text-red-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Jobs</h2>
          <p className="text-sm text-earth-400">{jobs.length} total jobs</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          New Job
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === tab.key
                ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search jobs, customers, crews..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-10 h-10" />}
          title="No jobs found"
          description={search || statusFilter ? 'Try adjusting your search or filters' : 'Create your first job to get started'}
          actionLabel="New Job"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => (
            <Card key={job.id} hover onClick={() => navigate(`/jobs/${job.id}`)}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-earth-100">{job.title}</h3>
                    <p className="text-xs text-earth-400">{job.customer?.name}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-earth-300">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-earth-400" />
                    {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-earth-400" />
                    {job.estimated_hours}h est
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-earth-400" />
                    ${job.total_price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-earth-800/50">
                  <Badge color="earth">{job.type.replace('_', ' ')}</Badge>
                  {job.crew && (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: job.crew.color }} />
                      <span className={typeColor[job.type] || 'text-earth-300'}>{job.crew.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="New Job"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Job</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Job Title" required value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Weekly Lawn Maintenance" />
          </div>
          <Select label="Customer" options={[{ value: '', label: 'Select customer' }, ...customers.map(c => ({ value: c.id, label: c.name }))]} value={formData.customer_id} onChange={e => setFormData(f => ({ ...f, customer_id: e.target.value }))} />
          <Select label="Job Type" options={jobTypeOptions.map(o => ({ value: o.value, label: o.label }))} value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value as JobType }))} />
          <Select label="Assign Crew" options={[{ value: '', label: 'Unassigned' }, ...crews.map(c => ({ value: c.id, label: c.name }))]} value={formData.crew_id} onChange={e => setFormData(f => ({ ...f, crew_id: e.target.value }))} />
          <Input label="Scheduled Date" type="date" required value={formData.scheduled_date} onChange={e => setFormData(f => ({ ...f, scheduled_date: e.target.value }))} />
          <Input label="Estimated Hours" type="number" value={formData.estimated_hours} onChange={e => setFormData(f => ({ ...f, estimated_hours: e.target.value }))} />
          <Input label="Total Price" type="number" value={formData.total_price} onChange={e => setFormData(f => ({ ...f, total_price: e.target.value }))} placeholder="0.00" prefix="$" />
        </div>
      </Modal>
    </div>
  );
}
