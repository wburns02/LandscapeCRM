import { useState, useMemo } from 'react';
import { Plus, FileText, Send, DollarSign, Trash2, Pencil } from 'lucide-react';
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
import type { Quote, QuoteStatus } from '../../types';

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
  const { quotes, customers, addQuote, addInvoice, updateQuote, deleteQuote } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | QuoteStatus>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', customer_id: '', valid_days: '30', notes: '' });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ description: '', quantity: '1', unit_price: '' }]);

  // Edit modal state
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', customer_id: '', valid_days: '30', notes: '', status: 'draft' as QuoteStatus });
  const [editLineItems, setEditLineItems] = useState<LineItemForm[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.customer?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotes, search, statusFilter]);

  // Create modal line item helpers
  const addLineItem = () => setLineItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }]);
  const removeLineItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: keyof LineItemForm, value: string) =>
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const lineTotal = lineItems.reduce((sum, li) => sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);

  // Edit modal line item helpers
  const addEditLineItem = () => setEditLineItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }]);
  const removeEditLineItem = (idx: number) => setEditLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateEditLineItem = (idx: number, field: keyof LineItemForm, value: string) =>
    setEditLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const editLineTotal = editLineItems.reduce((sum, li) => sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);

  // Open edit modal pre-filled with quote data
  const openEditModal = (quote: Quote) => {
    setEditingQuote(quote);
    const daysUntilValid = quote.valid_until
      ? Math.max(0, Math.ceil((new Date(quote.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30;
    setEditFormData({
      title: quote.title,
      customer_id: quote.customer_id,
      valid_days: String(daysUntilValid),
      notes: quote.notes || '',
      status: quote.status,
    });
    setEditLineItems(
      quote.line_items.map(li => ({
        description: li.description,
        quantity: String(li.quantity),
        unit_price: String(li.unit_price),
      }))
    );
    setShowDeleteConfirm(false);
  };

  const closeEditModal = () => {
    setEditingQuote(null);
    setEditFormData({ title: '', customer_id: '', valid_days: '30', notes: '', status: 'draft' });
    setEditLineItems([]);
    setShowDeleteConfirm(false);
  };

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
        customer: (customer ? { id: customer.id, name: customer.name } : undefined) as any,
        line_items: items as any,
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

  const handleEditSubmit = async () => {
    if (!editingQuote) return;
    if (!editFormData.title || !editFormData.customer_id) {
      toast.error('Title and customer are required');
      return;
    }
    try {
      const items = editLineItems
        .filter(li => li.description && li.unit_price)
        .map((li, idx) => ({
          id: editingQuote.line_items[idx]?.id || String(Date.now() + idx),
          description: li.description,
          quantity: parseFloat(li.quantity) || 1,
          unit_price: parseFloat(li.unit_price) || 0,
          total: (parseFloat(li.quantity) || 1) * (parseFloat(li.unit_price) || 0),
        }));
      const subtotal = items.reduce((s, li) => s + li.total, 0);
      const taxRate = 8.25;
      const taxAmount = subtotal * (taxRate / 100);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (parseInt(editFormData.valid_days) || 30));

      const customer = customers.find(c => c.id === editFormData.customer_id);
      await updateQuote(editingQuote.id, {
        title: editFormData.title,
        customer_id: editFormData.customer_id,
        customer: (customer ? { id: customer.id, name: customer.name } : undefined) as any,
        line_items: items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: subtotal + taxAmount,
        valid_until: validUntil.toISOString().split('T')[0],
        notes: editFormData.notes || undefined,
        status: editFormData.status,
      });
      toast.success(`Quote "${editFormData.title}" updated`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update quote');
    }
  };

  const handleDelete = async () => {
    if (!editingQuote) return;
    try {
      await deleteQuote(editingQuote.id);
      toast.success(`Quote "${editingQuote.title}" deleted`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quote');
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
                    <p className="text-lg font-bold text-earth-50">${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-earth-400">inc. tax</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEditModal(quote)}>
                      Edit
                    </Button>
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

      {/* Create Quote Modal */}
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

      {/* Edit Quote Modal */}
      <Modal
        isOpen={!!editingQuote}
        onClose={closeEditModal}
        title="Edit Quote"
        size="xl"
        footer={
          <>
            {!showDeleteConfirm ? (
              <>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} icon={<Trash2 className="w-4 h-4" />}>Delete</Button>
                <div className="flex-1" />
                <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
                <Button onClick={handleEditSubmit}>Save Changes</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-red-400 mr-auto">Are you sure? This cannot be undone.</p>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Confirm Delete</Button>
              </>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Quote Title" required value={editFormData.title} onChange={e => setEditFormData(f => ({ ...f, title: e.target.value }))} placeholder="Front Yard Redesign" />
            <Select label="Customer" options={[{ value: '', label: 'Select customer' }, ...customers.map(c => ({ value: c.id, label: c.name }))]} value={editFormData.customer_id} onChange={e => setEditFormData(f => ({ ...f, customer_id: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'declined', label: 'Declined' },
              ]}
              value={editFormData.status}
              onChange={e => setEditFormData(f => ({ ...f, status: e.target.value as QuoteStatus }))}
            />
            <Input label="Valid Days (from today)" type="number" value={editFormData.valid_days} onChange={e => setEditFormData(f => ({ ...f, valid_days: e.target.value }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-earth-200">Line Items</h4>
              <Button variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addEditLineItem}>Add Item</Button>
            </div>
            <div className="space-y-2">
              {editLineItems.map((li, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input placeholder="Description" value={li.description} onChange={e => updateEditLineItem(idx, 'description', e.target.value)} />
                  </div>
                  <div className="w-20">
                    <Input placeholder="Qty" type="number" value={li.quantity} onChange={e => updateEditLineItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="w-28">
                    <Input placeholder="Price" type="number" value={li.unit_price} onChange={e => updateEditLineItem(idx, 'unit_price', e.target.value)} />
                  </div>
                  <div className="w-24 text-right text-sm text-earth-200 pb-2.5">
                    ${((parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0)).toFixed(2)}
                  </div>
                  {editLineItems.length > 1 && (
                    <button onClick={() => removeEditLineItem(idx)} className="p-2.5 text-red-400 hover:text-red-300 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-earth-800 text-right">
              <p className="text-sm text-earth-300">Subtotal: <span className="font-semibold text-earth-100">${editLineTotal.toFixed(2)}</span></p>
              <p className="text-sm text-earth-300">Tax (8.25%): <span className="font-semibold text-earth-100">${(editLineTotal * 0.0825).toFixed(2)}</span></p>
              <p className="text-lg font-bold text-earth-50 mt-1">Total: ${(editLineTotal * 1.0825).toFixed(2)}</p>
            </div>
          </div>

          <Input label="Notes" value={editFormData.notes} onChange={e => setEditFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
        </div>
      </Modal>
    </div>
  );
}
