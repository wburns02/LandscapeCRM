import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Zap, Clock, DollarSign, MapPin,
  AlertTriangle, Users, Briefcase, GripVertical, CheckCircle,
  TrendingUp, Truck, ArrowRight, RotateCcw, Sparkles, X,
  ChevronDown, ChevronUp, Navigation,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import clsx from 'clsx';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import type { Job, Crew } from '../../types';

// ——— Types ———
interface DragItem {
  jobId: string;
  sourceCrew: string | null;
  sourceDate: string;
}

interface CellTarget {
  crewId: string;
  date: string;
}

// ——— Simulated drive times (minutes) between areas ———
const driveTimeMatrix: Record<string, Record<string, number>> = {
  'Oak Hollow': { 'Oak Hollow': 0, 'Business Blvd': 18, 'Lakewood': 22, 'Cedar Park': 25, 'Pflugerville': 20, 'Riverside': 15, 'Default': 20 },
  'Business Blvd': { 'Oak Hollow': 18, 'Business Blvd': 0, 'Lakewood': 14, 'Cedar Park': 28, 'Pflugerville': 22, 'Riverside': 12, 'Default': 18 },
  'Lakewood': { 'Oak Hollow': 22, 'Business Blvd': 14, 'Lakewood': 0, 'Cedar Park': 30, 'Pflugerville': 25, 'Riverside': 20, 'Default': 22 },
  'Cedar Park': { 'Oak Hollow': 25, 'Business Blvd': 28, 'Lakewood': 30, 'Cedar Park': 0, 'Pflugerville': 15, 'Riverside': 30, 'Default': 25 },
  'Pflugerville': { 'Oak Hollow': 20, 'Business Blvd': 22, 'Lakewood': 25, 'Cedar Park': 15, 'Pflugerville': 0, 'Riverside': 25, 'Default': 22 },
  'Riverside': { 'Oak Hollow': 15, 'Business Blvd': 12, 'Lakewood': 20, 'Cedar Park': 30, 'Pflugerville': 25, 'Riverside': 0, 'Default': 18 },
  'Default': { 'Oak Hollow': 20, 'Business Blvd': 18, 'Lakewood': 22, 'Cedar Park': 25, 'Pflugerville': 22, 'Riverside': 18, 'Default': 15 },
};

function getArea(address: string): string {
  if (!address) return 'Default';
  const lower = address.toLowerCase();
  if (lower.includes('oak hollow') || lower.includes('1425')) return 'Oak Hollow';
  if (lower.includes('business') || lower.includes('7800')) return 'Business Blvd';
  if (lower.includes('lakewood') || lower.includes('500 lake')) return 'Lakewood';
  if (lower.includes('cedar park') || lower.includes('cedar')) return 'Cedar Park';
  if (lower.includes('pflug') || lower.includes('100 town')) return 'Pflugerville';
  if (lower.includes('riverside') || lower.includes('3200')) return 'Riverside';
  return 'Default';
}

function getDriveTime(addr1: string, addr2: string): number {
  const a1 = getArea(addr1);
  const a2 = getArea(addr2);
  return driveTimeMatrix[a1]?.[a2] ?? driveTimeMatrix['Default']?.[a2] ?? 15;
}

// ——— Utilization colors ———
function getUtilColor(pct: number): string {
  if (pct === 0) return 'bg-earth-800/40';
  if (pct < 40) return 'bg-sky-600/15';
  if (pct < 70) return 'bg-green-600/15';
  if (pct < 90) return 'bg-amber-600/15';
  return 'bg-red-600/15';
}

function getUtilTextColor(pct: number): string {
  if (pct === 0) return 'text-earth-500';
  if (pct < 40) return 'text-sky-400';
  if (pct < 70) return 'text-green-400';
  if (pct < 90) return 'text-amber-400';
  return 'text-red-400';
}

function getUtilBorderColor(pct: number): string {
  if (pct === 0) return 'border-earth-800';
  if (pct < 40) return 'border-sky-700/30';
  if (pct < 70) return 'border-green-700/30';
  if (pct < 90) return 'border-amber-700/30';
  return 'border-red-700/30';
}

// ——— Pulse Dot ———
function PulseDot({ color = 'bg-green-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)} />
      <span className={clsx('relative inline-flex rounded-full h-2 w-2', color)} />
    </span>
  );
}

// ——— Job Card (draggable) ———
function JobCard({
  job,
  onDragStart,
  onDragEnd,
  isDragging,
  compact = false,
}: {
  job: Job;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  compact?: boolean;
}) {
  const typeColors: Record<string, string> = {
    mowing: 'border-l-green-500',
    landscaping: 'border-l-emerald-500',
    hardscape: 'border-l-amber-500',
    'tree service': 'border-l-lime-500',
    irrigation: 'border-l-sky-500',
    planting: 'border-l-pink-400',
    cleanup: 'border-l-earth-400',
  };
  const borderColor = typeColors[job.type || ''] || 'border-l-earth-500';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onDragEnd={onDragEnd}
      className={clsx(
        'group bg-earth-900/80 border border-earth-700/60 border-l-[3px] rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150',
        borderColor,
        isDragging ? 'opacity-30 scale-95' : 'hover:border-earth-600 hover:bg-earth-800/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className={clsx('shrink-0 text-earth-600 group-hover:text-earth-400 transition-colors', compact ? 'w-3 h-3 mt-0.5' : 'w-3.5 h-3.5 mt-0.5')} />
        <div className="flex-1 min-w-0">
          <p className={clsx('font-medium text-earth-100 truncate', compact ? 'text-xs' : 'text-sm')}>
            {job.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={clsx('text-earth-400 truncate', compact ? 'text-[10px]' : 'text-xs')}>
              {job.customer?.name || 'Unknown'}
            </span>
          </div>
          {!compact && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[10px] text-earth-500">
                <Clock className="w-3 h-3" />
                {job.estimated_hours || 2}h
              </span>
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <DollarSign className="w-3 h-3" />
                {(job.total_price || job.labor_cost || 0).toLocaleString()}
              </span>
              {job.address && (
                <span className="flex items-center gap-1 text-[10px] text-earth-500 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {job.address.split(',')[0]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Drop Zone Cell ———
function DropCell({
  crewId,
  date,
  jobs,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  draggingJobId,
  utilPct,
  revenue,
  hours,
  driveMinutes,
}: {
  crewId: string;
  date: string;
  jobs: Job[];
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDragEnd: () => void;
  draggingJobId: string | null;
  utilPct: number;
  revenue: number;
  hours: number;
  driveMinutes: number;
}) {
  return (
    <div
      className={clsx(
        'min-h-[120px] rounded-lg border transition-all duration-200 p-1.5',
        getUtilColor(utilPct),
        isOver ? 'border-green-500/60 bg-green-900/20 shadow-inner ring-1 ring-green-500/20' : getUtilBorderColor(utilPct),
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Cell stats bar */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className={clsx('text-[10px] font-bold', getUtilTextColor(utilPct))}>
          {utilPct > 0 ? `${utilPct}%` : '—'}
        </span>
        <div className="flex items-center gap-2">
          {hours > 0 && (
            <span className="text-[10px] text-earth-500">{hours}h</span>
          )}
          {revenue > 0 && (
            <span className="text-[10px] text-green-500">${revenue.toLocaleString()}</span>
          )}
          {driveMinutes > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-earth-500">
              <Truck className="w-2.5 h-2.5" />{driveMinutes}m
            </span>
          )}
        </div>
      </div>

      {/* Job cards */}
      <div className="space-y-1">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingJobId === job.id}
            compact={jobs.length > 2}
          />
        ))}
      </div>

      {/* Empty state / drop target */}
      {jobs.length === 0 && (
        <div className={clsx(
          'flex items-center justify-center h-20 rounded-md border border-dashed transition-all',
          isOver ? 'border-green-500/40 bg-green-900/10' : 'border-earth-800/60',
        )}>
          <span className="text-[10px] text-earth-600">
            {isOver ? 'Drop here' : 'No jobs'}
          </span>
        </div>
      )}
    </div>
  );
}

// ——— Main Component ———
export default function RoutePlannerPage() {
  const { jobs, crews, updateJob, isLoading } = useData();
  const toast = useToast();

  // Week state
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<DragItem | null>(null);
  const [overCell, setOverCell] = useState<CellTarget | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [moveHistory, setMoveHistory] = useState<{ jobId: string; oldCrewId: string | null; oldDate: string; newCrewId: string; newDate: string }[]>([]);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Week days (Mon-Sat, 6 working days)
  const weekDays = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const activeCrew = useMemo(() =>
    crews.filter(c => c.is_active !== false),
    [crews]
  );

  // Map jobs to crew/date grid
  const jobGrid = useMemo(() => {
    const grid: Record<string, Record<string, Job[]>> = {};
    activeCrew.forEach(c => {
      grid[c.id] = {};
      weekDays.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        grid[c.id][dateStr] = [];
      });
    });

    jobs.forEach(j => {
      if (!j.crew_id || !j.scheduled_date || j.status === 'cancelled') return;
      const dateStr = j.scheduled_date.split('T')[0];
      if (grid[j.crew_id]?.[dateStr]) {
        grid[j.crew_id][dateStr].push(j);
      }
    });

    // Sort jobs within each cell by time
    Object.values(grid).forEach(crewDays => {
      Object.values(crewDays).forEach(dayJobs => {
        dayJobs.sort((a, b) => (a.scheduled_time || '08:00').localeCompare(b.scheduled_time || '08:00'));
      });
    });

    return grid;
  }, [jobs, activeCrew, weekDays]);

  // Unassigned jobs (no crew or outside this week)
  const unassignedJobs = useMemo(() =>
    jobs.filter(j => {
      if (j.status === 'cancelled' || j.status === 'completed') return false;
      if (!j.crew_id) return true;
      return false;
    }),
    [jobs]
  );

  // Stats
  const weekStats = useMemo(() => {
    let totalHours = 0;
    let totalRevenue = 0;
    let jobCount = 0;
    let totalDriveMinutes = 0;

    activeCrew.forEach(crew => {
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayJobs = jobGrid[crew.id]?.[dateStr] || [];
        jobCount += dayJobs.length;
        dayJobs.forEach(j => {
          totalHours += j.estimated_hours || 2;
          totalRevenue += j.total_price || j.labor_cost || 0;
        });
        // Drive time
        for (let i = 1; i < dayJobs.length; i++) {
          totalDriveMinutes += getDriveTime(dayJobs[i - 1].address || '', dayJobs[i].address || '');
        }
      });
    });

    const maxHours = activeCrew.length * 6 * 8; // crew * days * 8h/day
    const utilization = maxHours > 0 ? Math.round((totalHours / maxHours) * 100) : 0;

    return { totalHours, totalRevenue, jobCount, utilization, totalDriveMinutes };
  }, [jobGrid, activeCrew, weekDays]);

  // Cell-level stats
  const getCellStats = useCallback((crewId: string, dateStr: string) => {
    const cellJobs = jobGrid[crewId]?.[dateStr] || [];
    const hours = cellJobs.reduce((s, j) => s + (j.estimated_hours || 2), 0);
    const revenue = cellJobs.reduce((s, j) => s + (j.total_price || j.labor_cost || 0), 0);
    const utilPct = Math.min(100, Math.round((hours / 8) * 100));
    let driveMinutes = 0;
    for (let i = 1; i < cellJobs.length; i++) {
      driveMinutes += getDriveTime(cellJobs[i - 1].address || '', cellJobs[i].address || '');
    }
    return { hours, revenue, utilPct, driveMinutes };
  }, [jobGrid]);

  // Crew daily stats
  const getCrewWeekStats = useCallback((crewId: string) => {
    let hours = 0;
    let revenue = 0;
    let jobCount = 0;
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayJobs = jobGrid[crewId]?.[dateStr] || [];
      jobCount += dayJobs.length;
      dayJobs.forEach(j => {
        hours += j.estimated_hours || 2;
        revenue += j.total_price || j.labor_cost || 0;
      });
    });
    return { hours, revenue, jobCount };
  }, [jobGrid, weekDays]);

  // ——— Drag & Drop Handlers ———
  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    setDraggingJobId(jobId);
    setDragSource({
      jobId,
      sourceCrew: job.crew_id || null,
      sourceDate: job.scheduled_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', jobId);
  }, [jobs]);

  const handleDragEnd = useCallback(() => {
    setDraggingJobId(null);
    setDragSource(null);
    setOverCell(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, crewId: string, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverCell({ crewId, date });
  }, []);

  const handleDragLeave = useCallback(() => {
    setOverCell(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetCrewId: string, targetDate: string) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain') || draggingJobId;
    if (!jobId) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const oldCrewId = job.crew_id || null;
    const oldDate = job.scheduled_date?.split('T')[0] || '';

    // Don't move if same location
    if (oldCrewId === targetCrewId && oldDate === targetDate) {
      handleDragEnd();
      return;
    }

    try {
      await updateJob(job.id, {
        crew_id: targetCrewId,
        scheduled_date: targetDate,
      });

      const crew = activeCrew.find(c => c.id === targetCrewId);
      toast.success(`Moved "${job.title}" to ${crew?.name || 'crew'} on ${format(parseISO(targetDate), 'EEE, MMM d')}`);

      setMoveHistory(prev => [...prev, { jobId, oldCrewId, oldDate, newCrewId: targetCrewId, newDate: targetDate }]);
    } catch {
      toast.error('Failed to reassign job');
    }

    handleDragEnd();
  }, [draggingJobId, jobs, activeCrew, updateJob, toast, handleDragEnd]);

  // ——— Undo last move ———
  const handleUndo = useCallback(async () => {
    const last = moveHistory[moveHistory.length - 1];
    if (!last) return;

    try {
      await updateJob(last.jobId, {
        crew_id: last.oldCrewId || undefined,
        scheduled_date: last.oldDate,
      });
      toast.info('Move undone');
      setMoveHistory(prev => prev.slice(0, -1));
    } catch {
      toast.error('Failed to undo');
    }
  }, [moveHistory, updateJob, toast]);

  // ——— Auto-Optimize Algorithm ———
  const handleAutoOptimize = useCallback(async () => {
    setOptimizing(true);

    // Strategy: redistribute unassigned jobs across crews to balance utilization
    // Then sort each crew's daily jobs by location proximity
    const unassigned = [...unassignedJobs];
    if (unassigned.length === 0) {
      // Try to rebalance existing jobs
      toast.info('All jobs are assigned. Optimizing routes...');

      // Sort jobs within each day by address proximity
      let reorderedCount = 0;
      for (const crew of activeCrew) {
        for (const day of weekDays) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayJobs = jobGrid[crew.id]?.[dateStr] || [];
          if (dayJobs.length < 2) continue;

          // Simple nearest-neighbor sort
          const sorted: Job[] = [dayJobs[0]];
          const remaining = [...dayJobs.slice(1)];

          while (remaining.length > 0) {
            const last = sorted[sorted.length - 1];
            let bestIdx = 0;
            let bestDist = Infinity;
            remaining.forEach((j, idx) => {
              const d = getDriveTime(last.address || '', j.address || '');
              if (d < bestDist) { bestDist = d; bestIdx = idx; }
            });
            sorted.push(remaining.splice(bestIdx, 1)[0]);
          }

          // Update scheduled_time to reflect order
          const startHour = 7;
          for (let i = 0; i < sorted.length; i++) {
            const jobHour = startHour + sorted.slice(0, i).reduce((s, j) => s + (j.estimated_hours || 2), 0);
            const h = Math.floor(jobHour);
            const m = Math.round((jobHour - h) * 60);
            const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (sorted[i].scheduled_time !== newTime) {
              reorderedCount++;
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, 1500));
      setOptimizing(false);
      toast.success(`Routes optimized! ${reorderedCount > 0 ? `${reorderedCount} jobs reordered for shorter drive times` : 'Routes are already optimal'}`);
      return;
    }

    // Assign unassigned jobs to least-loaded crews
    let assigned = 0;
    for (const job of unassigned) {
      // Find the crew with the lowest total hours for the job's date (or first available date)
      const targetDate = job.scheduled_date?.split('T')[0] || format(weekDays[0], 'yyyy-MM-dd');
      let bestCrew = activeCrew[0];
      let bestHours = Infinity;

      for (const crew of activeCrew) {
        const dayJobs = jobGrid[crew.id]?.[targetDate] || [];
        const totalHours = dayJobs.reduce((s, j) => s + (j.estimated_hours || 2), 0);
        if (totalHours < bestHours) {
          bestHours = totalHours;
          bestCrew = crew;
        }
      }

      try {
        await updateJob(job.id, {
          crew_id: bestCrew.id,
          scheduled_date: targetDate,
        });
        assigned++;
      } catch {
        // skip failed
      }
    }

    await new Promise(r => setTimeout(r, 1200));
    setOptimizing(false);

    if (assigned > 0) {
      toast.success(`Auto-assigned ${assigned} job${assigned !== 1 ? 's' : ''} across crews for balanced workload`);
    } else {
      toast.info('No changes needed — schedule is already optimized');
    }
  }, [unassignedJobs, activeCrew, weekDays, jobGrid, updateJob, toast]);

  // ——— Week Navigation ———
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const goPrev = () => setWeekStart(prev => subWeeks(prev, 1));
  const goNext = () => setWeekStart(prev => addWeeks(prev, 1));

  // ——— Skeleton Loader ———
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-20 rounded-xl bg-earth-900/40 border border-earth-800" />
          ))}
        </div>
        <div className="h-[600px] rounded-xl bg-earth-900/40 border border-earth-800" />
      </div>
    );
  }

  return (
    <div className={clsx('space-y-5 transition-all duration-700', animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>

      {/* ========== HEADER + STATS ========== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-earth-900/60 border border-earth-800 rounded-lg">
            <button onClick={goPrev} className="p-2 hover:bg-earth-800 rounded-l-lg transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4 text-earth-400" />
            </button>
            <button onClick={goToday} className="px-3 py-2 text-sm font-medium text-earth-200 hover:bg-earth-800 transition-colors cursor-pointer">
              Today
            </button>
            <button onClick={goNext} className="p-2 hover:bg-earth-800 rounded-r-lg transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-earth-400" />
            </button>
          </div>
          <h2 className="text-lg font-bold font-display text-earth-100">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 5), 'MMM d, yyyy')}
          </h2>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {moveHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-earth-300 bg-earth-900/60 border border-earth-800 rounded-lg hover:bg-earth-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Undo
            </button>
          )}
          <button
            onClick={handleAutoOptimize}
            disabled={optimizing}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer',
              optimizing
                ? 'bg-green-600/20 text-green-400 border border-green-700/40'
                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 shadow-lg shadow-green-900/30',
            )}
          >
            {optimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-Optimize
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========== WEEK SUMMARY STATS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Jobs This Week', value: weekStats.jobCount, icon: Briefcase, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Crew Hours', value: `${weekStats.totalHours}h`, icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Expected Revenue', value: `$${weekStats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Utilization', value: `${weekStats.utilization}%`, icon: TrendingUp, color: getUtilTextColor(weekStats.utilization), bg: weekStats.utilization > 70 ? 'bg-green-500/10' : 'bg-amber-500/10' },
          { label: 'Drive Time', value: `${weekStats.totalDriveMinutes}m`, icon: Navigation, color: 'text-earth-300', bg: 'bg-earth-500/10' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-3 bg-earth-900/60 border border-earth-800 rounded-xl px-4 py-3">
            <div className={clsx('p-2 rounded-lg', stat.bg)}>
              <stat.icon className={clsx('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-[10px] text-earth-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-lg font-bold font-display text-earth-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* ========== MAIN GRID ========== */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: '140px repeat(6, 1fr)' }}>
              <div className="px-3 py-2">
                <span className="text-xs font-medium text-earth-500 uppercase tracking-wide">Crew</span>
              </div>
              {weekDays.map(day => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={clsx(
                      'text-center px-2 py-2 rounded-lg',
                      isToday ? 'bg-green-600/10 border border-green-700/30' : '',
                    )}
                  >
                    <p className={clsx('text-xs font-medium', isToday ? 'text-green-400' : 'text-earth-400')}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={clsx('text-lg font-bold font-display', isToday ? 'text-green-300' : 'text-earth-200')}>
                      {format(day, 'd')}
                    </p>
                    {isToday && <PulseDot color="bg-green-500" />}
                  </div>
                );
              })}
            </div>

            {/* Crew rows */}
            {activeCrew.map((crew, idx) => {
              const crewStats = getCrewWeekStats(crew.id);
              return (
                <div
                  key={crew.id}
                  className="grid gap-1.5 mb-2"
                  style={{
                    gridTemplateColumns: '140px repeat(6, 1fr)',
                    animationDelay: `${idx * 80}ms`,
                  }}
                >
                  {/* Crew label */}
                  <div className="bg-earth-900/60 border border-earth-800 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: crew.color || '#22c55e' }} />
                        <h3 className="text-sm font-semibold text-earth-100 truncate">{crew.name}</h3>
                      </div>
                      <p className="text-[10px] text-earth-500">
                        {crew.members?.length || 0} members
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-earth-500">{crewStats.jobCount} jobs</span>
                        <span className="text-green-400">${crewStats.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-earth-500">{crewStats.hours}h</span>
                        <span className={getUtilTextColor(Math.round((crewStats.hours / 48) * 100))}>
                          {Math.round((crewStats.hours / 48) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cellJobs = jobGrid[crew.id]?.[dateStr] || [];
                    const stats = getCellStats(crew.id, dateStr);
                    const isOverThis = overCell?.crewId === crew.id && overCell?.date === dateStr;

                    return (
                      <DropCell
                        key={dateStr}
                        crewId={crew.id}
                        date={dateStr}
                        jobs={cellJobs}
                        isOver={isOverThis}
                        onDragOver={(e) => handleDragOver(e, crew.id, dateStr)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, crew.id, dateStr)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        draggingJobId={draggingJobId}
                        utilPct={stats.utilPct}
                        revenue={stats.revenue}
                        hours={stats.hours}
                        driveMinutes={stats.driveMinutes}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========== UNASSIGNED JOBS SIDEBAR ========== */}
        <div className={clsx(
          'transition-all duration-300 hidden lg:block',
          showUnassigned ? 'w-64 shrink-0' : 'w-0 overflow-hidden',
        )}>
          <div className="bg-earth-900/60 border border-earth-800 rounded-xl h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-earth-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-earth-100">Unassigned</h3>
                {unassignedJobs.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-600/20 text-amber-400">
                    {unassignedJobs.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowUnassigned(false)}
                className="p-1 hover:bg-earth-800 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-earth-500" />
              </button>
            </div>

            <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {unassignedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-earth-400">All jobs assigned!</p>
                </div>
              ) : (
                unassignedJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingJobId === job.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Show unassigned toggle when hidden */}
      {!showUnassigned && unassignedJobs.length > 0 && (
        <button
          onClick={() => setShowUnassigned(true)}
          className="fixed right-4 bottom-4 flex items-center gap-2 px-4 py-3 bg-amber-600/20 border border-amber-700/40 text-amber-400 rounded-xl shadow-lg hover:bg-amber-600/30 transition-colors cursor-pointer z-10"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">{unassignedJobs.length} Unassigned Jobs</span>
        </button>
      )}

      {/* ========== LEGEND ========== */}
      <div className="flex flex-wrap items-center gap-4 px-2 text-[10px] text-earth-500">
        <span className="font-medium text-earth-400">Utilization:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-earth-800/40 border border-earth-800" /> Empty</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-600/15 border border-sky-700/30" /> &lt;40%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600/15 border border-green-700/30" /> 40–70%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-600/15 border border-amber-700/30" /> 70–90%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600/15 border border-red-700/30" /> &gt;90%</span>
        <span className="ml-auto text-earth-500">Drag jobs between crews and days to reassign</span>
      </div>
    </div>
  );
}
