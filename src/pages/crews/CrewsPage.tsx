import { useState } from 'react';
import { Plus, UsersRound, Phone, Truck, Star, Save, Briefcase, UserPlus, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import type { Crew } from '../../types';

export default function CrewsPage() {
  const { crews, jobs, addCrew, refreshCrews } = useData();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', color: '#22c55e', vehicle: '' });

  // Edit/Detail modal state
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#22c55e', vehicle: '', is_active: true });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'jobs'>('details');

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', role: 'crew_member' as string, hourly_rate: '' });

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Crew name is required');
      return;
    }
    try {
      await addCrew({
        name: formData.name,
        color: formData.color,
        is_active: true,
        vehicle: formData.vehicle || undefined,
      });
      toast.success(`Crew "${formData.name}" created`);
      setShowAddModal(false);
      setFormData({ name: '', color: '#22c55e', vehicle: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create crew');
    }
  };

  const getCrewActiveJobs = (crewId: string) =>
    jobs.filter(j => j.crew_id === crewId && (j.status === 'scheduled' || j.status === 'in_progress'));

  const getCrewAllJobs = (crewId: string) =>
    jobs.filter(j => j.crew_id === crewId);

  const openCrewModal = (crew: Crew) => {
    setSelectedCrew(crew);
    setEditForm({
      name: crew.name,
      color: crew.color || '#22c55e',
      vehicle: crew.vehicle || '',
      is_active: crew.is_active,
    });
    setActiveTab('details');
  };

  const handleEditSave = async () => {
    if (!selectedCrew) return;
    setIsSaving(true);
    try {
      await api.patch(`/crews/${selectedCrew.id}`, {
        name: editForm.name,
        color: editForm.color,
        is_active: editForm.is_active,
        vehicle: editForm.vehicle || undefined,
      });
      toast.success(`Crew "${editForm.name}" updated`);
      setSelectedCrew(null);
      await refreshCrews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update crew');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedCrew || !memberForm.name || !memberForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await api.post(`/crews/${selectedCrew.id}/members`, {
        name: memberForm.name,
        phone: memberForm.phone,
        role: memberForm.role,
        hourly_rate: parseFloat(memberForm.hourly_rate) || 0,
        certifications: [],
        is_active: true,
      });
      toast.success(`${memberForm.name} added to ${selectedCrew.name}`);
      setShowAddMember(false);
      setMemberForm({ name: '', phone: '', role: 'crew_member', hourly_rate: '' });
      await refreshCrews();
      // Update the selectedCrew reference
      const updated = crews.find(c => c.id === selectedCrew.id);
      if (updated) setSelectedCrew(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedCrew) return;
    try {
      await api.delete(`/crews/${selectedCrew.id}/members/${memberId}`);
      toast.success(`${memberName} removed from ${selectedCrew.name}`);
      await refreshCrews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const roleOptions = [
    { value: 'foreman', label: 'Foreman' },
    { value: 'crew_member', label: 'Crew Member' },
    { value: 'apprentice', label: 'Apprentice' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Crews</h2>
          <p className="text-sm text-earth-400">{crews.length} crews, {crews.reduce((s, c) => s + (c.members ?? []).length, 0)} total members</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>Add Crew</Button>
      </div>

      {crews.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="w-10 h-10" />}
          title="No crews yet"
          description="Create crews to assign jobs and manage your team."
          actionLabel="Add Crew"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {crews.map(crew => {
            const activeJobs = getCrewActiveJobs(crew.id);
            return (
              <Card key={crew.id}>
                <div
                  className="space-y-4 cursor-pointer hover:ring-2 hover:ring-green-500/30 rounded-lg transition-all -m-1 p-1"
                  onClick={() => openCrewModal(crew)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: crew.color }}>
                        {crew.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-earth-100">{crew.name}</h3>
                        <p className="text-xs text-earth-400">{(crew.members ?? []).length} members</p>
                      </div>
                    </div>
                    <Badge color={crew.is_active ? 'green' : 'earth'} dot>
                      {crew.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {crew.vehicle && (
                    <div className="flex items-center gap-2 text-xs text-earth-300">
                      <Truck className="w-3.5 h-3.5 text-earth-400" />
                      {crew.vehicle}
                    </div>
                  )}

                  <div className="space-y-2">
                    {(crew.members ?? []).map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg bg-earth-800/30">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-earth-700 flex items-center justify-center text-xs font-medium text-earth-200">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm text-earth-100">{member.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge color={member.role === 'foreman' ? 'amber' : member.role === 'apprentice' ? 'sky' : 'earth'}>
                                {member.role.replace('_', ' ')}
                              </Badge>
                              {member.certifications.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                                  <Star className="w-2.5 h-2.5" />{member.certifications.length} cert{member.certifications.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <a href={`tel:${member.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 text-earth-400 hover:text-green-400">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-earth-800/50">
                    <p className="text-xs text-earth-400">
                      {activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}
                    </p>
                    {activeJobs.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {activeJobs.slice(0, 2).map(j => (
                          <p key={j.id} className="text-xs text-earth-300 truncate">{j.title}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Crew Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Crew"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Crew</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Crew Name" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Delta Crew" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-earth-200">Crew Color</label>
            <input type="color" value={formData.color} onChange={e => setFormData(f => ({ ...f, color: e.target.value }))} className="w-12 h-10 rounded cursor-pointer border border-earth-700" />
          </div>
          <Input label="Vehicle" value={formData.vehicle} onChange={e => setFormData(f => ({ ...f, vehicle: e.target.value }))} placeholder="2024 Ford F-250 #104" />
        </div>
      </Modal>

      {/* Crew Detail/Edit Modal */}
      <Modal
        isOpen={!!selectedCrew}
        onClose={() => setSelectedCrew(null)}
        title={selectedCrew?.name || 'Crew Details'}
        size="lg"
        footer={
          activeTab === 'details' ? (
            <>
              <Button variant="secondary" onClick={() => setSelectedCrew(null)}>Cancel</Button>
              <Button onClick={handleEditSave} loading={isSaving} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setSelectedCrew(null)}>Close</Button>
          )
        }
      >
        {selectedCrew && (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex border-b border-earth-800">
              {(['details', 'members', 'jobs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize cursor-pointer transition-colors ${
                    activeTab === tab
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-earth-400 hover:text-earth-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <Input label="Crew Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-earth-200">Crew Color</label>
                    <input type="color" value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="w-12 h-10 rounded cursor-pointer border border-earth-700" />
                  </div>
                  <Select
                    label="Status"
                    options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
                    value={String(editForm.is_active)}
                    onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
                  />
                </div>
                <Input label="Vehicle" value={editForm.vehicle} onChange={e => setEditForm(f => ({ ...f, vehicle: e.target.value }))} placeholder="2024 Ford F-250 #104" />

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-earth-800/20 border border-earth-800/50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-earth-50">{(selectedCrew.members ?? []).length}</p>
                    <p className="text-xs text-earth-400">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{getCrewActiveJobs(selectedCrew.id).length}</p>
                    <p className="text-xs text-earth-400">Active Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-earth-50">{getCrewAllJobs(selectedCrew.id).length}</p>
                    <p className="text-xs text-earth-400">Total Jobs</p>
                  </div>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-earth-300">{(selectedCrew.members ?? []).length} members</p>
                  <Button size="sm" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setShowAddMember(true)}>Add Member</Button>
                </div>
                {(selectedCrew.members ?? []).length === 0 ? (
                  <p className="text-sm text-earth-400 text-center py-6">No members yet. Add your first team member.</p>
                ) : (
                  (selectedCrew.members ?? []).map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30 border border-earth-800/40">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: selectedCrew.color }}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-earth-100">{member.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge color={member.role === 'foreman' ? 'amber' : member.role === 'apprentice' ? 'sky' : 'earth'}>
                              {member.role.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] text-earth-400">${member.hourly_rate}/hr</span>
                            {member.certifications.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                                <Star className="w-2.5 h-2.5" />{member.certifications.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${member.phone}`} className="p-2 text-earth-400 hover:text-green-400 rounded-lg hover:bg-earth-800">
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="p-2 text-earth-400 hover:text-red-400 rounded-lg hover:bg-earth-800 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div className="space-y-3">
                {getCrewAllJobs(selectedCrew.id).length === 0 ? (
                  <p className="text-sm text-earth-400 text-center py-6">No jobs assigned to this crew.</p>
                ) : (
                  getCrewAllJobs(selectedCrew.id).map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30 border border-earth-800/40">
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-earth-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-earth-100">{job.title}</p>
                          <p className="text-xs text-earth-400">
                            {job.customer?.name} {job.scheduled_date && `• ${job.scheduled_date.split('T')[0]}`}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title={`Add Member to ${selectedCrew?.name || 'Crew'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember}>Add Member</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" required value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
          <Input label="Phone" required value={memberForm.phone} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
          <Select label="Role" options={roleOptions} value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))} />
          <Input label="Hourly Rate ($)" type="number" value={memberForm.hourly_rate} onChange={e => setMemberForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="25.00" />
        </div>
      </Modal>
    </div>
  );
}
