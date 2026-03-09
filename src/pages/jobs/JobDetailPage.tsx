import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, Users, Camera, FileText, Edit, CheckCircle, PlayCircle, PauseCircle, Plus, MessageSquare, Upload } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';
import { useState } from 'react';
import type { JobType } from '../../types';

const jobTypeOptions: { value: JobType; label: string }[] = [
  { value: 'landscape_design', label: 'Landscape Design' },
  { value: 'construction', label: 'Construction' },
  { value: 'landscape_maintenance', label: 'Landscape Maintenance' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'invasive_vegetation', label: 'Invasive Vegetation' },
  { value: 'steel_fabrication', label: 'Steel Fabrication' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'tree_trimming', label: 'Tree Trimming' },
  { value: 'outdoor_lighting', label: 'Outdoor Lighting' },
  { value: 'erosion_control', label: 'Erosion Control' },
  { value: 'earthwork', label: 'Earthwork' },
  { value: 'stream_reclamation', label: 'Stream Reclamation' },
  { value: 'other', label: 'Other' },
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, crews, updateJobStatus, updateJob } = useData();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'materials' | 'time' | 'photos' | 'notes'>('details');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const job = jobs.find(j => j.id === id);

  const [editData, setEditData] = useState({
    title: '', type: 'landscape_design' as JobType, crew_id: '',
    scheduled_date: '', scheduled_time: '', estimated_hours: '',
    total_price: '', materials_cost: '', labor_cost: '',
    description: '', notes: '',
  });

  const openEditModal = () => {
    if (!job) return;
    setEditData({
      title: job.title,
      type: (job.type as JobType) || 'other',
      crew_id: job.crew_id || '',
      scheduled_date: job.scheduled_date,
      scheduled_time: job.scheduled_time || '',
      estimated_hours: job.estimated_hours?.toString() || '',
      total_price: (job.total_price ?? '').toString(),
      materials_cost: (job.materials_cost ?? '').toString(),
      labor_cost: (job.labor_cost ?? '').toString(),
      description: job.description || '',
      notes: job.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!job || !editData.title) {
      toast.error('Title is required');
      return;
    }
    setIsSaving(true);
    try {
      await updateJob(job.id, {
        title: editData.title,
        type: editData.type,
        crew_id: editData.crew_id || undefined,
        crew: editData.crew_id ? crews.find(c => c.id === editData.crew_id) : job.crew,
        scheduled_date: editData.scheduled_date,
        scheduled_time: editData.scheduled_time || undefined,
        estimated_hours: parseFloat(editData.estimated_hours) || undefined,
        total_price: parseFloat(editData.total_price) || undefined,
        materials_cost: parseFloat(editData.materials_cost) || undefined,
        labor_cost: parseFloat(editData.labor_cost) || undefined,
        description: editData.description || undefined,
        notes: editData.notes || undefined,
      });
      toast.success('Job updated');
      setShowEditModal(false);
    } catch {
      toast.error('Failed to update job');
    } finally {
      setIsSaving(false);
    }
  };

  if (!job) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/jobs')}>Back</Button>
        <EmptyState icon={<MapPin className="w-10 h-10" />} title="Job not found" description="This job may have been deleted." actionLabel="View All Jobs" onAction={() => navigate('/jobs')} />
      </div>
    );
  }

  const profit = (job.total_price ?? 0) - (job.materials_cost ?? 0) - (job.labor_cost ?? 0);
  const margin = (job.total_price ?? 0) > 0 ? (profit / (job.total_price ?? 0)) * 100 : 0;

  const statusLabels: Record<string, string> = {
    pending: 'Pending', scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed',
    on_hold: 'On Hold', cancelled: 'Cancelled',
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateJobStatus(job.id, newStatus);
      toast.success(`Job status updated to ${statusLabels[newStatus] || newStatus}`);
    } catch {
      toast.error('Failed to update job status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/jobs')}>Back</Button>
      </div>

      {/* Header */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold font-display text-earth-50">{job.title}</h2>
              <StatusBadge status={job.status} size="md" />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-earth-300">
              <span className="flex items-center gap-1"><Users className="w-4 h-4 text-earth-400" />{job.customer?.name}</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-earth-400" />{job.address || job.customer?.address}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-earth-400" />{format(new Date(job.scheduled_date), 'EEEE, MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(job.status === 'scheduled' || job.status === 'pending') && (
              <Button icon={<PlayCircle className="w-4 h-4" />} onClick={() => handleStatusChange('in_progress')} loading={isUpdating}>Start Job</Button>
            )}
            {job.status === 'in_progress' && (
              <>
                <Button variant="secondary" icon={<PauseCircle className="w-4 h-4" />} onClick={() => handleStatusChange('on_hold')} loading={isUpdating}>On Hold</Button>
                <Button icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleStatusChange('completed')} loading={isUpdating}>Complete</Button>
              </>
            )}
            {job.status === 'on_hold' && (
              <Button icon={<PlayCircle className="w-4 h-4" />} onClick={() => handleStatusChange('in_progress')} loading={isUpdating}>Resume</Button>
            )}
            <Button variant="secondary" icon={<Edit className="w-4 h-4" />} onClick={openEditModal}>Edit</Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <div className="text-center">
            <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-earth-50">${(job.total_price ?? 0).toLocaleString()}</p>
            <p className="text-xs text-earth-400">Total Price</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Clock className="w-5 h-5 text-sky-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-earth-50">{job.actual_hours || job.estimated_hours}h</p>
            <p className="text-xs text-earth-400">{job.actual_hours ? 'Actual' : 'Estimated'}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-earth-400 mb-1">Materials</p>
            <p className="text-lg font-bold text-earth-50">${(job.materials_cost ?? 0).toLocaleString()}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-earth-400 mb-1">Labor</p>
            <p className="text-lg font-bold text-earth-50">${(job.labor_cost ?? 0).toLocaleString()}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-earth-400 mb-1">Profit</p>
            <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${profit.toLocaleString()}</p>
            <p className="text-xs text-earth-500">{margin.toFixed(1)}% margin</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-earth-800 overflow-x-auto">
        {(['details', 'materials', 'time', 'photos', 'notes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer capitalize ${
              activeTab === tab ? 'border-green-500 text-green-400' : 'border-transparent text-earth-400 hover:text-earth-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Job Information</h3>}>
            <dl className="space-y-3">
              <div className="flex justify-between"><dt className="text-sm text-earth-400">Type</dt><dd><Badge color="green">{(job.type ?? 'other').replace('_', ' ')}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-sm text-earth-400">Scheduled Date</dt><dd className="text-sm text-earth-100">{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-earth-400">Time</dt><dd className="text-sm text-earth-100">{job.scheduled_time || 'Not set'}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-earth-400">Est. Hours</dt><dd className="text-sm text-earth-100">{job.estimated_hours}</dd></div>
              {job.actual_hours && <div className="flex justify-between"><dt className="text-sm text-earth-400">Actual Hours</dt><dd className="text-sm text-earth-100">{job.actual_hours}</dd></div>}
              {job.description && <div className="pt-2 border-t border-earth-800"><p className="text-sm text-earth-200">{job.description}</p></div>}
            </dl>
          </Card>
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Crew Assignment</h3>}>
            {job.crew ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: job.crew.color }} />
                  <span className="text-sm font-medium text-earth-100">{job.crew.name}</span>
                </div>
                {(job.crew.members ?? []).map(m => (
                  <div key={m.id} className="flex items-center justify-between pl-6">
                    <span className="text-sm text-earth-200">{m.name}</span>
                    <Badge color="earth">{m.role.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-earth-400">No crew assigned</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'materials' && (() => {
        const demoMaterials = [
          { id: '1', name: 'Bermuda Sod', quantity: 200, unit: 'sq ft', unitCost: 0.35 },
          { id: '2', name: 'Hardwood Mulch', quantity: 5, unit: 'cu yd', unitCost: 22.00 },
          { id: '3', name: 'River Rock (3/4")', quantity: 2, unit: 'tons', unitCost: 45.00 },
          { id: '4', name: 'Landscape Fabric', quantity: 150, unit: 'sq ft', unitCost: 0.18 },
          { id: '5', name: 'Drip Irrigation Kit', quantity: 1, unit: 'kit', unitCost: 85.00 },
        ];
        const totalMaterialsCost = demoMaterials.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
        return (
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-earth-200">Materials Used</h3>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => toast.info('Material tracking coming soon')}>Add Material</Button>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-earth-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-400">Material</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-earth-400">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-earth-400">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-earth-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-800/50">
                  {demoMaterials.map(m => (
                    <tr key={m.id} className="hover:bg-earth-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-earth-100 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-earth-200 text-right">{m.quantity} {m.unit}</td>
                      <td className="px-4 py-3 text-sm text-earth-200 text-right">${m.unitCost.toFixed(2)}/{m.unit}</td>
                      <td className="px-4 py-3 text-sm text-earth-100 text-right font-medium">${(m.quantity * m.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-earth-700">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-earth-200 text-right">Total Materials Cost</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-400 text-right">${totalMaterialsCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        );
      })()}

      {activeTab === 'time' && (() => {
        const demoTimeEntries = [
          { id: '1', crewMember: 'Carlos Ramirez', hours: 2.0, description: 'Mowing & edging', date: '2026-03-06' },
          { id: '2', crewMember: 'Jake Wilson', hours: 1.5, description: 'Cleanup & debris removal', date: '2026-03-06' },
          { id: '3', crewMember: 'Carlos Ramirez', hours: 3.0, description: 'Sod installation', date: '2026-03-07' },
          { id: '4', crewMember: 'Maria Santos', hours: 2.5, description: 'Mulch spreading & bed prep', date: '2026-03-07' },
          { id: '5', crewMember: 'Jake Wilson', hours: 2.0, description: 'Irrigation line setup', date: '2026-03-07' },
        ];
        const totalHours = demoTimeEntries.reduce((sum, e) => sum + e.hours, 0);
        return (
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-earth-200">Time Entries</h3>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => toast.info('Time logging coming soon')}>Log Time</Button>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-earth-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-400">Crew Member</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-earth-400">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-400">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-800/50">
                  {demoTimeEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-earth-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-earth-100 font-medium">{entry.crewMember}</td>
                      <td className="px-4 py-3 text-sm text-earth-200 text-right">{entry.hours}h</td>
                      <td className="px-4 py-3 text-sm text-earth-200">{entry.description}</td>
                      <td className="px-4 py-3 text-sm text-earth-300">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-earth-700">
                    <td className="px-4 py-3 text-sm font-semibold text-earth-200 text-right">Total Hours</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-400 text-right">{totalHours}h</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        );
      })()}

      {activeTab === 'photos' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 bg-earth-800/50 rounded-2xl text-earth-400 mb-4">
              <Camera className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold font-display text-earth-200 mb-2">No photos for this job yet</h3>
            <p className="text-sm text-earth-400 max-w-sm mb-6">
              Capture before, during, and after photos to document the work and share progress with the customer.
            </p>
            <Button icon={<Upload className="w-4 h-4" />} onClick={() => toast.info('Photo uploads coming soon')}>Upload Photos</Button>
          </div>
        </Card>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-earth-200">Job Notes</h3>
              <Badge color="earth">{job.notes ? '2 notes' : '1 note'}</Badge>
            </div>
          }>
            <div className="space-y-4">
              {/* Existing notes */}
              <div className="p-4 bg-earth-800/40 rounded-lg border border-earth-700/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-earth-700/50 rounded-lg shrink-0">
                    <MessageSquare className="w-4 h-4 text-earth-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-earth-100">Customer prefers we enter through back gate. Dog in yard — friendly. Leave gate closed when leaving.</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-earth-400">Carlos Ramirez</span>
                      <span className="text-xs text-earth-500">Mar 5, 2026 at 8:15 AM</span>
                    </div>
                  </div>
                </div>
              </div>
              {job.notes && (
                <div className="p-4 bg-earth-800/40 rounded-lg border border-earth-700/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-earth-700/50 rounded-lg shrink-0">
                      <MessageSquare className="w-4 h-4 text-earth-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-earth-100">{job.notes}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-earth-400">System</span>
                        <span className="text-xs text-earth-500">Mar 3, 2026 at 10:00 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
          {/* Add Note form */}
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Add a Note</h3>}>
            <div className="space-y-3">
              <textarea
                rows={3}
                placeholder="Write a note about this job..."
                className="w-full px-3.5 py-2.5 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 placeholder:text-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 resize-none"
              />
              <div className="flex justify-end">
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => toast.info('Note saving coming soon')}>Add Note</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Job"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving}>Save Changes</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Job Title" required value={editData.title} onChange={e => setEditData(f => ({ ...f, title: e.target.value }))} />
          </div>
          <Select label="Job Type" options={jobTypeOptions.map(o => ({ value: o.value, label: o.label }))} value={editData.type} onChange={e => setEditData(f => ({ ...f, type: e.target.value as JobType }))} />
          <Select label="Assign Crew" options={[{ value: '', label: 'Unassigned' }, ...crews.map(c => ({ value: c.id, label: c.name }))]} value={editData.crew_id} onChange={e => setEditData(f => ({ ...f, crew_id: e.target.value }))} />
          <Input label="Scheduled Date" type="date" value={editData.scheduled_date} onChange={e => setEditData(f => ({ ...f, scheduled_date: e.target.value }))} />
          <Input label="Scheduled Time" type="time" value={editData.scheduled_time} onChange={e => setEditData(f => ({ ...f, scheduled_time: e.target.value }))} />
          <Input label="Estimated Hours" type="number" value={editData.estimated_hours} onChange={e => setEditData(f => ({ ...f, estimated_hours: e.target.value }))} />
          <Input label="Total Price" type="number" value={editData.total_price} onChange={e => setEditData(f => ({ ...f, total_price: e.target.value }))} prefix="$" />
          <Input label="Materials Cost" type="number" value={editData.materials_cost} onChange={e => setEditData(f => ({ ...f, materials_cost: e.target.value }))} prefix="$" />
          <Input label="Labor Cost" type="number" value={editData.labor_cost} onChange={e => setEditData(f => ({ ...f, labor_cost: e.target.value }))} prefix="$" />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-earth-200 mb-1.5">Description</label>
            <textarea
              value={editData.description}
              onChange={e => setEditData(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 placeholder:text-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 resize-none"
              placeholder="Job description..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-earth-200 mb-1.5">Notes</label>
            <textarea
              value={editData.notes}
              onChange={e => setEditData(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 placeholder:text-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 resize-none"
              placeholder="Internal notes..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
