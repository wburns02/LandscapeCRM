import { useState, useMemo } from 'react';
import { Plus, Package, AlertTriangle, Minus, Save, Edit2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import type { InventoryItem, InventoryCategory } from '../../types';

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
  const { inventory, addInventoryItem, updateInventoryQuantity, refreshInventory } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | InventoryCategory>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'plants' as InventoryCategory, quantity: '', unit: '',
    unit_cost: '', retail_price: '', min_stock: '', supplier: '',
  });

  // Edit modal state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', category: 'plants' as InventoryCategory, quantity: '', unit: '',
    unit_cost: '', retail_price: '', min_stock: '', supplier: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const lowStockItems = useMemo(() => inventory.filter(i => (i.quantity ?? 0) <= (i.min_stock ?? 0)), [inventory]);

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.supplier?.toLowerCase().includes(search.toLowerCase());
      const matchCat = !category || i.category === category;
      return matchSearch && matchCat;
    });
  }, [inventory, search, category]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity || !formData.unit) {
      toast.error('Name, quantity, and unit are required');
      return;
    }
    try {
      await addInventoryItem({
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity) || 0,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        retail_price: parseFloat(formData.retail_price) || 0,
        min_stock: parseFloat(formData.min_stock) || 0,
        supplier: formData.supplier || undefined,
      });
      toast.success(`"${formData.name}" added to inventory`);
      setShowAddModal(false);
      setFormData({ name: '', category: 'plants', quantity: '', unit: '', unit_cost: '', retail_price: '', min_stock: '', supplier: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  const handleQuantityAdjust = async (e: React.MouseEvent, itemId: string, itemName: string, delta: number) => {
    e.stopPropagation();
    try {
      await updateInventoryQuantity(itemId, delta);
      toast.success(`${itemName} quantity adjusted by ${delta > 0 ? '+' : ''}${delta}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust quantity');
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity ?? 0),
      unit: item.unit,
      unit_cost: String(item.unit_cost ?? 0),
      retail_price: String(item.retail_price ?? 0),
      min_stock: String(item.min_stock ?? 0),
      supplier: item.supplier || '',
    });
  };

  const handleEditSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await api.patch(`/inventory/${selectedItem.id}`, {
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        quantity_on_hand: parseFloat(editForm.quantity) || 0,
        unit_cost: parseFloat(editForm.unit_cost) || 0,
        unit_price: parseFloat(editForm.retail_price) || 0,
        reorder_level: parseFloat(editForm.min_stock) || 0,
        supplier_name: editForm.supplier || undefined,
      });
      toast.success(`"${editForm.name}" updated`);
      setSelectedItem(null);
      await refreshInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
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
                <div
                  className="space-y-3 cursor-pointer hover:ring-2 hover:ring-green-500/30 rounded-lg transition-all -m-1 p-1"
                  onClick={() => openEditModal(item)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-earth-100">{item.name}</h3>
                      {item.sku && <p className="text-xs text-earth-500">SKU: {item.sku}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5 text-earth-500" />
                      <Badge color={isLow ? 'red' : 'green'}>{item.category}</Badge>
                    </div>
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
                        onClick={(e) => handleQuantityAdjust(e, item.id, item.name, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleQuantityAdjust(e, item.id, item.name, 1)}
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

      {/* Add Item Modal */}
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

      {/* Edit Item Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`Edit: ${selectedItem?.name || 'Item'}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedItem(null)}>Cancel</Button>
            <Button onClick={handleEditSave} loading={isSaving} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
          </>
        }
      >
        {selectedItem && (
          <div className="space-y-5">
            {/* Quick Stock Adjust */}
            <div className="p-4 rounded-xl bg-earth-800/30 border border-earth-800/50">
              <p className="text-xs font-medium text-earth-300 mb-3">Quick Stock Adjustment</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setEditForm(f => ({ ...f, quantity: String(Math.max(0, (parseFloat(f.quantity) || 0) - 10)) }))}
                  className="px-3 py-2 rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 text-sm font-medium cursor-pointer"
                >-10</button>
                <button
                  onClick={() => setEditForm(f => ({ ...f, quantity: String(Math.max(0, (parseFloat(f.quantity) || 0) - 1)) }))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 cursor-pointer"
                ><Minus className="w-4 h-4" /></button>
                <div className="text-center min-w-[80px]">
                  <p className="text-3xl font-bold text-earth-50">{editForm.quantity}</p>
                  <p className="text-xs text-earth-400">{editForm.unit}</p>
                </div>
                <button
                  onClick={() => setEditForm(f => ({ ...f, quantity: String((parseFloat(f.quantity) || 0) + 1) }))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 cursor-pointer"
                ><Plus className="w-4 h-4" /></button>
                <button
                  onClick={() => setEditForm(f => ({ ...f, quantity: String((parseFloat(f.quantity) || 0) + 10) }))}
                  className="px-3 py-2 rounded-lg bg-earth-800 hover:bg-earth-700 text-earth-300 text-sm font-medium cursor-pointer"
                >+10</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Item Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <Select label="Category" options={categories.filter(c => c.key).map(c => ({ value: c.key, label: c.label }))} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value as InventoryCategory }))} />
              <Input label="Supplier" value={editForm.supplier} onChange={e => setEditForm(f => ({ ...f, supplier: e.target.value }))} />
              <Input label="Quantity" type="number" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
              <Input label="Unit" value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} />
              <Input label="Unit Cost ($)" type="number" value={editForm.unit_cost} onChange={e => setEditForm(f => ({ ...f, unit_cost: e.target.value }))} />
              <Input label="Retail Price ($)" type="number" value={editForm.retail_price} onChange={e => setEditForm(f => ({ ...f, retail_price: e.target.value }))} />
              <Input label="Min Stock Level" type="number" value={editForm.min_stock} onChange={e => setEditForm(f => ({ ...f, min_stock: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
