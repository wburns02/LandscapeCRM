import { useState, useMemo } from 'react';
import {
  Bell, BellRing, Send, Phone, Eye, CheckCircle, Clock, AlertTriangle,
  TrendingUp, DollarSign, Users, ChevronDown, ChevronRight, Mail,
  MessageSquare, Settings, History, Filter, Zap, Check, RotateCcw,
  FileText, MoreVertical, ArrowRight, Star,
} from 'lucide-react';
import clsx from 'clsx';
import { format, differenceInDays, subDays } from 'date-fns';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';

// ---------- Demo overdue invoices (supplement real data) ----------
const DEMO_OVERDUE = [
  {
    id: 'd1', invoice_number: 'INV-2026-003', customer_name: 'Lakewood HOA',
    customer_phone: '(512) 555-0303', customer_email: 'board@lakewood.org',
    amount_owed: 4200, due_date: '2026-02-28', status: 'overdue',
    service: 'February HOA Maintenance', last_reminder: null, reminder_count: 0,
  },
  {
    id: 'd2', invoice_number: 'INV-2026-004', customer_name: 'Sarah Mitchell',
    customer_phone: '(512) 555-0101', customer_email: 'sarah@example.com',
    amount_owed: 357.75, due_date: '2026-03-10', status: 'partial',
    service: 'Weekly Maintenance — February (4 visits)', last_reminder: '2026-03-08', reminder_count: 1,
  },
  {
    id: 'd3', invoice_number: 'INV-2026-007', customer_name: 'Green Valleys HOA',
    customer_phone: '(512) 555-0777', customer_email: 'hoa@greenvalley.org',
    amount_owed: 2850, due_date: '2026-03-05', status: 'overdue',
    service: 'March Grounds Maintenance', last_reminder: '2026-03-09', reminder_count: 1,
  },
  {
    id: 'd4', invoice_number: 'INV-2026-009', customer_name: 'Riverside Office Park',
    customer_phone: '(512) 555-0202', customer_email: 'manager@riverside.com',
    amount_owed: 1240, due_date: '2026-03-08', status: 'overdue',
    service: 'Spring Cleanup & Mulch Install', last_reminder: null, reminder_count: 0,
  },
  {
    id: 'd5', invoice_number: 'INV-2026-012', customer_name: 'Tom Bradley',
    customer_phone: '(512) 555-2003', customer_email: 'tom@example.com',
    amount_owed: 6800, due_date: '2026-02-15', status: 'overdue',
    service: 'Patio Pavers & Outdoor Kitchen', last_reminder: '2026-03-01', reminder_count: 2,
  },
  {
    id: 'd6', invoice_number: 'INV-2025-087', customer_name: 'Oakmont Business Center',
    customer_phone: '(512) 555-2002', customer_email: 'facilities@oakmont.com',
    amount_owed: 3900, due_date: '2026-01-31', status: 'overdue',
    service: 'Q4 Grounds Contract Balance', last_reminder: '2026-02-28', reminder_count: 3,
  },
  {
    id: 'd7', invoice_number: 'INV-2026-015', customer_name: 'David Chen',
    customer_phone: '(512) 555-0404', customer_email: 'david@example.com',
    amount_owed: 485, due_date: '2026-03-09', status: 'overdue',
    service: 'Irrigation System Repair', last_reminder: null, reminder_count: 0,
  },
  {
    id: 'd8', invoice_number: 'INV-2025-092', customer_name: 'Cedar Ridge HOA',
    customer_phone: '(512) 555-0888', customer_email: 'manager@cedarridge.com',
    amount_owed: 7600, due_date: '2025-12-31', status: 'overdue',
    service: 'Annual Contract Q4 Balance', last_reminder: '2026-02-01', reminder_count: 4,
  },
];

const TODAY = new Date('2026-03-12');

type ComputedInvoice = typeof DEMO_OVERDUE[0] & { daysOverdue: number; ageGroup: '1-7' | '8-14' | '15-30' | '30+' };

function getDaysOverdue(dueDate: string): number {
  return Math.max(0, differenceInDays(TODAY, new Date(dueDate)));
}

function getReminderStage(count: number): { label: string; color: 'green' | 'amber' | 'red' | 'earth'; step: number } {
  if (count === 0) return { label: '1st Reminder', color: 'green', step: 1 };
  if (count === 1) return { label: '2nd Notice', color: 'amber', step: 2 };
  if (count === 2) return { label: 'Final Notice', color: 'red', step: 3 };
  return { label: 'Escalate', color: 'red', step: 4 };
}

function getAgeGroup(days: number): '1-7' | '8-14' | '15-30' | '30+' {
  if (days <= 7) return '1-7';
  if (days <= 14) return '8-14';
  if (days <= 30) return '15-30';
  return '30+';
}

const AGE_CONFIG = {
  '1-7': { label: '1–7 Days Overdue', color: 'text-amber-400', bg: 'bg-amber-600/10 border-amber-600/20', icon: Clock },
  '8-14': { label: '8–14 Days Overdue', color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-600/20', icon: AlertTriangle },
  '15-30': { label: '15–30 Days Overdue', color: 'text-red-400', bg: 'bg-red-600/10 border-red-600/20', icon: AlertTriangle },
  '30+': { label: '30+ Days Overdue', color: 'text-red-500', bg: 'bg-red-900/20 border-red-700/30', icon: BellRing },
};

const DEFAULT_TEMPLATES = [
  {
    id: 'friendly',
    name: 'Friendly Reminder',
    stage: 1,
    days: 7,
    subject: 'Friendly reminder: Invoice {{invoice_number}} due',
    body: `Hi {{customer_name}},

Hope you're doing well! Just a friendly reminder that invoice {{invoice_number}} for {{amount}} is now {{days}} days past due.

If you've already sent payment, please disregard this message. Otherwise, you can pay online or give us a call.

Thank you for your business!

Best,
{{company_name}}`,
    color: 'green' as const,
  },
  {
    id: 'firm',
    name: 'Second Notice',
    stage: 2,
    days: 14,
    subject: 'Second notice: Invoice {{invoice_number}} — payment required',
    body: `Hi {{customer_name}},

This is our second notice regarding invoice {{invoice_number}} for {{amount}}, which is now {{days}} days past due.

We value your business and want to resolve this quickly. Please make payment at your earliest convenience to avoid any service disruption.

If you have questions about this invoice or need to discuss payment arrangements, please contact us right away.

Best regards,
{{company_name}}`,
    color: 'amber' as const,
  },
  {
    id: 'final',
    name: 'Final Notice',
    stage: 3,
    days: 30,
    subject: 'FINAL NOTICE: Invoice {{invoice_number}} — immediate action required',
    body: `Dear {{customer_name}},

This is a final notice that invoice {{invoice_number}} for {{amount}} is now {{days}} days past due. This account has been flagged for collections review.

To avoid further action, payment must be received within 5 business days.

Please contact us immediately at {{company_phone}} to arrange payment.

Regards,
{{company_name}}`,
    color: 'red' as const,
  },
];

type ReminderLog = {
  id: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  channel: 'email' | 'sms';
  stage: string;
  sent_at: string;
  result: 'delivered' | 'opened' | 'paid' | 'bounced';
};

const DEMO_LOG: ReminderLog[] = [
  { id: 'l1', invoice_number: 'INV-2026-004', customer_name: 'Sarah Mitchell', amount: 357.75, channel: 'email', stage: '1st Reminder', sent_at: '2026-03-08T10:30:00Z', result: 'opened' },
  { id: 'l2', invoice_number: 'INV-2026-007', customer_name: 'Green Valleys HOA', amount: 2850, channel: 'email', stage: '1st Reminder', sent_at: '2026-03-09T09:00:00Z', result: 'delivered' },
  { id: 'l3', invoice_number: 'INV-2026-012', customer_name: 'Tom Bradley', amount: 6800, channel: 'email', stage: '1st Reminder', sent_at: '2026-03-01T08:00:00Z', result: 'opened' },
  { id: 'l4', invoice_number: 'INV-2026-012', customer_name: 'Tom Bradley', amount: 6800, channel: 'sms', stage: '2nd Notice', sent_at: '2026-03-07T14:00:00Z', result: 'delivered' },
  { id: 'l5', invoice_number: 'INV-2025-087', customer_name: 'Oakmont Business Center', amount: 3900, channel: 'email', stage: '1st Reminder', sent_at: '2026-02-14T09:00:00Z', result: 'opened' },
  { id: 'l6', invoice_number: 'INV-2025-087', customer_name: 'Oakmont Business Center', amount: 3900, channel: 'email', stage: '2nd Notice', sent_at: '2026-02-21T09:00:00Z', result: 'opened' },
  { id: 'l7', invoice_number: 'INV-2025-087', customer_name: 'Oakmont Business Center', amount: 3900, channel: 'sms', stage: 'Final Notice', sent_at: '2026-02-28T10:00:00Z', result: 'delivered' },
  { id: 'l8', invoice_number: 'INV-2025-092', customer_name: 'Cedar Ridge HOA', amount: 7600, channel: 'email', stage: '1st Reminder', sent_at: '2025-12-15T09:00:00Z', result: 'opened' },
  { id: 'l9', invoice_number: 'INV-2025-092', customer_name: 'Cedar Ridge HOA', amount: 7600, channel: 'email', stage: '2nd Notice', sent_at: '2025-12-22T09:00:00Z', result: 'opened' },
  { id: 'l10', invoice_number: 'INV-2025-092', customer_name: 'Cedar Ridge HOA', amount: 7600, channel: 'sms', stage: 'Final Notice', sent_at: '2026-01-05T10:00:00Z', result: 'delivered' },
  { id: 'l11', invoice_number: 'INV-2025-092', customer_name: 'Cedar Ridge HOA', amount: 7600, channel: 'email', stage: 'Escalate', sent_at: '2026-02-01T09:00:00Z', result: 'bounced' },
];

export default function InvoiceFollowUp() {
  const { invoices } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'queue' | 'log' | 'settings'>('queue');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['1-7', '8-14', '15-30', '30+']));
  const [previewInvoice, setPreviewInvoice] = useState<ComputedInvoice | null>(null);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [autoRemind, setAutoRemind] = useState(false);
  const [reminderLog, setReminderLog] = useState<ReminderLog[]>(DEMO_LOG);
  const [channelPref, setChannelPref] = useState<'email' | 'sms'>('email');

  // Combine real overdue with demo data
  const allOverdue = useMemo(() => {
    return DEMO_OVERDUE.map(d => ({
      ...d,
      daysOverdue: getDaysOverdue(d.due_date),
      ageGroup: getAgeGroup(getDaysOverdue(d.due_date)),
    }));
  }, [invoices]);

  const totalOwed = allOverdue.reduce((s, i) => s + i.amount_owed, 0);
  const avgDaysOverdue = Math.round(allOverdue.reduce((s, i) => s + i.daysOverdue, 0) / allOverdue.length);
  const neverContacted = allOverdue.filter(i => i.reminder_count === 0).length;

  const groupedInvoices = useMemo(() => {
    const groups: Record<string, typeof allOverdue> = { '1-7': [], '8-14': [], '15-30': [], '30+': [] };
    allOverdue.forEach(inv => { groups[inv.ageGroup].push(inv); });
    return groups;
  }, [allOverdue]);

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectGroup = (group: string) => {
    const ids = groupedInvoices[group].map(i => i.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const sendReminder = (inv: typeof allOverdue[0], channel: 'email' | 'sms' = channelPref) => {
    const stage = getReminderStage(inv.reminder_count);
    setSentIds(prev => new Set([...prev, inv.id]));
    const newLog: ReminderLog = {
      id: `new-${Date.now()}`,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      amount: inv.amount_owed,
      channel,
      stage: stage.label,
      sent_at: new Date().toISOString(),
      result: 'delivered',
    };
    setReminderLog(prev => [newLog, ...prev]);
    addToast('success', `${stage.label} sent to ${inv.customer_name} via ${channel.toUpperCase()}`);
  };

  const sendBatchReminders = (group?: string) => {
    const targets = group
      ? groupedInvoices[group].filter(i => !sentIds.has(i.id))
      : allOverdue.filter(i => selectedIds.has(i.id) && !sentIds.has(i.id));
    targets.forEach(inv => sendReminder(inv));
    if (targets.length > 0) {
      addToast('success', `Sent ${targets.length} reminder${targets.length > 1 ? 's' : ''} via ${channelPref.toUpperCase()}`);
    }
    setSelectedIds(new Set());
  };

  const fillTemplate = (template: typeof DEFAULT_TEMPLATES[0], inv: typeof allOverdue[0]) => {
    return template.body
      .replace(/\{\{customer_name\}\}/g, inv.customer_name)
      .replace(/\{\{invoice_number\}\}/g, inv.invoice_number)
      .replace(/\{\{amount\}\}/g, `$${inv.amount_owed.toLocaleString()}`)
      .replace(/\{\{days\}\}/g, `${inv.daysOverdue}`)
      .replace(/\{\{company_name\}\}/g, 'Maas Verde Landscape')
      .replace(/\{\{company_phone\}\}/g, '(512) 555-0100');
  };

  const getTemplateForInvoice = (inv: typeof allOverdue[0]) =>
    templates.find(t => t.stage === Math.min(inv.reminder_count + 1, 3)) || templates[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-earth-50 flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-400" />
            Invoice Follow-Up
          </h1>
          <p className="text-sm text-earth-400 mt-0.5">
            Automated reminders — get paid faster without awkward calls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-earth-900 border border-earth-700 rounded-lg px-3 py-1.5">
            <span className="text-xs text-earth-400">Send via:</span>
            <button
              onClick={() => setChannelPref('email')}
              className={clsx('text-xs px-2 py-1 rounded cursor-pointer transition-colors', channelPref === 'email' ? 'bg-green-600 text-white' : 'text-earth-400 hover:text-earth-200')}
            >
              <Mail className="w-3.5 h-3.5 inline mr-1" />Email
            </button>
            <button
              onClick={() => setChannelPref('sms')}
              className={clsx('text-xs px-2 py-1 rounded cursor-pointer transition-colors', channelPref === 'sms' ? 'bg-green-600 text-white' : 'text-earth-400 hover:text-earth-200')}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />SMS
            </button>
          </div>
          {selectedIds.size > 0 && (
            <Button icon={<Send className="w-4 h-4" />} onClick={() => sendBatchReminders()}>
              Send {selectedIds.size} Reminder{selectedIds.size > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Overdue"
          value={`$${totalOwed.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Invoices Outstanding"
          value={allOverdue.length}
          icon={<FileText className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Avg Days Overdue"
          value={avgDaysOverdue}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Never Contacted"
          value={neverContacted}
          icon={<Bell className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Auto-remind banner */}
      <div className={clsx(
        'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
        autoRemind ? 'bg-green-600/10 border-green-600/20' : 'bg-earth-900/60 border-earth-800'
      )}>
        <div className="flex items-center gap-3">
          <Zap className={clsx('w-5 h-5', autoRemind ? 'text-green-400' : 'text-earth-400')} />
          <div>
            <p className="text-sm font-medium text-earth-100">Auto-Remind</p>
            <p className="text-xs text-earth-400">
              {autoRemind
                ? 'Automatically sending reminders on schedule (7, 14, 30 days overdue)'
                : 'Enable to automatically send reminders when invoices hit reminder thresholds'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setAutoRemind(v => !v);
            addToast('success', autoRemind ? 'Auto-remind disabled' : 'Auto-remind enabled — reminders will send on schedule');
          }}
          className={clsx(
            'relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0',
            autoRemind ? 'bg-green-600' : 'bg-earth-700'
          )}
        >
          <span className={clsx(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
            autoRemind ? 'left-7' : 'left-1'
          )} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900 border border-earth-800 rounded-xl p-1 w-fit">
        {([
          { key: 'queue', label: 'Follow-Up Queue', icon: BellRing, count: allOverdue.filter(i => !sentIds.has(i.id)).length },
          { key: 'log', label: 'Reminder Log', icon: History, count: reminderLog.length },
          { key: 'settings', label: 'Templates & Settings', icon: Settings, count: null },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
              activeTab === t.key
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'text-earth-400 hover:text-earth-200'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.count !== null && (
              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', activeTab === t.key ? 'bg-green-600/30 text-green-300' : 'bg-earth-700 text-earth-400')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ======== QUEUE TAB ======== */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {((['1-7', '8-14', '15-30', '30+'] as const)).map(group => {
            const invoicesInGroup = groupedInvoices[group];
            if (invoicesInGroup.length === 0) return null;
            const config = AGE_CONFIG[group];
            const GroupIcon = config.icon;
            const isExpanded = expandedGroups.has(group);
            const groupTotal = invoicesInGroup.reduce((s, i) => s + i.amount_owed, 0);
            const unsent = invoicesInGroup.filter(i => !sentIds.has(i.id));

            return (
              <div key={group} className={clsx('border rounded-xl overflow-hidden', config.bg)}>
                {/* Group header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(group)}
                  onKeyDown={e => e.key === 'Enter' && toggleGroup(group)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className={clsx('w-4 h-4', config.color)} />
                    <span className={clsx('text-sm font-semibold', config.color)}>{config.label}</span>
                    <span className="text-xs text-earth-400">{invoicesInGroup.length} invoice{invoicesInGroup.length > 1 ? 's' : ''}</span>
                    <span className="text-xs font-semibold text-earth-200">${groupTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unsent.length > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); sendBatchReminders(group); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded-lg hover:bg-green-600/30 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Send All ({unsent.length})
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelectGroup(group); }}
                      className="text-xs text-earth-400 hover:text-earth-200 px-2 py-1 rounded hover:bg-earth-800/60 transition-colors"
                    >
                      Select
                    </button>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-earth-500" /> : <ChevronRight className="w-4 h-4 text-earth-500" />}
                  </div>
                </div>

                {/* Invoice rows */}
                {isExpanded && (
                  <div className="divide-y divide-earth-800/40">
                    {invoicesInGroup.map(inv => {
                      const stage = getReminderStage(inv.reminder_count);
                      const isSent = sentIds.has(inv.id);
                      const isSelected = selectedIds.has(inv.id);

                      return (
                        <div
                          key={inv.id}
                          className={clsx(
                            'flex items-center gap-3 px-4 py-3 transition-all',
                            isSent ? 'opacity-60' : 'hover:bg-white/5',
                            isSelected && 'bg-green-600/5'
                          )}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(inv.id)}
                            className={clsx(
                              'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors',
                              isSelected ? 'bg-green-600 border-green-600' : 'border-earth-600 hover:border-earth-400'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>

                          {/* Invoice info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-earth-100">{inv.customer_name}</p>
                              <span className="text-xs text-earth-500">{inv.invoice_number}</span>
                              <Badge color={stage.color}>{stage.label}</Badge>
                              {isSent && <Badge color="green" dot>Sent</Badge>}
                            </div>
                            <p className="text-xs text-earth-400 mt-0.5 truncate">{inv.service}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-earth-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due {format(new Date(inv.due_date), 'MMM d')} — {inv.daysOverdue}d overdue
                              </span>
                              {inv.last_reminder && (
                                <span className="text-[10px] text-earth-500">
                                  Last sent {format(new Date(inv.last_reminder), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-earth-100">${inv.amount_owed.toLocaleString()}</p>
                            {inv.status === 'partial' && (
                              <p className="text-[10px] text-amber-400">Partial paid</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="p-1.5 text-earth-400 hover:text-earth-200 hover:bg-earth-700/50 rounded-lg transition-colors cursor-pointer"
                              title="Preview message"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={`tel:${inv.customer_phone}`}
                              onClick={e => e.preventDefault()}
                              className="p-1.5 text-earth-400 hover:text-green-400 hover:bg-earth-700/50 rounded-lg transition-colors cursor-pointer"
                              title="Call customer"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            <Button
                              size="sm"
                              variant={isSent ? 'secondary' : 'primary'}
                              disabled={isSent}
                              icon={isSent ? <CheckCircle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                              onClick={() => sendReminder(inv)}
                            >
                              <span className="hidden md:inline">{isSent ? 'Sent' : 'Send'}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {allOverdue.every(i => sentIds.has(i.id)) && (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-600/15 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-earth-100 mb-1">All reminders sent!</h3>
                <p className="text-sm text-earth-400">You've contacted all outstanding customers. Check the Reminder Log for responses.</p>
                <button
                  onClick={() => setSentIds(new Set())}
                  className="mt-4 flex items-center gap-2 text-sm text-earth-400 hover:text-earth-200 mx-auto cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to re-send
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ======== LOG TAB ======== */}
      {activeTab === 'log' && (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-earth-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-earth-200">Reminder History</h3>
            <span className="text-xs text-earth-400">{reminderLog.length} entries</span>
          </div>
          <div className="divide-y divide-earth-800/60">
            {reminderLog.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 px-4 py-3">
                <div className={clsx(
                  'p-2 rounded-lg shrink-0',
                  entry.channel === 'email' ? 'bg-sky-600/10' : 'bg-green-600/10'
                )}>
                  {entry.channel === 'email'
                    ? <Mail className={clsx('w-4 h-4', 'text-sky-400')} />
                    : <MessageSquare className="w-4 h-4 text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-earth-100">{entry.customer_name}</p>
                    <span className="text-xs text-earth-500">{entry.invoice_number}</span>
                    <Badge color={
                      entry.stage === '1st Reminder' ? 'green' :
                      entry.stage === '2nd Notice' ? 'amber' : 'red'
                    }>{entry.stage}</Badge>
                  </div>
                  <p className="text-xs text-earth-400 mt-0.5">
                    ${entry.amount.toLocaleString()} — {format(new Date(entry.sent_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="shrink-0">
                  <Badge color={
                    entry.result === 'paid' ? 'green' :
                    entry.result === 'opened' ? 'sky' :
                    entry.result === 'bounced' ? 'red' : 'earth'
                  } dot>
                    {entry.result.charAt(0).toUpperCase() + entry.result.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ======== SETTINGS TAB ======== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card header={<h3 className="text-sm font-semibold text-earth-200">Reminder Sequence</h3>}>
            <div className="space-y-3">
              <p className="text-xs text-earth-400">
                Configure the 3-step reminder sequence. Each template is used automatically based on how many times an invoice has been reminded.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                {templates.map((t, idx) => (
                  <div key={t.id} className={clsx('relative p-3 rounded-xl border text-center',
                    t.color === 'green' ? 'bg-green-600/10 border-green-600/20' :
                    t.color === 'amber' ? 'bg-amber-600/10 border-amber-600/20' :
                    'bg-red-600/10 border-red-600/20'
                  )}>
                    {idx < 2 && (
                      <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 text-earth-500 z-10" />
                    )}
                    <p className={clsx('text-xs font-bold uppercase tracking-wide mb-1', t.color === 'green' ? 'text-green-400' : t.color === 'amber' ? 'text-amber-400' : 'text-red-400')}>
                      Step {t.stage}
                    </p>
                    <p className="text-sm font-semibold text-earth-100">{t.name}</p>
                    <p className="text-xs text-earth-400 mt-1">Triggers at {t.days} days</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {templates.map(template => (
            <Card key={template.id} header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color={template.color}>{`Step ${template.stage}`}</Badge>
                  <h3 className="text-sm font-semibold text-earth-200">{template.name}</h3>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingTemplate(editingTemplate === template.id ? null : template.id)}
                >
                  {editingTemplate === template.id ? 'Done' : 'Edit'}
                </Button>
              </div>
            }>
              {editingTemplate === template.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-earth-400 mb-1">Subject line</label>
                    <input
                      value={template.subject}
                      onChange={e => setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, subject: e.target.value } : t))}
                      className="w-full px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-100 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-earth-400 mb-1">
                      Message body
                      <span className="ml-2 text-earth-500">
                        Available: {'{{customer_name}}'} {'{{invoice_number}}'} {'{{amount}}'} {'{{days}}'} {'{{company_name}}'}
                      </span>
                    </label>
                    <textarea
                      value={template.body}
                      onChange={e => setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, body: e.target.value } : t))}
                      rows={8}
                      className="w-full px-3 py-2 bg-earth-900 border border-earth-700 rounded-lg text-sm text-earth-100 focus:outline-none focus:ring-2 focus:ring-green-500/30 font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    icon={<Check className="w-4 h-4" />}
                    onClick={() => {
                      setEditingTemplate(null);
                      addToast('success', `${template.name} template saved`);
                    }}
                  >
                    Save Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-earth-400">Subject: <span className="text-earth-200">{template.subject}</span></p>
                  <pre className="text-xs text-earth-300 whitespace-pre-wrap font-sans bg-earth-900/60 p-3 rounded-lg border border-earth-800 max-h-40 overflow-y-auto">
                    {template.body}
                  </pre>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ======== PREVIEW MODAL ======== */}
      {previewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setPreviewInvoice(null)}
          onKeyDown={e => e.key === 'Escape' && setPreviewInvoice(null)}
          tabIndex={-1}
        >
          <div className="bg-earth-950 border border-earth-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-earth-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-earth-100">Preview Message</h3>
                <p className="text-xs text-earth-400 mt-0.5">
                  {previewInvoice.customer_name} — {previewInvoice.invoice_number}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={channelPref === 'email' ? 'sky' : 'green'}>
                  {channelPref === 'email' ? '✉ EMAIL' : '💬 SMS'}
                </Badge>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {channelPref === 'email' && (
                <div className="text-xs bg-earth-900 border border-earth-800 rounded-lg px-3 py-2">
                  <span className="text-earth-400">To: </span>
                  <span className="text-earth-200">{previewInvoice.customer_email}</span>
                </div>
              )}
              {channelPref === 'sms' && (
                <div className="text-xs bg-earth-900 border border-earth-800 rounded-lg px-3 py-2">
                  <span className="text-earth-400">To: </span>
                  <span className="text-earth-200">{previewInvoice.customer_phone}</span>
                </div>
              )}
              {channelPref === 'email' && (
                <div className="text-xs bg-earth-900 border border-earth-800 rounded-lg px-3 py-2">
                  <span className="text-earth-400">Subject: </span>
                  <span className="text-earth-200">{getTemplateForInvoice(previewInvoice).subject.replace(/\{\{invoice_number\}\}/g, previewInvoice.invoice_number)}</span>
                </div>
              )}
              <pre className="text-xs text-earth-200 whitespace-pre-wrap font-sans bg-earth-900/60 p-3 rounded-lg border border-earth-800 max-h-64 overflow-y-auto leading-relaxed">
                {channelPref === 'sms'
                  ? `Hi ${previewInvoice.customer_name}! Invoice ${previewInvoice.invoice_number} for $${previewInvoice.amount_owed.toLocaleString()} is ${previewInvoice.daysOverdue} days overdue. Please pay at your earliest convenience or call (512) 555-0100. Thank you! — Maas Verde Landscape`
                  : fillTemplate(getTemplateForInvoice(previewInvoice), previewInvoice)
                }
              </pre>
            </div>
            <div className="px-5 py-4 border-t border-earth-800 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreviewInvoice(null)}>Cancel</Button>
              <Button
                icon={<Send className="w-4 h-4" />}
                onClick={() => {
                  sendReminder(previewInvoice);
                  setPreviewInvoice(null);
                }}
              >
                Send Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
