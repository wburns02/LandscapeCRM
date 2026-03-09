import { useState, useEffect } from 'react';
import {
  Mail, Plus, Download, Printer, Truck, CheckCircle2, FileText,
  Users, DollarSign, ChevronRight, X, Eye, Trash2, Edit2,
  Package, MapPin, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import type { DirectMailCampaign, MailTemplate, DirectMailRecipient } from '../../types';

type Tab = 'campaigns' | 'templates';

const STATUS_CONFIG: Record<string, { color: 'green' | 'sky' | 'amber' | 'earth' | 'purple' | 'red'; icon: React.ReactNode; label: string }> = {
  draft: { color: 'earth', icon: <Edit2 className="w-3.5 h-3.5" />, label: 'Draft' },
  ready: { color: 'sky', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Ready' },
  sent_to_printer: { color: 'purple', icon: <Printer className="w-3.5 h-3.5" />, label: 'Sent to Printer' },
  printed: { color: 'amber', icon: <Package className="w-3.5 h-3.5" />, label: 'Printed' },
  mailed: { color: 'sky', icon: <Truck className="w-3.5 h-3.5" />, label: 'Mailed' },
  delivered: { color: 'green', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Delivered' },
};

const STATUS_ORDER: string[] = ['draft', 'ready', 'sent_to_printer', 'printed', 'mailed', 'delivered'];

export default function DirectMailPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<DirectMailCampaign[]>([]);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [viewingCampaign, setViewingCampaign] = useState<DirectMailCampaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<DirectMailRecipient[]>([]);
  const [recipientTotal, setRecipientTotal] = useState(0);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    name: '',
    mail_type: 'postcard' as 'postcard' | 'letter',
    template_id: '',
    cost_per_piece: '',
    print_vendor: '',
    notes: '',
    // Recipient filters
    city: '',
    work_type: '',
    min_score: '',
    max_score: '',
    min_property_value: '',
    max_property_value: '',
    recipient_limit: '',
  });

  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    mail_type: 'postcard',
    size: '6x4',
    front_html: '',
    back_html: '',
    category: '',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api.get<DirectMailCampaign[]>('/direct-mail/campaigns'),
        api.get<MailTemplate[]>('/direct-mail/templates'),
      ]);
      setCampaigns(c);
      setTemplates(t);
    } catch { /* empty state */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Campaign actions
  const handleExportCSV = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem('gs_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const res = await fetch(`${apiUrl}/direct-mail/campaigns/${id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailverde_${name.replace(/\s+/g, '_').toLowerCase()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
      fetchData();
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.post(`/direct-mail/campaigns/${id}/update-status?status=${status}`);
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label || status}`);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await api.delete(`/direct-mail/campaigns/${id}`);
      toast.success('Campaign deleted');
      setViewingCampaign(null);
      fetchData();
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const handleViewRecipients = async (campaign: DirectMailCampaign) => {
    setViewingCampaign(campaign);
    try {
      const data = await api.get<{ items: DirectMailRecipient[]; total: number }>(
        `/direct-mail/campaigns/${campaign.id}/recipients?page_size=100`
      );
      setCampaignRecipients(data.items);
      setRecipientTotal(data.total);
    } catch {
      setCampaignRecipients([]);
      setRecipientTotal(0);
    }
  };

  // Wizard
  const handleWizardNext = () => setWizardStep(s => Math.min(4, s + 1));
  const handleWizardBack = () => setWizardStep(s => Math.max(1, s - 1));

  const isDemoMode = () => localStorage.getItem('gs_token') === 'demo_token';

  const handleWizardSubmit = async () => {
    try {
      if (isDemoMode()) {
        const recipientCount = Math.floor(Math.random() * 300) + 25;
        const costPer = wizardData.cost_per_piece ? parseFloat(wizardData.cost_per_piece) : (wizardData.mail_type === 'postcard' ? 0.78 : 1.25);
        const demoCampaign: DirectMailCampaign = {
          id: `demo-${Date.now()}`,
          name: wizardData.name,
          mail_type: wizardData.mail_type,
          template_id: wizardData.template_id || '',
          status: 'draft',
          recipient_count: recipientCount,
          cost_per_piece: costPer,
          estimated_cost: Math.round(recipientCount * costPer * 100) / 100,
          print_vendor: wizardData.print_vendor || undefined,
          notes: wizardData.notes || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCampaigns(prev => [demoCampaign, ...prev]);
        toast.success(`Campaign "${wizardData.name}" created with ${recipientCount} recipients`);
        setShowWizard(false);
        setWizardStep(1);
        setWizardData({ name: '', mail_type: 'postcard', template_id: '', cost_per_piece: '', print_vendor: '', notes: '', city: '', work_type: '', min_score: '', max_score: '', min_property_value: '', max_property_value: '', recipient_limit: '' });
        return;
      }

      const campaign = await api.post<DirectMailCampaign>('/direct-mail/campaigns', {
        name: wizardData.name,
        mail_type: wizardData.mail_type,
        template_id: wizardData.template_id || undefined,
        cost_per_piece: wizardData.cost_per_piece ? parseFloat(wizardData.cost_per_piece) : undefined,
        print_vendor: wizardData.print_vendor || undefined,
        notes: wizardData.notes || undefined,
      });

      // Add recipients
      const addResult = await api.post<{ added: number }>(`/direct-mail/campaigns/${campaign.id}/add-recipients`, {
        city: wizardData.city || undefined,
        work_type: wizardData.work_type || undefined,
        min_score: wizardData.min_score ? parseInt(wizardData.min_score) : undefined,
        max_score: wizardData.max_score ? parseInt(wizardData.max_score) : undefined,
        min_property_value: wizardData.min_property_value ? parseFloat(wizardData.min_property_value) : undefined,
        max_property_value: wizardData.max_property_value ? parseFloat(wizardData.max_property_value) : undefined,
        limit: wizardData.recipient_limit ? parseInt(wizardData.recipient_limit) : undefined,
      });

      toast.success(`Campaign "${wizardData.name}" created with ${addResult.added} recipients`);
      setShowWizard(false);
      setWizardStep(1);
      setWizardData({ name: '', mail_type: 'postcard', template_id: '', cost_per_piece: '', print_vendor: '', notes: '', city: '', work_type: '', min_score: '', max_score: '', min_property_value: '', max_property_value: '', recipient_limit: '' });
      fetchData();
    } catch {
      toast.error('Failed to create campaign');
    }
  };

  // Templates
  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await api.patch(`/direct-mail/templates/${editingTemplate.id}`, templateForm);
        toast.success('Template updated');
      } else {
        await api.post('/direct-mail/templates', templateForm);
        toast.success('Template created');
      }
      setShowTemplateEditor(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', mail_type: 'postcard', size: '6x4', front_html: '', back_html: '', category: '', description: '' });
      fetchData();
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/direct-mail/templates/${id}`);
      toast.success('Template deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const openEditTemplate = (t: MailTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({
      name: t.name,
      mail_type: t.mail_type,
      size: t.size,
      front_html: t.front_html,
      back_html: t.back_html || '',
      category: t.category || '',
      description: t.description || '',
    });
    setShowTemplateEditor(true);
  };

  const filteredTemplates = templates.filter(t =>
    wizardData.mail_type ? t.mail_type === wizardData.mail_type : true
  );

  const getNextStatus = (current: string) => {
    const idx = STATUS_ORDER.indexOf(current);
    return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  };

  const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipient_count, 0);
  const totalCost = campaigns.reduce((sum, c) => sum + (c.estimated_cost || 0), 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'campaigns', label: 'Campaigns', icon: <Mail className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Direct Mail</h2>
          <p className="text-sm text-earth-400 mt-1">
            {campaigns.length} campaigns · {totalRecipients.toLocaleString()} total recipients · ${totalCost.toLocaleString()} estimated
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'templates' && (
            <Button variant="secondary" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', mail_type: 'postcard', size: '6x4', front_html: '', back_html: '', category: '', description: '' }); setShowTemplateEditor(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          )}
          <Button onClick={() => { setWizardStep(1); setShowWizard(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900 p-1 rounded-lg border border-earth-800 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer',
              tab === t.id
                ? 'bg-green-600/20 text-green-400'
                : 'text-earth-400 hover:text-earth-200'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        loading ? (
          <div className="p-12 text-center text-earth-400">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-12 h-12" />}
            title="No Direct Mail Campaigns"
            description="Create your first direct mail campaign to reach prospects with postcards or letters."
            actionLabel="New Campaign"
            onAction={() => setShowWizard(true)}
          />
        ) : (
          <div className="grid gap-4">
            {campaigns.map(c => {
              const statusConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
              const next = getNextStatus(c.status);
              return (
                <Card key={c.id} hover>
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-earth-50">{c.name}</h3>
                          <Badge color={statusConf.color}>{statusConf.label}</Badge>
                          <Badge color="earth">{c.mail_type}</Badge>
                        </div>

                        {/* Status timeline */}
                        <div className="flex items-center gap-1 mb-3">
                          {STATUS_ORDER.map((s, i) => {
                            const reached = STATUS_ORDER.indexOf(c.status) >= i;
                            return (
                              <div key={s} className="flex items-center gap-1">
                                <div className={clsx(
                                  'w-2.5 h-2.5 rounded-full',
                                  reached ? 'bg-green-500' : 'bg-earth-700'
                                )} />
                                {i < STATUS_ORDER.length - 1 && (
                                  <div className={clsx(
                                    'w-6 h-0.5',
                                    reached && STATUS_ORDER.indexOf(c.status) > i ? 'bg-green-500' : 'bg-earth-700'
                                  )} />
                                )}
                              </div>
                            );
                          })}
                          <span className="text-xs text-earth-500 ml-2">
                            {STATUS_ORDER.map(s => STATUS_CONFIG[s]?.label?.split(' ').pop()).join(' → ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-earth-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {c.recipient_count.toLocaleString()} recipients
                          </span>
                          {c.estimated_cost != null && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" /> ${c.estimated_cost.toLocaleString()} est.
                            </span>
                          )}
                          {c.cost_per_piece != null && (
                            <span className="flex items-center gap-1">
                              ${c.cost_per_piece}/piece
                            </span>
                          )}
                          {c.print_vendor && (
                            <span className="flex items-center gap-1">
                              <Printer className="w-3.5 h-3.5" /> {c.print_vendor}
                            </span>
                          )}
                          {c.tracking_number && (
                            <span className="flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5" /> {c.tracking_number}
                            </span>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-earth-500">
                          {c.sent_to_printer_at && <span>Sent to printer: {new Date(c.sent_to_printer_at).toLocaleDateString()}</span>}
                          {c.mailed_at && <span>Mailed: {new Date(c.mailed_at).toLocaleDateString()}</span>}
                          {c.delivered_at && <span>Delivered: {new Date(c.delivered_at).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleViewRecipients(c)}>
                          <Users className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleExportCSV(c.id, c.name)}>
                          <Download className="w-3.5 h-3.5 mr-1" /> CSV
                        </Button>
                        {next && (
                          <Button size="sm" onClick={() => handleUpdateStatus(c.id, next)}>
                            {STATUS_CONFIG[next]?.icon}
                            <span className="ml-1">{STATUS_CONFIG[next]?.label}</span>
                          </Button>
                        )}
                        {c.status === 'draft' && (
                          <Button size="sm" variant="danger" onClick={() => handleDeleteCampaign(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        loading ? (
          <div className="p-12 text-center text-earth-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No Mail Templates"
            description="Create postcard or letter templates for your direct mail campaigns."
            actionLabel="New Template"
            onAction={() => setShowTemplateEditor(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map(t => (
              <Card key={t.id} hover>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-earth-50">{t.name}</h3>
                    <div className="flex gap-1.5">
                      <Badge color={t.mail_type === 'postcard' ? 'sky' : 'purple'}>{t.mail_type}</Badge>
                      <Badge color="earth">{t.size}</Badge>
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-sm text-earth-400 mb-3">{t.description}</p>
                  )}
                  {t.category && (
                    <div className="mb-3"><Badge color="earth">{t.category}</Badge></div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" onClick={() => openEditTemplate(t)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPreviewHtml(t.front_html); setPreviewTitle(`${t.name} — Front`); }}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Front
                    </Button>
                    {t.back_html && (
                      <Button size="sm" variant="ghost" onClick={() => { setPreviewHtml(t.back_html!); setPreviewTitle(`${t.name} — Back`); }}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Back
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* New Campaign Wizard */}
      <Modal isOpen={showWizard} onClose={() => setShowWizard(false)} title={`New Direct Mail Campaign — Step ${wizardStep} of 4`}>
        <div className="space-y-4">
          {wizardStep === 1 && (
            <>
              <div>
                <label className="block text-sm text-earth-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={wizardData.name}
                  onChange={e => setWizardData({ ...wizardData, name: e.target.value })}
                  placeholder="e.g., Spring 2026 Austin Postcards"
                  className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
                />
              </div>
              <div>
                <label className="block text-sm text-earth-300 mb-1">Mail Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['postcard', 'letter'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setWizardData({ ...wizardData, mail_type: type, template_id: '' })}
                      className={clsx(
                        'p-4 rounded-lg border text-left transition-colors cursor-pointer',
                        wizardData.mail_type === type
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-earth-700 bg-earth-800 hover:border-earth-600'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {type === 'postcard' ? <Mail className="w-5 h-5 text-sky-400" /> : <FileText className="w-5 h-5 text-purple-400" />}
                        <span className="text-sm font-semibold text-earth-100 capitalize">{type}</span>
                      </div>
                      <p className="text-xs text-earth-400">
                        {type === 'postcard' ? 'Quick, eye-catching. Available in 6x4 or 6x9.' : 'Full letter format (8.5x11). More detail.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-earth-300 mb-1">Template (optional)</label>
                <select
                  value={wizardData.template_id}
                  onChange={e => setWizardData({ ...wizardData, template_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
                >
                  <option value="">No template</option>
                  {filteredTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.size})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-earth-300 mb-1">Cost per Piece ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={wizardData.cost_per_piece}
                    onChange={e => setWizardData({ ...wizardData, cost_per_piece: e.target.value })}
                    placeholder="Auto-estimate"
                    className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-earth-300 mb-1">Print Vendor</label>
                  <input
                    type="text"
                    value={wizardData.print_vendor}
                    onChange={e => setWizardData({ ...wizardData, print_vendor: e.target.value })}
                    placeholder="e.g., VistaPrint"
                    className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
                  />
                </div>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <p className="text-sm text-earth-400">Filter which prospects to include. Only prospects with an address will be added.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-earth-400 mb-1">City</label>
                  <input
                    type="text"
                    value={wizardData.city}
                    onChange={e => setWizardData({ ...wizardData, city: e.target.value })}
                    placeholder="e.g., Austin"
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Work Type</label>
                  <input
                    type="text"
                    value={wizardData.work_type}
                    onChange={e => setWizardData({ ...wizardData, work_type: e.target.value })}
                    placeholder="e.g., new_construction"
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Min Lead Score</label>
                  <input
                    type="number"
                    value={wizardData.min_score}
                    onChange={e => setWizardData({ ...wizardData, min_score: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Max Lead Score</label>
                  <input
                    type="number"
                    value={wizardData.max_score}
                    onChange={e => setWizardData({ ...wizardData, max_score: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Min Property Value</label>
                  <input
                    type="number"
                    value={wizardData.min_property_value}
                    onChange={e => setWizardData({ ...wizardData, min_property_value: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Max Property Value</label>
                  <input
                    type="number"
                    value={wizardData.max_property_value}
                    onChange={e => setWizardData({ ...wizardData, max_property_value: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-earth-400 mb-1">Recipient Limit</label>
                <input
                  type="number"
                  value={wizardData.recipient_limit}
                  onChange={e => setWizardData({ ...wizardData, recipient_limit: e.target.value })}
                  placeholder="No limit (include all matching)"
                  className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                />
              </div>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <p className="text-sm text-earth-400">Add any notes for this campaign.</p>
              <div>
                <label className="block text-sm text-earth-300 mb-1">Notes</label>
                <textarea
                  value={wizardData.notes}
                  onChange={e => setWizardData({ ...wizardData, notes: e.target.value })}
                  rows={4}
                  placeholder="Internal notes about this campaign..."
                  className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 text-sm"
                />
              </div>
            </>
          )}

          {wizardStep === 4 && (
            <>
              <p className="text-sm text-earth-400">Review your campaign before creating.</p>
              <div className="bg-earth-800/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-earth-400">Name</span>
                  <span className="text-earth-100 font-medium">{wizardData.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Type</span>
                  <span className="text-earth-100 capitalize">{wizardData.mail_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Template</span>
                  <span className="text-earth-100">{templates.find(t => t.id === wizardData.template_id)?.name || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Cost/Piece</span>
                  <span className="text-earth-100">{wizardData.cost_per_piece ? `$${wizardData.cost_per_piece}` : 'Auto-estimate'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Print Vendor</span>
                  <span className="text-earth-100">{wizardData.print_vendor || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">City Filter</span>
                  <span className="text-earth-100">{wizardData.city || 'All'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Work Type</span>
                  <span className="text-earth-100">{wizardData.work_type || 'All'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Score Range</span>
                  <span className="text-earth-100">{wizardData.min_score || '0'} – {wizardData.max_score || '∞'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Recipient Limit</span>
                  <span className="text-earth-100">{wizardData.recipient_limit || 'No limit'}</span>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between pt-2">
            {wizardStep > 1 ? (
              <Button variant="secondary" onClick={handleWizardBack}>Back</Button>
            ) : <div />}
            {wizardStep < 4 ? (
              <Button onClick={handleWizardNext} disabled={wizardStep === 1 && !wizardData.name}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleWizardSubmit} disabled={!wizardData.name}>
                <Mail className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Template Editor */}
      <Modal
        isOpen={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
        title={editingTemplate ? 'Edit Mail Template' : 'New Mail Template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-earth-300 mb-1">Template Name</label>
            <input
              type="text"
              value={templateForm.name}
              onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="e.g., Spring Postcard"
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-earth-300 mb-1">Type</label>
              <select
                value={templateForm.mail_type}
                onChange={e => setTemplateForm({ ...templateForm, mail_type: e.target.value, size: e.target.value === 'letter' ? '8.5x11' : '6x4' })}
                className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
              >
                <option value="postcard">Postcard</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-earth-300 mb-1">Size</label>
              <select
                value={templateForm.size}
                onChange={e => setTemplateForm({ ...templateForm, size: e.target.value })}
                className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
              >
                {templateForm.mail_type === 'postcard' ? (
                  <>
                    <option value="6x4">6" x 4"</option>
                    <option value="6x9">6" x 9"</option>
                  </>
                ) : (
                  <option value="8.5x11">8.5" x 11"</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-earth-300 mb-1">Category</label>
              <select
                value={templateForm.category}
                onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })}
                className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
              >
                <option value="">Select...</option>
                <option value="introduction">Introduction</option>
                <option value="promotion">Promotion</option>
                <option value="follow_up">Follow-Up</option>
                <option value="re_engagement">Re-engagement</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-earth-300 mb-1">Description</label>
            <input
              type="text"
              value={templateForm.description}
              onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })}
              placeholder="Brief description of this template"
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
            />
          </div>
          <div>
            <label className="block text-sm text-earth-300 mb-1">
              Front HTML
              <span className="text-xs text-earth-500 ml-2">{'{{full_name}}'}, {'{{address}}'}, {'{{city}}'}, {'{{state}}'}, {'{{zip_code}}'}</span>
            </label>
            <textarea
              value={templateForm.front_html}
              onChange={e => setTemplateForm({ ...templateForm, front_html: e.target.value })}
              rows={6}
              placeholder="<div>Your postcard/letter front...</div>"
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 font-mono text-sm"
            />
          </div>
          {templateForm.mail_type === 'postcard' && (
            <div>
              <label className="block text-sm text-earth-300 mb-1">Back HTML (postcard back)</label>
              <textarea
                value={templateForm.back_html}
                onChange={e => setTemplateForm({ ...templateForm, back_html: e.target.value })}
                rows={6}
                placeholder="<div>Postcard back with address area...</div>"
                className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 font-mono text-sm"
              />
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => {
              if (templateForm.front_html) {
                setPreviewHtml(templateForm.front_html);
                setPreviewTitle('Template Preview — Front');
              }
            }}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.front_html}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* HTML Preview */}
      <Modal isOpen={!!previewHtml} onClose={() => { setPreviewHtml(''); setPreviewTitle(''); }} title={previewTitle || 'Preview'}>
        <div className="bg-white rounded-lg overflow-hidden">
          <iframe
            srcDoc={previewHtml}
            className="w-full h-96 border-0"
            title="Mail Preview"
          />
        </div>
      </Modal>

      {/* Campaign Detail / Recipients */}
      <Modal
        isOpen={!!viewingCampaign}
        onClose={() => { setViewingCampaign(null); setCampaignRecipients([]); }}
        title={viewingCampaign ? `${viewingCampaign.name} — ${recipientTotal} Recipients` : 'Recipients'}
      >
        <div className="space-y-4">
          {viewingCampaign && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={() => handleExportCSV(viewingCampaign.id, viewingCampaign.name)}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download CSV
              </Button>
              {(() => {
                const next = getNextStatus(viewingCampaign.status);
                return next ? (
                  <Button size="sm" onClick={() => { handleUpdateStatus(viewingCampaign.id, next); setViewingCampaign(null); }}>
                    {STATUS_CONFIG[next]?.icon}
                    <span className="ml-1">Mark as {STATUS_CONFIG[next]?.label}</span>
                  </Button>
                ) : null;
              })()}
            </div>
          )}

          {campaignRecipients.length === 0 ? (
            <p className="text-center text-earth-400 py-8">No recipients in this campaign yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-earth-900">
                  <tr className="text-earth-400 text-left">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Address</th>
                    <th className="py-2 px-3">City</th>
                    <th className="py-2 px-3">Zip</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignRecipients.map(r => (
                    <tr key={r.id} className="border-t border-earth-800">
                      <td className="py-2 px-3 text-earth-100">{r.full_name}</td>
                      <td className="py-2 px-3 text-earth-300 text-xs">{r.address}</td>
                      <td className="py-2 px-3 text-earth-300">{r.city}, {r.state}</td>
                      <td className="py-2 px-3 text-earth-400">{r.zip_code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recipientTotal > campaignRecipients.length && (
                <p className="text-center text-earth-500 text-xs py-2">
                  Showing {campaignRecipients.length} of {recipientTotal.toLocaleString()} recipients
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
