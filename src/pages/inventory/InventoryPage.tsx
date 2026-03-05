import { useState, useMemo } from 'react';
import { Plus, Package, AlertTriangle, Minus } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import type { InventoryCategory } from '../../types';

const categories: { key: '' | InventoryCategory; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'plants', label: 'Plants' },
  { key: 'trees', label: 'Trees' },
  { key: 'mulch', label: 'Mulch' },
  { key: 'fertilizers', label: 'Fertilizers' },
  { key: 'chemicals', label: 'Chemicals' },
  { key: 'hardscape', label: 'Hardscape' },
  { key: 'tools', label: 'Tools' },
  { key: 'soil', label: 'Soil' },
  { key: 'seed', label: 'Seed' },
];

export default function InventoryPage() {
  const { inventory } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | InventoryCategory>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'plants' as InventoryCategory, quantity: '', unit: '',
    unit_cost: '', retail_price: '', min_stock: '', supplier: '',
  });

  const lowStockItems = useMemo(() => inventory.filter(i => (i.quantity ?? 0) <= (i.min_stock ?? 0)), [inventory]);

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.supplier?.toLowerCase().includes(search.toLowerCase());
      const matchCat = !category || i.category === category;
      return matchSearch && matchCat;
    });
  }, [inventory, search, category]);

  const handleSubmit = () => {
    if (!formData.name || !formData.quantity || !formData.unit) {
      toast.error('Name, quantity, and unit are required');
      return;
    }
    toast.success(`"${formData.name}" added to inventory`);
    setShowAddModal(false);
    setFormData({ name: '', category: 'plants', quantity: '', unit: '', unit_cost: '', retail_price: '', min_stock: '', supplier: '' });
  };

  const handleQuantityAdjust = (itemId: string, itemName: string, delta: number) => {
    toast.success(`${itemName} quantity adjusted by ${delta > 0 ? '+' : ''}${delta}`);
    void itemId;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Inventory</h2>
          <p className="text-sm text-earth-400">{inventory.length} items tracked</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>Add Item</Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-600/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Low Stock Alert</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {lowStockItems.map(i => i.name).join(', ')} {lowStockItems.length === 1 ? 'is' : 'are'} at or below minimum stock level.
            </p>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              category === cat.key
                ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                : 'text-earth-400 hover:text-earth-200 hover:bg-earth-800/50 border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search inventory..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title="No items found"
          description={search || category ? 'Try adjusting your search or category' : 'Add your first inventory item'}
          actionLabel="Add Item"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const isLow = (item.quantity ?? 0) <= (item.min_stock ?? 0);
            return (
              <Card key={item.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-earth-100">{item.name}</h3>
                      {item.sku && <p className="text-xs text-earth-500">SKU: {item.sku}</p>}
                    </div>
                    <Badge color={isLow ? 'red' : 'green'}>{item.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-2xl font-bold ${isLow ? 'text-red-400' : 'text-earth-50'}`}>
                        {item.quantity}
                      </p>
                      <p className="text-xs text-earth-400">{item.unit} (min: {item.min_stock})</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuantityAdjust(item.id, item.name, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleQuantityAdjust(item.id, item.name, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-earth-400 pt-2 border-t border-earth-800/50">
                    <span>Cost: ${item.unit_cost.toFixed(2)}/{item.unit}</span>
                    {(item.retail_price ?? 0) > 0 && <span>Retail: ${(item.retail_price ?? 0).toFixed(2)}</span>}
                  </div>
                  {item.supplier && <p className="text-xs text-earth-500">Supplier: {item.supplier}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Item"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Item</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Item Name" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Bermuda Grass Sod" />
          </div>
          <Select label="Category" options={categories.filter(c => c.key).map(c => ({ value: c.key, label: c.label }))} value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value as InventoryCategory }))} />
          <Input label="Supplier" value={formData.supplier} onChange={e => setFormData(f => ({ ...f, supplier: e.target.value }))} placeholder="TX Turf Farms" />
          <Input label="Quantity" type="number" required value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} />
          <Input label="Unit" required value={formData.unit} onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))} placeholder="sq ft, cu yd, each..." />
          <Input label="Unit Cost" type="number" value={formData.unit_cost} onChange={e => setFormData(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0.00" />
          <Input label="Retail Price" type="number" value={formData.retail_price} onChange={e => setFormData(f => ({ ...f, retail_price: e.target.value }))} placeholder="0.00" />
          <Input label="Min Stock Level" type="number" value={formData.min_stock} onChange={e => setFormData(f => ({ ...f, min_stock: e.target.value }))} placeholder="10" />
        </div>
      </Modal>
    </div>
  );
}
