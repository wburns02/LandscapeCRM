import { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw, Plus, Search, Calendar, DollarSign, Clock, Users,
  Play, Pause, CheckCircle, ChevronRight, AlertTriangle, MapPin,
  Repeat, X, Pencil, Save,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { RecurringService, ServiceFrequency } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const FREQUENCY_COLORS: Record<ServiceFrequency, string> = {
  weekly: 'bg-green-500/20 text-green-400 border-green-500/30',
  biweekly: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  monthly: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  quarterly: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
  expired: 'bg-earth-600/20 text-earth-400',
};

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SERVICE_TYPES = [
  'Lawn Mowing', 'Edging & Blowing', 'Weed Control', 'Fertilization',
  'Irrigation Check', 'Tree Trimming', 'Hedge Trimming', 'Mulching',
  'Leaf Cleanup', 'Seasonal Color', 'Pest Control', 'Aeration',
];

function getNextDate(frequency: ServiceFrequency, lastDate: string): string {
  const d = new Date(lastDate);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
  }
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface FormData {
  title: string;
  customer_id: string;
  service_type: string;
  frequency: ServiceFrequency;
  preferred_day: string;
  preferred_time: string;
  crew_id: string;
  price_per_visit: string;
  estimated_hours: string;
  start_date: string;
  end_date: string;
  services_included: string[];
  notes: string;
}

const emptyForm: FormData = {
  title: '', customer_id: '', service_type: 'Lawn Mowing', frequency: 'weekly',
  preferred_day: 'Monday', preferred_time: '08:00', crew_id: '', price_per_visit: '',
  estimated_hours: '2', start_date: '', end_date: '', services_included: [], notes: '',
};

export default function RecurringServicesPage() {
  const { recurringServices, customers, crews, addRecurringService, updateRecurringService, generateServiceVisit } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [selectedService, setSelectedService] = useState<RecurringService | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<FormData>(emptyForm);

  // Close Create Modal on Escape key
  useEffect(() => {
    if (showModal) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowModal(false);
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [showModal]);

  // Close Detail Sidebar on Escape key
  useEffect(() => {
    if (selectedService) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedService(null);
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [selectedService]);

  const filtered = useMemo(() => {
    let list = recurringServices || [];
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.service_type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [recurringServices, statusFilter, search]);

  const stats = useMemo(() => {
    const all = recurringServices || [];
    const active = all.filter(s => s.status === 'active');
    const monthlyRevenue = active.reduce((sum, s) => {
      const multiplier = s.frequency === 'weekly' ? 4.33 : s.frequency === 'biweekly' ? 2.17 : s.frequency === 'quarterly' ? 0.33 : 1;
      return sum + s.price_per_visit * multiplier;
    }, 0);
    const dueSoon = active.filter(s => {
      const days = daysUntil(s.next_scheduled || '');
      return days >= 0 && days <= 7;
    });
    return { total: all.length, active: active.length, monthlyRevenue, dueSoon: dueSoon.length };
  }, [recurringServices]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.customer_id) {
      toast.error('Title and customer are required');
      return;
    }
    const customer = customers.find(c => c.id === formData.customer_id);
    const crew = formData.crew_id ? crews.find(c => c.id === formData.crew_id) : undefined;
    const startDate = formData.start_date || new Date().toISOString().split('T')[0];

    await addRecurringService({
      title: formData.title,
      customer_id: formData.customer_id,
      customer,
      service_type: formData.service_type,
      frequency: formData.frequency,
      preferred_day: formData.preferred_day.toLowerCase(),
      preferred_time: formData.preferred_time,
      crew_id: formData.crew_id || undefined,
      crew,
      price_per_visit: parseFloat(formData.price_per_visit) || 0,
      estimated_hours: parseFloat(formData.estimated_hours) || 2,
      status: 'active',
      start_date: startDate,
      end_date: formData.end_date || undefined,
      next_scheduled: getNextDate(formData.frequency, startDate),
      total_visits: 0,
      visits_completed: 0,
      services_included: formData.services_included,
      notes: formData.notes || undefined,
    });

    toast.success(`Recurring service "${formData.title}" created`);
    setShowModal(false);
    setFormData(emptyForm);
  };

  const handleToggleStatus = async (service: RecurringService) => {
    const newStatus = service.status === 'active' ? 'paused' : 'active';
    await updateRecurringService(service.id, { status: newStatus });
    toast.success(`Service ${newStatus === 'active' ? 'resumed' : 'paused'}`);
  };

  const handleGenerateVisit = async (service: RecurringService) => {
    await generateServiceVisit(service.id);
    toast.success(`Visit scheduled for "${service.title}"`);
  };

  const toggleServiceIncluded = (svc: string) => {
    setFormData(prev => ({
      ...prev,
      services_included: prev.services_included.includes(svc)
        ? prev.services_included.filter(s => s !== svc)
        : [...prev.services_included, svc],
    }));
  };

  const toggleEditServiceIncluded = (svc: string) => {
    setEditFormData(prev => ({
      ...prev,
      services_included: prev.services_included.includes(svc)
        ? prev.services_included.filter(s => s !== svc)
        : [...prev.services_included, svc],
    }));
  };

  const openEditModal = (service: RecurringService) => {
    setEditingServiceId(service.id);
    setEditFormData({
      title: service.title,
      customer_id: service.customer_id,
      service_type: service.service_type,
      frequency: service.frequency,
      preferred_day: service.preferred_day
        ? service.preferred_day.charAt(0).toUpperCase() + service.preferred_day.slice(1)
        : 'Monday',
      preferred_time: service.preferred_time || '08:00',
      crew_id: service.crew_id || '',
      price_per_visit: String(service.price_per_visit),
      estimated_hours: String(service.estimated_hours),
      start_date: service.start_date || '',
      end_date: service.end_date || '',
      services_included: [...service.services_included],
      notes: service.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingServiceId) return;
    if (!editFormData.title) {
      toast.error('Title is required');
      return;
    }
    const crew = editFormData.crew_id ? crews.find(c => c.id === editFormData.crew_id) : undefined;

    await updateRecurringService(editingServiceId, {
      title: editFormData.title,
      service_type: editFormData.service_type,
      frequency: editFormData.frequency,
      preferred_day: editFormData.preferred_day.toLowerCase(),
      preferred_time: editFormData.preferred_time,
      crew_id: editFormData.crew_id || undefined,
      crew,
      price_per_visit: parseFloat(editFormData.price_per_visit) || 0,
      estimated_hours: parseFloat(editFormData.estimated_hours) || 2,
      services_included: editFormData.services_included,
      notes: editFormData.notes || undefined,
    });

    toast.success(`Service "${editFormData.title}" updated`);
    setShowEditModal(false);
    setEditingServiceId(null);
    // If the detail sidebar is open for this service, close it so it refreshes cleanly
    if (selectedService?.id === editingServiceId) {
      setSelectedService(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Services" value={stats.active} icon={<RefreshCw className="w-5 h-5" />} color="green" />
        <StatCard title="Monthly Revenue" value={`$${stats.monthlyRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="Due This Week" value={stats.dueSoon} icon={<Calendar className="w-5 h-5" />} color="sky" />
        <StatCard title="Total Services" value={stats.total} icon={<Repeat className="w-5 h-5" />} color="earth" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {['all', 'active', 'paused', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize cursor-pointer ${
                statusFilter === status
                  ? 'bg-green-600 text-white'
                  : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-earth-800/50 border border-earth-700/50 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600/50"
            />
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setFormData(emptyForm); setShowModal(true); }}>
            New Service
          </Button>
        </div>
      </div>

      {/* Service Cards */}
      {filtered.length === 0 ? (
        <div className="bg-earth-800/30 border border-earth-700/30 rounded-xl p-12 text-center">
          <RefreshCw className="w-12 h-12 text-earth-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-earth-300 mb-2">No Recurring Services</h3>
          <p className="text-earth-500 text-sm mb-6">Set up recurring services to automatically schedule visits for your customers.</p>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Create First Service</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(service => {
            const daysLeft = daysUntil(service.next_scheduled || '');
            const isOverdue = daysLeft < 0;
            const isDueSoon = daysLeft >= 0 && daysLeft <= 2;

            return (
              <div
                key={service.id}
                className="bg-earth-800/50 border border-earth-700/50 rounded-xl overflow-hidden hover:border-earth-600/50 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-earth-100 truncate">{service.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${FREQUENCY_COLORS[service.frequency]}`}>
                          {FREQUENCY_LABELS[service.frequency]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-earth-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{service.customer?.name || 'Unknown Customer'}</span>
                        {service.customer?.address && (
                          <>
                            <span className="text-earth-600">|</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{service.customer.address}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[service.status]}`}>
                      {service.status}
                    </span>
                  </div>

                  {/* Service details */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-earth-500">Per Visit</p>
                      <p className="text-sm font-semibold text-earth-200">${service.price_per_visit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-earth-500">Est. Hours</p>
                      <p className="text-sm font-semibold text-earth-200">{service.estimated_hours}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-earth-500">Visits Done</p>
                      <p className="text-sm font-semibold text-earth-200">{service.visits_completed} / {service.total_visits || '—'}</p>
                    </div>
                  </div>

                  {/* Services included tags */}
                  {service.services_included.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {service.services_included.map(svc => (
                        <span key={svc} className="text-xs px-2 py-0.5 bg-earth-700/50 text-earth-400 rounded">
                          {svc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Crew assignment */}
                  {service.crew && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-earth-400">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: service.crew.color || '#22c55e' }} />
                      <span>{service.crew.name}</span>
                    </div>
                  )}
                </div>

                {/* Footer with next visit + actions */}
                <div className="px-5 py-3 bg-earth-900/30 border-t border-earth-700/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {service.status === 'active' && service.next_scheduled && (
                      <>
                        <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-yellow-400' : 'text-earth-500'}`} />
                        <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : isDueSoon ? 'text-yellow-400' : 'text-earth-400'}`}>
                          {isOverdue ? `Overdue by ${Math.abs(daysLeft)}d` :
                           isDueSoon ? `Due ${daysLeft === 0 ? 'today' : `in ${daysLeft}d`}` :
                           `Next: ${formatDate(service.next_scheduled)}`}
                        </span>
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      </>
                    )}
                    {service.last_completed && (
                      <span className="text-xs text-earth-500 ml-2">
                        Last: {formatDate(service.last_completed)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {service.status === 'active' && (
                      <button
                        onClick={() => handleGenerateVisit(service)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-600/20 text-green-400 rounded-md hover:bg-green-600/30 transition-colors cursor-pointer"
                        title="Schedule next visit"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Schedule Visit
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(service)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        service.status === 'active'
                          ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      {service.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {service.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => openEditModal(service)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-earth-400 hover:text-earth-200 hover:bg-earth-700/50 rounded-md transition-colors cursor-pointer"
                      title="Edit service"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setSelectedService(service)}
                      className="flex items-center px-2 py-1 text-xs text-earth-400 hover:text-earth-200 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Sidebar */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedService(null)} />
          <div className="ml-auto relative z-10 w-full max-w-md bg-earth-900 border-l border-earth-700/50 h-full overflow-y-auto animate-slide-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-earth-100">Service Details</h2>
                <button onClick={() => setSelectedService(null)} className="text-earth-400 hover:text-earth-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-semibold text-earth-50">{selectedService.title}</h3>
                  <p className="text-earth-400 text-sm mt-1">{selectedService.customer?.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-earth-800/50 rounded-lg p-3">
                    <p className="text-xs text-earth-500">Frequency</p>
                    <p className="text-sm font-medium text-earth-200">{FREQUENCY_LABELS[selectedService.frequency]}</p>
                  </div>
                  <div className="bg-earth-800/50 rounded-lg p-3">
                    <p className="text-xs text-earth-500">Price/Visit</p>
                    <p className="text-sm font-medium text-earth-200">${selectedService.price_per_visit}</p>
                  </div>
                  <div className="bg-earth-800/50 rounded-lg p-3">
                    <p className="text-xs text-earth-500">Preferred Day</p>
                    <p className="text-sm font-medium text-earth-200 capitalize">{selectedService.preferred_day || '—'}</p>
                  </div>
                  <div className="bg-earth-800/50 rounded-lg p-3">
                    <p className="text-xs text-earth-500">Preferred Time</p>
                    <p className="text-sm font-medium text-earth-200">{selectedService.preferred_time || '—'}</p>
                  </div>
                  <div className="bg-earth-800/50 rounded-lg p-3">
                    <p className="text-xs text-earth-500">Start Date</p>
                    <p className="text-sm font-medium text-earth-200">{formatDate(selectedService.start_date)}</p>
                  </div>
                  <div className="bg-earth-800/50 rounded-lg p-3">
                    <p className="text-xs text-earth-500">Crew</p>
                    <p className="text-sm font-medium text-earth-200">{selectedService.crew?.name || 'Unassigned'}</p>
                  </div>
                </div>

                {selectedService.services_included.length > 0 && (
                  <div>
                    <p className="text-xs text-earth-500 mb-2">Services Included</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedService.services_included.map(svc => (
                        <span key={svc} className="text-xs px-2.5 py-1 bg-green-600/20 text-green-400 rounded-md">
                          {svc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-earth-800/50 rounded-lg p-4">
                  <p className="text-xs text-earth-500 mb-2">Visit History</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-earth-100">{selectedService.visits_completed}</span>
                    <span className="text-earth-500 text-sm">visits completed</span>
                  </div>
                  <div className="w-full bg-earth-700/50 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${selectedService.total_visits ? Math.min(100, (selectedService.visits_completed / selectedService.total_visits) * 100) : 0}%` }}
                    />
                  </div>
                  {selectedService.total_visits > 0 && (
                    <p className="text-xs text-earth-500 mt-1">{selectedService.total_visits - selectedService.visits_completed} remaining</p>
                  )}
                </div>

                {selectedService.notes && (
                  <div>
                    <p className="text-xs text-earth-500 mb-1">Notes</p>
                    <p className="text-sm text-earth-300">{selectedService.notes}</p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    className="w-full"
                    variant="secondary"
                    icon={<Pencil className="w-4 h-4" />}
                    onClick={() => { openEditModal(selectedService); setSelectedService(null); }}
                  >
                    Edit Service
                  </Button>
                  <div className="flex gap-2">
                    {selectedService.status === 'active' && (
                      <Button className="flex-1" icon={<CheckCircle className="w-4 h-4" />} onClick={() => { handleGenerateVisit(selectedService); setSelectedService(null); }}>
                        Schedule Next Visit
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => { handleToggleStatus(selectedService); setSelectedService(null); }}
                      icon={selectedService.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    >
                      {selectedService.status === 'active' ? 'Pause Service' : 'Resume Service'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-earth-900 border border-earth-700/50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-earth-100">New Recurring Service</h2>
                <button onClick={() => setShowModal(false)} className="text-earth-400 hover:text-earth-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Service Title</label>
                    <input
                      type="text"
                      placeholder="Weekly Lawn Maintenance"
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Customer</label>
                    <select
                      value={formData.customer_id}
                      onChange={e => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    >
                      <option value="">Select customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={e => setFormData(p => ({ ...p, frequency: e.target.value as ServiceFrequency }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Preferred Day</label>
                    <select
                      value={formData.preferred_day}
                      onChange={e => setFormData(p => ({ ...p, preferred_day: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    >
                      {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Preferred Time</label>
                    <input
                      type="time"
                      value={formData.preferred_time}
                      onChange={e => setFormData(p => ({ ...p, preferred_time: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Assign Crew</label>
                    <select
                      value={formData.crew_id}
                      onChange={e => setFormData(p => ({ ...p, crew_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    >
                      <option value="">Unassigned</option>
                      {crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Price Per Visit</label>
                    <input
                      type="number"
                      placeholder="175.00"
                      value={formData.price_per_visit}
                      onChange={e => setFormData(p => ({ ...p, price_per_visit: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Est. Hours</label>
                    <input
                      type="number"
                      value={formData.estimated_hours}
                      onChange={e => setFormData(p => ({ ...p, estimated_hours: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-300 mb-1">End Date (optional)</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
                    />
                  </div>
                </div>

                {/* Services checklist */}
                <div>
                  <label className="block text-sm font-medium text-earth-300 mb-2">Services Included</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SERVICE_TYPES.map(svc => (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => toggleServiceIncluded(svc)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer text-left ${
                          formData.services_included.includes(svc)
                            ? 'bg-green-600/20 border-green-600/50 text-green-400'
                            : 'bg-earth-800 border-earth-700 text-earth-400 hover:border-earth-600'
                        }`}
                      >
                        {svc}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-earth-300 mb-1">Notes</label>
                  <textarea
                    placeholder="Special instructions, gate codes, etc."
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-earth-700/50">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button icon={<Plus className="w-4 h-4" />} onClick={handleSubmit}>Create Service</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingServiceId(null); }}
        title="Edit Recurring Service"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingServiceId(null); }}>Cancel</Button>
            <Button icon={<Save className="w-4 h-4" />} onClick={handleEditSubmit}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Service Title</label>
              <input
                type="text"
                placeholder="Weekly Lawn Maintenance"
                value={editFormData.title}
                onChange={e => setEditFormData(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Service Type</label>
              <select
                value={editFormData.service_type}
                onChange={e => setEditFormData(p => ({ ...p, service_type: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
              >
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Frequency</label>
              <select
                value={editFormData.frequency}
                onChange={e => setEditFormData(p => ({ ...p, frequency: e.target.value as ServiceFrequency }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
              >
                {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Preferred Day</label>
              <select
                value={editFormData.preferred_day}
                onChange={e => setEditFormData(p => ({ ...p, preferred_day: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Preferred Time</label>
              <input
                type="time"
                value={editFormData.preferred_time}
                onChange={e => setEditFormData(p => ({ ...p, preferred_time: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Assign Crew</label>
              <select
                value={editFormData.crew_id}
                onChange={e => setEditFormData(p => ({ ...p, crew_id: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
              >
                <option value="">Unassigned</option>
                {crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Price Per Visit</label>
              <input
                type="number"
                placeholder="175.00"
                value={editFormData.price_per_visit}
                onChange={e => setEditFormData(p => ({ ...p, price_per_visit: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-300 mb-1">Est. Hours</label>
              <input
                type="number"
                value={editFormData.estimated_hours}
                onChange={e => setEditFormData(p => ({ ...p, estimated_hours: e.target.value }))}
                className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {/* Services checklist */}
          <div>
            <label className="block text-sm font-medium text-earth-300 mb-2">Services Included</label>
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_TYPES.map(svc => (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleEditServiceIncluded(svc)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer text-left ${
                    editFormData.services_included.includes(svc)
                      ? 'bg-green-600/20 border-green-600/50 text-green-400'
                      : 'bg-earth-800 border-earth-700 text-earth-400 hover:border-earth-600'
                  }`}
                >
                  {svc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-300 mb-1">Notes</label>
            <textarea
              placeholder="Special instructions, gate codes, etc."
              value={editFormData.notes}
              onChange={e => setEditFormData(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-200 placeholder:text-earth-500 focus:outline-none focus:border-green-600 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
