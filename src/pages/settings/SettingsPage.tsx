import { useState } from 'react';
import { Save, Building, DollarSign, Users, Palette } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

function isDemoMode(): boolean {
  return localStorage.getItem('gs_token') === 'demo_token';
}

type SettingsTab = 'company' | 'billing' | 'users' | 'appearance';

export default function SettingsPage() {
  const { settings, updateSettings } = useData();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [companyForm, setCompanyForm] = useState({
    company_name: settings?.company_name || '',
    company_email: settings?.company_email || '',
    company_phone: settings?.company_phone || '',
    company_address: settings?.company_address || '',
    timezone: settings?.timezone || 'America/Chicago',
  });
  const [billingForm, setBillingForm] = useState({
    tax_rate: String(settings?.tax_rate || 8.25),
    default_payment_terms: String(settings?.default_payment_terms || 30),
    currency: settings?.currency || 'USD',
  });

  const tabs: { key: SettingsTab; label: string; icon: typeof Building }[] = [
    { key: 'company', label: 'Company', icon: Building },
    { key: 'billing', label: 'Billing & Tax', icon: DollarSign },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const handleSaveCompany = async () => {
    if (isDemoMode()) {
      updateSettings({
        company_name: companyForm.company_name,
        company_email: companyForm.company_email,
        company_phone: companyForm.company_phone,
        company_address: companyForm.company_address,
        timezone: companyForm.timezone,
      });
      toast.success('Company settings saved');
      return;
    }
    try {
      await api.put('/settings', {
        company_name: companyForm.company_name,
        company_email: companyForm.company_email,
        company_phone: companyForm.company_phone,
        company_address: companyForm.company_address,
        timezone: companyForm.timezone,
      });
      toast.success('Company settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleSaveBilling = async () => {
    if (isDemoMode()) {
      updateSettings({
        tax_rate: parseFloat(billingForm.tax_rate) || 8.25,
        default_payment_terms: parseInt(billingForm.default_payment_terms) || 30,
        currency: billingForm.currency,
      });
      toast.success('Billing settings saved');
      return;
    }
    try {
      await api.put('/settings', {
        tax_rate: parseFloat(billingForm.tax_rate) || 8.25,
        default_payment_terms: parseInt(billingForm.default_payment_terms) || 30,
        currency: billingForm.currency,
      });
      toast.success('Billing settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-earth-100">Settings</h2>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                  : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'company' && (
        <Card header={<h3 className="text-sm font-semibold text-earth-200">Company Information</h3>}>
          <div className="space-y-4 max-w-2xl">
            <Input label="Company Name" value={companyForm.company_name} onChange={e => setCompanyForm(f => ({ ...f, company_name: e.target.value }))} />
            <Input label="Email" type="email" value={companyForm.company_email} onChange={e => setCompanyForm(f => ({ ...f, company_email: e.target.value }))} />
            <Input label="Phone" type="tel" value={companyForm.company_phone} onChange={e => setCompanyForm(f => ({ ...f, company_phone: e.target.value }))} />
            <Input label="Address" value={companyForm.company_address} onChange={e => setCompanyForm(f => ({ ...f, company_address: e.target.value }))} />
            <Select label="Timezone" options={[
              { value: 'America/Chicago', label: 'Central Time (CT)' },
              { value: 'America/New_York', label: 'Eastern Time (ET)' },
              { value: 'America/Denver', label: 'Mountain Time (MT)' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            ]} value={companyForm.timezone} onChange={e => setCompanyForm(f => ({ ...f, timezone: e.target.value }))} />
            <div className="pt-4">
              <Button icon={<Save className="w-4 h-4" />} onClick={handleSaveCompany}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'billing' && (
        <Card header={<h3 className="text-sm font-semibold text-earth-200">Billing & Tax Configuration</h3>}>
          <div className="space-y-4 max-w-2xl">
            <Input label="Tax Rate (%)" type="number" value={billingForm.tax_rate} onChange={e => setBillingForm(f => ({ ...f, tax_rate: e.target.value }))} hint="Applied to invoices and quotes" />
            <Input label="Default Payment Terms (days)" type="number" value={billingForm.default_payment_terms} onChange={e => setBillingForm(f => ({ ...f, default_payment_terms: e.target.value }))} hint="Net days for invoice due dates" />
            <Select label="Currency" options={[
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'CAD', label: 'CAD - Canadian Dollar' },
            ]} value={billingForm.currency} onChange={e => setBillingForm(f => ({ ...f, currency: e.target.value }))} />
            <div className="pt-4">
              <Button icon={<Save className="w-4 h-4" />} onClick={handleSaveBilling}>Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card header={
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-earth-200">User Management</h3>
            <Button size="sm" onClick={() => toast.info('User invitation coming soon')}>Invite User</Button>
          </div>
        }>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-earth-800/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">A</div>
                <div>
                  <p className="text-sm font-medium text-earth-100">Admin User</p>
                  <p className="text-xs text-earth-400">admin@maasverde.com</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-green-600/15 text-green-400 text-xs rounded-full">Admin</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-earth-800/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-sky-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">M</div>
                <div>
                  <p className="text-sm font-medium text-earth-100">Manager User</p>
                  <p className="text-xs text-earth-400">manager@maasverde.com</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-sky-600/15 text-sky-400 text-xs rounded-full">Manager</span>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'appearance' && (
        <Card header={<h3 className="text-sm font-semibold text-earth-200">Appearance</h3>}>
          <div className="space-y-4 max-w-2xl">
            <div>
              <p className="text-sm font-medium text-earth-200 mb-2">Theme</p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-3 bg-green-600/15 border border-green-500/30 rounded-lg text-green-400 text-sm cursor-pointer">
                  <div className="w-4 h-4 bg-earth-950 border border-earth-600 rounded" />
                  Dark (Active)
                </button>
                <button className="flex items-center gap-2 px-4 py-3 bg-earth-800/50 border border-earth-700 rounded-lg text-earth-400 text-sm cursor-pointer" onClick={() => toast.info('Light theme coming soon')}>
                  <div className="w-4 h-4 bg-white border border-earth-300 rounded" />
                  Light
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-earth-200 mb-2">Company Logo</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-earth-800 border border-earth-700 rounded-xl flex items-center justify-center text-earth-400">
                  <Building className="w-8 h-8" />
                </div>
                <Button variant="secondary" size="sm" onClick={() => toast.info('Logo upload coming soon')}>Upload Logo</Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
