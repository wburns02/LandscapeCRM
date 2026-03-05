import { useState } from 'react';
import { Plus, UsersRound, Phone, Truck, Star } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';

export default function CrewsPage() {
  const { crews, jobs } = useData();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', color: '#22c55e', vehicle: '' });

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Crew name is required');
      return;
    }
    toast.success(`Crew "${formData.name}" created`);
    setShowAddModal(false);
    setFormData({ name: '', color: '#22c55e', vehicle: '' });
  };

  const getCrewActiveJobs = (crewId: string) =>
    jobs.filter(j => j.crew_id === crewId && (j.status === 'scheduled' || j.status === 'in_progress'));

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
                <div className="space-y-4">
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
                        <a href={`tel:${member.phone}`} className="p-1.5 text-earth-400 hover:text-green-400">
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
    </div>
  );
}
