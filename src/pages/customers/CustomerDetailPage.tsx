import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, DollarSign, Briefcase, FileText, Receipt, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';
import { useState } from 'react';

type Tab = 'overview' | 'jobs' | 'quotes' | 'invoices' | 'notes';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, jobs, quotes, invoices, updateCustomer, refreshCustomers } = useData();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const customer = customers.find(c => c.id === id);

  const [editData, setEditData] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', zip: '',
    type: 'residential', property_size_sqft: '', notes: '',
  });

  const openEditModal = () => {
    if (!customer) return;
    setEditData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip || '',
      type: customer.type,
      property_size_sqft: customer.property_size_sqft?.toString() || '',
      notes: customer.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!customer || !editData.name || !editData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    setIsSaving(true);
    try {
      await updateCustomer(customer.id, {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        city: editData.city,
        state: editData.state,
        zip: editData.zip,
        type: editData.type,
        property_size_sqft: editData.property_size_sqft ? parseInt(editData.property_size_sqft) : undefined,
        notes: editData.notes || undefined,
      });
      toast.success('Customer updated');
      setShowEditModal(false);
    } catch {
      toast.error('Failed to update customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${customer.id}`);
      toast.success(`Customer "${customer.name}" deleted`);
      await refreshCustomers();
      navigate('/customers');
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/customers')}>
          Back
        </Button>
        <EmptyState
          icon={<MapPin className="w-10 h-10" />}
          title="Customer not found"
          description="This customer may have been deleted."
          actionLabel="View All Customers"
          onAction={() => navigate('/customers')}
        />
      </div>
    );
  }

  const customerJobs = jobs.filter(j => j.customer_id === customer.id);
  const customerQuotes = quotes.filter(q => q.customer_id === customer.id);
  const customerInvoices = invoices.filter(i => i.customer_id === customer.id);
  const totalRevenue = customerInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'jobs', label: `Jobs (${customerJobs.length})` },
    { key: 'quotes', label: `Quotes (${customerQuotes.length})` },
    { key: 'invoices', label: `Invoices (${customerInvoices.length})` },
    { key: 'notes', label: 'Notes' },
  ] as const;

  const typeColors: Record<string, 'green' | 'sky' | 'amber' | 'purple'> = {
    residential: 'green', commercial: 'sky', hoa: 'amber', municipal: 'purple',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/customers')}>
          Back
        </Button>
      </div>

      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-600/20 flex items-center justify-center text-green-400 text-xl font-bold">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold font-display text-earth-50">{customer.name}</h2>
                <Badge color={typeColors[customer.type] || 'earth'}>{customer.type}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-earth-300">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{customer.address}, {customer.city} {customer.state}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Edit className="w-4 h-4" />} onClick={openEditModal}>Edit</Button>
            <Button variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <Briefcase className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-earth-50">{customerJobs.length}</p>
            <p className="text-xs text-earth-400">Total Jobs</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-earth-50">${totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-earth-400">Total Paid</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <FileText className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-earth-50">{customerQuotes.length}</p>
            <p className="text-xs text-earth-400">Quotes</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Calendar className="w-5 h-5 text-sky-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-earth-50">{format(new Date(customer.created_at), 'MMM yyyy')}</p>
            <p className="text-xs text-earth-400">Since</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-earth-800 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-earth-400 hover:text-earth-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Property Details</h3>}>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-earth-400">Property Size</dt>
                <dd className="text-sm text-earth-100">{customer.property_size_sqft?.toLocaleString() || 'N/A'} sq ft</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-earth-400">Address</dt>
                <dd className="text-sm text-earth-100">{customer.address}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-earth-400">City</dt>
                <dd className="text-sm text-earth-100">{customer.city}, {customer.state} {customer.zip}</dd>
              </div>
            </dl>
          </Card>
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Tags</h3>}>
            <div className="flex flex-wrap gap-2">
              {customer.tags.length === 0 ? (
                <p className="text-sm text-earth-400">No tags</p>
              ) : (
                customer.tags.map(t => <Badge key={t} color="green" size="md">{t}</Badge>)
              )}
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-earth-800">
                <p className="text-xs text-earth-400 mb-1">Notes</p>
                <p className="text-sm text-earth-200">{customer.notes}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {customerJobs.length === 0 ? (
            <EmptyState icon={<Briefcase className="w-10 h-10" />} title="No jobs yet" description="Create a job for this customer." />
          ) : (
            customerJobs.map(job => (
              <Card key={job.id} hover onClick={() => navigate(`/jobs/${job.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-earth-100">{job.title}</p>
                    <p className="text-xs text-earth-400">{format(new Date(job.scheduled_date), 'MMM d, yyyy')} - {job.crew?.name || 'Unassigned'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-earth-200">${(job.total_price ?? 0).toLocaleString()}</span>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="space-y-3">
          {customerQuotes.length === 0 ? (
            <EmptyState icon={<FileText className="w-10 h-10" />} title="No quotes yet" description="Create a quote for this customer." />
          ) : (
            customerQuotes.map(q => (
              <Card key={q.id} hover>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-earth-100">{q.title}</p>
                    <p className="text-xs text-earth-400">Valid until {q.valid_until ? format(new Date(q.valid_until), 'MMM d, yyyy') : '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-earth-200">${q.total.toLocaleString()}</span>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {customerInvoices.length === 0 ? (
            <EmptyState icon={<Receipt className="w-10 h-10" />} title="No invoices yet" description="Invoices will appear here once jobs are completed." />
          ) : (
            customerInvoices.map(inv => (
              <Card key={inv.id} hover>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-earth-100">{inv.invoice_number}</p>
                    <p className="text-xs text-earth-400">Due {format(new Date(inv.due_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-earth-200">${inv.total.toLocaleString()}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <Card>
          <p className="text-sm text-earth-200">{customer.notes || 'No notes for this customer.'}</p>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Customer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-earth-200">
          Are you sure you want to delete <strong>{customer.name}</strong>? This action cannot be undone.
        </p>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Customer"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving}>Save Changes</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name" required value={editData.name} onChange={e => setEditData(f => ({ ...f, name: e.target.value }))} />
          <Select label="Type" options={[
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'hoa', label: 'HOA' },
            { value: 'municipal', label: 'Municipal' },
          ]} value={editData.type} onChange={e => setEditData(f => ({ ...f, type: e.target.value }))} />
          <Input label="Email" type="email" value={editData.email} onChange={e => setEditData(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" type="tel" required value={editData.phone} onChange={e => setEditData(f => ({ ...f, phone: e.target.value }))} />
          <div className="sm:col-span-2">
            <Input label="Address" value={editData.address} onChange={e => setEditData(f => ({ ...f, address: e.target.value }))} />
          </div>
          <Input label="City" value={editData.city} onChange={e => setEditData(f => ({ ...f, city: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="State" value={editData.state} onChange={e => setEditData(f => ({ ...f, state: e.target.value }))} />
            <Input label="ZIP" value={editData.zip} onChange={e => setEditData(f => ({ ...f, zip: e.target.value }))} />
          </div>
          <Input label="Property Size (sq ft)" type="number" value={editData.property_size_sqft} onChange={e => setEditData(f => ({ ...f, property_size_sqft: e.target.value }))} />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-earth-200 mb-1.5">Notes</label>
            <textarea
              value={editData.notes}
              onChange={e => setEditData(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 placeholder:text-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 resize-none"
              placeholder="Customer notes..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
