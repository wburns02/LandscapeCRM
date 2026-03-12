import { useState, useMemo } from 'react';
import {
  Star, Send, MessageSquare, TrendingUp, CheckCircle, Clock,
  Users, ThumbsUp, Award, ExternalLink, Search, Filter,
  ChevronDown, Mail, Repeat, Settings, BarChart3, Smile,
  AlertCircle, Check, X, Bell, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { format, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';

// ---------- Demo data ----------
type SurveyStatus = 'responded' | 'sent' | 'not_sent';

type SurveyRecord = {
  id: string;
  job_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  job_type: string;
  crew_name: string;
  completed_date: string;
  survey_status: SurveyStatus;
  rating: number | null;
  comment: string | null;
  survey_sent_at: string | null;
  responded_at: string | null;
};

const TODAY = new Date('2026-03-12');

const SURVEYS: SurveyRecord[] = [
  {
    id: 's1', job_title: 'Weekly Lawn Maintenance', customer_name: 'Sarah Mitchell',
    customer_email: 'sarah@example.com', customer_phone: '(512) 555-0101',
    job_type: 'Mowing', crew_name: 'Alpha Crew', completed_date: '2026-03-11',
    survey_status: 'responded', rating: 5, comment: 'Carlos and the team were fantastic! Showed up on time, did a perfect job, and left the yard spotless. Highly recommend!',
    survey_sent_at: '2026-03-11T16:00:00Z', responded_at: '2026-03-11T18:30:00Z',
  },
  {
    id: 's2', job_title: 'HOA Common Area Mowing', customer_name: 'Lakewood HOA',
    customer_email: 'board@lakewood.org', customer_phone: '(512) 555-0303',
    job_type: 'Mowing', crew_name: 'Alpha Crew', completed_date: '2026-03-10',
    survey_status: 'responded', rating: 5, comment: 'Our residents have been very pleased with the quality of work. The grounds look beautiful.',
    survey_sent_at: '2026-03-10T17:00:00Z', responded_at: '2026-03-11T09:15:00Z',
  },
  {
    id: 's3', job_title: 'Patio Pavers Installation', customer_name: 'David Chen',
    customer_email: 'david@example.com', customer_phone: '(512) 555-0404',
    job_type: 'Hardscape', crew_name: 'Bravo Crew', completed_date: '2026-03-09',
    survey_status: 'responded', rating: 4, comment: 'Great work overall. The patio looks amazing. Only small note — took a day longer than quoted but the quality made up for it.',
    survey_sent_at: '2026-03-09T16:00:00Z', responded_at: '2026-03-10T11:00:00Z',
  },
  {
    id: 's4', job_title: 'Spring Mulch Installation', customer_name: 'Riverside Office Park',
    customer_email: 'manager@riverside.com', customer_phone: '(512) 555-0202',
    job_type: 'Landscaping', crew_name: 'Bravo Crew', completed_date: '2026-03-07',
    survey_status: 'responded', rating: 3, comment: 'Decent job but we noticed some areas that weren\'t fully covered. Had to request a touchup. Communication could be better.',
    survey_sent_at: '2026-03-07T17:00:00Z', responded_at: '2026-03-08T14:00:00Z',
  },
  {
    id: 's5', job_title: 'New Flower Bed Design & Install', customer_name: 'Jennifer Wallace',
    customer_email: 'jen@example.com', customer_phone: '(512) 555-2001',
    job_type: 'Planting', crew_name: 'Charlie Crew', completed_date: '2026-03-06',
    survey_status: 'responded', rating: 5, comment: 'Absolutely love the new flower beds! Sam really understood our vision and the execution was perfect. Will definitely book again.',
    survey_sent_at: '2026-03-06T18:00:00Z', responded_at: '2026-03-07T08:45:00Z',
  },
  {
    id: 's6', job_title: 'Park Tree Trimming', customer_name: 'City of Pflugerville',
    customer_email: 'parks@pflugerville.gov', customer_phone: '(512) 555-0505',
    job_type: 'Tree Service', crew_name: 'Charlie Crew', completed_date: '2026-03-03',
    survey_status: 'responded', rating: 4, comment: 'Professional crew, clean worksite. A few stumps were slightly higher than spec but overall very satisfied.',
    survey_sent_at: '2026-03-03T16:00:00Z', responded_at: '2026-03-04T10:30:00Z',
  },
  {
    id: 's7', job_title: 'Irrigation System Repair', customer_name: 'Sarah Mitchell',
    customer_email: 'sarah@example.com', customer_phone: '(512) 555-0101',
    job_type: 'Irrigation', crew_name: 'Alpha Crew', completed_date: '2026-03-01',
    survey_status: 'responded', rating: 5, comment: 'Fixed our irrigation issue in half the time we expected. Carlos explained everything clearly. No leaks at all!',
    survey_sent_at: '2026-03-01T17:00:00Z', responded_at: '2026-03-02T09:00:00Z',
  },
  {
    id: 's8', job_title: 'Parking Lot Cleanup', customer_name: 'Riverside Office Park',
    customer_email: 'manager@riverside.com', customer_phone: '(512) 555-0202',
    job_type: 'Cleanup', crew_name: 'Alpha Crew', completed_date: '2026-02-28',
    survey_status: 'responded', rating: 2, comment: 'Some debris was left near the service entrance. Had to call them back. Disappointing for a premium service.',
    survey_sent_at: '2026-02-28T16:00:00Z', responded_at: '2026-03-01T11:00:00Z',
  },
  {
    id: 's9', job_title: 'Weekly Lawn Maintenance', customer_name: 'Sarah Mitchell',
    customer_email: 'sarah@example.com', customer_phone: '(512) 555-0101',
    job_type: 'Mowing', crew_name: 'Alpha Crew', completed_date: '2026-03-05',
    survey_status: 'sent', rating: null, comment: null,
    survey_sent_at: '2026-03-05T16:00:00Z', responded_at: null,
  },
  {
    id: 's10', job_title: 'HOA Common Area Mowing', customer_name: 'Lakewood HOA',
    customer_email: 'board@lakewood.org', customer_phone: '(512) 555-0303',
    job_type: 'Mowing', crew_name: 'Alpha Crew', completed_date: '2026-03-04',
    survey_status: 'sent', rating: null, comment: null,
    survey_sent_at: '2026-03-04T17:00:00Z', responded_at: null,
  },
  {
    id: 's11', job_title: 'Retaining Wall Repair', customer_name: 'Tom Bradley',
    customer_email: 'tom@example.com', customer_phone: '(512) 555-2003',
    job_type: 'Hardscape', crew_name: 'Bravo Crew', completed_date: '2026-03-08',
    survey_status: 'not_sent', rating: null, comment: null,
    survey_sent_at: null, responded_at: null,
  },
  {
    id: 's12', job_title: 'Spring Cleanup & Prep', customer_name: 'Oakmont Business Center',
    customer_email: 'facilities@oakmont.com', customer_phone: '(512) 555-2002',
    job_type: 'Cleanup', crew_name: 'Charlie Crew', completed_date: '2026-03-07',
    survey_status: 'not_sent', rating: null, comment: null,
    survey_sent_at: null, responded_at: null,
  },
];

// Trend data — avg rating per day for last 14 days
const TREND_DATA = Array.from({ length: 14 }, (_, i) => {
  const d = subDays(TODAY, 13 - i);
  const seed = d.getDate() + d.getMonth();
  const rating = 3.8 + Math.sin(seed * 1.7) * 0.6 + (i / 14) * 0.4;
  return {
    date: format(d, 'MMM d'),
    rating: Math.round(rating * 10) / 10,
    responses: Math.floor(2 + Math.abs(Math.sin(seed * 2.1)) * 3),
  };
});

const CREW_SCORES = [
  { name: 'Alpha Crew', avg: 4.5, count: 12, color: '#22c55e' },
  { name: 'Bravo Crew', avg: 3.8, count: 8, color: '#3b82f6' },
  { name: 'Charlie Crew', avg: 4.7, count: 6, color: '#f59e0b' },
];

const TYPE_SCORES = [
  { type: 'Irrigation', avg: 4.9 },
  { type: 'Planting', avg: 4.8 },
  { type: 'Mowing', avg: 4.5 },
  { type: 'Tree Service', avg: 4.4 },
  { type: 'Hardscape', avg: 4.2 },
  { type: 'Cleanup', avg: 3.5 },
];

const DEFAULT_SURVEY_MSG = `Hi {{customer_name}},

Thank you for choosing Maas Verde Landscape! We recently completed "{{job_title}}" for you.

We'd love to hear how we did. It only takes 30 seconds:

👉 [Rate Your Experience]

Your feedback helps us improve and serve you better.

Thank you!
Maas Verde Landscape Team`;

const DEFAULT_REVIEW_MSG = `Hi {{customer_name}},

We're so glad you enjoyed your recent service! Would you mind leaving us a quick Google review? It helps small businesses like ours grow.

👉 {{google_review_link}}

It only takes a minute and means the world to us. Thank you!

— The Maas Verde Team`;

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={clsx(sz, s <= rating ? 'text-amber-400 fill-amber-400' : 'text-earth-700')}
        />
      ))}
    </div>
  );
}

function RatingBar({ value, max = 5, color = '#22c55e' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="w-full bg-earth-800/60 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function CustomerSatisfaction() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'surveys' | 'reviews' | 'settings'>('overview');
  const [surveys, setSurveys] = useState<SurveyRecord[]>(SURVEYS);
  const [sentSurveys, setSentSurveys] = useState<Set<string>>(new Set());
  const [sentReviews, setSentReviews] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | SurveyStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [sendDelay, setSendDelay] = useState('2');
  const [reviewThreshold, setReviewThreshold] = useState('4');
  const [surveyMsg, setSurveyMsg] = useState(DEFAULT_SURVEY_MSG);
  const [reviewMsg, setReviewMsg] = useState(DEFAULT_REVIEW_MSG);
  const [googleLink, setGoogleLink] = useState('https://g.page/r/your-business/review');
  const [editingSurvey, setEditingSurvey] = useState(false);
  const [editingReview, setEditingReview] = useState(false);

  const responded = surveys.filter(s => s.survey_status === 'responded');
  const avgRating = responded.length
    ? Math.round((responded.reduce((a, s) => a + (s.rating || 0), 0) / responded.length) * 10) / 10
    : 0;
  const responseRate = surveys.filter(s => s.survey_status !== 'not_sent').length
    ? Math.round((responded.length / surveys.filter(s => s.survey_status !== 'not_sent').length) * 100)
    : 0;
  const fiveStars = responded.filter(s => s.rating === 5).length;
  const notSent = surveys.filter(s => s.survey_status === 'not_sent');
  const readyForReview = responded.filter(s => s.rating !== null && s.rating >= parseInt(reviewThreshold));

  const filteredSurveys = useMemo(() => {
    let list = surveys;
    if (filterStatus !== 'all') list = list.filter(s => s.survey_status === filterStatus);
    if (searchQuery) list = list.filter(s =>
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.job_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return list.sort((a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime());
  }, [surveys, filterStatus, searchQuery]);

  const sendSurvey = (survey: SurveyRecord) => {
    setSentSurveys(prev => new Set([...prev, survey.id]));
    setSurveys(prev => prev.map(s => s.id === survey.id
      ? { ...s, survey_status: 'sent', survey_sent_at: new Date().toISOString() }
      : s
    ));
    addToast('success', `Survey sent to ${survey.customer_name}`);
  };

  const sendAllSurveys = () => {
    const targets = notSent;
    targets.forEach(s => sendSurvey(s));
    addToast('success', `Sent ${targets.length} survey${targets.length > 1 ? 's' : ''} to customers`);
  };

  const sendReviewRequest = (survey: SurveyRecord) => {
    setSentReviews(prev => new Set([...prev, survey.id]));
    addToast('success', `Google review request sent to ${survey.customer_name}!`);
  };

  const ratingColor = (r: number) =>
    r >= 4.5 ? 'text-green-400' : r >= 3.5 ? 'text-amber-400' : 'text-red-400';

  const statusConfig = {
    responded: { label: 'Responded', color: 'green' as const },
    sent: { label: 'Awaiting', color: 'amber' as const },
    not_sent: { label: 'Not Sent', color: 'earth' as const },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-earth-50 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            Customer Satisfaction
          </h1>
          <p className="text-sm text-earth-400 mt-0.5">
            Turn happy customers into 5-star Google reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notSent.length > 0 && (
            <Button
              icon={<Send className="w-4 h-4" />}
              onClick={sendAllSurveys}
            >
              Send {notSent.length} Survey{notSent.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Rating"
          value={`${avgRating} / 5`}
          icon={<Star className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Response Rate"
          value={`${responseRate}%`}
          icon={<MessageSquare className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="5-Star Reviews"
          value={fiveStars}
          icon={<Award className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Pending Surveys"
          value={notSent.length}
          icon={<Bell className="w-5 h-5" />}
          color={notSent.length > 0 ? 'amber' : 'earth'}
        />
      </div>

      {/* Auto-send banner */}
      <div className={clsx(
        'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
        autoSend ? 'bg-green-600/10 border-green-600/20' : 'bg-earth-900/60 border-earth-800'
      )}>
        <div className="flex items-center gap-3">
          <RefreshCw className={clsx('w-5 h-5', autoSend ? 'text-green-400' : 'text-earth-400')} />
          <div>
            <p className="text-sm font-medium text-earth-100">Auto-Send Surveys</p>
            <p className="text-xs text-earth-400">
              {autoSend
                ? `Surveys auto-sent ${sendDelay}h after job completion`
                : `Enable to automatically send satisfaction surveys after job completion`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setAutoSend(v => !v);
            addToast('success', autoSend ? 'Auto-send disabled' : `Auto-send enabled — surveys send ${sendDelay}h after completion`);
          }}
          className={clsx(
            'relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0',
            autoSend ? 'bg-green-600' : 'bg-earth-700'
          )}
        >
          <span className={clsx(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
            autoSend ? 'left-7' : 'left-1'
          )} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {([
          { key: 'overview', label: 'Overview', icon: BarChart3, count: null },
          { key: 'surveys', label: 'Survey Queue', icon: MessageSquare, count: surveys.length },
          { key: 'reviews', label: 'Review Requests', icon: ThumbsUp, count: readyForReview.length },
          { key: 'settings', label: 'Settings', icon: Settings, count: null },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
              activeTab === t.key
                ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                : 'text-earth-400 hover:text-earth-200'
            )}
          >
            <t.icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">{t.label}</span>
            {t.count !== null && t.count > 0 && (
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded-full shrink-0',
                activeTab === t.key ? 'bg-green-600/30 text-green-300' : 'bg-earth-700 text-earth-400'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ======= OVERVIEW TAB ======= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Rating gauge + trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Big rating display */}
            <Card>
              <div className="text-center py-4">
                <div className="text-6xl font-bold font-display text-amber-400 mb-2">
                  {avgRating}
                </div>
                <StarRating rating={Math.round(avgRating)} size="lg" />
                <p className="text-sm text-earth-400 mt-3">
                  Based on {responded.length} reviews
                </p>
                <div className="mt-4 space-y-2">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = responded.filter(s => s.rating === stars).length;
                    const pct = responded.length ? count / responded.length : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs">
                        <span className="text-earth-400 w-4 text-right">{stars}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                        <div className="flex-1">
                          <RatingBar value={pct} max={1} color={stars >= 4 ? '#22c55e' : stars === 3 ? '#f59e0b' : '#ef4444'} />
                        </div>
                        <span className="text-earth-400 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Trend chart */}
            <div className="lg:col-span-2">
              <Card header={
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-semibold text-earth-200">Rating Trend — Last 14 Days</h3>
                </div>
              }>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={TREND_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis domain={[2.5, 5.5]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1c2128', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#e6edf3' }}
                        formatter={(v: number | undefined) => [`${v ?? ''} ★`, 'Avg Rating']}
                      />
                      <Area type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} fill="url(#ratingGrad)" dot={{ r: 3, fill: '#f59e0b' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* Crew scores + Job type scores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-earth-200">Score by Crew</h3>
              </div>
            }>
              <div className="space-y-4">
                {CREW_SCORES.sort((a, b) => b.avg - a.avg).map(crew => (
                  <div key={crew.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: crew.color }} />
                        <span className="text-sm text-earth-200">{crew.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating rating={Math.round(crew.avg)} size="sm" />
                        <span className={clsx('text-sm font-bold', ratingColor(crew.avg))}>{crew.avg}</span>
                      </div>
                    </div>
                    <RatingBar value={crew.avg} max={5} color={crew.color} />
                    <p className="text-[10px] text-earth-500 mt-0.5">{crew.count} reviews</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card header={
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-earth-200">Score by Job Type</h3>
              </div>
            }>
              <div className="space-y-3">
                {TYPE_SCORES.sort((a, b) => b.avg - a.avg).map(t => (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-xs text-earth-400 w-24 shrink-0">{t.type}</span>
                    <div className="flex-1">
                      <RatingBar value={t.avg} max={5} color={t.avg >= 4.5 ? '#22c55e' : t.avg >= 4 ? '#f59e0b' : '#ef4444'} />
                    </div>
                    <span className={clsx('text-sm font-semibold w-8 text-right shrink-0', ratingColor(t.avg))}>{t.avg}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent reviews */}
          <Card header={
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-earth-200">Recent Reviews</h3>
            </div>
          } padding={false}>
            <div className="divide-y divide-earth-800/60">
              {responded.slice(0, 5).map(s => (
                <div key={s.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-earth-800 flex items-center justify-center text-sm font-semibold text-earth-200 shrink-0">
                        {s.customer_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-earth-100">{s.customer_name}</p>
                          <span className="text-xs text-earth-500">{s.job_title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={s.rating!} size="sm" />
                          <span className="text-[10px] text-earth-500">
                            {s.responded_at ? format(new Date(s.responded_at), 'MMM d, yyyy') : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge color={s.rating! >= 5 ? 'green' : s.rating! >= 4 ? 'amber' : 'red'}>
                      {s.rating! >= 5 ? '5 Stars' : s.rating! >= 4 ? `${s.rating} Stars` : `${s.rating} Stars`}
                    </Badge>
                  </div>
                  {s.comment && (
                    <p className="text-sm text-earth-300 mt-2 ml-12 italic">
                      "{s.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ======= SURVEYS TAB ======= */}
      {activeTab === 'surveys' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customers or jobs..."
                className="w-full pl-9 pr-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-100 placeholder-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'not_sent', 'sent', 'responded'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    filterStatus === f
                      ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                      : 'bg-earth-900 border border-earth-700 text-earth-400 hover:text-earth-200'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'not_sent' ? 'Not Sent' : f === 'sent' ? 'Awaiting' : 'Responded'}
                </button>
              ))}
            </div>
          </div>

          {notSent.length > 0 && filterStatus !== 'responded' && filterStatus !== 'sent' && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-600/10 border border-amber-600/20 rounded-xl">
              <Bell className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm text-earth-200 flex-1">
                <span className="font-semibold text-amber-400">{notSent.length} jobs</span> completed without a satisfaction survey.
              </p>
              <Button size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={sendAllSurveys}>
                Send All
              </Button>
            </div>
          )}

          <Card padding={false}>
            <div className="divide-y divide-earth-800/60">
              {filteredSurveys.length === 0 ? (
                <div className="py-12 text-center">
                  <Smile className="w-10 h-10 text-earth-700 mx-auto mb-3" />
                  <p className="text-sm text-earth-400">No surveys match the current filter</p>
                </div>
              ) : filteredSurveys.map(s => {
                const conf = statusConfig[s.survey_status];
                const alreadySent = sentSurveys.has(s.id);

                return (
                  <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                    {/* Customer avatar */}
                    <div className="w-9 h-9 rounded-full bg-earth-800 flex items-center justify-center text-sm font-semibold text-earth-200 shrink-0">
                      {s.customer_name.charAt(0)}
                    </div>

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-earth-100">{s.customer_name}</p>
                        <span className="text-xs text-earth-500 truncate">{s.job_title}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-earth-500">
                          Completed {format(new Date(s.completed_date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-[10px] text-earth-500">{s.crew_name}</span>
                      </div>
                    </div>

                    {/* Rating (if responded) */}
                    <div className="shrink-0">
                      {s.survey_status === 'responded' && s.rating ? (
                        <div className="text-right">
                          <StarRating rating={s.rating} size="sm" />
                          <p className="text-[10px] text-earth-500 mt-0.5">
                            {s.responded_at ? format(new Date(s.responded_at), 'MMM d') : ''}
                          </p>
                        </div>
                      ) : (
                        <Badge color={conf.color}>{conf.label}</Badge>
                      )}
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {s.survey_status === 'responded' ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : s.survey_status === 'sent' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Repeat className="w-3 h-3" />}
                          onClick={() => sendSurvey(s)}
                        >
                          <span className="hidden sm:inline">Resend</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={alreadySent}
                          icon={alreadySent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                          onClick={() => sendSurvey(s)}
                        >
                          <span className="hidden sm:inline">{alreadySent ? 'Sent' : 'Send'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ======= REVIEW REQUESTS TAB ======= */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {/* Explainer */}
          <div className="flex items-start gap-3 px-4 py-3 bg-green-600/10 border border-green-600/20 rounded-xl">
            <ThumbsUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-earth-100">Ready to request reviews</p>
              <p className="text-xs text-earth-400 mt-0.5">
                {readyForReview.length} customer{readyForReview.length !== 1 ? 's' : ''} rated {reviewThreshold}+ stars — prime candidates for a Google review request.
                Customers who loved your service are 3× more likely to leave a review when asked within 24 hours.
              </p>
            </div>
          </div>

          {readyForReview.length === 0 ? (
            <Card>
              <div className="text-center py-10">
                <Star className="w-10 h-10 text-earth-700 mx-auto mb-3" />
                <p className="text-sm text-earth-400">No customers ready for review requests yet.</p>
                <p className="text-xs text-earth-500 mt-1">Send surveys first — customers who rate {reviewThreshold}+ stars will appear here.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyForReview.map(s => {
                const isSent = sentReviews.has(s.id);
                return (
                  <Card key={s.id} className={clsx(isSent && 'opacity-70')}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center text-lg font-bold text-green-400 shrink-0">
                        {s.customer_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-earth-100">{s.customer_name}</p>
                        <p className="text-xs text-earth-400 truncate">{s.job_title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={s.rating!} size="sm" />
                          <span className="text-xs text-amber-400 font-semibold">{s.rating} stars</span>
                        </div>
                        {s.comment && (
                          <p className="text-xs text-earth-400 mt-2 italic line-clamp-2">"{s.comment}"</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            disabled={isSent}
                            icon={isSent ? <CheckCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                            onClick={() => sendReviewRequest(s)}
                          >
                            {isSent ? 'Request Sent' : 'Send Review Request'}
                          </Button>
                          {!isSent && (
                            <button
                              onClick={() => {
                                addToast('info', `Calling ${s.customer_name}...`);
                              }}
                              className="p-1.5 text-earth-400 hover:text-green-400 hover:bg-earth-700/50 rounded-lg transition-colors cursor-pointer"
                              title="Call customer"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Google review link preview */}
          <Card header={
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-earth-200">Your Google Review Link</h3>
            </div>
          }>
            <div className="flex items-center gap-3">
              <input
                value={googleLink}
                onChange={e => setGoogleLink(e.target.value)}
                className="flex-1 px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-100 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                placeholder="https://g.page/r/your-business/review"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addToast('success', 'Google Review link saved')}
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-earth-500 mt-2">
              Find your Google Review link in Google Business Profile → Get more reviews.
            </p>
          </Card>
        </div>
      )}

      {/* ======= SETTINGS TAB ======= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Auto-send settings */}
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Auto-Send Configuration</h3>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-earth-400 mb-1">Send survey after (hours)</label>
                <select
                  value={sendDelay}
                  onChange={e => setSendDelay(e.target.value)}
                  className="w-full px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-100 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                >
                  {['1', '2', '4', '6', '12', '24'].map(v => (
                    <option key={v} value={v}>{v} hour{v !== '1' ? 's' : ''} after completion</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-earth-400 mb-1">Review request threshold (min rating)</label>
                <select
                  value={reviewThreshold}
                  onChange={e => setReviewThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-100 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                >
                  {['3', '4', '5'].map(v => (
                    <option key={v} value={v}>{v}+ stars</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Survey template */}
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-earth-200">Survey Message Template</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-earth-500">Variables: {'{{customer_name}}'} {'{{job_title}}'}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingSurvey(v => !v);
                    if (editingSurvey) addToast('success', 'Survey template saved');
                  }}
                >
                  {editingSurvey ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>
          }>
            {editingSurvey ? (
              <textarea
                value={surveyMsg}
                onChange={e => setSurveyMsg(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-200 font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            ) : (
              <pre className="text-xs text-earth-300 whitespace-pre-wrap font-sans bg-earth-900/60 p-3 rounded-lg border border-earth-800 max-h-48 overflow-y-auto leading-relaxed">
                {surveyMsg}
              </pre>
            )}
          </Card>

          {/* Review request template */}
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-earth-200">Review Request Template</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-earth-500">Variables: {'{{customer_name}}'} {'{{google_review_link}}'}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingReview(v => !v);
                    if (editingReview) addToast('success', 'Review template saved');
                  }}
                >
                  {editingReview ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>
          }>
            {editingReview ? (
              <textarea
                value={reviewMsg}
                onChange={e => setReviewMsg(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-200 font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            ) : (
              <pre className="text-xs text-earth-300 whitespace-pre-wrap font-sans bg-earth-900/60 p-3 rounded-lg border border-earth-800 max-h-48 overflow-y-auto leading-relaxed">
                {reviewMsg}
              </pre>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              icon={<Check className="w-4 h-4" />}
              onClick={() => addToast('success', 'All satisfaction settings saved')}
            >
              Save All Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
