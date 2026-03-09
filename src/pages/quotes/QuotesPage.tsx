import { useState, useMemo } from 'react';
import { Plus, FileText, Send, CheckCircle, DollarSign, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import type { QuoteStatus } from '../../types';

const statusTabs: { key: '' | QuoteStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

interface LineItemForm {
  description: string;
  quantity: string;
  unit_price: string;
}

export default function QuotesPage() {
  const { quotes, customers, addQuote, addInvoice, updateQuote } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | QuoteStatus>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', customer_id: '', valid_days: '30', notes: '' });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ description: '', quantity: '1', unit_price: '' }]);

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.customer?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotes, search, statusFilter]);

  const addLineItem = () => setLineItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }]);
  const removeLineItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: keyof LineItemForm, value: string) =>
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const lineTotal = lineItems.reduce((sum, li) => sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);

  const handleSubmit = async () => {
    if (!formData.title || !formData.customer_id) {
      toast.error('Title and customer are required');
      return;
    }
    try {
      const items = lineItems
        .filter(li => li.description && li.unit_price)
        .map(li => ({
          description: li.description,
          quantity: parseFloat(li.quantity) || 1,
          unit_price: parseFloat(li.unit_price) || 0,
          total: (parseFloat(li.quantity) || 1) * (parseFloat(li.unit_price) || 0),
        }));
      const subtotal = items.reduce((s, li) => s + li.total, 0);
      const taxRate = 8.25;
      const taxAmount = subtotal * (taxRate / 100);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (parseInt(formData.valid_days) || 30));

      const customer = customers.find(c => c.id === formData.customer_id);
      await addQuote({
        title: formData.title,
        customer_id: formData.customer_id,
        customer: customer ? { id: customer.id, name: customer.name } : undefined,
        line_items: items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: subtotal + taxAmount,
        valid_until: validUntil.toISOString().split('T')[0],
        notes: formData.notes || undefined,
        status: 'draft',
      });
      toast.success(`Quote "${formData.title}" created`);
      setShowCreateModal(false);
      setFormData({ title: '', customer_id: '', valid_days: '30', notes: '' });
      setLineItems([{ description: '', quantity: '1', unit_price: '' }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create quote');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Quotes</h2>
          <p className="text-sm text-earth-400">{quotes.length} total quotes</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>New Quote</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === tab.key
                ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search quotes..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10" />}
          title="No quotes found"
          description="Create your first quote to get started"
          actionLabel="New Quote"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(quote => (
            <Card key={quote.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-earth-100">{quote.title}</h3>
                    <StatusBadge status={quote.status} />
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5">{quote.customer?.name} - {quote.line_items.length} line items</p>
                  <p className="text-xs text-earth-500 mt-0.5">
                    Valid until {quote.valid_until ? format(new Date(quote.valid_until), 'MMM d, yyyy') : '—'}
                    {quote.sent_at && ` - Sent ${format(new Date(quote.sent_at), 'MMM d')}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-earth-50">${quote.total.toLocaleString()}</p>
                    <p className="text-xs text-earth-400">inc. tax</p>
                  </div>
                  <div className="flex gap-1">
                    {quote.status === 'draft' && (
                      <Button variant="ghost" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={async () => {
                        try {
                          await updateQuote(quote.id, { status: 'sent', sent_at: new Date().toISOString() });
                          toast.success('Quote sent');
                        } catch { toast.error('Failed to send quote'); }
                      }}>
                        Send
                      </Button>
                    )}
                    {quote.status === 'accepted' && (
                      <Button variant="ghost" size="sm" icon={<DollarSign className="w-3.5 h-3.5" />} onClick={async () => {
                        try {
                          const customer = customers.find(c => c.id === quote.customer_id);
                          await addInvoice({
                            customer_id: quote.customer_id,
                            customer: customer,
                            line_items: quote.line_items,
                            subtotal: quote.subtotal,
                            tax_rate: quote.tax_rate,
                            tax_amount: quote.tax_amount,
                            total: quote.total,
                            status: 'draft',
                            due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                          });
                          toast.success('Invoice created from quote');
                        } catch { toast.error('Failed to create invoice'); }
                      }}>
                        Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {/* Line items preview */}
              <div className="mt-3 pt-3 border-t border-earth-800/50">
                <div className="space-y-1">
                  {quote.line_items.slice(0, 3).map(li => (
                    <div key={li.id} className="flex justify-between text-xs">
                      <span className="text-earth-300">{li.description}</span>
                      <span className="text-earth-400">{li.quantity} x ${li.unit_price.toFixed(2)} = ${li.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {quote.line_items.length > 3 && (
                    <p className="text-xs text-earth-500">+{quote.line_items.length - 3} more items</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Quote"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Quote</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Quote Title" required value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Front Yard Redesign" />
            <Select label="Customer" options={[{ value: '', label: 'Select customer' }, ...customers.map(c => ({ value: c.id, label: c.name }))]} value={formData.customer_id} onChange={e => setFormData(f => ({ ...f, customer_id: e.target.value }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-earth-200">Line Items</h4>
              <Button variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addLineItem}>Add Item</Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input placeholder="Description" value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} />
                  </div>
                  <div className="w-20">
                    <Input placeholder="Qty" type="number" value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="w-28">
                    <Input placeholder="Price" type="number" value={li.unit_price} onChange={e => updateLineItem(idx, 'unit_price', e.target.value)} />
                  </div>
                  <div className="w-24 text-right text-sm text-earth-200 pb-2.5">
                    ${((parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0)).toFixed(2)}
                  </div>
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(idx)} className="p-2.5 text-red-400 hover:text-red-300 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-earth-800 text-right">
              <p className="text-sm text-earth-300">Subtotal: <span className="font-semibold text-earth-100">${lineTotal.toFixed(2)}</span></p>
              <p className="text-sm text-earth-300">Tax (8.25%): <span className="font-semibold text-earth-100">${(lineTotal * 0.0825).toFixed(2)}</span></p>
              <p className="text-lg font-bold text-earth-50 mt-1">Total: ${(lineTotal * 1.0825).toFixed(2)}</p>
            </div>
          </div>

          <Input label="Notes" value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
        </div>
      </Modal>
    </div>
  );
}
