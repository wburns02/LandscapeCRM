import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Navigation, Phone, Clock, CheckCircle2, AlertCircle,
  Send, ChevronRight, Zap, Users, Briefcase, Radio, X,
  TrendingUp, Filter, RefreshCw, Layers
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useToast } from '../../components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatLng { x: number; y: number; lat: number; lng: number; }
interface CrewPosition { crewId: string; pos: LatLng; heading: number; speed: number; }
interface MapJob {
  id: string; title: string; customer: string; address: string;
  status: 'pending' | 'en_route' | 'in_progress' | 'completed';
  pos: LatLng; crewId: string | null; scheduledTime: string;
  estimatedDuration: number; actualStart?: number; priority: 'high' | 'medium' | 'low';
}
interface Crew {
  id: string; name: string; lead: string; members: number;
  vehicle: string; color: string; phone: string;
  status: 'idle' | 'en_route' | 'on_job' | 'break';
  currentJobId: string | null; completedToday: number; revenueToday: number;
}

// ── Austin TX Map Data ─────────────────────────────────────────────────────────
// Normalized SVG coords (0-900 wide, 0-600 tall) centered on Austin

const toXY = (lat: number, lng: number): { x: number; y: number } => {
  // Austin center: 30.2672, -97.7431
  const centerLat = 30.2672, centerLng = -97.7431;
  const scale = 2800;
  const x = (lng - centerLng) * scale * Math.cos(centerLat * Math.PI / 180) + 450;
  const y = -(lat - centerLat) * scale + 300;
  return { x: Math.round(x), y: Math.round(y) };
};

const mkPos = (lat: number, lng: number): LatLng => ({
  ...toXY(lat, lng), lat, lng
});

// Major Austin roads (simplified SVG paths)
const ROADS = {
  highways: [
    // I-35
    "M 620 0 L 618 100 L 615 200 L 612 300 L 610 400 L 608 500 L 605 600",
    // MoPac (Loop 1)
    "M 290 0 L 292 80 L 295 160 L 300 240 L 310 310 L 325 370 L 330 420 L 328 500 L 325 600",
    // US-183
    "M 700 0 L 680 100 L 650 200 L 620 280 L 600 340 L 580 400 L 560 480 L 540 560 L 520 600",
    // SH-71 / Ben White
    "M 0 420 L 100 418 L 200 415 L 320 412 L 450 410 L 500 410 L 580 408 L 700 405 L 900 402",
    // Loop 360
    "M 270 80 L 262 150 L 255 220 L 250 300 L 255 380 L 265 450 L 280 520 L 295 580 L 310 600",
    // US-290
    "M 0 340 L 100 338 L 200 336 L 320 335 L 450 333 L 560 331 L 680 330 L 900 328",
    // Research Blvd (620)
    "M 0 140 L 100 138 L 250 136 L 400 135 L 550 134 L 700 133 L 900 132",
  ],
  major: [
    // Congress Ave (goes through downtown, N-S)
    "M 448 150 L 450 250 L 452 350 L 454 450 L 456 550 L 458 600",
    // Lamar Blvd
    "M 380 0 L 382 80 L 385 160 L 388 240 L 390 320 L 392 400 L 394 500 L 396 600",
    // 6th Street (E-W through downtown)
    "M 200 310 L 300 308 L 400 306 L 500 304 L 600 302 L 700 300",
    // 5th/University Ave
    "M 200 290 L 350 288 L 500 286 L 650 284",
    // 38th Street
    "M 150 230 L 300 228 L 450 226 L 600 225",
    // Rundberg/Parmer
    "M 0 175 L 150 174 L 350 173 L 550 172 L 750 171 L 900 170",
    // Anderson / 183A spur
    "M 350 190 L 500 188 L 650 186 L 800 184",
    // Airport Blvd
    "M 550 220 L 560 280 L 565 350 L 560 420 L 555 480",
    // MLK Jr. Blvd
    "M 300 270 L 450 268 L 600 266",
    // Riverside Dr
    "M 200 380 L 350 378 L 500 376 L 620 374",
    // Oltorf / William Cannon
    "M 150 450 L 350 448 L 550 446 L 750 444",
    // Slaughter Lane
    "M 100 510 L 300 508 L 500 506 L 700 504 L 900 502",
    // Manor Rd
    "M 450 240 L 580 238 L 700 236 L 900 234",
    // FM 2222
    "M 200 180 L 320 178 L 440 178 L 500 175",
    // S. 1st St
    "M 405 340 L 407 420 L 409 500 L 411 600",
    // S. Congress connector
    "M 455 460 L 457 530 L 459 600",
  ],
  minor: [
    // Downtown grid (simplified)
    "M 420 280 L 560 280", "M 420 300 L 560 300", "M 420 320 L 560 320",
    "M 420 260 L 560 260", "M 420 240 L 560 240",
    "M 430 240 L 430 360", "M 460 240 L 460 360", "M 490 240 L 490 360",
    "M 520 240 L 520 360", "M 550 240 L 550 360",
    // South Austin grid
    "M 380 400 L 520 400", "M 380 430 L 520 430", "M 380 460 L 520 460",
    "M 390 380 L 390 480", "M 420 380 L 420 480", "M 450 380 L 450 480", "M 480 380 L 480 480",
    // North Austin
    "M 350 150 L 550 150", "M 350 170 L 550 170",
    "M 360 130 L 360 190", "M 400 130 L 400 190", "M 440 130 L 440 190", "M 480 130 L 480 190",
    // East Austin
    "M 620 260 L 760 260", "M 620 290 L 760 290", "M 620 320 L 760 320",
    "M 630 250 L 630 340", "M 670 250 L 670 340", "M 710 250 L 710 340",
  ]
};

// Labels for landmarks
const LABELS = [
  { pos: mkPos(30.267, -97.743), text: "Downtown", size: 11, bold: true },
  { pos: mkPos(30.286, -97.740), text: "UT Campus", size: 9, bold: false },
  { pos: mkPos(30.250, -97.750), text: "S. Congress", size: 9, bold: false },
  { pos: mkPos(30.310, -97.756), text: "Domain", size: 9, bold: false },
  { pos: mkPos(30.270, -97.720), text: "E. Austin", size: 9, bold: false },
  { pos: mkPos(30.320, -97.710), text: "Pflugerville", size: 9, bold: false },
  { pos: mkPos(30.345, -97.770), text: "Cedar Park", size: 9, bold: false },
  { pos: mkPos(30.230, -97.760), text: "S. Austin", size: 9, bold: false },
  { pos: mkPos(30.280, -97.775), text: "Westlake", size: 9, bold: false },
  { pos: mkPos(30.220, -97.730), text: "Slaughter", size: 8, bold: false },
  { pos: mkPos(30.225, -97.797), text: "Oak Hill", size: 8, bold: false },
];

// ── Demo Data ──────────────────────────────────────────────────────────────────

const CREWS: Crew[] = [
  {
    id: 'c1', name: 'Alpha Crew', lead: 'Mike Torres', members: 3,
    vehicle: 'F-350 #101', color: '#22c55e', phone: '(512) 555-0101',
    status: 'on_job', currentJobId: 'j1', completedToday: 2, revenueToday: 875,
  },
  {
    id: 'c2', name: 'Bravo Crew', lead: 'Carlos Reyes', members: 2,
    vehicle: 'F-250 #102', color: '#3b82f6', phone: '(512) 555-0102',
    status: 'en_route', currentJobId: 'j4', completedToday: 1, revenueToday: 450,
  },
  {
    id: 'c3', name: 'Charlie Crew', lead: 'Jason Kim', members: 4,
    vehicle: 'Ram 1500 #103', color: '#f59e0b', phone: '(512) 555-0103',
    status: 'on_job', currentJobId: 'j7', completedToday: 3, revenueToday: 1240,
  },
];

const JOBS: MapJob[] = [
  {
    id: 'j1', title: 'Weekly Lawn Maintenance', customer: 'Sarah Mitchell',
    address: '1425 Oak Hollow Dr', status: 'in_progress', crewId: 'c1',
    pos: mkPos(30.267, -97.767), scheduledTime: '08:00', estimatedDuration: 90,
    actualStart: Date.now() - 45 * 60000, priority: 'high',
  },
  {
    id: 'j2', title: 'Hedge Trimming', customer: 'David Chen',
    address: '742 Pecan St', status: 'completed', crewId: 'c1',
    pos: mkPos(30.259, -97.744), scheduledTime: '06:30', estimatedDuration: 60,
    priority: 'medium',
  },
  {
    id: 'j3', title: 'Spring Cleanup', customer: 'Maria Garcia',
    address: '315 Bluebonnet Ln', status: 'completed', crewId: 'c1',
    pos: mkPos(30.248, -97.752), scheduledTime: '07:30', estimatedDuration: 45,
    priority: 'low',
  },
  {
    id: 'j4', title: 'Commercial Grounds Care', customer: 'Riverside Office Park',
    address: '8800 Business Blvd', status: 'en_route', crewId: 'c2',
    pos: mkPos(30.318, -97.721), scheduledTime: '09:00', estimatedDuration: 180,
    priority: 'high',
  },
  {
    id: 'j5', title: 'Irrigation Repair', customer: 'Oakmont Business Ctr',
    address: '4400 Domain Dr', status: 'pending', crewId: 'c2',
    pos: mkPos(30.398, -97.726), scheduledTime: '11:30', estimatedDuration: 120,
    priority: 'high',
  },
  {
    id: 'j6', title: 'Landscape Install', customer: 'Jennifer Wallace',
    address: '2810 Barton Hills Dr', status: 'pending', crewId: 'c2',
    pos: mkPos(30.232, -97.771), scheduledTime: '14:00', estimatedDuration: 240,
    priority: 'medium',
  },
  {
    id: 'j7', title: 'HOA Full Service', customer: 'Lakewood HOA',
    address: '200 Lakewood Blvd', status: 'in_progress', crewId: 'c3',
    pos: mkPos(30.295, -97.805), scheduledTime: '07:00', estimatedDuration: 300,
    actualStart: Date.now() - 110 * 60000, priority: 'high',
  },
  {
    id: 'j8', title: 'Tree Pruning', customer: 'City of Pflugerville',
    address: '100 E Main St', status: 'completed', crewId: 'c3',
    pos: mkPos(30.439, -97.620), scheduledTime: '06:00', estimatedDuration: 90,
    priority: 'medium',
  },
  {
    id: 'j9', title: 'Sod Installation', customer: 'Tom Bradley',
    address: '512 Patio Creek Dr', status: 'completed', crewId: 'c3',
    pos: mkPos(30.308, -97.793), scheduledTime: '07:30', estimatedDuration: 60,
    priority: 'low',
  },
  {
    id: 'j10', title: 'Mulch & Bed Refresh', customer: 'Lisa Park',
    address: '5030 Shoal Creek Blvd', status: 'pending', crewId: 'c3',
    pos: mkPos(30.338, -97.735), scheduledTime: '13:00', estimatedDuration: 90,
    priority: 'medium',
  },
];

// Initial crew positions (near their current jobs)
const getInitialPositions = (): Record<string, LatLng> => ({
  c1: { ...mkPos(30.268, -97.768), lat: 30.268, lng: -97.768 },
  c2: { ...mkPos(30.305, -97.730), lat: 30.305, lng: -97.730 },
  c3: { ...mkPos(30.294, -97.806), lat: 30.294, lng: -97.806 },
});

const statusColors: Record<string, string> = {
  pending: '#6b7280',
  en_route: '#3b82f6',
  in_progress: '#22c55e',
  completed: '#d1d5db',
};
const statusLabels: Record<string, string> = {
  pending: 'Pending', en_route: 'En Route', in_progress: 'In Progress', completed: 'Done',
};
const crewStatusColors: Record<string, string> = {
  idle: '#6b7280', en_route: '#3b82f6', on_job: '#22c55e', break: '#f59e0b',
};
const crewStatusLabels: Record<string, string> = {
  idle: 'Idle', en_route: 'En Route', on_job: 'On Job', break: 'On Break',
};

// ── Main Component ──────────────────────────────────────────────────────────────

export default function LiveDispatchMap() {
  const { addToast } = useToast();

  const [selectedCrewId, setSelectedCrewId] = useState<string | null>('c1');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [crewPositions, setCrewPositions] = useState<Record<string, LatLng>>(getInitialPositions);
  const [jobs, setJobs] = useState<MapJob[]>(JOBS);
  const [tick, setTick] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [etaSent, setEtaSent] = useState<Set<string>>(new Set());
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [now, setNow] = useState(Date.now());

  // Simulate crew movement
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setNow(Date.now());
      setCrewPositions(prev => {
        const next = { ...prev };
        CREWS.forEach(crew => {
          const job = jobs.find(j => j.crewId === crew.id && j.status === 'in_progress');
          const enRouteJob = jobs.find(j => j.crewId === crew.id && j.status === 'en_route');
          const target = job || enRouteJob;
          if (!target) return;
          const cur = prev[crew.id];
          const dx = target.pos.x - cur.x;
          const dy = target.pos.y - cur.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) return;
          const step = job ? 0.3 : 1.5; // slower when on job (minor drift), faster when en route
          const jitterX = (Math.random() - 0.5) * (job ? 0.8 : 0.2);
          const jitterY = (Math.random() - 0.5) * (job ? 0.8 : 0.2);
          next[crew.id] = {
            x: cur.x + (dx / dist) * step + jitterX,
            y: cur.y + (dy / dist) * step + jitterY,
            lat: cur.lat + (target.pos.lat - cur.lat) * (step / dist) * 0.01,
            lng: cur.lng + (target.pos.lng - cur.lng) * (step / dist) * 0.01,
          };
        });
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [jobs]);

  const handleSendETA = useCallback((job: MapJob, crew: Crew) => {
    const mins = Math.round(Math.random() * 10 + 5);
    addToast('success', `ETA sent to ${job.customer}: "${crew.name} arriving in ~${mins} min"`);
    setEtaSent(prev => new Set([...prev, job.id]));
  }, [addToast]);

  const handleCallCrew = useCallback((crew: Crew) => {
    addToast('info', `Calling ${crew.name} — ${crew.lead} at ${crew.phone}`);
  }, [addToast]);

  const handleRedispatch = useCallback((jobId: string) => {
    addToast('success', 'Job re-assigned to nearest available crew');
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, crewId: 'c1' } : j));
  }, [addToast]);

  const handleCompleteJob = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'completed' } : j));
    addToast('success', 'Job marked complete! Invoice ready to send.');
  }, [addToast]);

  const selectedCrew = CREWS.find(c => c.id === selectedCrewId) ?? null;
  const selectedJob = jobs.find(j => j.id === selectedJobId) ?? null;

  const crewJobs = (crewId: string) => jobs.filter(j => j.crewId === crewId);
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const enRouteJobs = jobs.filter(j => j.status === 'en_route');
  const todayRevenue = CREWS.reduce((s, c) => s + c.revenueToday, 0);
  const totalCompleted = CREWS.reduce((s, c) => s + c.completedToday, 0);

  const filteredJobs = filterStatus === 'all' ? jobs : jobs.filter(j => j.status === filterStatus);

  const getElapsedMinutes = (job: MapJob) => {
    if (!job.actualStart) return 0;
    return Math.round((now - job.actualStart) / 60000);
  };

  const getProgressPct = (job: MapJob) => {
    const elapsed = getElapsedMinutes(job);
    return Math.min(100, Math.round((elapsed / job.estimatedDuration) * 100));
  };

  // ── Route lines between jobs for selected crew ──────────────────────────────
  const getRoutePath = (crewId: string): string => {
    const crewJobsList = crewJobs(crewId).filter(j => j.status !== 'completed');
    const sortedJobs = [...crewJobsList].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    if (sortedJobs.length < 2) return '';
    const pos = crewPositions[crewId];
    const pts = [pos, ...sortedJobs.map(j => j.pos)];
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  return (
    <div className="flex bg-[#0d1117] overflow-hidden h-full">

      {/* ── LEFT PANEL: Crew List ─────────────────────────────────────────────── */}
      <div className="w-72 bg-[#161b22] border-r border-[#30363d] flex flex-col flex-shrink-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-green-400 animate-pulse" />
              <h2 className="text-white font-semibold text-sm">Live Dispatch</h2>
            </div>
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </div>
          <p className="text-xs text-gray-500">{format(new Date(), 'EEEE, MMM d · h:mm a')}</p>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d] grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{activeJobs.length}</div>
            <div className="text-[10px] text-gray-500">Active</div>
          </div>
          <div className="text-center border-x border-[#30363d]">
            <div className="text-lg font-bold text-white">{totalCompleted}</div>
            <div className="text-[10px] text-gray-500">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">${todayRevenue.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Revenue</div>
          </div>
        </div>

        {/* Crew list */}
        <div className="flex-1 overflow-y-auto">
          {CREWS.map(crew => {
            const isSelected = crew.id === selectedCrewId;
            const cJobs = crewJobs(crew.id);
            const currentJob = jobs.find(j => j.id === crew.currentJobId);
            const elapsed = currentJob?.actualStart ? getElapsedMinutes(currentJob) : null;

            return (
              <div
                key={crew.id}
                onClick={() => { setSelectedCrewId(crew.id); setSelectedJobId(null); }}
                className={clsx(
                  'border-b border-[#30363d] cursor-pointer transition-all duration-200',
                  isSelected ? 'bg-[#21262d]' : 'hover:bg-[#1c2128]'
                )}
              >
                {/* Crew header */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                      style={{ backgroundColor: crew.color }} />
                    <span className="text-white text-sm font-medium truncate">{crew.name}</span>
                    <span
                      className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: crewStatusColors[crew.status] + '33', color: crewStatusColors[crew.status] }}
                    >
                      {crewStatusLabels[crew.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{crew.lead} · {crew.members} members</div>
                  <div className="text-xs text-gray-500">{crew.vehicle}</div>
                </div>

                {/* Current job info */}
                {currentJob && crew.status !== 'idle' && (
                  <div className="px-4 pb-3">
                    <div className="bg-[#0d1117] rounded-lg p-2">
                      <div className="text-xs text-gray-300 font-medium truncate">{currentJob.title}</div>
                      <div className="text-xs text-gray-500 truncate">{currentJob.customer}</div>
                      {elapsed !== null && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>{elapsed}m elapsed</span>
                            <span>{getProgressPct(currentJob)}%</span>
                          </div>
                          <div className="h-1 bg-[#30363d] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${getProgressPct(currentJob)}%`, backgroundColor: crew.color }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Job count */}
                {isSelected && (
                  <div className="px-4 pb-3">
                    <div className="flex gap-3 text-[10px] text-gray-500">
                      <span className="text-green-400">{cJobs.filter(j => j.status === 'completed').length} done</span>
                      <span className="text-blue-400">{cJobs.filter(j => j.status !== 'completed').length} remaining</span>
                      <span className="text-white ml-auto">${crew.revenueToday.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {isSelected && (
                  <div className="px-4 pb-3 flex gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleCallCrew(crew); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs py-1.5 rounded-lg transition-colors"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </button>
                    {currentJob && crew.status === 'on_job' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleSendETA(currentJob, crew); }}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg transition-colors',
                          etaSent.has(currentJob.id)
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-blue-900/30 hover:bg-blue-800/40 text-blue-400'
                        )}
                      >
                        <Send className="w-3 h-3" />
                        {etaSent.has(currentJob.id) ? 'ETA Sent' : 'Send ETA'}
                      </button>
                    )}
                    {currentJob && crew.status === 'en_route' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleSendETA(currentJob, crew); }}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 text-xs py-1.5 rounded-lg transition-colors"
                      >
                        <Send className="w-3 h-3" /> Send ETA
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: Map ───────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Map controls */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] text-gray-300 text-xs px-3 py-1.5 rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          {showFilters && (
            <div className="flex gap-1">
              {['all', 'in_progress', 'en_route', 'pending', 'completed'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={clsx(
                    'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                    filterStatus === s
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-[#161b22] border-[#30363d] text-gray-400 hover:bg-[#21262d]'
                  )}
                >
                  {s === 'all' ? 'All' : statusLabels[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            onClick={() => setMapScale(s => Math.min(2, s + 0.2))}
            className="w-8 h-8 bg-[#161b22] border border-[#30363d] text-gray-300 rounded-lg hover:bg-[#21262d] transition-colors flex items-center justify-center text-lg font-bold"
          >+</button>
          <button
            onClick={() => setMapScale(s => Math.max(0.5, s - 0.2))}
            className="w-8 h-8 bg-[#161b22] border border-[#30363d] text-gray-300 rounded-lg hover:bg-[#21262d] transition-colors flex items-center justify-center text-lg font-bold"
          >−</button>
          <button
            onClick={() => { setMapScale(1); setMapOffset({ x: 0, y: 0 }); }}
            className="w-8 h-8 bg-[#161b22] border border-[#30363d] text-gray-300 rounded-lg hover:bg-[#21262d] transition-colors flex items-center justify-center"
          ><Layers className="w-3.5 h-3.5" /></button>
        </div>

        {/* SVG Map */}
        <svg
          ref={svgRef}
          viewBox="0 0 900 600"
          className="w-full h-full"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f2d 50%, #0a1628 100%)' }}
        >
          {/* Map grid texture */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1a2a3a" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a3a5c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0a1628" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid */}
          <rect width="900" height="600" fill="url(#grid)" />
          {/* Center glow */}
          <rect width="900" height="600" fill="url(#centerGlow)" />

          {/* Water body (Town Lake / Colorado River) */}
          <path
            d="M 200 370 Q 280 362 360 358 Q 430 354 500 352 Q 570 350 640 348 Q 720 346 780 345"
            stroke="#1a4a6e" strokeWidth="8" fill="none" strokeLinecap="round"
          />
          <path
            d="M 200 374 Q 280 366 360 362 Q 430 358 500 356 Q 570 354 640 352 Q 720 350 780 349"
            stroke="#163d5c" strokeWidth="4" fill="none" strokeLinecap="round"
          />

          {/* Park areas */}
          <ellipse cx="450" cy="400" rx="30" ry="20" fill="#0d2a1a" opacity="0.6" />
          <ellipse cx="320" cy="350" rx="20" ry="15" fill="#0d2a1a" opacity="0.5" />

          {/* Minor roads */}
          {ROADS.minor.map((d, i) => (
            <path key={`minor-${i}`} d={d} stroke="#243545" strokeWidth="0.8" fill="none" />
          ))}

          {/* Major roads */}
          {ROADS.major.map((d, i) => (
            <path key={`major-${i}`} d={d} stroke="#274060" strokeWidth="2" fill="none" strokeLinecap="round" />
          ))}

          {/* Highways */}
          {ROADS.highways.map((d, i) => (
            <g key={`hwy-${i}`}>
              <path d={d} stroke="#1e3a1e" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d={d} stroke="#3a7a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d={d} stroke="#4a9a4a" strokeWidth="1" fill="none" strokeLinecap="round" strokeDasharray="4,8" strokeOpacity="0.5" />
            </g>
          ))}

          {/* Landmark labels */}
          {LABELS.map((label, i) => (
            <text
              key={i} x={label.pos.x} y={label.pos.y}
              fill="#2d4a6a" fontSize={label.size}
              fontWeight={label.bold ? 700 : 400}
              fontFamily="Inter, system-ui, sans-serif"
              textAnchor="middle" dominantBaseline="middle"
            >
              {label.text}
            </text>
          ))}

          {/* Route lines for selected crew */}
          {CREWS.map(crew => {
            if (selectedCrewId && crew.id !== selectedCrewId) return null;
            const path = getRoutePath(crew.id);
            if (!path) return null;
            return (
              <g key={`route-${crew.id}`}>
                <path d={path} stroke={crew.color} strokeWidth="2.5" fill="none"
                  strokeDasharray="8,5" strokeOpacity="0.4"
                  style={{ filter: `drop-shadow(0 0 4px ${crew.color}40)` }} />
              </g>
            );
          })}

          {/* Job pins */}
          {filteredJobs.map(job => {
            const isSelected = job.id === selectedJobId;
            const crew = CREWS.find(c => c.id === job.crewId);
            const color = job.status === 'in_progress' && crew ? crew.color : statusColors[job.status];
            return (
              <g
                key={job.id}
                transform={`translate(${job.pos.x}, ${job.pos.y})`}
                onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse ring for active jobs */}
                {job.status === 'in_progress' && (
                  <circle r={14} fill={color} opacity="0.15">
                    <animate attributeName="r" from="10" to="22" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Pin body */}
                <circle r={isSelected ? 10 : 7}
                  fill={job.status === 'completed' ? '#21262d' : color}
                  stroke={isSelected ? '#ffffff' : color}
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={job.status === 'completed' ? 0.5 : 0.95}
                  style={{ filter: job.status !== 'completed' ? `drop-shadow(0 0 6px ${color}80)` : 'none' }}
                />

                {/* Status icon */}
                <text
                  x="0" y="0" textAnchor="middle" dominantBaseline="middle"
                  fontSize={isSelected ? "8" : "6"} fill="white" fontWeight="bold"
                >
                  {job.status === 'completed' ? '✓' :
                    job.status === 'in_progress' ? '▶' :
                      job.status === 'en_route' ? '→' : '○'}
                </text>

                {/* Label */}
                {(isSelected || job.status === 'in_progress') && (
                  <g>
                    <rect x="-35" y="12" width="70" height="16" rx="3"
                      fill="#161b22" stroke={color} strokeWidth="0.5" opacity="0.95" />
                    <text x="0" y="20" textAnchor="middle" dominantBaseline="middle"
                      fontSize="7" fill="#c9d1d9" fontFamily="Inter, sans-serif">
                      {job.title.length > 16 ? job.title.slice(0, 15) + '…' : job.title}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Crew position markers */}
          {CREWS.map(crew => {
            const pos = crewPositions[crew.id];
            if (!pos) return null;
            const isSelected = crew.id === selectedCrewId;
            return (
              <g key={`crew-${crew.id}`} transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedCrewId(crew.id)}
                style={{ cursor: 'pointer' }}>

                {/* Outer pulse */}
                <circle r={20} fill={crew.color} opacity="0.08">
                  <animate attributeName="r" from="14" to="26" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.15" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>

                {/* Crew icon background */}
                <circle r={isSelected ? 16 : 12} fill={crew.color}
                  stroke="white" strokeWidth={isSelected ? 2.5 : 1.5}
                  style={{ filter: `drop-shadow(0 0 8px ${crew.color}90)` }} />

                {/* Truck icon */}
                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle"
                  fontSize={isSelected ? "11" : "9"} fill="white">🚛</text>

                {/* Crew name tag */}
                <g transform={`translate(0, ${isSelected ? 22 : 18})`}>
                  <rect x="-24" y="-8" width="48" height="14" rx="4"
                    fill={crew.color} opacity="0.95" />
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle"
                    fontSize="7" fill="white" fontWeight="700" fontFamily="Inter, sans-serif">
                    {crew.name.split(' ')[0]}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Job detail popup */}
        {selectedJob && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-96 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-20 overflow-hidden">
            <div className="flex items-start justify-between p-4 border-b border-[#30363d]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: statusColors[selectedJob.status] + '33', color: statusColors[selectedJob.status] }}
                  >
                    {statusLabels[selectedJob.status]}
                  </span>
                  {selectedJob.priority === 'high' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">High Priority</span>
                  )}
                </div>
                <h3 className="text-white font-semibold">{selectedJob.title}</h3>
                <p className="text-gray-400 text-sm">{selectedJob.customer}</p>
                <p className="text-gray-500 text-xs">{selectedJob.address}</p>
              </div>
              <button onClick={() => setSelectedJobId(null)}
                className="text-gray-500 hover:text-gray-300 p-1 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedJob.status === 'in_progress' && (
              <div className="p-4 border-b border-[#30363d]">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>{getElapsedMinutes(selectedJob)}m elapsed</span>
                  <span>~{selectedJob.estimatedDuration - getElapsedMinutes(selectedJob)}m remaining</span>
                </div>
                <div className="h-2 bg-[#30363d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPct(selectedJob)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="p-4 flex gap-2">
              <button
                onClick={() => {
                  const crew = CREWS.find(c => c.id === selectedJob.crewId);
                  if (crew) handleSendETA(selectedJob, crew);
                }}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg transition-colors font-medium',
                  etaSent.has(selectedJob.id)
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                )}
              >
                <Send className="w-4 h-4" />
                {etaSent.has(selectedJob.id) ? 'ETA Sent ✓' : 'Send ETA to Customer'}
              </button>
              {selectedJob.status === 'in_progress' && (
                <button
                  onClick={() => handleCompleteJob(selectedJob.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" /> Complete Job
                </button>
              )}
              {(selectedJob.status === 'pending' || selectedJob.status === 'en_route') && (
                <button
                  onClick={() => handleRedispatch(selectedJob.id)}
                  className="flex items-center justify-center gap-1.5 text-sm py-2 px-3 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#161b22]/80 border border-[#30363d] px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live · Updates every 0.8s</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: Job Queue ────────────────────────────────────────────── */}
      <div className="w-72 bg-[#161b22] border-l border-[#30363d] flex flex-col flex-shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d]">
          <h2 className="text-white font-semibold text-sm">Today's Jobs</h2>
          <p className="text-xs text-gray-500">
            {jobs.filter(j => j.status === 'completed').length} of {jobs.length} complete
          </p>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {(selectedCrew ? crewJobs(selectedCrew.id) : jobs).map(job => {
            const crew = CREWS.find(c => c.id === job.crewId);
            const isSelected = job.id === selectedJobId;
            const elapsed = job.status === 'in_progress' ? getElapsedMinutes(job) : null;

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
                className={clsx(
                  'border-b border-[#30363d] px-4 py-3 cursor-pointer transition-all duration-200',
                  isSelected ? 'bg-[#21262d]' : 'hover:bg-[#1c2128]',
                  job.status === 'completed' && 'opacity-50'
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Status dot */}
                  <div className="mt-1 flex-shrink-0">
                    {job.status === 'completed'
                      ? <CheckCircle2 className="w-4 h-4 text-gray-500" />
                      : job.status === 'in_progress'
                        ? <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        : <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-white text-xs font-medium truncate">{job.title}</span>
                    </div>
                    <div className="text-gray-400 text-xs truncate">{job.customer}</div>
                    <div className="text-gray-500 text-[10px]">{job.scheduledTime} · {job.estimatedDuration}m</div>

                    {/* Progress bar */}
                    {job.status === 'in_progress' && elapsed !== null && (
                      <div className="mt-1.5">
                        <div className="h-1 bg-[#30363d] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${getProgressPct(job)}%`,
                              backgroundColor: crew?.color ?? '#22c55e'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Crew badge */}
                    {crew && !selectedCrew && (
                      <div className="mt-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: crew.color + '22', color: crew.color }}
                        >
                          {crew.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {job.priority === 'high' && job.status !== 'completed' && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                </div>

                {/* ETA send button */}
                {isSelected && job.status !== 'completed' && (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (crew) handleSendETA(job, crew);
                      }}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-lg transition-colors',
                        etaSent.has(job.id)
                          ? 'bg-green-900/20 text-green-400'
                          : 'bg-blue-900/20 hover:bg-blue-900/40 text-blue-400'
                      )}
                    >
                      <Send className="w-3 h-3" />
                      {etaSent.has(job.id) ? 'ETA Sent' : 'Send ETA'}
                    </button>
                    {job.status === 'in_progress' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleCompleteJob(job.id); }}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-lg bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom summary */}
        <div className="px-4 py-3 border-t border-[#30363d] bg-[#0d1117]">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500">Crews Active</div>
              <div className="text-white font-bold">{CREWS.filter(c => c.status !== 'idle').length} / {CREWS.length}</div>
            </div>
            <div>
              <div className="text-gray-500">Today's Revenue</div>
              <div className="text-green-400 font-bold">${todayRevenue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
