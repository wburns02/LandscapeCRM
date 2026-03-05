import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Grid, List, Phone, Mail, MapPin } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import type { Customer } from '../../types';

export default function CustomersPage() {
  const { customers, refreshCustomers } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', type: 'residential',
  });

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.address.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || c.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [customers, search, typeFilter]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      await api.post('/customers', {
        first_name: firstName,
        last_name: lastName,
        email: formData.email || undefined,
        phone: formData.phone,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip || undefined,
        customer_type: formData.type,
      });
      toast.success(`Customer "${formData.name}" created`);
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', type: 'residential' });
      await refreshCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create customer');
    }
  };

  const typeColors: Record<string, 'green' | 'sky' | 'amber' | 'purple'> = {
    residential: 'green', commercial: 'sky', hoa: 'amber', municipal: 'purple',
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true, render: (c: Customer) => (
      <div>
        <p className="font-medium text-earth-100">{c.name}</p>
        <p className="text-xs text-earth-400">{c.address}, {c.city}</p>
      </div>
    )},
    { key: 'type', header: 'Type', sortable: true, render: (c: Customer) => (
      <Badge color={typeColors[c.type] || 'earth'}>{c.type.replace('_', ' ')}</Badge>
    )},
    { key: 'phone', header: 'Phone', render: (c: Customer) => <span className="text-earth-300">{c.phone}</span> },
    { key: 'email', header: 'Email', render: (c: Customer) => <span className="text-earth-300">{c.email}</span> },
    { key: 'tags', header: 'Tags', render: (c: Customer) => (
      <div className="flex flex-wrap gap-1">
        {c.tags.map(t => <Badge key={t} color="earth">{t}</Badge>)}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">All Customers</h2>
          <p className="text-sm text-earth-400">{customers.length} total customers</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          Add Customer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search customers..." className="flex-1" />
        <Select
          options={[
            { value: '', label: 'All Types' },
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'hoa', label: 'HOA' },
            { value: 'municipal', label: 'Municipal' },
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <div className="flex border border-earth-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2.5 cursor-pointer ${viewMode === 'table' ? 'bg-green-600 text-white' : 'text-earth-400 hover:bg-earth-800'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2.5 cursor-pointer ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'text-earth-400 hover:bg-earth-800'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title="No customers found"
          description={search ? 'Try adjusting your search or filters' : 'Add your first customer to get started'}
          actionLabel="Add Customer"
          onAction={() => setShowAddModal(true)}
        />
      ) : viewMode === 'table' ? (
        <Card padding={false}>
          <DataTable
            data={filtered as unknown as Record<string, unknown>[]}
            columns={columns as unknown as { key: string; header: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode }[]}
            keyField="id"
            onRowClick={(item) => navigate(`/customers/${(item as unknown as Customer).id}`)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => (
            <Card key={customer.id} hover onClick={() => navigate(`/customers/${customer.id}`)}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-earth-100">{customer.name}</h3>
                  <Badge color={typeColors[customer.type] || 'earth'}>{customer.type}</Badge>
                </div>
                <div className="space-y-1.5 text-sm text-earth-300">
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-earth-400" />{customer.phone}</div>
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-earth-400" />{customer.email}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-earth-400" />{customer.address}, {customer.city}</div>
                </div>
                {customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map(t => <Badge key={t} color="earth">{t}</Badge>)}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Customer"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Customer</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
          <Select label="Type" options={[
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'hoa', label: 'HOA' },
            { value: 'municipal', label: 'Municipal' },
          ]} value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
          <Input label="Phone" type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="(512) 555-0000" />
          <div className="sm:col-span-2">
            <Input label="Address" value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} placeholder="1234 Main St" />
          </div>
          <Input label="City" value={formData.city} onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} placeholder="Austin" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="State" value={formData.state} onChange={e => setFormData(f => ({ ...f, state: e.target.value }))} placeholder="TX" />
            <Input label="ZIP" value={formData.zip} onChange={e => setFormData(f => ({ ...f, zip: e.target.value }))} placeholder="78745" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
