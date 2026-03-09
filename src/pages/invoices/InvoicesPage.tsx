import { useState, useMemo } from 'react';
import { Receipt, DollarSign, Send, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';
import type { InvoiceStatus } from '../../types';

const statusTabs: { key: '' | InvoiceStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
];

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function InvoicesPage() {
  const { invoices, customers, addInvoice, updateInvoice, recordPayment } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    due_date: '',
    notes: '',
    tax_rate: '8.25',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);

  // Record Payment modal state
  const [paymentInvoice, setPaymentInvoice] = useState<typeof invoices[0] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const openPaymentModal = (inv: typeof invoices[0]) => {
    const balance = inv.total - (inv.amount_paid ?? 0);
    setPaymentInvoice(inv);
    setPaymentAmount(balance.toFixed(2));
    setPaymentMethod('credit_card');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentNotes('');
  };

  const closePaymentModal = () => {
    setPaymentInvoice(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleRecordPayment = async () => {
    if (!paymentInvoice) return;
    const amount = parseFloat(paymentAmount);
    const balance = paymentInvoice.total - (paymentInvoice.amount_paid ?? 0);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (amount > balance + 0.01) {
      toast.error('Payment amount cannot exceed the balance due');
      return;
    }

    setIsRecording(true);
    try {
      await recordPayment(paymentInvoice.id, amount);
      toast.success(`Payment of $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} recorded`);
      closePaymentModal();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setIsRecording(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search || inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer?.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.total - (i.amount_paid ?? 0)), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.total - (i.amount_paid ?? 0)), 0);
  const totalPaidMTD = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount_paid ?? 0), 0);

  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const taxRate = parseFloat(formData.tax_rate) || 0;
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== index) return li;
      const updated = { ...li, [field]: field === 'description' ? value : parseFloat(value) || 0 };
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({ customer_id: '', due_date: '', notes: '', tax_rate: '8.25' });
    setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleCreateInvoice = async () => {
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    if (lineItems.every(li => !li.description)) {
      toast.error('Please add at least one line item');
      return;
    }

    setIsSaving(true);
    try {
      const customer = customers.find(c => c.id === formData.customer_id);
      const filteredItems = lineItems.filter(li => li.description).map((li, idx) => ({
        id: String(idx + 1),
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        total: li.total,
      }));
      await addInvoice({
        customer_id: formData.customer_id,
        customer: customer,
        status: 'draft',
        line_items: filteredItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        due_date: formData.due_date || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('Invoice created');
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Invoices</h2>
          <p className="text-sm text-earth-400">{invoices.length} total invoices</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
          New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} icon={<Receipt className="w-5 h-5" />} color="amber" />
        <StatCard title="Overdue" value={`$${totalOverdue.toLocaleString()}`} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard title="Collected MTD" value={`$${totalPaidMTD.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="green" />
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

      <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." />

      {filtered.length === 0 ? (
        <EmptyState icon={<Receipt className="w-10 h-10" />} title="No invoices found" description="Create your first invoice to get started." actionLabel="New Invoice" onAction={() => setShowCreateModal(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <Card key={inv.id} hover>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-earth-100">{inv.invoice_number}</h3>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5">{inv.customer?.name}</p>
                  <p className="text-xs text-earth-500">
                    Due: {format(new Date(inv.due_date), 'MMM d, yyyy')}
                    {inv.paid_at && ` - Paid: ${format(new Date(inv.paid_at), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-earth-50">${inv.total.toLocaleString()}</p>
                    {(inv.amount_paid ?? 0) > 0 && (inv.amount_paid ?? 0) < inv.total && (
                      <p className="text-xs text-green-400">Paid: ${(inv.amount_paid ?? 0).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {inv.status === 'draft' && (
                      <Button variant="ghost" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={async () => {
                        try {
                          await updateInvoice(inv.id, { status: 'sent', sent_at: new Date().toISOString() });
                          toast.success('Invoice sent');
                        } catch { toast.error('Failed to send invoice'); }
                      }}>Send</Button>
                    )}
                    {(inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partial') && (
                      <Button variant="ghost" size="sm" icon={<DollarSign className="w-3.5 h-3.5" />} onClick={() => openPaymentModal(inv)}>Record Payment</Button>
                    )}
                  </div>
                </div>
              </div>
              {inv.line_items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-earth-800/50 space-y-1">
                  {inv.line_items.map((li, idx) => (
                    <div key={li.id || idx} className="flex justify-between text-xs">
                      <span className="text-earth-300">{li.description}</span>
                      <span className="text-earth-400">${li.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create Invoice"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreateInvoice} loading={isSaving}>Create Invoice</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Customer"
              required
              options={[
                { value: '', label: 'Select customer' },
                ...customers.map(c => ({ value: c.id, label: c.name })),
              ]}
              value={formData.customer_id}
              onChange={e => setFormData(f => ({ ...f, customer_id: e.target.value }))}
            />
            <Input
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-earth-200">Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    className="flex-1 px-3 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 placeholder:text-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    placeholder="Description"
                    value={li.description}
                    onChange={e => updateLineItem(idx, 'description', e.target.value)}
                  />
                  <input
                    className="w-16 px-2 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 text-center focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    type="number"
                    placeholder="Qty"
                    value={li.quantity || ''}
                    onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                  />
                  <input
                    className="w-24 px-2 py-2 bg-earth-800 border border-earth-700 rounded-lg text-sm text-earth-100 text-right focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    type="number"
                    placeholder="Price"
                    value={li.unit_price || ''}
                    onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                  />
                  <span className="w-20 py-2 text-sm text-earth-300 text-right">${li.total.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeLineItem(idx)}
                    className="p-2 text-earth-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right space-y-1 text-sm">
            <p className="text-earth-300">Subtotal: <span className="text-earth-100 font-medium">${subtotal.toFixed(2)}</span></p>
            <p className="text-earth-300">Tax ({taxRate}%): <span className="text-earth-100 font-medium">${taxAmount.toFixed(2)}</span></p>
            <p className="text-earth-100 font-bold text-base">Total: ${total.toFixed(2)}</p>
          </div>

          <Input
            label="Notes"
            value={formData.notes}
            onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes..."
          />
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentInvoice}
        onClose={closePaymentModal}
        title="Record Payment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closePaymentModal}>Cancel</Button>
            <Button onClick={handleRecordPayment} loading={isRecording}>Record Payment</Button>
          </>
        }
      >
        {paymentInvoice && (() => {
          const balance = paymentInvoice.total - (paymentInvoice.amount_paid ?? 0);
          return (
            <div className="space-y-5">
              {/* Invoice summary */}
              <div className="bg-earth-800/50 border border-earth-700/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-earth-400">Invoice</span>
                  <span className="text-sm font-semibold text-earth-100">{paymentInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-earth-400">Customer</span>
                  <span className="text-sm text-earth-200">{paymentInvoice.customer?.name ?? 'Unknown'}</span>
                </div>
                <div className="border-t border-earth-700/50 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-earth-400">Total Amount</span>
                  <span className="text-sm text-earth-200">${paymentInvoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-earth-400">Amount Paid</span>
                  <span className="text-sm text-green-400">${(paymentInvoice.amount_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-earth-300">Balance Remaining</span>
                  <span className="text-base font-bold text-amber-400">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Payment fields */}
              <Input
                label="Payment Amount"
                type="number"
                step="0.01"
                min="0.01"
                max={balance.toFixed(2)}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                hint={`Enter amount up to $${balance.toFixed(2)}`}
              />

              <Select
                label="Payment Method"
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'check', label: 'Check' },
                  { value: 'credit_card', label: 'Credit Card' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                ]}
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              />

              <Input
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
              />

              <Input
                label="Notes (optional)"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="e.g., Check #1234, PO reference..."
              />
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
