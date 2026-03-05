import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns';

type ViewMode = 'week' | 'month';

export default function SchedulePage() {
  const { jobs, crews } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthPaddingBefore = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  const navigate = (dir: 'prev' | 'next') => {
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

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('prev')} className="p-2 hover:bg-earth-800 rounded-lg text-earth-300 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold font-display text-earth-100 min-w-[200px] text-center">
            {viewMode === 'week'
              ? `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          <button onClick={() => navigate('next')} className="p-2 hover:bg-earth-800 rounded-lg text-earth-300 cursor-pointer">
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
              <div className="grid grid-cols-7 border-b border-earth-800">
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
              <div className="grid grid-cols-7 min-h-[400px]">
                {weekDays.map(day => {
                  const dayJobs = getJobsForDay(day);
                  return (
                    <div key={day.toISOString()} className={`border-r border-earth-800/50 last:border-r-0 p-2 space-y-1 ${
                      isSameDay(day, new Date()) ? 'bg-green-600/5' : ''
                    }`}>
                      {dayJobs.map(job => (
                        <div
                          key={job.id}
                          className="p-2 rounded-lg text-xs cursor-pointer hover:opacity-80 transition-opacity"
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
            </Card>
          ) : (
            <Card padding={false}>
              <div className="grid grid-cols-7 border-b border-earth-800">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="p-2 text-center text-xs text-earth-400 uppercase font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
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
                          className="text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer"
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
                  <div key={job.id} className="p-2.5 rounded-lg bg-earth-800/30">
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
                  <span className="text-xs text-earth-400 ml-auto">{crew.members.length} members</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
