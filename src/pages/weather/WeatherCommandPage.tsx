import { useState, useMemo, useCallback } from 'react';
import {
  CloudRain, Sun, CloudSun, Cloud, CloudDrizzle, CloudLightning, Wind, Snowflake,
  Thermometer, Droplets, AlertTriangle, CheckCircle2, Clock, Calendar,
  DollarSign, Users, ChevronLeft, ChevronRight, ArrowRight,
  Shield, Zap, Eye, Send, RotateCcw, TrendingDown, TrendingUp,
  MapPin, Phone, RefreshCw, Star, Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isToday, isTomorrow, subDays } from 'date-fns';
import clsx from 'clsx';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeatherDay {
  date: Date;
  high: number;
  low: number;
  condition: WeatherCondition;
  precipitation_pct: number;
  wind_mph: number;
  humidity: number;
  uv_index: number;
  sunrise: string;
  sunset: string;
  hourly: HourlyForecast[];
}

interface HourlyForecast {
  hour: number;
  temp: number;
  condition: WeatherCondition;
  precipitation_pct: number;
  wind_mph: number;
}

type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'drizzle' | 'rain' | 'heavy_rain' | 'thunderstorm' | 'windy' | 'snow';

interface WeatherConflict {
  id: string;
  job_id: string;
  job_title: string;
  customer_name: string;
  customer_phone?: string;
  crew_name: string;
  crew_color?: string;
  scheduled_date: Date;
  scheduled_time?: string;
  revenue_at_risk: number;
  job_type: string;
  conflict_reason: string;
  severity: 'high' | 'medium' | 'low';
  suggested_date?: Date;
  suggested_reason?: string;
  status: 'unresolved' | 'rescheduled' | 'proceeding' | 'cancelled';
}

interface WeatherWindow {
  date: Date;
  time_range: string;
  quality: 'excellent' | 'good' | 'fair';
  best_for: string[];
  temp: number;
  wind: number;
}

type Tab = 'forecast' | 'conflicts' | 'windows' | 'impact';

// ─── Weather Data Generator ──────────────────────────────────────────────────

function generateWeatherData(startDate: Date): WeatherDay[] {
  // Realistic central Texas March weather patterns
  const patterns: { condition: WeatherCondition; highRange: [number, number]; lowRange: [number, number]; precip: number; wind: [number, number] }[] = [
    { condition: 'sunny', highRange: [78, 85], lowRange: [55, 62], precip: 0, wind: [5, 12] },
    { condition: 'partly_cloudy', highRange: [74, 82], lowRange: [52, 60], precip: 10, wind: [8, 15] },
    { condition: 'cloudy', highRange: [68, 76], lowRange: [50, 58], precip: 25, wind: [10, 18] },
    { condition: 'rain', highRange: [62, 72], lowRange: [48, 56], precip: 75, wind: [12, 22] },
    { condition: 'heavy_rain', highRange: [58, 68], lowRange: [46, 54], precip: 90, wind: [15, 28] },
    { condition: 'thunderstorm', highRange: [72, 82], lowRange: [58, 66], precip: 85, wind: [18, 35] },
    { condition: 'drizzle', highRange: [65, 74], lowRange: [50, 58], precip: 50, wind: [8, 14] },
    { condition: 'windy', highRange: [70, 80], lowRange: [52, 60], precip: 5, wind: [20, 35] },
  ];

  // Fixed pattern for 14 days to keep data stable across renders
  const dayPatternIndices = [0, 1, 3, 4, 6, 0, 1, 0, 2, 5, 0, 1, 0, 3];

  return Array.from({ length: 14 }, (_, i) => {
    const date = addDays(startDate, i);
    const pIdx = dayPatternIndices[i % dayPatternIndices.length];
    const p = patterns[pIdx];
    const seed = date.getDate() * 7 + i * 13; // Deterministic pseudo-random

    const high = p.highRange[0] + ((seed * 31) % (p.highRange[1] - p.highRange[0]));
    const low = p.lowRange[0] + ((seed * 17) % (p.lowRange[1] - p.lowRange[0]));
    const wind = p.wind[0] + ((seed * 23) % (p.wind[1] - p.wind[0]));

    const hourly: HourlyForecast[] = Array.from({ length: 12 }, (_, h) => {
      const hour = 6 + h; // 6 AM to 5 PM
      const hourSeed = seed + h * 7;
      const tempSpread = high - low;
      const hourTemp = low + Math.round(tempSpread * Math.sin((h / 12) * Math.PI) * 10) / 10;
      return {
        hour,
        temp: Math.round(hourTemp),
        condition: h >= 3 && h <= 8 && p.precip > 40 ? p.condition : (p.precip < 30 ? 'sunny' : 'partly_cloudy'),
        precipitation_pct: Math.max(0, p.precip + ((hourSeed * 11) % 20) - 10),
        wind_mph: Math.max(3, wind + ((hourSeed * 3) % 8) - 4),
      };
    });

    return {
      date,
      high: Math.round(high),
      low: Math.round(low),
      condition: p.condition,
      precipitation_pct: p.precip + ((seed * 7) % 10),
      wind_mph: Math.round(wind),
      humidity: 40 + ((seed * 11) % 35),
      uv_index: p.condition === 'sunny' ? 8 + ((seed * 3) % 3) : p.precip > 50 ? 2 + ((seed * 5) % 3) : 5 + ((seed * 7) % 3),
      sunrise: '6:45 AM',
      sunset: '7:32 PM',
      hourly,
    };
  });
}

// ─── Weather Helpers ─────────────────────────────────────────────────────────

const weatherIcons: Record<WeatherCondition, LucideIcon> = {
  sunny: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  heavy_rain: CloudRain,
  thunderstorm: CloudLightning,
  windy: Wind,
  snow: Snowflake,
};

const weatherLabels: Record<WeatherCondition, string> = {
  sunny: 'Sunny',
  partly_cloudy: 'Partly Cloudy',
  cloudy: 'Overcast',
  drizzle: 'Light Rain',
  rain: 'Rain',
  heavy_rain: 'Heavy Rain',
  thunderstorm: 'Thunderstorm',
  windy: 'Windy',
  snow: 'Snow',
};

const weatherColors: Record<WeatherCondition, string> = {
  sunny: 'text-amber-400',
  partly_cloudy: 'text-sky-300',
  cloudy: 'text-earth-400',
  drizzle: 'text-sky-400',
  rain: 'text-blue-400',
  heavy_rain: 'text-blue-500',
  thunderstorm: 'text-purple-400',
  windy: 'text-teal-400',
  snow: 'text-slate-300',
};

const weatherBgs: Record<WeatherCondition, string> = {
  sunny: 'from-amber-600/15 to-amber-800/5 border-amber-700/30',
  partly_cloudy: 'from-sky-600/15 to-sky-800/5 border-sky-700/30',
  cloudy: 'from-earth-600/15 to-earth-800/5 border-earth-600/30',
  drizzle: 'from-sky-600/15 to-blue-800/5 border-sky-700/30',
  rain: 'from-blue-600/15 to-blue-800/5 border-blue-700/30',
  heavy_rain: 'from-blue-700/20 to-blue-900/10 border-blue-600/30',
  thunderstorm: 'from-purple-600/15 to-purple-800/5 border-purple-700/30',
  windy: 'from-teal-600/15 to-teal-800/5 border-teal-700/30',
  snow: 'from-slate-500/15 to-slate-700/5 border-slate-600/30',
};

function isOutdoorUnsafe(day: WeatherDay): boolean {
  return ['rain', 'heavy_rain', 'thunderstorm', 'snow'].includes(day.condition) || day.wind_mph > 30;
}

function isOutdoorRisky(day: WeatherDay): boolean {
  return ['drizzle', 'windy'].includes(day.condition) || day.precipitation_pct > 40 || day.wind_mph > 20;
}

function getWorkabilityScore(day: WeatherDay): number {
  let score = 100;
  if (day.precipitation_pct > 60) score -= 40;
  else if (day.precipitation_pct > 30) score -= 20;
  if (day.wind_mph > 25) score -= 30;
  else if (day.wind_mph > 15) score -= 10;
  if (day.high > 100) score -= 15;
  if (day.high < 40) score -= 20;
  if (['thunderstorm', 'heavy_rain'].includes(day.condition)) score -= 30;
  if (['rain', 'snow'].includes(day.condition)) score -= 20;
  return Math.max(0, Math.min(100, score));
}

function getWorkabilityLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
  if (score >= 60) return { label: 'Good', color: 'text-sky-400' };
  if (score >= 40) return { label: 'Fair', color: 'text-amber-400' };
  if (score >= 20) return { label: 'Poor', color: 'text-orange-400' };
  return { label: 'Unsafe', color: 'text-red-400' };
}

function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE');
}

// ─── Job Type Weather Compatibility ──────────────────────────────────────────

const JOB_WEATHER_RULES: Record<string, { rainOk: boolean; windMax: number; tempMin: number; tempMax: number }> = {
  landscape_maintenance: { rainOk: false, windMax: 25, tempMin: 35, tempMax: 105 },
  landscape_design: { rainOk: false, windMax: 20, tempMin: 40, tempMax: 100 },
  construction: { rainOk: false, windMax: 25, tempMin: 32, tempMax: 105 },
  irrigation: { rainOk: true, windMax: 30, tempMin: 35, tempMax: 105 },
  tree_trimming: { rainOk: false, windMax: 15, tempMin: 35, tempMax: 105 },
  hardscape: { rainOk: false, windMax: 20, tempMin: 40, tempMax: 100 },
  outdoor_lighting: { rainOk: false, windMax: 20, tempMin: 35, tempMax: 100 },
  carpentry: { rainOk: false, windMax: 20, tempMin: 35, tempMax: 100 },
  masonry: { rainOk: false, windMax: 20, tempMin: 40, tempMax: 100 },
  earthwork: { rainOk: false, windMax: 25, tempMin: 35, tempMax: 105 },
  erosion_control: { rainOk: true, windMax: 25, tempMin: 35, tempMax: 105 },
  other: { rainOk: false, windMax: 25, tempMin: 35, tempMax: 105 },
};

function getConflictReason(day: WeatherDay, jobType: string): string | null {
  const rules = JOB_WEATHER_RULES[jobType] || JOB_WEATHER_RULES.other;

  if (['thunderstorm'].includes(day.condition)) return 'Thunderstorm warning — unsafe for all outdoor work';
  if (['heavy_rain'].includes(day.condition) && !rules.rainOk) return `Heavy rain expected (${day.precipitation_pct}% chance) — ${jobType.replace(/_/g, ' ')} cannot proceed`;
  if (['rain'].includes(day.condition) && !rules.rainOk) return `Rain forecasted (${day.precipitation_pct}% chance) — ground conditions will be too wet`;
  if (['drizzle'].includes(day.condition) && !rules.rainOk && day.precipitation_pct > 50) return `Persistent drizzle (${day.precipitation_pct}% chance) — may affect work quality`;
  if (day.wind_mph > rules.windMax) return `High winds (${day.wind_mph} mph) — exceeds ${rules.windMax} mph safety limit for ${jobType.replace(/_/g, ' ')}`;
  if (day.high > rules.tempMax) return `Extreme heat (${day.high}°F) — heat safety protocol required`;
  if (day.low < rules.tempMin) return `Below minimum temp (${day.low}°F) — ${jobType.replace(/_/g, ' ')} requires ${rules.tempMin}°F+`;

  return null;
}

function getConflictSeverity(day: WeatherDay): 'high' | 'medium' | 'low' {
  if (['thunderstorm', 'heavy_rain'].includes(day.condition) || day.wind_mph > 30) return 'high';
  if (['rain'].includes(day.condition) || day.wind_mph > 20 || day.precipitation_pct > 60) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function WeatherCommandPage() {
  const { jobs, crews, customers } = useData();
  const { addToast } = useToast();

  const [tab, setTab] = useState<Tab>('forecast');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);

  // Generate stable weather data
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weatherData = useMemo(() => generateWeatherData(today), [today]);

  const weekStart = useMemo(() => {
    const base = startOfWeek(today, { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [today, weekOffset]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const found = weatherData.find(w => isSameDay(w.date, date));
      // Ensure each day has its correct date to avoid duplicate keys
      return found ? found : { ...weatherData[0], date };
    }),
    [weekStart, weatherData]
  );

  // Get scheduled jobs for the 14-day forecast window
  const scheduledJobs = useMemo(() =>
    jobs.filter(j => ['scheduled', 'in_progress', 'pending'].includes(j.status)),
    [jobs]
  );

  // Generate conflicts
  const [conflictStatuses, setConflictStatuses] = useState<Record<string, WeatherConflict['status']>>({});

  const conflicts = useMemo(() => {
    const result: WeatherConflict[] = [];

    for (const job of scheduledJobs) {
      const jobDate = new Date(job.scheduled_date);
      const weather = weatherData.find(w => isSameDay(w.date, jobDate));
      if (!weather) continue;

      const jobType = job.type || job.job_type || 'other';
      const reason = getConflictReason(weather, jobType);
      if (!reason) continue;

      const crew = crews.find(c => c.id === job.crew_id);
      const customer = customers.find(c => c.id === job.customer_id);

      // Find best reschedule date (next clear day within 5 days)
      let suggestedDate: Date | undefined;
      let suggestedReason: string | undefined;
      for (let d = 1; d <= 5; d++) {
        const candidate = addDays(jobDate, d);
        const candidateWeather = weatherData.find(w => isSameDay(w.date, candidate));
        if (candidateWeather && getWorkabilityScore(candidateWeather) >= 70) {
          suggestedDate = candidate;
          suggestedReason = `${format(candidate, 'EEEE')} looks ${weatherLabels[candidateWeather.condition].toLowerCase()} with ${candidateWeather.high}°F and ${candidateWeather.wind_mph} mph winds`;
          break;
        }
      }

      const conflictId = `${job.id}-${format(jobDate, 'yyyy-MM-dd')}`;

      result.push({
        id: conflictId,
        job_id: job.id,
        job_title: job.title,
        customer_name: customer?.name || 'Unknown',
        customer_phone: customer?.phone,
        crew_name: crew?.name || 'Unassigned',
        crew_color: crew?.color,
        scheduled_date: jobDate,
        scheduled_time: job.scheduled_time,
        revenue_at_risk: job.total_price || 0,
        job_type: jobType,
        conflict_reason: reason,
        severity: getConflictSeverity(weather),
        suggested_date: suggestedDate,
        suggested_reason: suggestedReason,
        status: conflictStatuses[conflictId] || 'unresolved',
      });
    }

    return result.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (a.severity !== b.severity) return severityOrder[a.severity] - severityOrder[b.severity];
      return a.scheduled_date.getTime() - b.scheduled_date.getTime();
    });
  }, [scheduledJobs, weatherData, crews, customers, conflictStatuses]);

  // Weather windows
  const weatherWindows = useMemo((): WeatherWindow[] => {
    const windows: WeatherWindow[] = [];
    for (const day of weatherData.slice(0, 10)) {
      const score = getWorkabilityScore(day);
      if (score < 60) continue;

      const bestHours = day.hourly.filter(h => h.precipitation_pct < 20 && h.wind_mph < 20);
      if (bestHours.length < 4) continue;

      const startHour = bestHours[0].hour;
      const endHour = bestHours[bestHours.length - 1].hour;

      const bestFor: string[] = [];
      if (score >= 80 && day.wind_mph < 15) bestFor.push('Tree trimming', 'Landscape design');
      if (score >= 70) bestFor.push('Hardscape', 'Fencing', 'Outdoor lighting');
      if (score >= 60) bestFor.push('Lawn maintenance', 'Mulching', 'Cleanup');
      if (day.condition === 'sunny' && day.high > 60) bestFor.push('Sod installation');
      if (day.precipitation_pct < 10) bestFor.push('Concrete/masonry');

      windows.push({
        date: day.date,
        time_range: `${startHour > 12 ? startHour - 12 : startHour}${startHour >= 12 ? 'PM' : 'AM'} – ${endHour > 12 ? endHour - 12 : endHour}${endHour >= 12 ? 'PM' : 'AM'}`,
        quality: score >= 80 ? 'excellent' : score >= 70 ? 'good' : 'fair',
        best_for: bestFor.slice(0, 5),
        temp: day.high,
        wind: day.wind_mph,
      });
    }
    return windows;
  }, [weatherData]);

  // Analytics
  const analytics = useMemo(() => {
    const unresolvedConflicts = conflicts.filter(c => c.status === 'unresolved');
    const revenueAtRisk = unresolvedConflicts.reduce((s, c) => s + c.revenue_at_risk, 0);
    const crewsAffected = new Set(unresolvedConflicts.map(c => c.crew_name)).size;
    const rainyDays = weatherData.slice(0, 7).filter(d => isOutdoorUnsafe(d) || isOutdoorRisky(d)).length;
    const clearDays = 7 - rainyDays;
    const avgWorkability = weatherData.slice(0, 7).reduce((s, d) => s + getWorkabilityScore(d), 0) / 7;

    // Weekly revenue projection based on weather
    const totalScheduledRevenue = scheduledJobs
      .filter(j => {
        const d = new Date(j.scheduled_date);
        return d >= today && d <= addDays(today, 6);
      })
      .reduce((s, j) => s + (j.total_price || 0), 0);

    const projectedRevenue = totalScheduledRevenue * (avgWorkability / 100);

    return { unresolvedCount: unresolvedConflicts.length, revenueAtRisk, crewsAffected, rainyDays, clearDays, avgWorkability, totalScheduledRevenue, projectedRevenue };
  }, [conflicts, weatherData, scheduledJobs, today]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const resolveConflict = useCallback((conflictId: string, action: 'rescheduled' | 'proceeding' | 'cancelled') => {
    setConflictStatuses(prev => ({ ...prev, [conflictId]: action }));
    const labels = { rescheduled: 'rescheduled to suggested date', proceeding: 'marked as proceeding despite weather', cancelled: 'cancelled' };
    addToast('success', `Job ${labels[action]}`);
  }, [addToast]);

  const resolveAllSuggested = useCallback(() => {
    const updates: Record<string, WeatherConflict['status']> = {};
    for (const c of conflicts) {
      if (c.status === 'unresolved' && c.suggested_date) {
        updates[c.id] = 'rescheduled';
      }
    }
    setConflictStatuses(prev => ({ ...prev, ...updates }));
    const count = Object.keys(updates).length;
    addToast('success', `${count} job${count !== 1 ? 's' : ''} rescheduled to optimal weather windows`);
  }, [conflicts, addToast]);

  const sendWeatherAlert = useCallback((customerName: string) => {
    addToast('success', `Weather delay notification sent to ${customerName}`);
  }, [addToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const selectedWeather = selectedDay ? weatherData.find(w => isSameDay(w.date, selectedDay)) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-earth-50 flex items-center gap-2">
            <CloudSun className="w-6 h-6 text-sky-400" />
            Weather Command
          </h1>
          <p className="text-sm text-earth-400 mt-0.5">
            Austin, TX &middot; 14-day forecast &middot; {format(today, 'EEEE, MMMM d')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-earth-800/60 rounded-lg p-0.5 border border-earth-700/50">
            {([
              { key: 'forecast' as Tab, label: 'Forecast', icon: Sun },
              { key: 'conflicts' as Tab, label: `Conflicts${analytics.unresolvedCount > 0 ? ` (${analytics.unresolvedCount})` : ''}`, icon: AlertTriangle },
              { key: 'windows' as Tab, label: 'Windows', icon: CheckCircle2 },
              { key: 'impact' as Tab, label: 'Impact', icon: TrendingDown },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer',
                  tab === t.key
                    ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                    : 'text-earth-400 hover:text-earth-200'
                )}
              >
                <t.icon className="w-3.5 h-3.5 hidden sm:block" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Alert Banner */}
      {analytics.unresolvedCount > 0 && tab !== 'conflicts' && (
        <div className="bg-gradient-to-r from-amber-600/15 to-red-600/10 border border-amber-700/30 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-200">
                {analytics.unresolvedCount} weather conflict{analytics.unresolvedCount !== 1 ? 's' : ''} need attention
              </p>
              <p className="text-xs text-earth-400">
                ${analytics.revenueAtRisk.toLocaleString()} revenue at risk &middot; {analytics.crewsAffected} crew{analytics.crewsAffected !== 1 ? 's' : ''} affected
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('conflicts')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
          >
            Resolve Now <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ═══ FORECAST TAB ═══ */}
      {tab === 'forecast' && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Week Workability"
              value={`${analytics.avgWorkability.toFixed(0)}%`}
              icon={<Shield className="w-5 h-5" />}
              color={analytics.avgWorkability >= 70 ? 'green' : analytics.avgWorkability >= 50 ? 'amber' : 'red'}
            />
            <StatCard
              title="Clear Work Days"
              value={`${analytics.clearDays}/7`}
              icon={<Sun className="w-5 h-5" />}
              color={analytics.clearDays >= 5 ? 'green' : analytics.clearDays >= 3 ? 'amber' : 'red'}
            />
            <StatCard
              title="Revenue at Risk"
              value={analytics.revenueAtRisk > 0 ? `$${(analytics.revenueAtRisk / 1000).toFixed(1)}k` : '$0'}
              icon={<DollarSign className="w-5 h-5" />}
              color={analytics.revenueAtRisk > 5000 ? 'red' : analytics.revenueAtRisk > 0 ? 'amber' : 'green'}
            />
            <StatCard
              title="Projected Revenue"
              value={`$${(analytics.projectedRevenue / 1000).toFixed(1)}k`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="sky"
            />
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              disabled={weekOffset <= 0}
              className="p-2 text-earth-400 hover:text-earth-200 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold font-display text-earth-100">
                {format(weekStart, 'MMMM d')} – {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
              </h2>
              {weekOffset === 0 && <p className="text-xs text-green-400">This Week</p>}
              {weekOffset === 1 && <p className="text-xs text-earth-400">Next Week</p>}
            </div>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              disabled={weekOffset >= 1}
              className="p-2 text-earth-400 hover:text-earth-200 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 7-Day Forecast Strip */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const Icon = weatherIcons[day.condition];
              const score = getWorkabilityScore(day);
              const wb = getWorkabilityLabel(score);
              const isSelected = selectedDay && isSameDay(day.date, selectedDay);
              const dayJobs = scheduledJobs.filter(j => isSameDay(new Date(j.scheduled_date), day.date));
              const dayConflicts = conflicts.filter(c => isSameDay(c.scheduled_date, day.date) && c.status === 'unresolved');
              const isUnsafe = isOutdoorUnsafe(day);

              return (
                <button
                  key={day.date.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day.date)}
                  className={clsx(
                    'relative rounded-xl border p-3 text-center transition-all duration-200 cursor-pointer group',
                    'bg-gradient-to-b',
                    isSelected
                      ? 'border-green-500/40 bg-green-900/20 ring-1 ring-green-500/20 -translate-y-1 shadow-lg shadow-green-900/20'
                      : isUnsafe
                        ? 'border-red-800/30 bg-red-900/10 hover:border-red-700/40 hover:-translate-y-0.5'
                        : `${weatherBgs[day.condition]} hover:-translate-y-0.5 hover:shadow-md`,
                  )}
                >
                  {/* Day label */}
                  <p className={clsx(
                    'text-xs font-semibold mb-1',
                    isToday(day.date) ? 'text-green-400' : 'text-earth-400'
                  )}>
                    {formatDayLabel(day.date)}
                  </p>
                  <p className="text-[10px] text-earth-500 mb-2">{format(day.date, 'M/d')}</p>

                  {/* Weather icon */}
                  <div className="flex justify-center mb-2">
                    <Icon className={clsx('w-7 h-7 transition-transform group-hover:scale-110', weatherColors[day.condition])} />
                  </div>

                  {/* Temps */}
                  <p className="text-base font-bold text-earth-100">{day.high}°</p>
                  <p className="text-xs text-earth-500">{day.low}°</p>

                  {/* Precipitation */}
                  {day.precipitation_pct > 10 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-blue-400">{day.precipitation_pct}%</span>
                    </div>
                  )}

                  {/* Wind */}
                  {day.wind_mph > 15 && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <Wind className="w-3 h-3 text-teal-400" />
                      <span className="text-[10px] text-teal-400">{day.wind_mph}mph</span>
                    </div>
                  )}

                  {/* Workability bar */}
                  <div className="mt-2">
                    <div className="h-1 bg-earth-800 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <p className={clsx('text-[9px] font-medium mt-0.5', wb.color)}>{wb.label}</p>
                  </div>

                  {/* Job count + conflict badge */}
                  {dayJobs.length > 0 && (
                    <div className="mt-1.5 flex items-center justify-center gap-1">
                      <span className="text-[10px] text-earth-400">{dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}</span>
                      {dayConflicts.length > 0 && (
                        <span className="w-4 h-4 bg-red-600/30 text-red-400 text-[9px] font-bold rounded-full flex items-center justify-center">
                          {dayConflicts.length}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Day Detail */}
          {selectedWeather && (
            <Card>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Day summary */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    {(() => { const Icon = weatherIcons[selectedWeather.condition]; return <Icon className={clsx('w-10 h-10', weatherColors[selectedWeather.condition])} />; })()}
                    <div>
                      <h3 className="text-lg font-semibold text-earth-100">
                        {format(selectedWeather.date, 'EEEE, MMMM d')}
                      </h3>
                      <p className={clsx('text-sm', weatherColors[selectedWeather.condition])}>
                        {weatherLabels[selectedWeather.condition]}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-earth-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-earth-500 mb-1">
                        <Thermometer className="w-3 h-3" /> Temperature
                      </div>
                      <p className="text-sm font-semibold text-earth-100">{selectedWeather.high}° / {selectedWeather.low}°</p>
                    </div>
                    <div className="bg-earth-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-earth-500 mb-1">
                        <Droplets className="w-3 h-3" /> Precipitation
                      </div>
                      <p className="text-sm font-semibold text-earth-100">{selectedWeather.precipitation_pct}%</p>
                    </div>
                    <div className="bg-earth-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-earth-500 mb-1">
                        <Wind className="w-3 h-3" /> Wind
                      </div>
                      <p className="text-sm font-semibold text-earth-100">{selectedWeather.wind_mph} mph</p>
                    </div>
                    <div className="bg-earth-800/60 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-earth-500 mb-1">
                        <Sun className="w-3 h-3" /> UV Index
                      </div>
                      <p className="text-sm font-semibold text-earth-100">{selectedWeather.uv_index}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Hourly forecast */}
                <div className="lg:w-[380px]">
                  <h4 className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">Hourly Forecast</h4>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {selectedWeather.hourly.map(h => {
                      const HIcon = weatherIcons[h.condition];
                      return (
                        <div key={h.hour} className="flex flex-col items-center min-w-[40px] py-2 px-1 rounded-lg hover:bg-earth-800/40 transition-colors">
                          <span className="text-[10px] text-earth-500">{h.hour > 12 ? h.hour - 12 : h.hour}{h.hour >= 12 ? 'p' : 'a'}</span>
                          <HIcon className={clsx('w-4 h-4 my-1', weatherColors[h.condition])} />
                          <span className="text-xs font-medium text-earth-200">{h.temp}°</span>
                          {h.precipitation_pct > 20 && (
                            <span className="text-[9px] text-blue-400">{h.precipitation_pct}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Scheduled jobs for this day */}
              {(() => {
                const dayJobs = scheduledJobs.filter(j => selectedDay && isSameDay(new Date(j.scheduled_date), selectedDay));
                if (dayJobs.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-earth-800">
                    <h4 className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-2">
                      Scheduled Jobs ({dayJobs.length})
                    </h4>
                    <div className="space-y-2">
                      {dayJobs.map(job => {
                        const crew = crews.find(c => c.id === job.crew_id);
                        const conflict = conflicts.find(c => c.job_id === job.id && selectedDay && isSameDay(c.scheduled_date, selectedDay));
                        return (
                          <div key={job.id} className={clsx(
                            'flex items-center justify-between px-3 py-2 rounded-lg',
                            conflict && conflict.status === 'unresolved' ? 'bg-red-900/15 border border-red-800/30' : 'bg-earth-800/40'
                          )}>
                            <div className="flex items-center gap-2">
                              {crew && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: crew.color }} />}
                              <div>
                                <p className="text-sm text-earth-200">{job.title}</p>
                                <p className="text-xs text-earth-500">{crew?.name || 'Unassigned'} &middot; {job.estimated_hours || 0}h</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {job.total_price && <span className="text-xs text-earth-400">${job.total_price.toLocaleString()}</span>}
                              {conflict && conflict.status === 'unresolved' && (
                                <span className="text-[10px] font-medium text-red-400 bg-red-600/20 px-1.5 py-0.5 rounded">At Risk</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Jobs This Week Quick View (if no day selected) */}
          {!selectedDay && (
            <Card>
              <h3 className="text-sm font-semibold text-earth-100 mb-3">This Week at a Glance</h3>
              <div className="space-y-2">
                {weekDays.map(day => {
                  const dayJobs = scheduledJobs.filter(j => isSameDay(new Date(j.scheduled_date), day.date));
                  const dayConflicts = conflicts.filter(c => isSameDay(c.scheduled_date, day.date) && c.status === 'unresolved');
                  const dayRevenue = dayJobs.reduce((s, j) => s + (j.total_price || 0), 0);
                  const Icon = weatherIcons[day.condition];
                  const score = getWorkabilityScore(day);

                  return (
                    <div
                      key={day.date.toISOString()}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        isToday(day.date) ? 'bg-green-900/15 border border-green-800/30' : 'bg-earth-800/30 hover:bg-earth-800/50'
                      )}
                    >
                      <div className="w-12 text-center shrink-0">
                        <p className={clsx('text-xs font-semibold', isToday(day.date) ? 'text-green-400' : 'text-earth-300')}>
                          {formatDayLabel(day.date)}
                        </p>
                        <p className="text-[10px] text-earth-500">{format(day.date, 'M/d')}</p>
                      </div>
                      <Icon className={clsx('w-5 h-5 shrink-0', weatherColors[day.condition])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-earth-200">{day.high}°/{day.low}°</span>
                          <span className={clsx('text-[10px] font-medium', getWorkabilityLabel(score).color)}>
                            {getWorkabilityLabel(score).label}
                          </span>
                        </div>
                        <div className="h-1 bg-earth-800 rounded-full overflow-hidden mt-1 w-20">
                          <div
                            className={clsx('h-full rounded-full', score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-earth-300">{dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}</p>
                        {dayRevenue > 0 && <p className="text-[10px] text-earth-500">${dayRevenue.toLocaleString()}</p>}
                      </div>
                      {dayConflicts.length > 0 && (
                        <div className="w-5 h-5 bg-red-600/20 text-red-400 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                          {dayConflicts.length}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ═══ CONFLICTS TAB ═══ */}
      {tab === 'conflicts' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Unresolved" value={analytics.unresolvedCount} icon={<AlertTriangle className="w-5 h-5" />} color={analytics.unresolvedCount > 0 ? 'red' : 'green'} />
            <StatCard title="Revenue at Risk" value={`$${(analytics.revenueAtRisk / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5" />} color={analytics.revenueAtRisk > 0 ? 'amber' : 'green'} />
            <StatCard title="Crews Affected" value={analytics.crewsAffected} icon={<Users className="w-5 h-5" />} color="earth" />
            <StatCard title="Resolved" value={conflicts.filter(c => c.status !== 'unresolved').length} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
          </div>

          {/* Bulk action */}
          {analytics.unresolvedCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-earth-900/60 border border-earth-800 rounded-xl px-5 py-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-earth-200">
                  {conflicts.filter(c => c.status === 'unresolved' && c.suggested_date).length} conflicts have smart reschedule suggestions
                </span>
              </div>
              <button
                onClick={resolveAllSuggested}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                Auto-Reschedule All
              </button>
            </div>
          )}

          {/* Conflict list */}
          {conflicts.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-earth-100 mb-1">All Clear!</h3>
                <p className="text-sm text-earth-400">No weather conflicts detected for your scheduled jobs.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {conflicts.map(conflict => {
                const isExpanded = expandedConflict === conflict.id;
                const severityConfig = {
                  high: { bg: 'bg-red-600/10 border-red-800/30', badge: 'bg-red-600/20 text-red-400', label: 'High Risk' },
                  medium: { bg: 'bg-amber-600/10 border-amber-800/30', badge: 'bg-amber-600/20 text-amber-400', label: 'Medium Risk' },
                  low: { bg: 'bg-sky-600/10 border-sky-800/30', badge: 'bg-sky-600/20 text-sky-400', label: 'Low Risk' },
                }[conflict.severity];

                const statusConfig = {
                  unresolved: null,
                  rescheduled: { bg: 'bg-green-600/20', color: 'text-green-400', label: 'Rescheduled' },
                  proceeding: { bg: 'bg-sky-600/20', color: 'text-sky-400', label: 'Proceeding' },
                  cancelled: { bg: 'bg-earth-600/20', color: 'text-earth-400', label: 'Cancelled' },
                }[conflict.status];

                return (
                  <div
                    key={conflict.id}
                    className={clsx(
                      'border rounded-xl transition-all duration-200',
                      conflict.status === 'unresolved' ? severityConfig.bg : 'bg-earth-900/40 border-earth-800 opacity-75'
                    )}
                  >
                    {/* Conflict header */}
                    <button
                      onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                      className="w-full px-5 py-4 flex items-start gap-4 text-left cursor-pointer"
                    >
                      <div className="shrink-0 mt-0.5">
                        {conflict.status === 'unresolved' ? (
                          <AlertTriangle className={clsx('w-5 h-5', conflict.severity === 'high' ? 'text-red-400' : conflict.severity === 'medium' ? 'text-amber-400' : 'text-sky-400')} />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-earth-100">{conflict.job_title}</h4>
                          <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', severityConfig.badge)}>
                            {severityConfig.label}
                          </span>
                          {statusConfig && (
                            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                              {statusConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-earth-400 mt-0.5">{conflict.conflict_reason}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-earth-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(conflict.scheduled_date, 'EEE, MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            {conflict.crew_color && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: conflict.crew_color }} />}
                            {conflict.crew_name}
                          </span>
                          <span>{conflict.customer_name}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-earth-200">
                          ${conflict.revenue_at_risk.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-earth-500">at risk</p>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-3 border-t border-earth-800/50 pt-3">
                        {/* Suggested reschedule */}
                        {conflict.suggested_date && conflict.status === 'unresolved' && (
                          <div className="bg-green-900/15 border border-green-800/30 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-green-300">
                                  Suggested: Move to {format(conflict.suggested_date, 'EEEE, MMMM d')}
                                </p>
                                <p className="text-xs text-earth-400 mt-0.5">{conflict.suggested_reason}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {conflict.status === 'unresolved' && (
                          <div className="flex flex-wrap gap-2">
                            {conflict.suggested_date && (
                              <button
                                onClick={() => resolveConflict(conflict.id, 'rescheduled')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reschedule to {format(conflict.suggested_date, 'EEE M/d')}
                              </button>
                            )}
                            <button
                              onClick={() => resolveConflict(conflict.id, 'proceeding')}
                              className="flex items-center gap-1.5 px-3 py-2 bg-earth-700 hover:bg-earth-600 text-earth-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Proceed Anyway
                            </button>
                            <button
                              onClick={() => resolveConflict(conflict.id, 'cancelled')}
                              className="flex items-center gap-1.5 px-3 py-2 bg-earth-800 hover:bg-earth-700 text-earth-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              Cancel Job
                            </button>
                            <button
                              onClick={() => sendWeatherAlert(conflict.customer_name)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Notify Customer
                            </button>
                            {conflict.customer_phone && (
                              <button
                                onClick={() => addToast('info', `Calling ${conflict.customer_name}...`)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-earth-800 hover:bg-earth-700 text-earth-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Call
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ WINDOWS TAB ═══ */}
      {tab === 'windows' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Excellent Windows" value={weatherWindows.filter(w => w.quality === 'excellent').length} icon={<Star className="w-5 h-5" />} color="green" />
            <StatCard title="Good Windows" value={weatherWindows.filter(w => w.quality === 'good').length} icon={<CheckCircle2 className="w-5 h-5" />} color="sky" />
            <StatCard title="Best Day This Week" value={(() => { const best = weatherData.slice(0, 7).reduce((b, d) => getWorkabilityScore(d) > getWorkabilityScore(b) ? d : b); return format(best.date, 'EEE'); })()} icon={<Sun className="w-5 h-5" />} color="amber" />
            <StatCard title="Next 10 Days" value={`${weatherWindows.length} windows`} icon={<Calendar className="w-5 h-5" />} color="earth" />
          </div>

          <div className="space-y-3">
            {weatherWindows.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <CloudRain className="w-12 h-12 text-earth-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-earth-100 mb-1">No Good Windows Found</h3>
                  <p className="text-sm text-earth-400">Weather conditions are poor for the next 10 days. Consider indoor tasks or equipment maintenance.</p>
                </div>
              </Card>
            ) : (
              weatherWindows.map((win, idx) => {
                const qualityConfig = {
                  excellent: { bg: 'bg-green-600/10 border-green-700/30', badge: 'bg-green-600/20 text-green-400', icon: Star },
                  good: { bg: 'bg-sky-600/10 border-sky-700/30', badge: 'bg-sky-600/20 text-sky-400', icon: CheckCircle2 },
                  fair: { bg: 'bg-amber-600/10 border-amber-700/30', badge: 'bg-amber-600/20 text-amber-400', icon: Eye },
                }[win.quality];
                const QIcon = qualityConfig.icon;
                const dayWeather = weatherData.find(w => isSameDay(w.date, win.date));
                const WIcon = dayWeather ? weatherIcons[dayWeather.condition] : Sun;

                return (
                  <div key={idx} className={clsx('border rounded-xl px-5 py-4', qualityConfig.bg)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <WIcon className={clsx('w-6 h-6', dayWeather ? weatherColors[dayWeather.condition] : 'text-amber-400')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-earth-100">
                              {format(win.date, 'EEEE, MMM d')}
                            </h4>
                            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1', qualityConfig.badge)}>
                              <QIcon className="w-3 h-3" />
                              {win.quality.charAt(0).toUpperCase() + win.quality.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-earth-400">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {win.time_range}</span>
                            <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {win.temp}°F</span>
                            <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {win.wind} mph</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Best for tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {win.best_for.map(task => (
                        <span key={task} className="text-[10px] font-medium px-2 py-0.5 bg-earth-800/60 text-earth-300 rounded-full">
                          {task}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ═══ IMPACT TAB ═══ */}
      {tab === 'impact' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Rainy Days (7d)" value={analytics.rainyDays} icon={<CloudRain className="w-5 h-5" />} color={analytics.rainyDays >= 3 ? 'red' : 'amber'} />
            <StatCard title="Scheduled Revenue" value={`$${(analytics.totalScheduledRevenue / 1000).toFixed(1)}k`} icon={<DollarSign className="w-5 h-5" />} color="earth" />
            <StatCard title="Weather-Adjusted" value={`$${(analytics.projectedRevenue / 1000).toFixed(1)}k`} icon={<TrendingDown className="w-5 h-5" />} color="amber" />
            <StatCard title="Potential Loss" value={`$${((analytics.totalScheduledRevenue - analytics.projectedRevenue) / 1000).toFixed(1)}k`} icon={<AlertTriangle className="w-5 h-5" />} color="red" />
          </div>

          {/* Revenue impact by day */}
          <Card>
            <h3 className="text-sm font-semibold text-earth-100 mb-4">Weekly Revenue Impact</h3>
            <div className="space-y-3">
              {weekDays.map(day => {
                const dayJobs = scheduledJobs.filter(j => isSameDay(new Date(j.scheduled_date), day.date));
                const scheduledRev = dayJobs.reduce((s, j) => s + (j.total_price || 0), 0);
                const score = getWorkabilityScore(day);
                const projectedRev = scheduledRev * (score / 100);
                const lost = scheduledRev - projectedRev;
                const Icon = weatherIcons[day.condition];
                const maxRev = Math.max(...weekDays.map(d => scheduledJobs.filter(j => isSameDay(new Date(j.scheduled_date), d.date)).reduce((s, j) => s + (j.total_price || 0), 0)), 1);

                return (
                  <div key={day.date.toISOString()}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs font-medium w-12', isToday(day.date) ? 'text-green-400' : 'text-earth-300')}>
                          {formatDayLabel(day.date)}
                        </span>
                        <Icon className={clsx('w-4 h-4', weatherColors[day.condition])} />
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-earth-400">${scheduledRev.toLocaleString()}</span>
                        {lost > 0 && (
                          <span className="text-red-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            -${lost.toLocaleString()}
                          </span>
                        )}
                        <span className={clsx('font-medium', score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400')}>
                          ${projectedRev.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-earth-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-green-600/70 rounded-l-full transition-all"
                        style={{ width: `${(projectedRev / maxRev) * 100}%` }}
                      />
                      {lost > 0 && (
                        <div
                          className="bg-red-600/40"
                          style={{ width: `${(lost / maxRev) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-earth-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-600 rounded-full" /> Projected</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-600/40 rounded-full" /> Weather loss</span>
            </div>
          </Card>

          {/* Workability trend */}
          <Card>
            <h3 className="text-sm font-semibold text-earth-100 mb-4">14-Day Workability Trend</h3>
            <div className="flex items-end gap-1 h-32">
              {weatherData.map((day, idx) => {
                const score = getWorkabilityScore(day);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative" style={{ height: '100px' }}>
                      <div
                        className={clsx(
                          'absolute bottom-0 w-full rounded-t transition-all',
                          score >= 70 ? 'bg-green-600/60' : score >= 40 ? 'bg-amber-600/60' : 'bg-red-600/60'
                        )}
                        style={{ height: `${score}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-earth-500 rotate-0">
                      {format(day.date, 'M/d')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-earth-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-600 rounded-full" /> Good (70%+)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-600 rounded-full" /> Fair (40-70%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-600 rounded-full" /> Poor (&lt;40%)</span>
              </div>
            </div>
          </Card>

          {/* Smart Recommendations */}
          <Card>
            <h3 className="text-sm font-semibold text-earth-100 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Weather-Smart Recommendations
            </h3>
            <div className="space-y-2">
              {analytics.rainyDays >= 3 && (
                <div className="flex items-start gap-2 text-xs bg-amber-600/10 border border-amber-700/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-200 font-medium">Heavy weather week ahead</p>
                    <p className="text-earth-400 mt-0.5">
                      {analytics.rainyDays} days of poor conditions this week. Consider scheduling indoor tasks
                      (equipment maintenance, shop organization, training) for weather days.
                    </p>
                  </div>
                </div>
              )}
              {analytics.clearDays >= 5 && (
                <div className="flex items-start gap-2 text-xs bg-green-600/10 border border-green-700/20 rounded-lg p-3">
                  <Sun className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-200 font-medium">Great week for outdoor work</p>
                    <p className="text-earth-400 mt-0.5">
                      {analytics.clearDays} clear days this week. This is a great time to schedule
                      weather-sensitive jobs like concrete, painting, and sod installation.
                    </p>
                  </div>
                </div>
              )}
              {weatherWindows.some(w => w.quality === 'excellent') && (
                <div className="flex items-start gap-2 text-xs bg-sky-600/10 border border-sky-700/20 rounded-lg p-3">
                  <Star className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sky-200 font-medium">Premium weather windows available</p>
                    <p className="text-earth-400 mt-0.5">
                      {weatherWindows.filter(w => w.quality === 'excellent').length} excellent weather windows
                      detected. Ideal for high-value jobs like landscape installs and hardscaping.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 text-xs bg-earth-800/40 border border-earth-700/20 rounded-lg p-3">
                <MapPin className="w-4 h-4 text-earth-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-earth-200 font-medium">Route optimization tip</p>
                  <p className="text-earth-400 mt-0.5">
                    On weather-shortened days, group jobs by geography to minimize drive time
                    and maximize billable hours in the available window.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
