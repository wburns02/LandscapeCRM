import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Save, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import type { Job } from '../../types';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns';

type ViewMode = 'week' | 'month';

export default function SchedulePage() {
  const { jobs, crews, refreshJobs } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState({
    status: '', crew_id: '', scheduled_date: '', scheduled_time: '', notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthPaddingBefore = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  const navigateDate = (dir: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(dir === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const scheduledJobs = useMemo(() => jobs.filter(j => j.status !== 'cancelled'), [jobs]);

  const getJobsForDay = (date: Date) =>
    scheduledJobs.filter(j => isSameDay(new Date(j.scheduled_date), date));

  const todaysJobs = getJobsForDay(new Date());

  const openJobModal = (job: Job) => {
    setSelectedJob(job);
    setEditForm({
      status: job.status,
      crew_id: job.crew_id || '',
      scheduled_date: job.scheduled_date?.split('T')[0] || '',
      scheduled_time: job.scheduled_time || '',
      notes: job.notes || '',
    });
  };

  const handleSaveJob = async () => {
    if (!selectedJob) return;
    setIsSaving(true);
    try {
      await api.patch(`/jobs/${selectedJob.id}`, {
        status: editForm.status,
        crew_id: editForm.crew_id || undefined,
        scheduled_date: editForm.scheduled_date || undefined,
        scheduled_time: editForm.scheduled_time || undefined,
        notes: editForm.notes || undefined,
      });
      toast.success(`"${selectedJob.title}" updated`);
      setSelectedJob(null);
      await refreshJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const crewOptions = [
    { value: '', label: 'Unassigned' },
    ...crews.map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-earth-800 rounded-lg text-earth-300 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold font-display text-earth-100 text-center truncate">
            {viewMode === 'week'
              ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          <button onClick={() => navigateDate('next')} className="p-2 hover:bg-earth-800 rounded-lg text-earth-300 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
        <div className="flex border border-earth-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm font-medium cursor-pointer ${viewMode === 'week' ? 'bg-green-600 text-white' : 'text-earth-400 hover:bg-earth-800'}`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 text-sm font-medium cursor-pointer ${viewMode === 'month' ? 'bg-green-600 text-white' : 'text-earth-400 hover:bg-earth-800'}`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          {viewMode === 'week' ? (
            <Card padding={false}>
              <div className="overflow-x-auto">
              <div className="grid grid-cols-7 border-b border-earth-800 min-w-[500px]">
                {weekDays.map(day => (
                  <div key={day.toISOString()} className={`p-3 text-center border-r border-earth-800/50 last:border-r-0 ${
                    isSameDay(day, new Date()) ? 'bg-green-600/10' : ''
                  }`}>
                    <p className="text-xs text-earth-400 uppercase">{format(day, 'EEE')}</p>
                    <p className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-green-400' : 'text-earth-100'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 min-h-[400px] min-w-[500px]">
                {weekDays.map(day => {
                  const dayJobs = getJobsForDay(day);
                  return (
                    <div key={day.toISOString()} className={`border-r border-earth-800/50 last:border-r-0 p-2 space-y-1 ${
                      isSameDay(day, new Date()) ? 'bg-green-600/5' : ''
                    }`}>
                      {dayJobs.map(job => (
                        <div
                          key={job.id}
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="p-2 rounded-lg text-xs cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-green-500/40 hover:scale-[1.02] transition-all"
                          style={{ backgroundColor: `${job.crew?.color || '#a68360'}22`, borderLeft: `3px solid ${job.crew?.color || '#a68360'}` }}
                        >
                          <p className="font-medium text-earth-100 truncate">{job.title}</p>
                          <p className="text-earth-400 truncate">{job.scheduled_time || '8:00'} - {job.customer?.name}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              </div>
            </Card>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
              <div className="grid grid-cols-7 border-b border-earth-800 min-w-[500px]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="p-2 text-center text-xs text-earth-400 uppercase font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 min-w-[500px]">
                {Array.from({ length: monthPaddingBefore }).map((_, i) => (
                  <div key={`pad-${i}`} className="p-2 min-h-[100px] border-r border-b border-earth-800/30 bg-earth-950/50" />
                ))}
                {monthDays.map(day => {
                  const dayJobs = getJobsForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 min-h-[100px] border-r border-b border-earth-800/30 ${
                        isSameDay(day, new Date()) ? 'bg-green-600/5' : ''
                      }`}
                    >
                      <p className={`text-sm mb-1 ${isSameDay(day, new Date()) ? 'text-green-400 font-bold' : 'text-earth-300'}`}>
                        {format(day, 'd')}
                      </p>
                      {dayJobs.slice(0, 3).map(job => (
                        <div
                          key={job.id}
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:ring-1 hover:ring-green-500/40 hover:brightness-125 transition-all"
                          style={{ backgroundColor: `${job.crew?.color || '#a68360'}22`, color: job.crew?.color || '#a68360' }}
                        >
                          {job.title}
                        </div>
                      ))}
                      {dayJobs.length > 3 && (
                        <p className="text-[10px] text-earth-400">+{dayJobs.length - 3} more</p>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card header={
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-earth-200">Today's Schedule</h3>
            </div>
          }>
            {todaysJobs.length === 0 ? (
              <p className="text-sm text-earth-400 text-center py-4">No jobs today</p>
            ) : (
              <div className="space-y-3">
                {todaysJobs.map(job => (
                  <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="p-2.5 rounded-lg bg-earth-800/30 cursor-pointer hover:bg-earth-800/50 hover:ring-1 hover:ring-green-500/30 transition-all">
                    <p className="text-sm font-medium text-earth-100">{job.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-earth-400">
                      <Clock className="w-3 h-3" />{job.scheduled_time || '8:00'}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-earth-400">
                      <MapPin className="w-3 h-3" />{job.customer?.name}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card header={<h3 className="text-sm font-semibold text-earth-200">Crews</h3>}>
            <div className="space-y-2">
              {crews.map(crew => (
                <div key={crew.id} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: crew.color }} />
                  <span className="text-sm text-earth-200">{crew.name}</span>
                  <span className="text-xs text-earth-400 ml-auto">{(crew.members ?? []).length} members</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Job Modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title || 'Edit Job'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedJob(null)}>Cancel</Button>
            <Button onClick={handleSaveJob} loading={isSaving} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
          </>
        }
      >
        {selectedJob && (
          <div className="space-y-5">
            {/* Job Info Header */}
            <div className="p-3 rounded-lg bg-earth-800/30 space-y-1">
              <p className="text-sm text-earth-300">Customer: <span className="text-earth-100 font-medium">{selectedJob.customer?.name || 'Unassigned'}</span></p>
              {selectedJob.address && <p className="text-xs text-earth-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedJob.address}</p>}
              <p className="text-xs text-earth-400">Type: {selectedJob.type || selectedJob.job_type || 'General'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Status"
                options={statusOptions}
                value={editForm.status}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              />
              <Select
                label="Crew"
                options={crewOptions}
                value={editForm.crew_id}
                onChange={e => setEditForm(f => ({ ...f, crew_id: e.target.value }))}
              />
              <Input
                label="Scheduled Date"
                type="date"
                value={editForm.scheduled_date}
                onChange={e => setEditForm(f => ({ ...f, scheduled_date: e.target.value }))}
              />
              <Input
                label="Scheduled Time"
                type="time"
                value={editForm.scheduled_time}
                onChange={e => setEditForm(f => ({ ...f, scheduled_time: e.target.value }))}
              />
            </div>

            <Input
              label="Notes"
              value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Add notes about this job..."
            />

            {/* Job Cost Summary */}
            {((selectedJob.materials_cost ?? 0) > 0 || (selectedJob.labor_cost ?? 0) > 0 || (selectedJob.total_price ?? 0) > 0) && (
              <div className="p-3 rounded-lg bg-earth-800/20 border border-earth-800/50">
                <p className="text-xs font-medium text-earth-300 mb-2">Cost Summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-earth-400">Materials</p>
                    <p className="text-sm font-semibold text-earth-100">${(selectedJob.materials_cost ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-400">Labor</p>
                    <p className="text-sm font-semibold text-earth-100">${(selectedJob.labor_cost ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-400">Total</p>
                    <p className="text-sm font-semibold text-green-400">${(selectedJob.total_price ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
