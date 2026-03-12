import { useState, useMemo, useEffect } from 'react';
import {
  Store, ShoppingCart, BarChart3, Plus, Search, Filter, ChevronDown, ChevronRight,
  Package, Truck, CheckCircle, Clock, AlertCircle, XCircle, Phone, Mail, Globe,
  MapPin, DollarSign, TrendingUp, Star, Edit2, Eye, X, RefreshCw,
  FileText, Send, Check, AlertTriangle, Leaf, FlaskConical, Wrench,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type VendorType = 'nursery' | 'supplier' | 'chemical' | 'equipment' | 'service' | 'other';
type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'invoiced' | 'cancelled';

interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  contact: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  rating: number; // 1-5
  paymentTerms: string;
  accountNumber: string;
  notes: string;
  totalSpend: number;
  activeOrders: number;
  lastOrderDate: string;
  preferred: boolean;
}

interface POLineItem {
  id: string;
  description: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  receivedQty: number;
  jobRef?: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  status: POStatus;
  createdDate: string;
  expectedDate: string;
  receivedDate?: string;
  items: POLineItem[];
  notes: string;
  shippingCost: number;
  taxRate: number;
  jobRef?: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const VENDORS: Vendor[] = [
  {
    id: 'v1', name: 'Green Thumb Nursery', type: 'nursery', contact: 'Carlos Reyes',
    phone: '(512) 555-0201', email: 'orders@greenthumb.com', website: 'greenthumb.com',
    address: '4820 Burnet Rd', city: 'Austin', state: 'TX', rating: 5,
    paymentTerms: 'Net 30', accountNumber: 'GT-4821', notes: 'Great selection of native plants. Discount on bulk orders over $500.',
    totalSpend: 28450, activeOrders: 2, lastOrderDate: '2026-03-08', preferred: true,
  },
  {
    id: 'v2', name: 'Texas Mulch & Materials', type: 'supplier', contact: 'Linda Fowler',
    phone: '(512) 555-0334', email: 'dispatch@texasmulch.com', website: 'texasmulch.com',
    address: '12200 Dessau Rd', city: 'Austin', state: 'TX', rating: 4,
    paymentTerms: 'Net 15', accountNumber: 'TM-2291', notes: 'Free delivery on orders over $300.',
    totalSpend: 41200, activeOrders: 1, lastOrderDate: '2026-03-10', preferred: true,
  },
  {
    id: 'v3', name: 'ProGreen Chemical Supply', type: 'chemical', contact: 'Mark Stevens',
    phone: '(800) 555-0882', email: 'sales@progreen.com', website: 'progreenchemical.com',
    address: '890 Industrial Blvd', city: 'Round Rock', state: 'TX', rating: 4,
    paymentTerms: 'Net 30', accountNumber: 'PGC-8841', notes: 'Licensed chemical distributor. Keep SDS on file.',
    totalSpend: 15670, activeOrders: 1, lastOrderDate: '2026-03-05', preferred: false,
  },
  {
    id: 'v4', name: 'Lone Star Equipment', type: 'equipment', contact: 'Jim Patterson',
    phone: '(512) 555-0512', email: 'parts@lonestarequip.com', website: 'lonestarequip.com',
    address: '3301 S Lamar Blvd', city: 'Austin', state: 'TX', rating: 3,
    paymentTerms: 'COD', accountNumber: 'LSE-1124', notes: 'Parts specialist. Call ahead for specialty items.',
    totalSpend: 8920, activeOrders: 0, lastOrderDate: '2026-02-20', preferred: false,
  },
  {
    id: 'v5', name: 'Austin Stone & Gravel', type: 'supplier', contact: 'Donna Kirby',
    phone: '(512) 555-0667', email: 'quotes@austinstone.com', website: 'austinstone.com',
    address: '7800 N Lamar Blvd', city: 'Austin', state: 'TX', rating: 5,
    paymentTerms: 'Net 30', accountNumber: 'ASG-3345', notes: 'Premium limestone and decomposed granite. Best prices in Austin.',
    totalSpend: 33100, activeOrders: 1, lastOrderDate: '2026-03-11', preferred: true,
  },
  {
    id: 'v6', name: 'Hill Country Irrigation', type: 'service', contact: 'Bob Nguyen',
    phone: '(512) 555-0789', email: 'bob@hcirrigation.com', website: '',
    address: '2200 W Anderson Ln', city: 'Austin', state: 'TX', rating: 4,
    paymentTerms: 'Due on Receipt', accountNumber: 'HCI-7712', notes: 'Sub for irrigation work. Licensed and insured.',
    totalSpend: 12400, activeOrders: 0, lastOrderDate: '2026-03-01', preferred: false,
  },
];

const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po1', poNumber: 'PO-2026-0041', vendorId: 'v1', status: 'partial',
    createdDate: '2026-03-08', expectedDate: '2026-03-14', notes: 'For Ridgemont HOA spring install',
    shippingCost: 85, taxRate: 8.25, jobRef: 'JOB-1089',
    items: [
      { id: 'i1', description: 'Live Oak 15-gal', sku: 'LO-15G', quantity: 6, unit: 'ea', unitPrice: 89.99, receivedQty: 4, jobRef: 'JOB-1089' },
      { id: 'i2', description: 'Texas Sage 3-gal', sku: 'TS-3G', quantity: 24, unit: 'ea', unitPrice: 18.50, receivedQty: 24, jobRef: 'JOB-1089' },
      { id: 'i3', description: 'Mexican Feathergrass 1-gal', sku: 'MFG-1G', quantity: 48, unit: 'ea', unitPrice: 8.75, receivedQty: 0, jobRef: 'JOB-1089' },
    ],
  },
  {
    id: 'po2', poNumber: 'PO-2026-0042', vendorId: 'v2', status: 'sent',
    createdDate: '2026-03-10', expectedDate: '2026-03-13', notes: 'Hardwood mulch for spring cleanup schedule',
    shippingCost: 0, taxRate: 8.25, jobRef: undefined,
    items: [
      { id: 'i4', description: 'Hardwood Mulch - Bulk', sku: 'HM-BULK', quantity: 40, unit: 'cu yd', unitPrice: 42.00, receivedQty: 0 },
      { id: 'i5', description: 'Decomposed Granite - Bulk', sku: 'DG-BULK', quantity: 15, unit: 'cu yd', unitPrice: 55.00, receivedQty: 0 },
    ],
  },
  {
    id: 'po3', poNumber: 'PO-2026-0039', vendorId: 'v3', status: 'invoiced',
    createdDate: '2026-03-01', expectedDate: '2026-03-07', receivedDate: '2026-03-06',
    notes: 'Monthly chemical restock', shippingCost: 45, taxRate: 0,
    items: [
      { id: 'i6', description: 'Roundup Pro Concentrate', sku: 'RPC-2.5G', quantity: 4, unit: 'jug', unitPrice: 124.00, receivedQty: 4 },
      { id: 'i7', description: 'Pre-M 0.86G', sku: 'PREM-50', quantity: 6, unit: 'bag', unitPrice: 68.50, receivedQty: 6 },
      { id: 'i8', description: 'Fertilome Liquid', sku: 'FTL-32OZ', quantity: 12, unit: 'bt', unitPrice: 24.99, receivedQty: 12 },
    ],
  },
  {
    id: 'po4', poNumber: 'PO-2026-0040', vendorId: 'v5', status: 'received',
    createdDate: '2026-03-06', expectedDate: '2026-03-10', receivedDate: '2026-03-10',
    notes: 'Flagstone for Martinez patio', shippingCost: 150, taxRate: 8.25, jobRef: 'JOB-1082',
    items: [
      { id: 'i9', description: 'Austin Limestone Flagstone', sku: 'ALF-PALLET', quantity: 3, unit: 'pallet', unitPrice: 485.00, receivedQty: 3, jobRef: 'JOB-1082' },
      { id: 'i10', description: 'Polymeric Sand 50lb', sku: 'PS-50', quantity: 8, unit: 'bag', unitPrice: 28.75, receivedQty: 8, jobRef: 'JOB-1082' },
    ],
  },
  {
    id: 'po5', poNumber: 'PO-2026-0043', vendorId: 'v1', status: 'draft',
    createdDate: '2026-03-11', expectedDate: '2026-03-18', notes: 'Thompson residence landscape renovation',
    shippingCost: 95, taxRate: 8.25, jobRef: 'JOB-1092',
    items: [
      { id: 'i11', description: 'Desert Willow 15-gal', sku: 'DW-15G', quantity: 4, unit: 'ea', unitPrice: 95.00, receivedQty: 0 },
      { id: 'i12', description: 'Crepe Myrtle 5-gal', sku: 'CM-5G', quantity: 10, unit: 'ea', unitPrice: 45.00, receivedQty: 0 },
      { id: 'i13', description: 'Buffalo Grass Sod', sku: 'BGS-PALLET', quantity: 5, unit: 'pallet', unitPrice: 275.00, receivedQty: 0 },
    ],
  },
  {
    id: 'po6', poNumber: 'PO-2026-0038', vendorId: 'v5', status: 'received',
    createdDate: '2026-02-28', expectedDate: '2026-03-05', receivedDate: '2026-03-04',
    notes: 'Erosion control materials', shippingCost: 120, taxRate: 8.25,
    items: [
      { id: 'i14', description: 'River Rock 3" - Bulk', sku: 'RR3-BULK', quantity: 20, unit: 'cu yd', unitPrice: 75.00, receivedQty: 20 },
      { id: 'i15', description: 'Filter Fabric 4x300', sku: 'FF-4X300', quantity: 2, unit: 'roll', unitPrice: 185.00, receivedQty: 2 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPOSubtotal(po: PurchaseOrder): number {
  return po.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
}

function calcPOTotal(po: PurchaseOrder): number {
  const sub = calcPOSubtotal(po);
  return sub + po.shippingCost + sub * (po.taxRate / 100);
}

function calcReceiveProgress(po: PurchaseOrder): number {
  const total = po.items.reduce((s, it) => s + it.quantity, 0);
  const received = po.items.reduce((s, it) => s + it.receivedQty, 0);
  if (!total) return 0;
  return Math.round((received / total) * 100);
}

function getVendor(id: string) {
  return VENDORS.find(v => v.id === id)!;
}

const VENDOR_ICONS: Record<VendorType, typeof Leaf> = {
  nursery: Leaf,
  supplier: Package,
  chemical: FlaskConical,
  equipment: Wrench,
  service: Star,
  other: Store,
};

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  nursery: 'Nursery', supplier: 'Supplier', chemical: 'Chemical',
  equipment: 'Equipment', service: 'Service', other: 'Other',
};

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft:      { label: 'Draft',      color: 'text-earth-400 bg-earth-800/60 border-earth-700',     icon: Edit2 },
  sent:       { label: 'Sent',       color: 'text-sky-400 bg-sky-900/30 border-sky-800',            icon: Send },
  partial:    { label: 'Partial',    color: 'text-amber-400 bg-amber-900/30 border-amber-800',      icon: AlertCircle },
  received:   { label: 'Received',   color: 'text-green-400 bg-green-900/30 border-green-800',      icon: CheckCircle },
  invoiced:   { label: 'Invoiced',   color: 'text-purple-400 bg-purple-900/30 border-purple-800',   icon: FileText },
  cancelled:  { label: 'Cancelled',  color: 'text-red-400 bg-red-900/30 border-red-800',            icon: XCircle },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: POStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={clsx('w-3 h-3', n <= rating ? 'text-amber-400 fill-amber-400' : 'text-earth-700')} />
      ))}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function NewVendorModal({ onClose, onSave }: { onClose: () => void; onSave: (v: Vendor) => void }) {
  const [form, setForm] = useState({ name: '', type: 'nursery' as VendorType, contact: '', phone: '', email: '', address: '', city: '', state: 'TX', paymentTerms: 'Net 30', notes: '' });
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  function handleSubmit() {
    if (!form.name.trim()) return;
    const vendor: Vendor = {
      id: `v${Date.now()}`, ...form, website: '', accountNumber: '',
      rating: 3, totalSpend: 0, activeOrders: 0,
      lastOrderDate: new Date().toISOString().split('T')[0], preferred: false,
    };
    onSave(vendor);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative z-10 bg-earth-900 border border-earth-700 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-800">
          <h3 className="text-lg font-semibold text-earth-50">Add Vendor</h3>
          <button onClick={onClose} className="p-1.5 text-earth-400 hover:text-earth-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-earth-400 mb-1">Vendor Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none" placeholder="e.g. Green Thumb Nursery" />
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as VendorType }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none">
                {Object.entries(VENDOR_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Payment Terms</label>
              <select value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none">
                {['Net 30', 'Net 15', 'Net 45', 'Net 60', 'Due on Receipt', 'COD'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Contact Name</label>
              <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none" placeholder="Primary contact" />
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none" placeholder="(512) 555-0000" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-earth-400 mb-1">Email</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none" placeholder="orders@vendor.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-earth-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none resize-none" placeholder="Payment terms, special conditions..." />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-earth-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-earth-300 hover:text-earth-100 cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.name.trim()}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-40 cursor-pointer">
            Add Vendor
          </button>
        </div>
      </div>
    </div>
  );
}

function NewPOModal({ vendors, onClose, onSave }: { vendors: Vendor[]; onClose: () => void; onSave: (po: PurchaseOrder) => void }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [jobRef, setJobRef] = useState('');
  const [items, setItems] = useState<POLineItem[]>([
    { id: 'ni1', description: '', sku: '', quantity: 1, unit: 'ea', unitPrice: 0, receivedQty: 0 },
  ]);

  function addItem() {
    setItems(p => [...p, { id: `ni${Date.now()}`, description: '', sku: '', quantity: 1, unit: 'ea', unitPrice: 0, receivedQty: 0 }]);
  }

  function updateItem(id: string, field: keyof POLineItem, val: string | number) {
    setItems(p => p.map(it => it.id === id ? { ...it, [field]: val } : it));
  }

  function removeItem(id: string) {
    setItems(p => p.filter(it => it.id !== id));
  }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  function handleSubmit() {
    if (!vendorId || items.length === 0) return;
    const po: PurchaseOrder = {
      id: `po${Date.now()}`,
      poNumber: `PO-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      vendorId, status: 'draft', createdDate: new Date().toISOString().split('T')[0],
      expectedDate: expectedDate || '', notes, shippingCost: 0, taxRate: 8.25,
      jobRef: jobRef || undefined, items,
    };
    onSave(po);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative z-10 bg-earth-900 border border-earth-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-800 sticky top-0 bg-earth-900 z-10">
          <h3 className="text-lg font-semibold text-earth-50">New Purchase Order</h3>
          <button onClick={onClose} className="p-1.5 text-earth-400 hover:text-earth-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-earth-400 mb-1">Vendor *</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none">
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Expected Delivery</label>
              <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Job Reference</label>
              <input value={jobRef} onChange={e => setJobRef(e.target.value)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none" placeholder="e.g. JOB-1089" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-earth-400 font-medium uppercase tracking-wider">Line Items</label>
              <button onClick={addItem} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 cursor-pointer">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-earth-800 border border-earth-700 rounded px-2 py-1.5 text-xs text-earth-100 focus:border-green-500 focus:outline-none" placeholder={`Item ${idx + 1} description`} />
                  </div>
                  <div className="col-span-2">
                    <input value={item.sku} onChange={e => updateItem(item.id, 'sku', e.target.value)}
                      className="w-full bg-earth-800 border border-earth-700 rounded px-2 py-1.5 text-xs text-earth-100 focus:border-green-500 focus:outline-none" placeholder="SKU" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" value={item.quantity} min={1} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full bg-earth-800 border border-earth-700 rounded px-2 py-1.5 text-xs text-earth-100 focus:border-green-500 focus:outline-none" />
                  </div>
                  <div className="col-span-1">
                    <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      className="w-full bg-earth-800 border border-earth-700 rounded px-1 py-1.5 text-xs text-earth-100 focus:border-green-500 focus:outline-none">
                      {['ea', 'bag', 'pallet', 'cu yd', 'lb', 'jug', 'roll', 'bt', 'sqft'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-earth-500" />
                      <input type="number" value={item.unitPrice} min={0} step={0.01} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-earth-800 border border-earth-700 rounded pl-6 pr-2 py-1.5 text-xs text-earth-100 focus:border-green-500 focus:outline-none" />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(item.id)} className="p-1 text-earth-600 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-earth-800">
              <span className="text-sm text-earth-400">Subtotal: <span className="text-earth-100 font-semibold">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-earth-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:border-green-500 focus:outline-none resize-none" placeholder="Special instructions..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-earth-800 sticky bottom-0 bg-earth-900">
          <button onClick={onClose} className="px-4 py-2 text-sm text-earth-300 hover:text-earth-100 cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} disabled={!vendorId || items.every(it => !it.description)}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-40 cursor-pointer">
            Create PO
          </button>
        </div>
      </div>
    </div>
  );
}

function PODetailModal({ po, vendor, onClose, onUpdateStatus }: {
  po: PurchaseOrder; vendor: Vendor; onClose: () => void;
  onUpdateStatus: (id: string, status: POStatus) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const subtotal = calcPOSubtotal(po);
  const tax = subtotal * (po.taxRate / 100);
  const total = subtotal + po.shippingCost + tax;
  const progress = calcReceiveProgress(po);

  const nextActions: Array<{ label: string; status: POStatus; variant: string }> = [];
  if (po.status === 'draft') nextActions.push({ label: 'Mark Sent', status: 'sent', variant: 'sky' });
  if (po.status === 'sent' || po.status === 'partial') nextActions.push({ label: 'Mark Received', status: 'received', variant: 'green' });
  if (po.status === 'received') nextActions.push({ label: 'Mark Invoiced', status: 'invoiced', variant: 'purple' });
  if (po.status !== 'cancelled' && po.status !== 'invoiced') nextActions.push({ label: 'Cancel PO', status: 'cancelled', variant: 'red' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative z-10 bg-earth-900 border border-earth-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-800 sticky top-0 bg-earth-900 z-10">
          <div>
            <h3 className="text-lg font-semibold text-earth-50">{po.poNumber}</h3>
            <p className="text-sm text-earth-400">{vendor.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={po.status} />
            <button onClick={onClose} className="p-1.5 text-earth-400 hover:text-earth-100 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-earth-500 text-xs block mb-0.5">Created</span>
              <span className="text-earth-200">{new Date(po.createdDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-earth-500 text-xs block mb-0.5">Expected</span>
              <span className="text-earth-200">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</span>
            </div>
            {po.jobRef && <div>
              <span className="text-earth-500 text-xs block mb-0.5">Job Ref</span>
              <span className="text-green-400">{po.jobRef}</span>
            </div>}
          </div>

          {/* Receive progress */}
          {(po.status === 'partial' || po.status === 'received') && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-earth-400">Received</span>
                <span className="text-earth-200">{progress}%</span>
              </div>
              <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-amber-500')}
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Line items */}
          <div>
            <h4 className="text-xs font-semibold text-earth-400 uppercase tracking-wider mb-3">Line Items</h4>
            <div className="border border-earth-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-earth-800/50">
                    <th className="text-left px-3 py-2 text-xs text-earth-500 font-medium">Description</th>
                    <th className="text-right px-3 py-2 text-xs text-earth-500 font-medium">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-earth-500 font-medium">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs text-earth-500 font-medium">Total</th>
                    {(po.status === 'partial' || po.status === 'received') && (
                      <th className="text-right px-3 py-2 text-xs text-earth-500 font-medium">Received</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-800/50">
                  {po.items.map(item => (
                    <tr key={item.id} className="hover:bg-earth-800/20">
                      <td className="px-3 py-2.5">
                        <div className="text-earth-200">{item.description}</div>
                        {item.sku && <div className="text-xs text-earth-500">{item.sku}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-earth-300">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2.5 text-right text-earth-300">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-earth-100 font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                      {(po.status === 'partial' || po.status === 'received') && (
                        <td className="px-3 py-2.5 text-right">
                          <span className={clsx('text-xs', item.receivedQty >= item.quantity ? 'text-green-400' : 'text-amber-400')}>
                            {item.receivedQty}/{item.quantity}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-earth-800/30 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-earth-400">
              <span>Subtotal</span><span className="text-earth-200">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-earth-400">
              <span>Shipping</span><span className="text-earth-200">${po.shippingCost.toFixed(2)}</span>
            </div>
            {po.taxRate > 0 && (
              <div className="flex justify-between text-earth-400">
                <span>Tax ({po.taxRate}%)</span><span className="text-earth-200">${tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-earth-700 font-semibold text-base">
              <span className="text-earth-200">Total</span>
              <span className="text-green-400">${total.toFixed(2)}</span>
            </div>
          </div>

          {po.notes && (
            <div className="bg-earth-800/30 rounded-lg p-3 text-sm text-earth-300">{po.notes}</div>
          )}
        </div>
        {nextActions.length > 0 && (
          <div className="flex gap-3 px-6 py-4 border-t border-earth-800 sticky bottom-0 bg-earth-900">
            {nextActions.map(({ label, status, variant }) => (
              <button key={status}
                onClick={() => { onUpdateStatus(po.id, status); onClose(); }}
                className={clsx(
                  'px-4 py-2 text-sm rounded-lg font-medium transition-colors cursor-pointer',
                  variant === 'green' && 'bg-green-600 hover:bg-green-500 text-white',
                  variant === 'sky' && 'bg-sky-700 hover:bg-sky-600 text-white',
                  variant === 'purple' && 'bg-purple-700 hover:bg-purple-600 text-white',
                  variant === 'red' && 'bg-red-900/50 hover:bg-red-900/70 text-red-300 border border-red-800',
                )}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function VendorsTab({ vendors, onAdd }: { vendors: Vendor[]; onAdd: () => void }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<VendorType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => vendors.filter(v => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.contact.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || v.type === typeFilter;
    return matchSearch && matchType;
  }), [vendors, search, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-earth-900 border border-earth-700 rounded-lg pl-9 pr-3 py-2 text-sm text-earth-100 placeholder-earth-500 focus:border-green-500 focus:outline-none"
            placeholder="Search vendors..." />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'nursery', 'supplier', 'chemical', 'equipment', 'service'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={clsx('px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer capitalize',
                typeFilter === t ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-earth-400 hover:text-earth-200 border border-earth-800')}>
              {t === 'all' ? 'All' : VENDOR_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition-colors cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(vendor => {
          const TypeIcon = VENDOR_ICONS[vendor.type];
          const expanded = expandedId === vendor.id;
          return (
            <div key={vendor.id} className="bg-earth-900 border border-earth-800 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedId(expanded ? null : vendor.id)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-earth-800/30 transition-colors cursor-pointer text-left">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  vendor.type === 'nursery' ? 'bg-green-900/50 text-green-400' :
                  vendor.type === 'chemical' ? 'bg-purple-900/50 text-purple-400' :
                  vendor.type === 'equipment' ? 'bg-amber-900/50 text-amber-400' :
                  vendor.type === 'supplier' ? 'bg-sky-900/50 text-sky-400' :
                  'bg-earth-800 text-earth-400')}>
                  <TypeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-earth-100">{vendor.name}</span>
                    {vendor.preferred && <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full">Preferred</span>}
                    <span className="text-xs text-earth-500">{VENDOR_TYPE_LABELS[vendor.type]}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-sm text-earth-400">
                    <span>{vendor.contact}</span>
                    {vendor.activeOrders > 0 && <span className="text-amber-400">{vendor.activeOrders} active orders</span>}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <StarRating rating={vendor.rating} />
                  <span className="text-sm text-green-400 font-medium">${vendor.totalSpend.toLocaleString()} YTD</span>
                </div>
                <ChevronDown className={clsx('w-4 h-4 text-earth-500 transition-transform shrink-0', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <div className="px-4 pb-4 pt-0 border-t border-earth-800/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-earth-400">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <a href={`tel:${vendor.phone}`} className="hover:text-earth-200 transition-colors">{vendor.phone}</a>
                    </div>
                    <div className="flex items-center gap-2 text-earth-400">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <a href={`mailto:${vendor.email}`} className="hover:text-earth-200 transition-colors truncate">{vendor.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-earth-400">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>{vendor.paymentTerms}</span>
                    </div>
                    <div className="flex items-center gap-2 text-earth-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{vendor.city}, {vendor.state}</span>
                    </div>
                  </div>
                  {vendor.accountNumber && (
                    <div className="mt-2 text-xs text-earth-500">Account #: <span className="text-earth-300">{vendor.accountNumber}</span></div>
                  )}
                  {vendor.notes && (
                    <div className="mt-2 text-sm text-earth-400 bg-earth-800/40 rounded-lg px-3 py-2">{vendor.notes}</div>
                  )}
                  <div className="flex gap-3 mt-3">
                    <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-earth-800 hover:bg-earth-700 text-earth-300 rounded-lg transition-colors cursor-pointer">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-earth-800 hover:bg-earth-700 text-earth-300 rounded-lg transition-colors cursor-pointer">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                    {vendor.website && (
                      <a href={`https://${vendor.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-earth-800 hover:bg-earth-700 text-earth-300 rounded-lg transition-colors cursor-pointer">
                        <Globe className="w-3.5 h-3.5" /> Website
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-earth-500">
            <Store className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No vendors found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PurchaseOrdersTab({ orders, vendors, onAdd, onViewPO, onUpdateStatus }: {
  orders: PurchaseOrder[]; vendors: Vendor[];
  onAdd: () => void; onViewPO: (po: PurchaseOrder) => void;
  onUpdateStatus: (id: string, status: POStatus) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');

  const filtered = useMemo(() => orders.filter(po => {
    const vendor = getVendor(po.vendorId);
    const matchSearch = !search ||
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      vendor?.name.toLowerCase().includes(search.toLowerCase()) ||
      (po.jobRef || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  const totalPending = orders.filter(p => p.status === 'sent' || p.status === 'partial')
    .reduce((s, po) => s + calcPOTotal(po), 0);
  const totalDraft = orders.filter(p => p.status === 'draft').length;
  const awaitingDelivery = orders.filter(p => p.status === 'sent').length;

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open Orders', value: awaitingDelivery, icon: Truck, color: 'sky' },
          { label: 'Partial Receipt', value: orders.filter(p => p.status === 'partial').length, icon: AlertCircle, color: 'amber' },
          { label: 'Drafts', value: totalDraft, icon: Edit2, color: 'earth' },
          { label: 'Pending Value', value: `$${Math.round(totalPending).toLocaleString()}`, icon: DollarSign, color: 'green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-earth-900 border border-earth-800 rounded-xl p-3.5">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2',
              color === 'sky' ? 'bg-sky-900/50 text-sky-400' :
              color === 'amber' ? 'bg-amber-900/50 text-amber-400' :
              color === 'green' ? 'bg-green-900/50 text-green-400' :
              'bg-earth-800 text-earth-400')}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-earth-100">{value}</div>
            <div className="text-xs text-earth-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-earth-900 border border-earth-700 rounded-lg pl-9 pr-3 py-2 text-sm text-earth-100 placeholder-earth-500 focus:border-green-500 focus:outline-none"
            placeholder="Search PO#, vendor, job..." />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'partial', 'received', 'invoiced'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer capitalize',
                statusFilter === s ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-earth-400 hover:text-earth-200 border border-earth-800')}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition-colors cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> New PO
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(po => {
          const vendor = getVendor(po.vendorId);
          const total = calcPOTotal(po);
          const progress = calcReceiveProgress(po);
          const isOverdue = po.status === 'sent' && po.expectedDate && new Date(po.expectedDate) < new Date();
          return (
            <div key={po.id}
              onClick={() => onViewPO(po)}
              className="bg-earth-900 border border-earth-800 hover:border-earth-700 rounded-xl p-4 cursor-pointer transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-earth-100">{po.poNumber}</span>
                    <StatusBadge status={po.status} />
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-800 rounded-full text-xs">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-earth-400 flex-wrap">
                    <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5" /> {vendor?.name}</span>
                    <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {po.items.length} items</span>
                    {po.jobRef && <span className="text-green-400/70 text-xs">{po.jobRef}</span>}
                    {po.expectedDate && <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {new Date(po.expectedDate).toLocaleDateString()}</span>}
                  </div>
                  {(po.status === 'partial') && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-earth-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-amber-400">{progress}% received</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-earth-100">${Math.round(total).toLocaleString()}</div>
                  <div className="text-xs text-earth-500">{po.items.reduce((s, i) => s + i.quantity, 0)} units</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-earth-500">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No purchase orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpendAnalyticsTab({ orders, vendors }: { orders: PurchaseOrder[]; vendors: Vendor[] }) {
  const completedOrders = orders.filter(po => po.status !== 'draft' && po.status !== 'cancelled');

  const byVendor = vendors.map(v => {
    const vOrders = completedOrders.filter(po => po.vendorId === v.id);
    const spend = vOrders.reduce((s, po) => s + calcPOTotal(po), 0);
    return { vendor: v, spend, orders: vOrders.length };
  }).filter(x => x.spend > 0).sort((a, b) => b.spend - a.spend);

  const categorySpend: Record<string, number> = {};
  completedOrders.forEach(po => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    if (!vendor) return;
    const type = VENDOR_TYPE_LABELS[vendor.type];
    categorySpend[type] = (categorySpend[type] || 0) + calcPOTotal(po);
  });
  const categoryData = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]);
  const maxCatSpend = Math.max(...categoryData.map(([, v]) => v), 1);

  const totalSpend = byVendor.reduce((s, x) => s + x.spend, 0);
  const totalOrders = completedOrders.length;
  const avgOrder = totalOrders ? totalSpend / totalOrders : 0;
  const maxVendorSpend = Math.max(...byVendor.map(x => x.spend), 1);

  const monthlySpend: Record<string, number> = {};
  completedOrders.forEach(po => {
    const month = po.createdDate.substring(0, 7);
    monthlySpend[month] = (monthlySpend[month] || 0) + calcPOTotal(po);
  });

  return (
    <div className="space-y-5">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Spend YTD', value: `$${Math.round(totalSpend).toLocaleString()}`, icon: DollarSign, sub: 'All vendors' },
          { label: 'Total Orders', value: totalOrders, icon: ShoppingCart, sub: 'Completed POs' },
          { label: 'Avg Order Value', value: `$${Math.round(avgOrder).toLocaleString()}`, icon: TrendingUp, sub: 'Per PO' },
          { label: 'Active Vendors', value: byVendor.length, icon: Store, sub: 'With spend' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="bg-earth-900 border border-earth-800 rounded-xl p-4">
            <Icon className="w-5 h-5 text-green-400 mb-2" />
            <div className="text-2xl font-bold text-earth-100">{value}</div>
            <div className="text-xs text-earth-500 mt-0.5">{label}</div>
            <div className="text-xs text-earth-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spend by Vendor */}
        <div className="bg-earth-900 border border-earth-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-earth-200 mb-4">Spend by Vendor</h3>
          <div className="space-y-3">
            {byVendor.map(({ vendor, spend, orders: cnt }) => {
              const TypeIcon = VENDOR_ICONS[vendor.type];
              return (
                <div key={vendor.id}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeIcon className="w-3.5 h-3.5 text-earth-500 shrink-0" />
                      <span className="text-earth-300 truncate">{vendor.name}</span>
                      <span className="text-earth-600 text-xs shrink-0">{cnt} POs</span>
                    </div>
                    <span className="text-earth-100 font-semibold shrink-0 ml-2">${Math.round(spend).toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 rounded-full transition-all"
                      style={{ width: `${(spend / maxVendorSpend) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spend by Category */}
        <div className="bg-earth-900 border border-earth-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-earth-200 mb-4">Spend by Category</h3>
          <div className="space-y-3">
            {categoryData.map(([cat, spend]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-earth-300">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-earth-500 text-xs">{Math.round((spend / totalSpend) * 100)}%</span>
                    <span className="text-earth-100 font-semibold">${Math.round(spend).toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-600 rounded-full transition-all"
                    style={{ width: `${(spend / maxCatSpend) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-earth-900 border border-earth-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-earth-200 mb-4">Recent Purchase Orders</h3>
        <div className="space-y-2">
          {orders.slice(0, 5).map(po => {
            const vendor = getVendor(po.vendorId);
            return (
              <div key={po.id} className="flex items-center justify-between py-2 border-b border-earth-800/50 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={po.status} />
                  <div>
                    <span className="text-sm text-earth-200 font-mono">{po.poNumber}</span>
                    <span className="text-sm text-earth-500 ml-2">• {vendor?.name}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-earth-100">${Math.round(calcPOTotal(po)).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VendorPurchaseOrders() {
  const [tab, setTab] = useState<'vendors' | 'orders' | 'analytics'>('orders');
  const [vendors, setVendors] = useState<Vendor[]>(VENDORS);
  const [orders, setOrders] = useState<PurchaseOrder[]>(PURCHASE_ORDERS);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [showNewPO, setShowNewPO] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

  function addVendor(v: Vendor) { setVendors(prev => [...prev, v]); }
  function addOrder(po: PurchaseOrder) { setOrders(prev => [po, ...prev]); }
  function updatePOStatus(id: string, status: POStatus) {
    setOrders(prev => prev.map(po => po.id === id ? { ...po, status, ...(status === 'received' ? { receivedDate: new Date().toISOString().split('T')[0] } : {}) } : po));
  }

  const pendingCount = orders.filter(o => o.status === 'sent' || o.status === 'partial').length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-earth-50">Vendors & Purchase Orders</h2>
          <p className="text-sm text-earth-400 mt-0.5">
            Manage suppliers, track orders, and monitor procurement spend
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setShowNewVendor(false); setShowNewPO(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-earth-800 hover:bg-earth-700 text-earth-200 text-sm rounded-lg font-medium transition-colors cursor-pointer">
            <ShoppingCart className="w-4 h-4" /> New PO
          </button>
          <button onClick={() => { setShowNewPO(false); setShowNewVendor(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-earth-900/50 rounded-xl p-1 w-fit border border-earth-800">
        {([
          { key: 'orders', label: 'Purchase Orders', icon: ShoppingCart, badge: pendingCount },
          { key: 'vendors', label: 'Vendors', icon: Store, badge: 0 },
          { key: 'analytics', label: 'Spend Analytics', icon: BarChart3, badge: 0 },
        ] as const).map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
              tab === key ? 'bg-earth-800 text-earth-100' : 'text-earth-400 hover:text-earth-200'
            )}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {badge > 0 && <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">{badge}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'vendors' && <VendorsTab vendors={vendors} onAdd={() => setShowNewVendor(true)} />}
      {tab === 'orders' && (
        <PurchaseOrdersTab orders={orders} vendors={vendors} onAdd={() => setShowNewPO(true)}
          onViewPO={setViewingPO} onUpdateStatus={updatePOStatus} />
      )}
      {tab === 'analytics' && <SpendAnalyticsTab orders={orders} vendors={vendors} />}

      {/* Modals */}
      {showNewVendor && <NewVendorModal onClose={() => setShowNewVendor(false)} onSave={addVendor} />}
      {showNewPO && <NewPOModal vendors={vendors} onClose={() => setShowNewPO(false)} onSave={addOrder} />}
      {viewingPO && (
        <PODetailModal po={viewingPO} vendor={getVendor(viewingPO.vendorId)}
          onClose={() => setViewingPO(null)} onUpdateStatus={updatePOStatus} />
      )}
    </div>
  );
}
