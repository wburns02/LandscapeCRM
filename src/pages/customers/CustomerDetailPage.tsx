import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, DollarSign, Briefcase, FileText, Receipt } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { useState } from 'react';

type Tab = 'overview' | 'jobs' | 'quotes' | 'invoices' | 'notes';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, jobs, quotes, invoices } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const customer = customers.find(c => c.id === id);

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
  const totalRevenue = customerInvoices.reduce((sum, inv) => sum + inv.amount_paid, 0);

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
          <Button variant="secondary" icon={<Edit className="w-4 h-4" />}>Edit</Button>
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
                    <span className="text-sm font-medium text-earth-200">${job.total_price.toLocaleString()}</span>
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
                    <p className="text-xs text-earth-400">Valid until {format(new Date(q.valid_until), 'MMM d, yyyy')}</p>
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
    </div>
  );
}
