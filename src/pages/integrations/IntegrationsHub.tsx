import { useState, useEffect, useCallback } from 'react';
import {
  Link2, CheckCircle, XCircle, RefreshCw, Download, Upload,
  Webhook, ChevronDown, ChevronRight, AlertCircle, Clock,
  FileText, Users, DollarSign, Package, ExternalLink, Copy,
  Plus, Trash2, ArrowRight, Zap, Globe, Shield, Activity,
  TrendingUp, BarChart3, Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { format, subDays, subHours, subMinutes } from 'date-fns';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';

// ─── Types ─────────────────────────────────────────────────────────────────

type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing';
type SyncStatus = 'success' | 'warning' | 'error' | 'pending';
type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

interface Integration {
  id: string;
  name: string;
  category: 'accounting' | 'payment' | 'calendar' | 'automation' | 'marketing' | 'communication';
  description: string;
  status: IntegrationStatus;
  logoBg: string;
  logoText: string;
  logoColor: string;
  lastSync: string | null;
  syncCount: number;
  errorCount: number;
  features: string[];
  popular?: boolean;
}

interface SyncEvent {
  id: string;
  integration: string;
  event: string;
  status: SyncStatus;
  records: number;
  timestamp: string;
  details: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  lastDelivery: string | null;
  successRate: number;
  deliveryCount: number;
}

interface ExportJob {
  id: string;
  name: string;
  type: string;
  format: ExportFormat;
  records: number;
  size: string;
  created: string;
  status: 'ready' | 'generating';
}

// ─── Demo Data ─────────────────────────────────────────────────────────────

const today = new Date('2026-03-12');

const INTEGRATIONS: Integration[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'accounting',
    description: 'Sync invoices, expenses, customers, and payments automatically. Two-way sync keeps your books and CRM in perfect alignment.',
    status: 'connected',
    logoBg: 'bg-[#2CA01C]/15',
    logoText: 'QB',
    logoColor: 'text-[#2CA01C]',
    lastSync: subHours(today, 2).toISOString(),
    syncCount: 1847,
    errorCount: 0,
    features: ['Invoices', 'Customers', 'Expenses', 'Payments', 'Chart of Accounts'],
    popular: true,
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'payment',
    description: 'Accept credit cards and ACH payments online. Customers pay invoices with a single click from their portal.',
    status: 'connected',
    logoBg: 'bg-[#635BFF]/15',
    logoText: 'S',
    logoColor: 'text-[#635BFF]',
    lastSync: subMinutes(today, 34).toISOString(),
    syncCount: 423,
    errorCount: 1,
    features: ['Card Payments', 'ACH', 'Subscriptions', 'Refunds', 'Payouts'],
    popular: true,
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    category: 'calendar',
    description: 'Push scheduled jobs to crew members\' Google Calendars. Crew always knows what\'s on their plate.',
    status: 'connected',
    logoBg: 'bg-blue-500/15',
    logoText: 'GC',
    logoColor: 'text-blue-400',
    lastSync: subMinutes(today, 12).toISOString(),
    syncCount: 312,
    errorCount: 0,
    features: ['Job Schedule', 'Crew Events', 'Customer Appointments', 'Reminders'],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'automation',
    description: 'Connect to 5,000+ apps. Trigger workflows when jobs complete, invoices are paid, or new customers sign up.',
    status: 'disconnected',
    logoBg: 'bg-orange-500/15',
    logoText: 'Z',
    logoColor: 'text-orange-400',
    lastSync: null,
    syncCount: 0,
    errorCount: 0,
    features: ['Triggers', 'Actions', '5,000+ Apps', 'Multi-step Zaps'],
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'marketing',
    description: 'Sync customer lists and automate seasonal email campaigns. Re-engage dormant clients automatically.',
    status: 'disconnected',
    logoBg: 'bg-yellow-500/15',
    logoText: 'MC',
    logoColor: 'text-yellow-400',
    lastSync: null,
    syncCount: 0,
    errorCount: 0,
    features: ['Customer Sync', 'Email Campaigns', 'Segmentation', 'Analytics'],
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    category: 'communication',
    description: 'Send automated text messages to customers — crew on the way, job complete, invoice ready.',
    status: 'error',
    logoBg: 'bg-red-500/15',
    logoText: 'TW',
    logoColor: 'text-red-400',
    lastSync: subDays(today, 2).toISOString(),
    syncCount: 89,
    errorCount: 12,
    features: ['Job Notifications', 'Invoice Alerts', '2-Way SMS', 'Templates'],
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'accounting',
    description: 'Alternative to QuickBooks for international businesses. Full invoice and expense sync.',
    status: 'disconnected',
    logoBg: 'bg-sky-500/15',
    logoText: 'X',
    logoColor: 'text-sky-400',
    lastSync: null,
    syncCount: 0,
    errorCount: 0,
    features: ['Invoices', 'Bills', 'Contacts', 'Bank Rec'],
  },
  {
    id: 'gusto',
    name: 'Gusto Payroll',
    category: 'payment',
    description: 'Sync crew time tracking data to Gusto for automatic payroll calculation.',
    status: 'disconnected',
    logoBg: 'bg-green-500/15',
    logoText: 'G',
    logoColor: 'text-green-400',
    lastSync: null,
    syncCount: 0,
    errorCount: 0,
    features: ['Time Sync', 'Payroll', 'Benefits', 'Tax Filing'],
  },
];

const SYNC_EVENTS: SyncEvent[] = [
  { id: 'se1', integration: 'QuickBooks', event: 'Invoice sync', status: 'success', records: 4, timestamp: subMinutes(today, 12).toISOString(), details: '4 invoices pushed to QB: INV-2026-001 through INV-2026-004' },
  { id: 'se2', integration: 'Stripe', event: 'Payment received', status: 'success', records: 1, timestamp: subMinutes(today, 34).toISOString(), details: 'Payment $1,800.00 from City of Pflugerville — INV-2026-001' },
  { id: 'se3', integration: 'Google Calendar', event: 'Job scheduled', status: 'success', records: 3, timestamp: subHours(today, 1).toISOString(), details: '3 jobs added to Alpha Crew calendar: Mar 13–15' },
  { id: 'se4', integration: 'QuickBooks', event: 'Customer sync', status: 'success', records: 12, timestamp: subHours(today, 2).toISOString(), details: '12 customer records synchronized. 1 updated, 11 unchanged.' },
  { id: 'se5', integration: 'Twilio', event: 'SMS delivery failed', status: 'error', records: 0, timestamp: subHours(today, 3).toISOString(), details: 'ERROR: Invalid API credentials. Re-connect Twilio to restore SMS notifications.' },
  { id: 'se6', integration: 'QuickBooks', event: 'Expense import', status: 'success', records: 7, timestamp: subHours(today, 5).toISOString(), details: '7 expense categories imported from QB Chart of Accounts' },
  { id: 'se7', integration: 'Stripe', event: 'Payout initiated', status: 'success', records: 1, timestamp: subHours(today, 8).toISOString(), details: '$6,240.50 payout to checking account — expected Mar 14' },
  { id: 'se8', integration: 'Google Calendar', event: 'Schedule update', status: 'warning', records: 2, timestamp: subHours(today, 12).toISOString(), details: '2 calendar events could not update (crew calendar not shared). Pending re-auth.' },
  { id: 'se9', integration: 'QuickBooks', event: 'Full sync', status: 'success', records: 156, timestamp: subDays(today, 1).toISOString(), details: 'Full sync: 89 invoices, 42 customers, 25 expenses aligned with QuickBooks.' },
  { id: 'se10', integration: 'Stripe', event: 'Webhook received', status: 'success', records: 1, timestamp: subDays(today, 1).toISOString(), details: 'payment_intent.succeeded — $2,598.00 from Riverside Office Park' },
];

const WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh1',
    name: 'Job Completion Notifier',
    url: 'https://hooks.zapier.com/hooks/catch/123456/abcdef',
    events: ['job.completed', 'job.started'],
    active: true,
    lastDelivery: subHours(today, 1).toISOString(),
    successRate: 98.4,
    deliveryCount: 247,
  },
  {
    id: 'wh2',
    name: 'Invoice Paid → Slack',
    url: 'https://hooks.slack.com/services/T00/B00/xxxxx',
    events: ['invoice.paid', 'payment.received'],
    active: true,
    lastDelivery: subHours(today, 3).toISOString(),
    successRate: 100,
    deliveryCount: 89,
  },
  {
    id: 'wh3',
    name: 'New Customer → HubSpot',
    url: 'https://api.hubspot.com/webhooks/v3/12345',
    events: ['customer.created', 'customer.updated'],
    active: false,
    lastDelivery: subDays(today, 5).toISOString(),
    successRate: 91.2,
    deliveryCount: 34,
  },
];

const EXPORTS: ExportJob[] = [
  { id: 'ex1', name: 'All Invoices Q1 2026', type: 'invoices', format: 'csv', records: 47, size: '24 KB', created: subHours(today, 2).toISOString(), status: 'ready' },
  { id: 'ex2', name: 'Customer List (All)', type: 'customers', format: 'excel', records: 28, size: '41 KB', created: subDays(today, 1).toISOString(), status: 'ready' },
  { id: 'ex3', name: 'Expense Report Mar 2026', type: 'expenses', format: 'pdf', records: 15, size: '88 KB', created: subDays(today, 2).toISOString(), status: 'ready' },
  { id: 'ex4', name: 'Jobs by Crew Feb 2026', type: 'jobs', format: 'excel', records: 34, size: '56 KB', created: subDays(today, 7).toISOString(), status: 'ready' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = new Date(today).getTime() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_LABELS: Record<Integration['category'], string> = {
  accounting: 'Accounting',
  payment: 'Payments',
  calendar: 'Calendar',
  automation: 'Automation',
  marketing: 'Marketing',
  communication: 'Communication',
};

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: 'green' | 'earth' | 'red' | 'amber'; icon: typeof CheckCircle }> = {
  connected: { label: 'Connected', color: 'green', icon: CheckCircle },
  disconnected: { label: 'Not Connected', color: 'earth', icon: XCircle },
  error: { label: 'Error', color: 'red', icon: AlertCircle },
  syncing: { label: 'Syncing…', color: 'amber', icon: RefreshCw },
};

const SYNC_STATUS_CONFIG: Record<SyncStatus, { color: string; icon: typeof CheckCircle }> = {
  success: { color: 'text-green-400', icon: CheckCircle },
  warning: { color: 'text-amber-400', icon: AlertCircle },
  error: { color: 'text-red-400', icon: XCircle },
  pending: { color: 'text-earth-400', icon: Clock },
};

const FORMAT_COLORS: Record<ExportFormat, string> = {
  csv: 'text-green-400 bg-green-500/10',
  excel: 'text-sky-400 bg-sky-500/10',
  pdf: 'text-red-400 bg-red-500/10',
  json: 'text-purple-400 bg-purple-500/10',
};

// ─── Main Component ────────────────────────────────────────────────────────

type Tab = 'apps' | 'sync' | 'export' | 'webhooks';

export default function IntegrationsHub() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('apps');
  const [categoryFilter, setCategoryFilter] = useState<Integration['category'] | 'all'>('all');
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>(SYNC_EVENTS);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(WEBHOOKS);
  const [exports, setExports] = useState<ExportJob[]>(EXPORTS);
  const [expandedSync, setExpandedSync] = useState<string | null>(null);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [generatingExport, setGeneratingExport] = useState<string | null>(null);

  const connected = integrations.filter(i => i.status === 'connected');
  const errors = integrations.filter(i => i.status === 'error');
  const totalSynced = integrations.reduce((s, i) => s + i.syncCount, 0);

  const filteredIntegrations = categoryFilter === 'all'
    ? integrations
    : integrations.filter(i => i.category === categoryFilter);

  // ── Sync Now ──────────────────────────────────────────────────────────────
  const handleSync = useCallback((id: string, name: string) => {
    setSyncingId(id);
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'syncing' } : i));

    setTimeout(() => {
      const records = Math.floor(Math.random() * 50) + 5;
      setSyncingId(null);
      setIntegrations(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'connected', lastSync: today.toISOString(), syncCount: i.syncCount + records } : i
      ));
      const newEvent: SyncEvent = {
        id: `se-new-${Date.now()}`,
        integration: name,
        event: 'Manual sync',
        status: 'success',
        records,
        timestamp: today.toISOString(),
        details: `${records} records synced successfully.`,
      };
      setSyncEvents(prev => [newEvent, ...prev]);
      addToast('success', `${name} synced — ${records} records updated`);
    }, 2200);
  }, [addToast]);

  // ── Connect / Disconnect ───────────────────────────────────────────────────
  const handleConnect = useCallback((id: string, name: string, currentStatus: IntegrationStatus) => {
    if (currentStatus === 'connected' || currentStatus === 'error') {
      // Disconnect
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'disconnected', lastSync: null } : i));
      addToast('info', `${name} disconnected`);
      return;
    }

    setConnectingId(id);
    // Simulate OAuth flow
    setTimeout(() => {
      setConnectingId(null);
      setIntegrations(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'connected', lastSync: today.toISOString() } : i
      ));
      addToast('success', `${name} connected successfully!`);
    }, 1800);
  }, [addToast]);

  // ── Fix Error ─────────────────────────────────────────────────────────────
  const handleFixError = useCallback((id: string, name: string) => {
    setConnectingId(id);
    setTimeout(() => {
      setConnectingId(null);
      setIntegrations(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'connected', errorCount: 0, lastSync: today.toISOString() } : i
      ));
      addToast('success', `${name} reconnected — all errors cleared`);
    }, 2000);
  }, [addToast]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback((type: string, format: ExportFormat, label: string) => {
    const key = `${type}-${format}`;
    setGeneratingExport(key);
    setTimeout(() => {
      setGeneratingExport(null);
      const records = Math.floor(Math.random() * 80) + 10;
      const sizeKb = Math.floor(records * 1.5);
      const newExport: ExportJob = {
        id: `ex-${Date.now()}`,
        name: `${label} — ${format(today, 'MMM d, yyyy')}`,
        type,
        format,
        records,
        size: `${sizeKb} KB`,
        created: today.toISOString(),
        status: 'ready',
      };
      setExports(prev => [newExport, ...prev]);
      addToast('success', `${label} exported — ${records} records ready to download`);
    }, 1500);
  }, [addToast]);

  // ── Webhook toggle ─────────────────────────────────────────────────────────
  const handleWebhookToggle = useCallback((id: string, name: string, active: boolean) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w));
    addToast(active ? 'info' : 'success', `${name} ${active ? 'disabled' : 'enabled'}`);
  }, [addToast]);

  // ── Add Webhook ──────────────────────────────────────────────────────────
  const handleAddWebhook = useCallback(() => {
    if (!newWebhookUrl.trim()) {
      addToast('error', 'Please enter a webhook URL');
      return;
    }
    const newWh: WebhookEndpoint = {
      id: `wh-${Date.now()}`,
      name: 'Custom Webhook',
      url: newWebhookUrl,
      events: ['job.completed'],
      active: true,
      lastDelivery: null,
      successRate: 0,
      deliveryCount: 0,
    };
    setWebhooks(prev => [...prev, newWh]);
    setNewWebhookUrl('');
    setShowAddWebhook(false);
    addToast('success', 'Webhook endpoint added');
  }, [newWebhookUrl, addToast]);

  const CATEGORIES: Array<{ key: Integration['category'] | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'accounting', label: 'Accounting' },
    { key: 'payment', label: 'Payments' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'automation', label: 'Automation' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'communication', label: 'Communication' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold font-display text-earth-50">Integrations Hub</h1>
          </div>
          <p className="text-sm text-earth-400 ml-12">Connect your tools. Sync your books. Run on autopilot.</p>
        </div>

        {/* Error alert */}
        {errors.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{errors.length} integration{errors.length > 1 ? 's' : ''} need{errors.length === 1 ? 's' : ''} attention</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Connected"
          value={connected.length}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Total Synced"
          value={totalSynced.toLocaleString()}
          icon={<RefreshCw className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          title="Payments Processed"
          value="$8,420"
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          change={22}
        />
        <StatCard
          title="Active Webhooks"
          value={webhooks.filter(w => w.active).length}
          icon={<Webhook className="w-5 h-5" />}
          color="earth"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900/60 border border-earth-800 rounded-xl p-1">
        {([
          { key: 'apps' as Tab, label: 'Connected Apps', icon: Link2, count: connected.length },
          { key: 'sync' as Tab, label: 'Sync Center', icon: RefreshCw, count: syncEvents.filter(e => e.status === 'error').length || null },
          { key: 'export' as Tab, label: 'Export Hub', icon: Download, count: null },
          { key: 'webhooks' as Tab, label: 'Webhooks', icon: Webhook, count: webhooks.filter(w => w.active).length },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                activeTab === tab.key
                  ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20'
                  : 'text-earth-400 hover:text-earth-200'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className={clsx(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold',
                  tab.key === 'sync' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Connected Apps ─────────────────────────────────────────── */}
      {activeTab === 'apps' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                  categoryFilter === cat.key
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'bg-earth-800/40 text-earth-400 hover:text-earth-200 border border-earth-800'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Integration cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredIntegrations.map(integration => {
              const statusCfg = STATUS_CONFIG[integration.status];
              const StatusIcon = statusCfg.icon;
              const isSyncing = syncingId === integration.id || integration.status === 'syncing';
              const isConnecting = connectingId === integration.id;

              return (
                <div
                  key={integration.id}
                  className={clsx(
                    'relative bg-earth-900 border rounded-2xl p-5 transition-all duration-200 hover:border-earth-700',
                    integration.status === 'connected' && 'border-earth-800',
                    integration.status === 'disconnected' && 'border-earth-800/60 opacity-80 hover:opacity-100',
                    integration.status === 'error' && 'border-red-500/30 bg-red-500/5',
                    integration.status === 'syncing' && 'border-purple-500/30'
                  )}
                >
                  {integration.popular && integration.status === 'disconnected' && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">Popular</span>
                    </div>
                  )}

                  {/* Logo + name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm', integration.logoBg, integration.logoColor)}>
                      {integration.logoText}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-earth-50 text-sm">{integration.name}</h3>
                      <span className="text-xs text-earth-500 capitalize">{CATEGORY_LABELS[integration.category]}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-earth-400 leading-relaxed mb-4">{integration.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {integration.features.map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 bg-earth-800 text-earth-400 rounded-md">{f}</span>
                    ))}
                  </div>

                  {/* Status row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={clsx(
                        'w-3.5 h-3.5',
                        isSyncing ? 'text-purple-400 animate-spin' : '',
                        statusCfg.color === 'green' && !isSyncing ? 'text-green-400' : '',
                        statusCfg.color === 'red' ? 'text-red-400' : '',
                        statusCfg.color === 'earth' ? 'text-earth-500' : '',
                        statusCfg.color === 'amber' ? 'text-amber-400' : '',
                      )} />
                      <span className={clsx(
                        'text-xs font-medium',
                        statusCfg.color === 'green' && !isSyncing ? 'text-green-400' : '',
                        statusCfg.color === 'red' ? 'text-red-400' : '',
                        statusCfg.color === 'earth' ? 'text-earth-500' : '',
                        isSyncing ? 'text-purple-400' : '',
                      )}>
                        {isSyncing ? 'Syncing…' : statusCfg.label}
                      </span>
                    </div>
                    {integration.lastSync && (
                      <span className="text-[10px] text-earth-600">{timeAgo(integration.lastSync)}</span>
                    )}
                  </div>

                  {/* Stats (connected only) */}
                  {integration.status === 'connected' && (
                    <div className="flex gap-3 mb-4 pt-3 border-t border-earth-800/60">
                      <div className="text-center">
                        <p className="text-xs font-semibold text-earth-100">{integration.syncCount.toLocaleString()}</p>
                        <p className="text-[10px] text-earth-600">Records synced</p>
                      </div>
                      <div className="text-center">
                        <p className={clsx('text-xs font-semibold', integration.errorCount > 0 ? 'text-red-400' : 'text-green-400')}>
                          {integration.errorCount}
                        </p>
                        <p className="text-[10px] text-earth-600">Errors</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {integration.status === 'error' ? (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={isConnecting}
                          onClick={() => handleFixError(integration.id, integration.name)}
                          className="flex-1 text-xs"
                        >
                          Fix Connection
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => addToast('info', 'Opening error details…')}>
                          <AlertCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : integration.status === 'connected' ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={isSyncing}
                          onClick={() => handleSync(integration.id, integration.name)}
                          className="flex-1 text-xs border border-earth-700"
                          icon={<RefreshCw className="w-3 h-3" />}
                        >
                          Sync Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConnect(integration.id, integration.name, integration.status)}
                          className="text-xs text-earth-500 hover:text-red-400"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isConnecting}
                        onClick={() => handleConnect(integration.id, integration.name, integration.status)}
                        className="flex-1 text-xs"
                        icon={<Link2 className="w-3 h-3" />}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Sync Center ────────────────────────────────────────────── */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          {/* Sync summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Syncs today', value: syncEvents.filter(e => new Date(e.timestamp) > subHours(today, 24)).length, color: 'text-green-400' },
              { label: 'Records moved', value: syncEvents.reduce((s, e) => s + e.records, 0).toLocaleString(), color: 'text-sky-400' },
              { label: 'Warnings', value: syncEvents.filter(e => e.status === 'warning').length, color: 'text-amber-400' },
              { label: 'Errors', value: syncEvents.filter(e => e.status === 'error').length, color: 'text-red-400' },
            ].map(item => (
              <div key={item.label} className="bg-earth-900 border border-earth-800 rounded-xl p-4">
                <p className={clsx('text-2xl font-bold font-display', item.color)}>{item.value}</p>
                <p className="text-xs text-earth-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Sync log */}
          <Card header={
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-display text-earth-100">Sync Activity</h3>
              <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => addToast('success', 'Sync log refreshed')}>
                Refresh
              </Button>
            </div>
          }>
            <div className="space-y-1">
              {syncEvents.map(event => {
                const cfg = SYNC_STATUS_CONFIG[event.status];
                const Icon = cfg.icon;
                const isExpanded = expandedSync === event.id;

                return (
                  <div key={event.id} className="border border-earth-800/60 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-earth-800/30 transition-colors cursor-pointer text-left"
                      onClick={() => setExpandedSync(isExpanded ? null : event.id)}
                    >
                      <Icon className={clsx('w-4 h-4 shrink-0', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-earth-100">{event.integration}</span>
                          <span className="text-earth-600">·</span>
                          <span className="text-sm text-earth-400">{event.event}</span>
                          {event.records > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-earth-800 text-earth-400 rounded-md">{event.records} records</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-earth-600 shrink-0">{timeAgo(event.timestamp)}</span>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-earth-600 shrink-0" /> : <ChevronRight className="w-4 h-4 text-earth-600 shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0 border-t border-earth-800/60 bg-earth-900/50">
                        <p className="text-xs text-earth-400 mt-2">{event.details}</p>
                        <p className="text-[10px] text-earth-600 mt-1">{format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}</p>
                        {event.status === 'error' && (
                          <button
                            className="mt-2 text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                            onClick={() => addToast('info', 'Opening error resolution guide…')}
                          >
                            View resolution steps →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: Export Hub ─────────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Quick export buttons */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Quick Export</h3>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { type: 'invoices', label: 'All Invoices', icon: FileText, formats: ['csv', 'excel', 'pdf'] },
                { type: 'customers', label: 'Customer List', icon: Users, formats: ['csv', 'excel'] },
                { type: 'expenses', label: 'Expenses', icon: DollarSign, formats: ['csv', 'excel', 'pdf'] },
                { type: 'jobs', label: 'Job History', icon: Package, formats: ['csv', 'excel'] },
              ] as const).map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="bg-earth-800/40 border border-earth-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-earth-300" />
                      <span className="text-sm font-medium text-earth-100">{item.label}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.formats.map(fmt => {
                        const key = `${item.type}-${fmt}`;
                        const isGenerating = generatingExport === key;
                        return (
                          <button
                            key={fmt}
                            onClick={() => handleExport(item.type, fmt as ExportFormat, item.label)}
                            disabled={!!generatingExport}
                            className={clsx(
                              'text-[11px] px-2 py-1 rounded-md font-medium transition-all cursor-pointer',
                              FORMAT_COLORS[fmt as ExportFormat],
                              isGenerating ? 'opacity-50' : 'hover:opacity-80'
                            )}
                          >
                            {isGenerating ? '…' : fmt.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* QuickBooks export section */}
          <Card header={
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#2CA01C]/20 flex items-center justify-center text-[10px] font-bold text-[#2CA01C]">QB</div>
              <h3 className="text-base font-semibold font-display text-earth-100">QuickBooks Export</h3>
              <Badge color="green" dot>Connected</Badge>
            </div>
          }>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Push Invoices to QB', desc: 'Sync all unpushed invoices', count: 4, action: 'Push 4 Invoices' },
                { label: 'Import QB Expenses', desc: 'Pull latest from QuickBooks', count: 12, action: 'Import 12 Expenses' },
                { label: 'Reconcile Payments', desc: 'Match QB deposits to invoices', count: 3, action: 'Reconcile 3 Payments' },
              ].map(item => (
                <div key={item.label} className="bg-earth-800/30 border border-earth-700 rounded-xl p-4">
                  <p className="text-sm font-medium text-earth-100 mb-1">{item.label}</p>
                  <p className="text-xs text-earth-500 mb-3">{item.desc}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs border border-[#2CA01C]/30 text-[#2CA01C] hover:bg-[#2CA01C]/10"
                    icon={<ArrowRight className="w-3 h-3" />}
                    onClick={() => {
                      addToast('success', `${item.action} — syncing with QuickBooks…`);
                    }}
                  >
                    {item.action}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Export history */}
          <Card header={<h3 className="text-base font-semibold font-display text-earth-100">Recent Exports</h3>}>
            <div className="space-y-2">
              {exports.map(exp => (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-3 bg-earth-800/30 border border-earth-800/60 rounded-xl">
                  <div className={clsx('text-[10px] px-2 py-0.5 rounded-md font-bold uppercase', FORMAT_COLORS[exp.format])}>
                    {exp.format}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-earth-100 truncate">{exp.name}</p>
                    <p className="text-xs text-earth-500">{exp.records} records · {exp.size}</p>
                  </div>
                  <span className="text-xs text-earth-600 shrink-0">{timeAgo(exp.created)}</span>
                  <button
                    className="p-1.5 text-earth-400 hover:text-earth-200 hover:bg-earth-700 rounded-lg transition-colors cursor-pointer"
                    onClick={() => addToast('success', `Downloading ${exp.name}…`)}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: Webhooks ────────────────────────────────────────────────── */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-earth-400">Send real-time data to external apps when events happen in Maas Verde.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddWebhook(true)}
            >
              Add Endpoint
            </Button>
          </div>

          {/* Add webhook form */}
          {showAddWebhook && (
            <div className="bg-earth-900 border border-purple-500/30 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-earth-100 mb-3">New Webhook Endpoint</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-earth-400 mb-1 block">Endpoint URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newWebhookUrl}
                      onChange={e => setNewWebhookUrl(e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      className="flex-1 bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder-earth-600 focus:outline-none focus:border-purple-500"
                    />
                    <Button variant="primary" size="sm" onClick={handleAddWebhook}>Add</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
                  </div>
                </div>
                <p className="text-xs text-earth-500">We'll send a POST request with JSON payload to this URL when the selected events occur.</p>
              </div>
            </div>
          )}

          {/* Webhook list */}
          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className={clsx(
                'bg-earth-900 border rounded-2xl p-5 transition-all',
                wh.active ? 'border-earth-800' : 'border-earth-800/40 opacity-70'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-earth-100">{wh.name}</h3>
                      <Badge color={wh.active ? 'green' : 'earth'} dot>{wh.active ? 'Active' : 'Disabled'}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-3.5 h-3.5 text-earth-600" />
                      <code className="text-xs text-earth-500 truncate">{wh.url}</code>
                      <button
                        className="p-0.5 text-earth-600 hover:text-earth-400 cursor-pointer"
                        onClick={() => { navigator.clipboard.writeText(wh.url); addToast('success', 'URL copied'); }}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {wh.events.map(ev => (
                        <span key={ev} className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-earth-600">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {wh.deliveryCount} deliveries
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {wh.successRate}% success
                      </span>
                      {wh.lastDelivery && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {timeAgo(wh.lastDelivery)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => handleWebhookToggle(wh.id, wh.name, wh.active)}
                      className={clsx(
                        'relative w-11 h-6 rounded-full transition-colors cursor-pointer',
                        wh.active ? 'bg-green-600' : 'bg-earth-700'
                      )}
                    >
                      <span className={clsx(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        wh.active ? 'translate-x-5' : 'translate-x-0'
                      )} />
                    </button>
                    <button
                      className="p-1.5 text-earth-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        setWebhooks(prev => prev.filter(w => w.id !== wh.id));
                        addToast('info', `${wh.name} removed`);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Available events reference */}
          <Card header={
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold font-display text-earth-100">Available Events</h3>
            </div>
          }>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { category: 'Jobs', events: ['job.created', 'job.started', 'job.completed', 'job.cancelled'] },
                { category: 'Invoices', events: ['invoice.created', 'invoice.sent', 'invoice.paid', 'invoice.overdue'] },
                { category: 'Customers', events: ['customer.created', 'customer.updated', 'customer.deleted'] },
                { category: 'Payments', events: ['payment.received', 'payment.failed', 'payment.refunded'] },
                { category: 'Quotes', events: ['quote.sent', 'quote.accepted', 'quote.declined'] },
                { category: 'Schedule', events: ['job.scheduled', 'job.rescheduled', 'crew.assigned'] },
              ].map(section => (
                <div key={section.category} className="bg-earth-800/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-earth-300 mb-2">{section.category}</p>
                  <div className="space-y-1">
                    {section.events.map(ev => (
                      <p key={ev} className="text-[10px] font-mono text-earth-500">{ev}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
