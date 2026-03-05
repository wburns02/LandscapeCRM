import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, Users, Camera, FileText, Edit, CheckCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { useState } from 'react';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, updateJobStatus } = useData();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'materials' | 'time' | 'photos' | 'notes'>('details');
  const [isUpdating, setIsUpdating] = useState(false);

  const job = jobs.find(j => j.id === id);

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
    scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed',
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
            {job.status === 'scheduled' && (
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
            <Button variant="secondary" icon={<Edit className="w-4 h-4" />}>Edit</Button>
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

      {activeTab === 'materials' && (
        <Card>
          <EmptyState icon={<FileText className="w-8 h-8" />} title="No materials tracked" description="Add materials used for this job to track costs." actionLabel="Add Material" onAction={() => toast.info('Material tracking coming soon')} />
        </Card>
      )}

      {activeTab === 'time' && (
        <Card>
          <EmptyState icon={<Clock className="w-8 h-8" />} title="No time entries" description="Time entries will appear here when crew members clock in." />
        </Card>
      )}

      {activeTab === 'photos' && (
        <Card>
          <EmptyState icon={<Camera className="w-8 h-8" />} title="No photos yet" description="Upload before and after photos for this job." actionLabel="Upload Photos" onAction={() => toast.info('Photo uploads coming soon')} />
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card>
          <p className="text-sm text-earth-200">{job.notes || 'No notes for this job.'}</p>
        </Card>
      )}
    </div>
  );
}
