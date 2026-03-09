import { useState, useMemo, useCallback, type DragEvent } from 'react';
import { Plus, Target, Phone, Mail, MapPin, ArrowRight, Grid, List, DollarSign, GripVertical } from 'lucide-react';
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
import type { LeadStatus, LeadSource } from '../../types';

const kanbanColumns: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'border-sky-500/50' },
  { status: 'contacted', label: 'Contacted', color: 'border-amber-500/50' },
  { status: 'qualified', label: 'Qualified', color: 'border-purple-500/50' },
  { status: 'quoted', label: 'Quoted', color: 'border-sky-400/50' },
  { status: 'won', label: 'Won', color: 'border-green-500/50' },
  { status: 'lost', label: 'Lost', color: 'border-red-500/50' },
];

export default function LeadsPage() {
  const { leads, addLead, updateLead } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', source: 'website' as LeadSource, service_interest: '', estimated_value: '',
  });

  // Drag-and-drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<LeadStatus | null>(null);

  const filtered = useMemo(() => {
    if (!search) return leads;
    return leads.filter(l =>
      (l.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.service_interest ?? '').toLowerCase().includes(search.toLowerCase())
    );
  }, [leads, search]);

  const pipelineValue = leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + (l.estimated_value || 0), 0);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const nameParts = formData.name.trim().split(/\s+/);
      await addLead({
        name: formData.name,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        phone: formData.phone,
        email: formData.email || undefined,
        source: formData.source,
        status: 'new',
        service_interest: formData.service_interest || undefined,
        estimated_value: parseFloat(formData.estimated_value) || undefined,
      });
      toast.success(`Lead "${formData.name}" created`);
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', source: 'website', service_interest: '', estimated_value: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead');
    }
  };

  // --- Drag-and-drop handlers ---

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    // Set a custom drag image with slight transparency
    if (e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, 20);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLeadId(null);
    setDropTargetStatus(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStatus(status);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only clear if we actually left the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDropTargetStatus(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDraggedLeadId(null);
    setDropTargetStatus(null);

    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    const fromLabel = kanbanColumns.find(c => c.status === lead.status)?.label || lead.status;
    const toLabel = kanbanColumns.find(c => c.status === targetStatus)?.label || targetStatus;

    try {
      await updateLead(leadId, { status: targetStatus });
      toast.success(`"${lead.name}" moved from ${fromLabel} to ${toLabel}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update lead');
    }
  }, [leads, updateLead, toast]);

  const sourceColors: Record<LeadSource, 'green' | 'sky' | 'amber' | 'earth' | 'purple' | 'red'> = {
    website: 'sky', referral: 'green', google: 'amber', social_media: 'purple',
    yard_sign: 'earth', door_hanger: 'earth', other: 'earth',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Leads</h2>
          <p className="text-sm text-earth-400">{leads.length} leads - Pipeline: ${pipelineValue.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-earth-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2.5 cursor-pointer ${viewMode === 'kanban' ? 'bg-green-600 text-white' : 'text-earth-400 hover:bg-earth-800'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 cursor-pointer ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-earth-400 hover:bg-earth-800'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>Add Lead</Button>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search leads..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Target className="w-10 h-10" />}
          title="No leads found"
          description="Start tracking potential customers and grow your business."
          actionLabel="Add Lead"
          onAction={() => setShowAddModal(true)}
        />
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => {
            const colLeads = filtered.filter(l => l.status === col.status);
            const isDropTarget = dropTargetStatus === col.status && draggedLeadId !== null;
            // Don't highlight the column the card is already in
            const draggedLead = draggedLeadId ? leads.find(l => l.id === draggedLeadId) : null;
            const isSameColumn = draggedLead?.status === col.status;
            const showDropHighlight = isDropTarget && !isSameColumn;

            return (
              <div
                key={col.status}
                className={`min-w-[280px] flex-shrink-0 rounded-lg transition-colors duration-150 ${
                  showDropHighlight
                    ? 'bg-green-600/10 border border-green-500/30'
                    : 'border border-transparent'
                }`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                <div className={`px-3 py-2 rounded-t-lg border-t-2 ${col.color} bg-earth-900/60`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-earth-200">{col.label}</h3>
                    <span className="text-xs text-earth-400 bg-earth-800 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                  </div>
                </div>
                <div className="space-y-2 mt-2 min-h-[60px] px-0.5">
                  {colLeads.map(lead => {
                    const isDragging = draggedLeadId === lead.id;
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`transition-all duration-150 ${
                          isDragging ? 'opacity-50 ring-2 ring-green-500 rounded-lg' : ''
                        }`}
                      >
                        <Card hover className="!rounded-lg cursor-grab active:cursor-grabbing">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-earth-600 flex-shrink-0" />
                                <h4 className="text-sm font-medium text-earth-100">{lead.name}</h4>
                              </div>
                              <Badge color={sourceColors[lead.source as LeadSource]}>{lead.source.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-xs text-earth-400 line-clamp-2">{lead.service_interest}</p>
                            {lead.estimated_value && (
                              <p className="text-xs font-medium text-green-400 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />${lead.estimated_value.toLocaleString()}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-earth-500">
                              <Phone className="w-3 h-3" />{lead.phone}
                            </div>
                            {lead.follow_up_date && (
                              <p className="text-[10px] text-amber-400">
                                Follow up: {format(new Date(lead.follow_up_date), 'MMM d')}
                              </p>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                  {colLeads.length === 0 && (
                    <p className="text-xs text-earth-500 text-center py-6">No leads</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => (
            <Card key={lead.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-earth-100">{lead.name}</h3>
                    <StatusBadge status={lead.status} />
                    <Badge color={sourceColors[lead.source as LeadSource]}>{lead.source.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5">{lead.service_interest}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-earth-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                    {lead.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {lead.estimated_value && (
                    <span className="text-sm font-semibold text-green-400">${lead.estimated_value.toLocaleString()}</span>
                  )}
                  {lead.status !== 'won' && lead.status !== 'lost' && (
                    <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => toast.success('Lead advanced')}>
                      Advance
                    </Button>
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
        title="Add Lead"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Lead</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
          <Input label="Phone" required value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="(512) 555-0000" />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
          <Select label="Source" options={[
            { value: 'website', label: 'Website' }, { value: 'referral', label: 'Referral' },
            { value: 'google', label: 'Google' }, { value: 'social_media', label: 'Social Media' },
            { value: 'yard_sign', label: 'Yard Sign' }, { value: 'door_hanger', label: 'Door Hanger' },
            { value: 'other', label: 'Other' },
          ]} value={formData.source} onChange={e => setFormData(f => ({ ...f, source: e.target.value as LeadSource }))} />
          <div className="sm:col-span-2">
            <Input label="Service Interest" value={formData.service_interest} onChange={e => setFormData(f => ({ ...f, service_interest: e.target.value }))} placeholder="Full landscape redesign" />
          </div>
          <Input label="Estimated Value" type="number" value={formData.estimated_value} onChange={e => setFormData(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0.00" />
        </div>
      </Modal>
    </div>
  );
}
