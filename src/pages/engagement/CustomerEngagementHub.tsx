import { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import {
  MessageSquare, Mail, Phone, Send, Clock, CheckCircle2, AlertTriangle,
  Users, Star, TrendingUp, TrendingDown, Heart, DollarSign, Calendar,
  Zap, Bell, ChevronRight, ChevronDown, ChevronUp, Search, Filter,
  FileText, Camera, Briefcase, Receipt, RefreshCw, ArrowRight,
  ThumbsUp, ThumbsDown, Smile, Meh, Frown, Eye, MailOpen, Reply,
  Bot, Sparkles, UserCheck, Timer, MapPin, Hash, Crown,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { format, formatDistanceToNow, subHours, subDays, subMinutes } from 'date-fns';

// ─── Types ───
type ActivityType = 'email_sent' | 'email_opened' | 'sms_sent' | 'sms_delivered' | 'call_made' | 'call_received'
  | 'quote_sent' | 'quote_accepted' | 'quote_declined' | 'invoice_sent' | 'invoice_paid' | 'invoice_overdue'
  | 'job_scheduled' | 'job_started' | 'job_completed' | 'photo_shared' | 'proposal_sent' | 'proposal_viewed'
  | 'review_requested' | 'review_received' | 'appointment_reminder' | 'estimate_sent' | 'follow_up'
  | 'auto_trigger';

type Channel = 'email' | 'sms' | 'phone' | 'system' | 'automation';
type HealthLevel = 'excellent' | 'good' | 'at_risk' | 'critical';

interface Activity {
  id: string;
  customerId: string;
  customerName: string;
  type: ActivityType;
  channel: Channel;
  subject: string;
  preview: string;
  timestamp: Date;
  read: boolean;
  automated: boolean;
  icon: LucideIcon;
  iconColor: string;
  responded?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface CustomerHealth {
  id: string;
  name: string;
  type: string;
  healthScore: number;
  healthLevel: HealthLevel;
  lastContact: Date;
  daysSinceContact: number;
  responseRate: number;
  paymentScore: number;
  loyaltyYears: number;
  lifetimeValue: number;
  openItems: number;
  nextAction: string;
  nextActionType: 'email' | 'call' | 'visit' | 'invoice';
  riskFactors: string[];
  positiveFactors: string[];
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  channel: Channel;
  subject: string;
  body: string;
  variables: string[];
  sendCount: number;
  openRate: number;
  icon: LucideIcon;
}

interface AutoTrigger {
  id: string;
  name: string;
  event: string;
  action: string;
  channel: Channel;
  template: string;
  delay: string;
  enabled: boolean;
  fireCount: number;
  lastFired?: Date;
}

// ─── Demo Data ───
function generateActivities(): Activity[] {
  const now = new Date();
  return [
    {
      id: 'act-1', customerId: '1', customerName: 'Sarah Mitchell',
      type: 'job_completed', channel: 'system', subject: 'Job Completed: Weekly Lawn Maintenance',
      preview: 'Crew Alpha completed lawn maintenance at 1425 Oak Hollow Dr. Before/after photos attached.',
      timestamp: subMinutes(now, 12), read: false, automated: true, icon: CheckCircle2, iconColor: 'text-green-400',
    },
    {
      id: 'act-2', customerId: '1', customerName: 'Sarah Mitchell',
      type: 'photo_shared', channel: 'email', subject: 'Your Lawn Looks Great! — Before & After Photos',
      preview: 'Hi Sarah, your weekly maintenance is complete! Here are the before and after photos from today\'s visit.',
      timestamp: subMinutes(now, 10), read: false, automated: true, icon: Camera, iconColor: 'text-sky-400',
      responded: false,
    },
    {
      id: 'act-3', customerId: '2', customerName: 'Robert Chen',
      type: 'sms_sent', channel: 'sms', subject: 'Crew Arrival ETA',
      preview: 'Hi Robert! Alpha Crew is on the way to 892 Willow Creek. ETA: 15 minutes. - Maas Verde',
      timestamp: subMinutes(now, 25), read: true, automated: true, icon: MapPin, iconColor: 'text-blue-400',
    },
    {
      id: 'act-4', customerId: '2', customerName: 'Robert Chen',
      type: 'job_started', channel: 'system', subject: 'Job Started: Spring Mulch & Bed Refresh',
      preview: 'Crew Alpha started mulching at 892 Willow Creek Blvd. Estimated completion: 1:00 PM.',
      timestamp: subMinutes(now, 20), read: true, automated: true, icon: Briefcase, iconColor: 'text-amber-400',
    },
    {
      id: 'act-5', customerId: '5', customerName: 'Jennifer Wallace',
      type: 'estimate_sent', channel: 'email', subject: 'Your Landscape Redesign Estimate — $15,000',
      preview: 'Hi Jennifer, attached is your complete landscape redesign estimate. This includes a full property assessment...',
      timestamp: subHours(now, 2), read: true, automated: false, icon: FileText, iconColor: 'text-purple-400',
      responded: false,
    },
    {
      id: 'act-6', customerId: '3', customerName: 'Hillcrest HOA',
      type: 'invoice_paid', channel: 'system', subject: 'Payment Received: INV-2026-042 — $2,800',
      preview: 'Hillcrest HOA paid invoice INV-2026-042 for March grounds maintenance. Payment method: ACH transfer.',
      timestamp: subHours(now, 3), read: true, automated: true, icon: DollarSign, iconColor: 'text-green-400',
      sentiment: 'positive',
    },
    {
      id: 'act-7', customerId: '4', customerName: 'David & Maria Lopez',
      type: 'review_received', channel: 'email', subject: 'New 5-Star Review from the Lopez Family!',
      preview: '"Absolutely incredible work on our patio! The crew was professional, clean, and finished ahead of schedule. Highly recommend!" ★★★★★',
      timestamp: subHours(now, 5), read: true, automated: false, icon: Star, iconColor: 'text-amber-400',
      sentiment: 'positive',
    },
    {
      id: 'act-8', customerId: '7', customerName: 'Oakwood Business Park',
      type: 'invoice_overdue', channel: 'system', subject: 'OVERDUE: INV-2026-038 — $4,100 (15 days)',
      preview: 'Invoice INV-2026-038 for February maintenance is 15 days overdue. Total: $4,100. Two reminders sent.',
      timestamp: subHours(now, 6), read: true, automated: true, icon: AlertTriangle, iconColor: 'text-red-400',
      sentiment: 'negative',
    },
    {
      id: 'act-9', customerId: '6', customerName: 'Thompson Family',
      type: 'appointment_reminder', channel: 'sms', subject: 'Tomorrow\'s Visit Reminder',
      preview: 'Hi Thompson family! Reminder: Maas Verde is scheduled for spring cleanup tomorrow at 9:00 AM. Reply C to confirm.',
      timestamp: subHours(now, 8), read: true, automated: true, icon: Bell, iconColor: 'text-sky-400',
      responded: true,
    },
    {
      id: 'act-10', customerId: '6', customerName: 'Thompson Family',
      type: 'sms_delivered', channel: 'sms', subject: 'Customer Confirmed: Tomorrow\'s Visit',
      preview: 'Thompson replied: "C — confirmed! Please use the back gate, code 3344. Thanks!"',
      timestamp: subHours(now, 7.5), read: true, automated: false, icon: Reply, iconColor: 'text-green-400',
      sentiment: 'positive',
    },
    {
      id: 'act-11', customerId: '5', customerName: 'Jennifer Wallace',
      type: 'proposal_viewed', channel: 'system', subject: 'Proposal Viewed: Landscape Redesign',
      preview: 'Jennifer Wallace viewed your landscape redesign proposal. Time spent: 4 minutes. Pages viewed: all 6.',
      timestamp: subHours(now, 1), read: false, automated: true, icon: Eye, iconColor: 'text-purple-400',
    },
    {
      id: 'act-12', customerId: '8', customerName: 'Patricia Anderson',
      type: 'follow_up', channel: 'email', subject: 'Following up on your irrigation quote',
      preview: 'Hi Patricia, just following up on the irrigation repair quote from last week. Happy to answer any questions...',
      timestamp: subDays(now, 1), read: true, automated: false, icon: RefreshCw, iconColor: 'text-earth-400',
      responded: false,
    },
    {
      id: 'act-13', customerId: '1', customerName: 'Sarah Mitchell',
      type: 'review_requested', channel: 'sms', subject: 'Review Request Sent',
      preview: 'Hi Sarah! How did we do on today\'s visit? Tap to leave a quick review: [link]. Thanks! - Maas Verde',
      timestamp: subMinutes(now, 5), read: false, automated: true, icon: Star, iconColor: 'text-amber-400',
    },
    {
      id: 'act-14', customerId: '3', customerName: 'Hillcrest HOA',
      type: 'call_made', channel: 'phone', subject: 'Contract Renewal Discussion',
      preview: 'Called Tom Bradley (board president) re: contract renewal. Discussed Premium tier upgrade. Sending proposal Friday.',
      timestamp: subDays(now, 1), read: true, automated: false, icon: Phone, iconColor: 'text-green-400',
    },
    {
      id: 'act-15', customerId: '2', customerName: 'Robert Chen',
      type: 'auto_trigger', channel: 'automation', subject: 'Auto: Job completion report sent',
      preview: 'Automation "Job Complete → Send Report" triggered. Sent completion email with photos to robert.chen@example.com.',
      timestamp: subDays(now, 3), read: true, automated: true, icon: Bot, iconColor: 'text-purple-400',
    },
  ];
}

function generateCustomerHealth(): CustomerHealth[] {
  const now = new Date();
  return [
    {
      id: '1', name: 'Sarah Mitchell', type: 'residential', healthScore: 95, healthLevel: 'excellent',
      lastContact: subMinutes(now, 12), daysSinceContact: 0, responseRate: 92, paymentScore: 100,
      loyaltyYears: 3, lifetimeValue: 8400, openItems: 0,
      nextAction: 'Send spring fertilization recommendation', nextActionType: 'email',
      riskFactors: [], positiveFactors: ['Always pays on time', '3-year loyalty', 'Refers friends', '5-star reviewer'],
    },
    {
      id: '4', name: 'David & Maria Lopez', type: 'residential', healthScore: 92, healthLevel: 'excellent',
      lastContact: subHours(now, 5), daysSinceContact: 0, responseRate: 88, paymentScore: 100,
      loyaltyYears: 4, lifetimeValue: 12800, openItems: 0,
      nextAction: 'Propose outdoor lighting package', nextActionType: 'email',
      riskFactors: [], positiveFactors: ['High lifetime value', 'Recent 5-star review', 'Active referrer', 'Premium services'],
    },
    {
      id: '3', name: 'Hillcrest HOA', type: 'hoa', healthScore: 78, healthLevel: 'good',
      lastContact: subDays(now, 1), daysSinceContact: 1, responseRate: 75, paymentScore: 85,
      loyaltyYears: 2, lifetimeValue: 42000, openItems: 1,
      nextAction: 'Send Premium tier upgrade proposal', nextActionType: 'email',
      riskFactors: ['Contract expires in 45 days'], positiveFactors: ['Highest revenue client', 'Board relationship strong'],
    },
    {
      id: '6', name: 'Thompson Family', type: 'residential', healthScore: 82, healthLevel: 'good',
      lastContact: subHours(now, 7.5), daysSinceContact: 0, responseRate: 80, paymentScore: 95,
      loyaltyYears: 1, lifetimeValue: 2100, openItems: 0,
      nextAction: 'Pitch mosquito treatment program', nextActionType: 'call',
      riskFactors: [], positiveFactors: ['Quick responder', 'Family with kids — health conscious'],
    },
    {
      id: '2', name: 'Robert Chen', type: 'residential', healthScore: 72, healthLevel: 'good',
      lastContact: subMinutes(now, 25), daysSinceContact: 0, responseRate: 65, paymentScore: 90,
      loyaltyYears: 2, lifetimeValue: 3200, openItems: 0,
      nextAction: 'Upsell fertilization program', nextActionType: 'call',
      riskFactors: ['Only uses mowing service', 'Low engagement rate'], positiveFactors: ['Large property', 'Growing relationship'],
    },
    {
      id: '5', name: 'Jennifer Wallace', type: 'residential', healthScore: 58, healthLevel: 'at_risk',
      lastContact: subHours(now, 2), daysSinceContact: 0, responseRate: 45, paymentScore: 80,
      loyaltyYears: 0.5, lifetimeValue: 4500, openItems: 2,
      nextAction: 'Follow up on redesign proposal — she viewed it!', nextActionType: 'call',
      riskFactors: ['Low response rate', 'New customer — not yet loyal', '$15K proposal pending'],
      positiveFactors: ['High property value', 'Just viewed proposal (hot lead!)'],
    },
    {
      id: '7', name: 'Oakwood Business Park', type: 'commercial', healthScore: 35, healthLevel: 'critical',
      lastContact: subDays(now, 8), daysSinceContact: 8, responseRate: 40, paymentScore: 45,
      loyaltyYears: 3, lifetimeValue: 24600, openItems: 1,
      nextAction: 'URGENT: Call about overdue invoice — $4,100', nextActionType: 'call',
      riskFactors: ['Invoice 15 days overdue', 'No contact in 8 days', 'Payment score declining', 'May be considering competitors'],
      positiveFactors: ['3-year client', 'High revenue potential'],
    },
    {
      id: '8', name: 'Patricia Anderson', type: 'residential', healthScore: 62, healthLevel: 'at_risk',
      lastContact: subDays(now, 12), daysSinceContact: 12, responseRate: 55, paymentScore: 90,
      loyaltyYears: 5, lifetimeValue: 18400, openItems: 1,
      nextAction: 'Follow up on irrigation quote (no response 12 days)', nextActionType: 'call',
      riskFactors: ['12 days without response', 'Open quote going stale', 'Engagement dropping'],
      positiveFactors: ['5-year loyal customer', 'Top-10 lifetime value', 'Premium service tier'],
    },
  ];
}

function generateTemplates(): MessageTemplate[] {
  return [
    { id: 't-1', name: 'Appointment Reminder', category: 'Scheduling', channel: 'sms', subject: 'Tomorrow\'s Visit Reminder', body: 'Hi {customer_name}! Reminder: Maas Verde is scheduled for {service_name} tomorrow at {time}. Reply C to confirm or R to reschedule.', variables: ['customer_name', 'service_name', 'time'], sendCount: 342, openRate: 98, icon: Bell },
    { id: 't-2', name: 'Crew En Route', category: 'Scheduling', channel: 'sms', subject: 'Crew On the Way', body: 'Hi {customer_name}! {crew_name} is on the way to your property. ETA: {eta} minutes. - Maas Verde', variables: ['customer_name', 'crew_name', 'eta'], sendCount: 518, openRate: 96, icon: MapPin },
    { id: 't-3', name: 'Job Complete Report', category: 'Service', channel: 'email', subject: 'Your {service_name} is Complete! — Before & After Photos', body: 'Hi {customer_name},\n\nGreat news — your {service_name} at {address} is complete!\n\nHere are the before and after photos from today\'s visit. We hope you love the results!\n\nBest,\nMaas Verde Team', variables: ['customer_name', 'service_name', 'address'], sendCount: 285, openRate: 82, icon: Camera },
    { id: 't-4', name: 'Review Request', category: 'Engagement', channel: 'sms', subject: 'How did we do?', body: 'Hi {customer_name}! How did we do on today\'s {service_name}? Tap to leave a quick review: {review_link}. Thanks! - Maas Verde', variables: ['customer_name', 'service_name', 'review_link'], sendCount: 198, openRate: 72, icon: Star },
    { id: 't-5', name: 'Invoice Follow-Up', category: 'Billing', channel: 'email', subject: 'Friendly Reminder: Invoice {invoice_number} Due', body: 'Hi {customer_name},\n\nJust a friendly reminder that invoice {invoice_number} for ${amount} is due on {due_date}.\n\nPay online: {payment_link}\n\nThanks!', variables: ['customer_name', 'invoice_number', 'amount', 'due_date', 'payment_link'], sendCount: 156, openRate: 78, icon: Receipt },
    { id: 't-6', name: 'Seasonal Recommendation', category: 'Upsell', channel: 'email', subject: 'Spring is Here — Recommendations for Your Property', body: 'Hi {customer_name},\n\nSpring is the perfect time for {recommendation}! Based on your property at {address}, we recommend:\n\n{service_details}\n\nReply to schedule a free consultation.\n\nBest,\nMaas Verde', variables: ['customer_name', 'recommendation', 'address', 'service_details'], sendCount: 89, openRate: 65, icon: Sparkles },
    { id: 't-7', name: 'Welcome New Customer', category: 'Onboarding', channel: 'email', subject: 'Welcome to the Maas Verde Family!', body: 'Hi {customer_name},\n\nWelcome to Maas Verde! We\'re thrilled to have you as a customer.\n\nHere\'s what you can expect:\n• Consistent, quality service\n• Before/after photos after every visit\n• Easy online payments\n• Your dedicated customer portal\n\nQuestions? Reply anytime.', variables: ['customer_name'], sendCount: 45, openRate: 88, icon: Heart },
    { id: 't-8', name: 'Weather Reschedule', category: 'Scheduling', channel: 'sms', subject: 'Weather Reschedule Notice', body: 'Hi {customer_name}! Due to {weather_condition}, we\'re rescheduling your {service_name} from {original_date} to {new_date}. Reply OK to confirm. - Maas Verde', variables: ['customer_name', 'weather_condition', 'service_name', 'original_date', 'new_date'], sendCount: 67, openRate: 94, icon: RefreshCw },
  ];
}

function generateTriggers(): AutoTrigger[] {
  const now = new Date();
  return [
    { id: 'tr-1', name: 'Job Complete → Send Report', event: 'Job status changes to "Completed"', action: 'Send completion email with photos', channel: 'email', template: 'Job Complete Report', delay: '5 minutes', enabled: true, fireCount: 285, lastFired: subMinutes(now, 12) },
    { id: 'tr-2', name: 'Crew En Route → Text Customer', event: 'Job status changes to "En Route"', action: 'Send ETA text to customer', channel: 'sms', template: 'Crew En Route', delay: 'Immediately', enabled: true, fireCount: 518, lastFired: subMinutes(now, 25) },
    { id: 'tr-3', name: 'Day Before → Appointment Reminder', event: '24 hours before scheduled job', action: 'Send appointment reminder', channel: 'sms', template: 'Appointment Reminder', delay: '24 hours before', enabled: true, fireCount: 342, lastFired: subHours(now, 8) },
    { id: 'tr-4', name: 'Job Complete → Request Review', event: 'Job status changes to "Completed"', action: 'Send review request', channel: 'sms', template: 'Review Request', delay: '2 hours', enabled: true, fireCount: 198, lastFired: subMinutes(now, 5) },
    { id: 'tr-5', name: 'Invoice 7 Days Overdue → Reminder', event: 'Invoice unpaid for 7 days', action: 'Send payment reminder', channel: 'email', template: 'Invoice Follow-Up', delay: '7 days overdue', enabled: true, fireCount: 156, lastFired: subDays(now, 2) },
    { id: 'tr-6', name: 'New Customer → Welcome Email', event: 'New customer created', action: 'Send welcome email', channel: 'email', template: 'Welcome New Customer', delay: '1 hour', enabled: true, fireCount: 45, lastFired: subDays(now, 5) },
    { id: 'tr-7', name: 'Weather Alert → Reschedule Notice', event: 'Weather conflict detected', action: 'Send reschedule notification', channel: 'sms', template: 'Weather Reschedule', delay: 'Immediately', enabled: false, fireCount: 67, lastFired: subDays(now, 14) },
    { id: 'tr-8', name: 'Quote 5 Days Old → Follow Up', event: 'Quote sent 5+ days ago, no response', action: 'Send follow-up email', channel: 'email', template: 'Seasonal Recommendation', delay: '5 days', enabled: true, fireCount: 89, lastFired: subDays(now, 1) },
  ];
}

// ─── Helper Components ───
const channelIcons: Record<Channel, { icon: LucideIcon; color: string; bg: string }> = {
  email: { icon: Mail, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  sms: { icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/15' },
  phone: { icon: Phone, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  system: { icon: Zap, color: 'text-earth-400', bg: 'bg-earth-700/40' },
  automation: { icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/15' },
};

function HealthScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : score >= 40 ? 'text-orange-500' : 'text-red-500';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-earth-800" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={3}
        className={color} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="fill-earth-100 text-xs font-bold" transform={`rotate(90 ${size/2} ${size/2})`}>
        {score}
      </text>
    </svg>
  );
}

function HealthBadge({ level }: { level: HealthLevel }) {
  const config = {
    excellent: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', label: 'Excellent' },
    good: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', label: 'Good' },
    at_risk: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'At Risk' },
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical' },
  }[level];
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold border', config.bg, config.text, config.border)}>
      {config.label}
    </span>
  );
}

function SentimentIcon({ sentiment }: { sentiment?: 'positive' | 'neutral' | 'negative' }) {
  if (!sentiment) return null;
  const config = {
    positive: { icon: Smile, color: 'text-green-400' },
    neutral: { icon: Meh, color: 'text-earth-400' },
    negative: { icon: Frown, color: 'text-red-400' },
  }[sentiment];
  const Icon = config.icon;
  return <Icon className={clsx('w-3.5 h-3.5', config.color)} />;
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 25;
    const inc = value / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(Math.round(cur));
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span>{prefix}{display.toLocaleString()}</span>;
}

// ─── Main Component ───
export default function CustomerEngagementHub() {
  const { addToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>(generateActivities);
  const [customerHealth] = useState<CustomerHealth[]>(generateCustomerHealth);
  const [templates] = useState<MessageTemplate[]>(generateTemplates);
  const [triggers, setTriggers] = useState<AutoTrigger[]>(generateTriggers);
  const [activeTab, setActiveTab] = useState<'feed' | 'health' | 'templates' | 'automations'>('feed');
  const [feedFilter, setFeedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeChannel, setComposeChannel] = useState<'email' | 'sms'>('email');
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // ─── Stats ───
  const stats = useMemo(() => {
    const unread = activities.filter(a => !a.read).length;
    const sentToday = activities.filter(a => {
      const hours = (new Date().getTime() - a.timestamp.getTime()) / (1000 * 60 * 60);
      return hours < 24;
    }).length;
    const autoMessages = activities.filter(a => a.automated).length;
    const responseRate = Math.round(
      activities.filter(a => a.responded !== undefined).length > 0
        ? (activities.filter(a => a.responded === true).length / activities.filter(a => a.responded !== undefined).length) * 100
        : 0
    );
    const avgHealth = Math.round(customerHealth.reduce((s, c) => s + c.healthScore, 0) / customerHealth.length);
    const atRisk = customerHealth.filter(c => c.healthLevel === 'at_risk' || c.healthLevel === 'critical').length;

    return { unread, sentToday, autoMessages, responseRate, avgHealth, atRisk };
  }, [activities, customerHealth]);

  // ─── Filtered Activities ───
  const filteredActivities = useMemo(() => {
    let result = [...activities];
    if (feedFilter !== 'all') {
      result = result.filter(a => a.channel === feedFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.customerName.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.preview.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, feedFilter, searchQuery]);

  // ─── Actions ───
  const markRead = (actId: string) => {
    setActivities(prev => prev.map(a => a.id === actId ? { ...a, read: true } : a));
  };

  const sendQuickReply = (customerId: string, customerName: string) => {
    addToast('success', `Quick reply sent to ${customerName}`);
  };

  const toggleTrigger = (triggerId: string) => {
    setTriggers(prev => prev.map(t =>
      t.id === triggerId ? { ...t, enabled: !t.enabled } : t
    ));
    const trigger = triggers.find(t => t.id === triggerId);
    addToast('success', `"${trigger?.name}" ${trigger?.enabled ? 'disabled' : 'enabled'}`);
  };

  const sendComposedMessage = () => {
    if (!composeRecipient || !composeBody) {
      addToast('error', 'Please fill in recipient and message');
      return;
    }
    const newActivity: Activity = {
      id: `act-new-${Date.now()}`,
      customerId: '0',
      customerName: composeRecipient,
      type: composeChannel === 'email' ? 'email_sent' : 'sms_sent',
      channel: composeChannel,
      subject: composeSubject || `${composeChannel === 'sms' ? 'SMS' : 'Email'} to ${composeRecipient}`,
      preview: composeBody.slice(0, 150),
      timestamp: new Date(),
      read: true,
      automated: false,
      icon: composeChannel === 'email' ? Mail : MessageSquare,
      iconColor: composeChannel === 'email' ? 'text-sky-400' : 'text-green-400',
    };
    setActivities(prev => [newActivity, ...prev]);
    setShowCompose(false);
    setComposeRecipient('');
    setComposeSubject('');
    setComposeBody('');
    addToast('success', `${composeChannel === 'email' ? 'Email' : 'SMS'} sent to ${composeRecipient}`);
  };

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* ═══ Hero Stats ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sky-600/20 to-sky-600/5 border border-sky-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-sky-400" />
            <span className="text-xs text-earth-400 font-medium">Today's Messages</span>
          </div>
          <p className="text-2xl font-bold text-sky-400"><AnimatedNumber value={stats.sentToday} /></p>
          <p className="text-xs text-earth-500 mt-1">{stats.unread} unread</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-earth-400 font-medium">Auto-Sent</span>
          </div>
          <p className="text-2xl font-bold text-purple-400"><AnimatedNumber value={stats.autoMessages} /></p>
          <p className="text-xs text-earth-500 mt-1">Automated this period</p>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-green-400" />
            <span className="text-xs text-earth-400 font-medium">Avg Health Score</span>
          </div>
          <p className="text-2xl font-bold text-green-400"><AnimatedNumber value={stats.avgHealth} /></p>
          <p className="text-xs text-earth-500 mt-1">{stats.atRisk} customers at risk</p>
        </div>

        <div className="bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Reply className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-earth-400 font-medium">Response Rate</span>
          </div>
          <p className="text-2xl font-bold text-amber-400"><AnimatedNumber value={stats.responseRate} />%</p>
          <p className="text-xs text-earth-500 mt-1">Customer replies</p>
        </div>
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {[
          { key: 'feed' as const, label: 'Activity Feed', icon: MessageSquare, count: stats.unread },
          { key: 'health' as const, label: 'Customer Health', icon: Heart, count: stats.atRisk },
          { key: 'templates' as const, label: 'Templates', icon: FileText, count: templates.length },
          { key: 'automations' as const, label: 'Automations', icon: Bot, count: triggers.filter(t => t.enabled).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
              activeTab === tab.key
                ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                : 'text-earth-400 hover:text-earth-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-green-500/20 text-green-400' :
                tab.key === 'health' && tab.count > 0 ? 'bg-red-500/20 text-red-400' :
                'bg-earth-800 text-earth-500'
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Activity Feed ═══ */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, customers..."
                className="w-full bg-earth-900/60 border border-earth-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-0.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'sms', label: 'SMS', icon: MessageSquare },
                { key: 'phone', label: 'Calls', icon: Phone },
                { key: 'automation', label: 'Auto', icon: Bot },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFeedFilter(f.key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
                    feedFilter === f.key ? 'bg-green-600/20 text-green-400' : 'text-earth-500 hover:text-earth-300'
                  )}
                >
                  {f.icon && <f.icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{f.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Compose
            </button>
          </div>

          {/* Compose Panel */}
          {showCompose && (
            <div className="bg-earth-900/80 border border-green-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-earth-200">New Message</h3>
                <button onClick={() => setShowCompose(false)} className="text-earth-500 hover:text-earth-300 cursor-pointer text-sm">Cancel</button>
              </div>
              <div className="flex gap-2">
                {(['email', 'sms'] as const).map(ch => (
                  <button
                    key={ch}
                    onClick={() => setComposeChannel(ch)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer',
                      composeChannel === ch
                        ? channelIcons[ch].bg + ' ' + channelIcons[ch].color + ' border-current'
                        : 'bg-earth-800/40 text-earth-400 border-earth-700'
                    )}
                  >
                    {ch === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    {ch === 'email' ? 'Email' : 'SMS'}
                  </button>
                ))}
              </div>
              <input
                type="text" value={composeRecipient} onChange={(e) => setComposeRecipient(e.target.value)}
                placeholder="Recipient (customer name or email)"
                className="w-full bg-earth-800/60 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
              />
              {composeChannel === 'email' && (
                <input
                  type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full bg-earth-800/60 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50"
                />
              )}
              <textarea
                value={composeBody} onChange={(e) => setComposeBody(e.target.value)}
                placeholder={composeChannel === 'sms' ? 'Message (160 chars for SMS)' : 'Compose your email...'}
                rows={3}
                className="w-full bg-earth-800/60 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-200 placeholder-earth-600 focus:outline-none focus:border-green-500/50 resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={sendComposedMessage}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Send {composeChannel === 'email' ? 'Email' : 'SMS'}
                </button>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="space-y-1">
            {filteredActivities.map((activity, idx) => {
              const isExpanded = expandedActivity === activity.id;
              const chInfo = channelIcons[activity.channel];
              const Icon = activity.icon;
              const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });

              return (
                <div key={activity.id}>
                  <button
                    onClick={() => {
                      setExpandedActivity(isExpanded ? null : activity.id);
                      if (!activity.read) markRead(activity.id);
                    }}
                    className={clsx(
                      'w-full flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer text-left group',
                      !activity.read ? 'bg-sky-500/5 hover:bg-sky-500/10' : 'hover:bg-earth-800/40',
                      isExpanded && 'bg-earth-800/40'
                    )}
                  >
                    {/* Icon */}
                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', chInfo.bg)}>
                      <Icon className={clsx('w-4 h-4', activity.iconColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-earth-100">{activity.customerName}</span>
                        {!activity.read && <div className="w-2 h-2 rounded-full bg-sky-400" />}
                        {activity.automated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> Auto
                          </span>
                        )}
                        <SentimentIcon sentiment={activity.sentiment} />
                      </div>
                      <p className="text-xs text-earth-300 mt-0.5 font-medium">{activity.subject}</p>
                      {!isExpanded && (
                        <p className="text-xs text-earth-500 mt-0.5 line-clamp-1">{activity.preview}</p>
                      )}
                    </div>

                    {/* Time + Channel */}
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-earth-500">{timeAgo}</p>
                      <span className={clsx('text-[10px] font-medium', chInfo.color)}>{activity.channel}</span>
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="ml-12 mr-3 mb-2 bg-earth-800/30 rounded-xl p-3 space-y-3">
                      <p className="text-sm text-earth-200 leading-relaxed">{activity.preview}</p>
                      <div className="flex items-center gap-2 text-xs text-earth-500">
                        <Clock className="w-3 h-3" />
                        {format(activity.timestamp, 'MMM d, yyyy h:mm a')}
                        {activity.responded !== undefined && (
                          <span className={clsx('ml-2', activity.responded ? 'text-green-400' : 'text-earth-500')}>
                            {activity.responded ? '✓ Customer responded' : '○ No response yet'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendQuickReply(activity.customerId, activity.customerName)}
                          className="flex items-center gap-1.5 bg-earth-800/60 hover:bg-earth-700 border border-earth-700 text-earth-300 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                          Quick Reply
                        </button>
                        <button
                          onClick={() => { setShowCompose(true); setComposeRecipient(activity.customerName); }}
                          className="flex items-center gap-1.5 text-earth-500 hover:text-earth-300 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Full Message
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TAB: Customer Health ═══ */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-earth-200 mb-1">Customer Health Dashboard</h2>
            <p className="text-xs text-earth-500">
              Health scores based on communication engagement, payment history, service frequency, and loyalty
            </p>
          </div>

          {/* Customer Health Cards */}
          <div className="space-y-2">
            {[...customerHealth]
              .sort((a, b) => a.healthScore - b.healthScore) // worst first
              .map(customer => (
                <div
                  key={customer.id}
                  className={clsx(
                    'border rounded-xl p-4 transition-colors',
                    customer.healthLevel === 'critical'
                      ? 'bg-red-500/5 border-red-500/30'
                      : customer.healthLevel === 'at_risk'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-earth-900/60 border-earth-800 hover:border-earth-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Health Ring */}
                    <HealthScoreRing score={customer.healthScore} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-earth-100">{customer.name}</h3>
                        <HealthBadge level={customer.healthLevel} />
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-earth-800 text-earth-400">{customer.type}</span>
                      </div>

                      {/* Metrics Row */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-earth-500">
                        <span>Last contact: <span className={clsx('font-medium', customer.daysSinceContact > 7 ? 'text-red-400' : customer.daysSinceContact > 3 ? 'text-amber-400' : 'text-earth-300')}>
                          {customer.daysSinceContact === 0 ? 'Today' : `${customer.daysSinceContact}d ago`}
                        </span></span>
                        <span>Response: <span className="text-earth-300 font-medium">{customer.responseRate}%</span></span>
                        <span>Payment: <span className={clsx('font-medium', customer.paymentScore >= 90 ? 'text-green-400' : customer.paymentScore >= 70 ? 'text-amber-400' : 'text-red-400')}>{customer.paymentScore}%</span></span>
                        <span className="hidden sm:inline">LTV: <span className="text-green-400 font-medium">${customer.lifetimeValue.toLocaleString()}</span></span>
                      </div>

                      {/* Next Action */}
                      <div className="mt-2 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-green-400 shrink-0" />
                        <span className="text-xs text-green-400 font-medium">{customer.nextAction}</span>
                      </div>

                      {/* Risk/Positive Factors */}
                      {(customer.riskFactors.length > 0 || customer.positiveFactors.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {customer.riskFactors.map((f, i) => (
                            <span key={`r-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              {f}
                            </span>
                          ))}
                          {customer.positiveFactors.slice(0, 2).map((f, i) => (
                            <span key={`p-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Action */}
                    <button
                      onClick={() => {
                        addToast('success', `Action started for ${customer.name}`);
                      }}
                      className={clsx(
                        'shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                        customer.healthLevel === 'critical'
                          ? 'bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400'
                          : customer.healthLevel === 'at_risk'
                          ? 'bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400'
                          : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400'
                      )}
                    >
                      {customer.nextActionType === 'call' ? <Phone className="w-3.5 h-3.5" /> :
                       customer.nextActionType === 'email' ? <Mail className="w-3.5 h-3.5" /> :
                       customer.nextActionType === 'visit' ? <MapPin className="w-3.5 h-3.5" /> :
                       <Receipt className="w-3.5 h-3.5" />}
                      {customer.nextActionType === 'call' ? 'Call' : customer.nextActionType === 'email' ? 'Email' : 'Action'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ═══ TAB: Templates ═══ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-earth-200 mb-1">Message Templates</h2>
            <p className="text-xs text-earth-500">
              Pre-built templates for common customer communications. Variables auto-fill with customer data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map(template => {
              const chInfo = channelIcons[template.channel];
              const Icon = template.icon;
              return (
                <div key={template.id} className="bg-earth-900/60 border border-earth-800 rounded-xl p-4 hover:border-earth-700 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', chInfo.bg)}>
                      <Icon className={clsx('w-4 h-4', chInfo.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-earth-200">{template.name}</h3>
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', chInfo.bg, chInfo.color)}>
                          {template.channel}
                        </span>
                      </div>
                      <p className="text-xs text-earth-500 mt-0.5">{template.category}</p>
                      <p className="text-xs text-earth-400 mt-1.5 line-clamp-2">{template.body}</p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-earth-500">
                        <span>Sent: <span className="text-earth-300">{template.sendCount}</span></span>
                        <span>Open rate: <span className={clsx(template.openRate >= 80 ? 'text-green-400' : 'text-earth-300')}>{template.openRate}%</span></span>
                        <span className="text-earth-600">
                          Vars: {template.variables.map(v => `{${v}}`).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setShowCompose(true);
                        setActiveTab('feed');
                        setComposeChannel(template.channel === 'sms' ? 'sms' : 'email');
                        setComposeSubject(template.subject);
                        setComposeBody(template.body);
                        addToast('info', `Template "${template.name}" loaded`);
                      }}
                      className="flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      Use Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TAB: Automations ═══ */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="bg-earth-900/60 border border-earth-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-earth-200 mb-1">Communication Automations</h2>
                <p className="text-xs text-earth-500">
                  Set up triggers that automatically send messages when events happen
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-earth-500">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                {triggers.filter(t => t.enabled).length} active
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {triggers.map(trigger => {
              const chInfo = channelIcons[trigger.channel];
              return (
                <div
                  key={trigger.id}
                  className={clsx(
                    'border rounded-xl p-4 transition-colors',
                    trigger.enabled ? 'bg-earth-900/60 border-earth-800' : 'bg-earth-900/30 border-earth-800/50 opacity-70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleTrigger(trigger.id)}
                      className={clsx(
                        'mt-0.5 w-10 h-6 rounded-full transition-colors cursor-pointer relative shrink-0',
                        trigger.enabled ? 'bg-green-500' : 'bg-earth-700'
                      )}
                    >
                      <div className={clsx(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm',
                        trigger.enabled ? 'left-[18px]' : 'left-0.5'
                      )} />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={clsx('text-sm font-medium', trigger.enabled ? 'text-earth-200' : 'text-earth-500')}>{trigger.name}</h3>
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', chInfo.bg, chInfo.color)}>
                          {trigger.channel}
                        </span>
                      </div>

                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-earth-500">When:</span>
                          <span className="text-earth-300">{trigger.event}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-earth-500">Then:</span>
                          <span className="text-earth-300">{trigger.action}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-earth-500">Delay:</span>
                          <span className="text-earth-300">{trigger.delay}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-[10px] text-earth-500">
                        <span>Fired: <span className="text-earth-300">{trigger.fireCount} times</span></span>
                        {trigger.lastFired && (
                          <span>Last: <span className="text-earth-300">{formatDistanceToNow(trigger.lastFired, { addSuffix: true })}</span></span>
                        )}
                        <span>Template: <span className="text-earth-300">{trigger.template}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
