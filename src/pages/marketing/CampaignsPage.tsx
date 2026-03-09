import { useState, useEffect } from 'react';
import {
  Mail, Plus, Send, Pause, Play, Eye, BarChart3, Sparkles,
  Clock, Users, MousePointerClick, AlertTriangle, X, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import type { EmailCampaign, EmailTemplate, AIRecommendations } from '../../types';

type Tab = 'campaigns' | 'templates' | 'ai';

const STATUS_COLORS: Record<string, 'green' | 'sky' | 'amber' | 'earth' | 'purple' | 'red'> = {
  draft: 'earth',
  scheduled: 'sky',
  sending: 'amber',
  sent: 'green',
  paused: 'red',
};

export default function CampaignsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    name: '',
    template_id: '',
    city: '',
    work_type: '',
    min_score: '',
    max_score: '',
    min_property_value: '',
    max_property_value: '',
    recipient_limit: '',
    schedule: 'now' as 'now' | 'later',
    send_at: '',
  });

  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    html_body: '',
    text_body: '',
    category: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api.get<EmailCampaign[]>('/email/campaigns'),
        api.get<EmailTemplate[]>('/email/templates'),
      ]);
      setCampaigns(c);
      setTemplates(t);
    } catch { /* empty state */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (tab === 'ai' && !recommendations) {
      api.get<AIRecommendations>('/email/campaigns/ai-recommend')
        .then(setRecommendations)
        .catch(() => {});
    }
  }, [tab, recommendations]);

  const handleSendCampaign = async (id: string) => {
    try {
      const result = await api.post<{ sent: number; status: string }>(`/email/campaigns/${id}/send`);
      toast.success(`Sent ${result.sent} emails`);
      fetchData();
    } catch {
      toast.error('Failed to send campaign');
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await api.post(`/email/campaigns/${id}/pause`);
      toast.success('Campaign paused');
      fetchData();
    } catch {
      toast.error('Failed to pause campaign');
    }
  };

  // --- Wizard ---
  const handleWizardNext = () => setWizardStep(s => Math.min(4, s + 1));
  const handleWizardBack = () => setWizardStep(s => Math.max(1, s - 1));

  const isDemoMode = () => localStorage.getItem('gs_token') === 'demo_token';

  const handleWizardSubmit = async () => {
    try {
      if (isDemoMode()) {
        const recipientCount = Math.floor(Math.random() * 400) + 50;
        const demoCampaign: EmailCampaign = {
          id: `demo-${Date.now()}`,
          name: wizardData.name,
          template_id: wizardData.template_id || '',
          status: wizardData.schedule === 'now' ? 'sending' : 'scheduled',
          recipient_count: recipientCount,
          sent_count: 0,
          open_count: 0,
          click_count: 0,
          bounce_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          send_at: wizardData.schedule === 'later' ? wizardData.send_at : undefined,
        };
        setCampaigns(prev => [demoCampaign, ...prev]);
        toast.success(`Campaign "${wizardData.name}" created with ${recipientCount} recipients`);
        setShowWizard(false);
        setWizardStep(1);
        setWizardData({ name: '', template_id: '', city: '', work_type: '', min_score: '', max_score: '', min_property_value: '', max_property_value: '', recipient_limit: '', schedule: 'now', send_at: '' });
        return;
      }

      // Create campaign
      const campaign = await api.post<EmailCampaign>('/email/campaigns', {
        name: wizardData.name,
        template_id: wizardData.template_id || undefined,
        send_at: wizardData.schedule === 'later' && wizardData.send_at ? wizardData.send_at : undefined,
      });

      // Add prospects
      await api.post(`/email/campaigns/${campaign.id}/add-prospects`, {
        city: wizardData.city || undefined,
        work_type: wizardData.work_type || undefined,
        min_score: wizardData.min_score ? parseInt(wizardData.min_score) : undefined,
        max_score: wizardData.max_score ? parseInt(wizardData.max_score) : undefined,
        min_property_value: wizardData.min_property_value ? parseFloat(wizardData.min_property_value) : undefined,
        max_property_value: wizardData.max_property_value ? parseFloat(wizardData.max_property_value) : undefined,
        limit: wizardData.recipient_limit ? parseInt(wizardData.recipient_limit) : undefined,
      });

      toast.success(`Campaign "${wizardData.name}" created`);
      setShowWizard(false);
      setWizardStep(1);
      setWizardData({ name: '', template_id: '', city: '', work_type: '', min_score: '', max_score: '', min_property_value: '', max_property_value: '', recipient_limit: '', schedule: 'now', send_at: '' });
      fetchData();
    } catch {
      toast.error('Failed to create campaign');
    }
  };

  // --- Template ---
  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await api.patch(`/email/templates/${editingTemplate.id}`, templateForm);
        toast.success('Template updated');
      } else {
        await api.post('/email/templates', templateForm);
        toast.success('Template created');
      }
      setShowTemplateEditor(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', subject: '', html_body: '', text_body: '', category: '' });
      fetchData();
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/email/templates/${id}`);
      toast.success('Template deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const openEditTemplate = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, subject: t.subject, html_body: t.html_body, text_body: t.text_body || '', category: t.category || '' });
    setShowTemplateEditor(true);
  };

  const createCampaignFromRecommendation = (segment: { segment_name: string; suggested_template: string }) => {
    const template = templates.find(t => t.name === segment.suggested_template);
    setWizardData({
      ...wizardData,
      name: `Campaign: ${segment.segment_name}`,
      template_id: template?.id || '',
    });
    setWizardStep(1);
    setShowWizard(true);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'campaigns', label: 'Campaigns', icon: <Mail className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Eye className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Insights', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Email Campaigns</h2>
          <p className="text-sm text-earth-400 mt-1">
            {campaigns.length} campaigns · {templates.length} templates
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'templates' && (
            <Button variant="secondary" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', html_body: '', text_body: '', category: '' }); setShowTemplateEditor(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          )}
          <Button onClick={() => { setWizardStep(1); setShowWizard(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900 p-1 rounded-lg border border-earth-800 w-fit max-w-full overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
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
            title="No Campaigns Yet"
            description="Create your first email campaign to reach your prospects."
            actionLabel="New Campaign"
            onAction={() => setShowWizard(true)}
          />
        ) : (
          <div className="grid gap-4">
            {campaigns.map(c => (
              <Card key={c.id} hover onClick={() => {}}>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-earth-50">{c.name}</h3>
                      <Badge color={STATUS_COLORS[c.status] || 'earth'}>{c.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-earth-400">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.recipient_count} recipients</span>
                      <span className="flex items-center gap-1"><Send className="w-3.5 h-3.5" /> {c.sent_count} sent</span>
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {c.open_count} opened</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" /> {c.click_count} clicked</span>
                      {c.bounce_count > 0 && (
                        <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3.5 h-3.5" /> {c.bounce_count} bounced</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(c.status === 'draft' || c.status === 'paused') && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSendCampaign(c.id); }}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Send
                      </Button>
                    )}
                    {c.status === 'sending' && (
                      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handlePauseCampaign(c.id); }}>
                        <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        loading ? (
          <div className="p-12 text-center text-earth-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<Eye className="w-12 h-12" />}
            title="No Templates"
            description="Create email templates or seed the starter templates."
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
                    {t.category && <Badge color="earth">{t.category}</Badge>}
                  </div>
                  <p className="text-sm text-earth-400 mb-3">{t.subject}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEditTemplate(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPreviewHtml(t.html_body)}>Preview</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(t.id)}>Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* AI Tab */}
      {tab === 'ai' && (
        !recommendations ? (
          <div className="p-12 text-center text-earth-400">Loading AI recommendations...</div>
        ) : (
          <div className="space-y-6">
            {/* Smart Send Card */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-earth-50">Smart Send</h3>
                    <p className="text-sm text-earth-400">{recommendations.total_unreached.toLocaleString()} prospects never contacted</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-earth-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-earth-300 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Best Send Times
                    </h4>
                    <ul className="space-y-1">
                      {recommendations.best_send_times.map((t, i) => (
                        <li key={i} className="text-sm text-earth-100">{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-earth-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-earth-300 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Recommended Cadence
                    </h4>
                    <ul className="space-y-1">
                      {recommendations.cadence.map((c, i) => (
                        <li key={i} className="text-sm text-earth-100">{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-earth-300 mb-3">Recommended Segments</h4>
                <div className="grid gap-3">
                  {recommendations.segments.map((seg, i) => (
                    <div key={i} className="bg-earth-800/30 border border-earth-700/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-semibold text-earth-100">{seg.segment_name}</h5>
                        <p className="text-xs text-earth-400 mt-0.5">{seg.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-earth-500">
                          <span>Score: {seg.avg_lead_score}</span>
                          <span>Avg Value: ${seg.avg_property_value.toLocaleString()}</span>
                          <span>Template: {seg.suggested_template}</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => createCampaignFromRecommendation(seg)}>
                        <ChevronRight className="w-3.5 h-3.5 mr-1" /> Create Campaign
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )
      )}

      {/* New Campaign Wizard Modal */}
      <Modal isOpen={showWizard} onClose={() => setShowWizard(false)} title={`New Campaign — Step ${wizardStep} of 4`}>
        <div className="space-y-4">
          {wizardStep === 1 && (
            <>
              <div>
                <label className="block text-sm text-earth-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={wizardData.name}
                  onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                  placeholder="e.g., Spring 2026 Austin Launch"
                  className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
                />
              </div>
              <div>
                <label className="block text-sm text-earth-300 mb-1">Email Template</label>
                <select
                  value={wizardData.template_id}
                  onChange={(e) => setWizardData({ ...wizardData, template_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
                >
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <p className="text-sm text-earth-400">Filter which prospects to include in this campaign.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-earth-400 mb-1">City</label>
                  <input
                    type="text"
                    value={wizardData.city}
                    onChange={(e) => setWizardData({ ...wizardData, city: e.target.value })}
                    placeholder="e.g., Austin"
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Work Type</label>
                  <input
                    type="text"
                    value={wizardData.work_type}
                    onChange={(e) => setWizardData({ ...wizardData, work_type: e.target.value })}
                    placeholder="e.g., new_construction"
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Min Score</label>
                  <input
                    type="number"
                    value={wizardData.min_score}
                    onChange={(e) => setWizardData({ ...wizardData, min_score: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Max Score</label>
                  <input
                    type="number"
                    value={wizardData.max_score}
                    onChange={(e) => setWizardData({ ...wizardData, max_score: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Min Property Value</label>
                  <input
                    type="number"
                    value={wizardData.min_property_value}
                    onChange={(e) => setWizardData({ ...wizardData, min_property_value: e.target.value })}
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-earth-400 mb-1">Recipient Limit</label>
                  <input
                    type="number"
                    value={wizardData.recipient_limit}
                    onChange={(e) => setWizardData({ ...wizardData, recipient_limit: e.target.value })}
                    placeholder="No limit"
                    className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <p className="text-sm text-earth-400">When should this campaign be sent?</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-earth-800 border border-earth-700 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={wizardData.schedule === 'now'}
                    onChange={() => setWizardData({ ...wizardData, schedule: 'now' })}
                  />
                  <div>
                    <p className="text-sm font-medium text-earth-100">Send Now</p>
                    <p className="text-xs text-earth-400">Start sending immediately (batches of 50)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-earth-800 border border-earth-700 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={wizardData.schedule === 'later'}
                    onChange={() => setWizardData({ ...wizardData, schedule: 'later' })}
                  />
                  <div>
                    <p className="text-sm font-medium text-earth-100">Schedule for Later</p>
                    <p className="text-xs text-earth-400">Pick a date and time</p>
                  </div>
                </label>
                {wizardData.schedule === 'later' && (
                  <input
                    type="datetime-local"
                    value={wizardData.send_at}
                    onChange={(e) => setWizardData({ ...wizardData, send_at: e.target.value })}
                    className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
                  />
                )}
              </div>
            </>
          )}

          {wizardStep === 4 && (
            <>
              <p className="text-sm text-earth-400">Review your campaign settings before creating.</p>
              <div className="bg-earth-800/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-earth-400">Name</span>
                  <span className="text-earth-100 font-medium">{wizardData.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Template</span>
                  <span className="text-earth-100">{templates.find(t => t.id === wizardData.template_id)?.name || 'None'}</span>
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
                  <span className="text-earth-100">{wizardData.min_score || '0'} – {wizardData.max_score || '100'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-400">Schedule</span>
                  <span className="text-earth-100">{wizardData.schedule === 'now' ? 'Send immediately' : wizardData.send_at || 'TBD'}</span>
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
                <Send className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Template Editor Modal */}
      <Modal
        isOpen={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-earth-300 mb-1">Template Name</label>
            <input
              type="text"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="e.g., Introduction"
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
            />
          </div>
          <div>
            <label className="block text-sm text-earth-300 mb-1">Subject Line</label>
            <input
              type="text"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
              placeholder="e.g., Maas Verde - Serving {{city}} Homeowners"
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500"
            />
          </div>
          <div>
            <label className="block text-sm text-earth-300 mb-1">Category</label>
            <select
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100"
            >
              <option value="">Select category...</option>
              <option value="introduction">Introduction</option>
              <option value="promotion">Promotion</option>
              <option value="follow_up">Follow-Up</option>
              <option value="re_engagement">Re-engagement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-earth-300 mb-1">
              HTML Body
              <span className="text-xs text-earth-500 ml-2">Variables: {'{{first_name}}'}, {'{{city}}'}, {'{{address}}'}, {'{{work_type}}'}, {'{{company_name}}'}</span>
            </label>
            <textarea
              value={templateForm.html_body}
              onChange={(e) => setTemplateForm({ ...templateForm, html_body: e.target.value })}
              rows={8}
              placeholder="<h1>Hello {{first_name}},</h1>..."
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-earth-300 mb-1">Plain Text (optional)</label>
            <textarea
              value={templateForm.text_body}
              onChange={(e) => setTemplateForm({ ...templateForm, text_body: e.target.value })}
              rows={4}
              className="w-full py-2.5 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 text-sm"
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => {
              if (templateForm.html_body) setPreviewHtml(templateForm.html_body);
            }}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.subject || !templateForm.html_body}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={!!previewHtml} onClose={() => setPreviewHtml('')} title="Email Preview">
        <div className="bg-white rounded-lg overflow-hidden">
          <iframe
            srcDoc={previewHtml}
            className="w-full h-96 border-0"
            title="Email Preview"
          />
        </div>
      </Modal>
    </div>
  );
}
