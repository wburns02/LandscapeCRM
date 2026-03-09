import { useState, useMemo } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, DollarSign, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import type { Equipment } from '../../types';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';

const emptyForm = { name: '', type: '', make: '', model: '', serial_number: '', purchase_price: '', status: 'available' as Equipment['status'], hours_used: '', assigned_crew_id: '', notes: '' };

export default function EquipmentPage() {
  const { equipment, crews, addEquipment, updateEquipment, deleteEquipment } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', make: '', model: '', serial_number: '', purchase_price: '' });

  // Edit modal state
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editFormData, setEditFormData] = useState(emptyForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const openEditModal = (eq: Equipment) => {
    setEditingEquipment(eq);
    setEditFormData({
      name: eq.name,
      type: eq.type ?? eq.equipment_type ?? '',
      make: eq.make ?? '',
      model: eq.model ?? '',
      serial_number: eq.serial_number ?? '',
      purchase_price: eq.purchase_price?.toString() ?? '',
      status: eq.status,
      hours_used: eq.hours_used.toString(),
      assigned_crew_id: eq.assigned_crew_id ?? '',
      notes: eq.notes ?? '',
    });
    setShowDeleteConfirm(false);
  };

  const closeEditModal = () => {
    setEditingEquipment(null);
    setEditFormData(emptyForm);
    setShowDeleteConfirm(false);
  };

  const handleEditSubmit = async () => {
    if (!editingEquipment) return;
    if (!editFormData.name || !editFormData.type) {
      toast.error('Name and type are required');
      return;
    }
    try {
      await updateEquipment(editingEquipment.id, {
        name: editFormData.name,
        type: editFormData.type,
        make: editFormData.make || undefined,
        model: editFormData.model || undefined,
        serial_number: editFormData.serial_number || undefined,
        purchase_price: parseFloat(editFormData.purchase_price) || undefined,
        status: editFormData.status,
        hours_used: parseFloat(editFormData.hours_used) || 0,
        assigned_crew_id: editFormData.assigned_crew_id || undefined,
        notes: editFormData.notes || undefined,
      });
      toast.success(`Equipment "${editFormData.name}" updated`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update equipment');
    }
  };

  const handleDelete = async () => {
    if (!editingEquipment) return;
    try {
      await deleteEquipment(editingEquipment.id);
      toast.success(`Equipment "${editingEquipment.name}" deleted`);
      closeEditModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete equipment');
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'in_use', label: 'In Use' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  const crewOptions = [
    { value: '', label: 'Unassigned' },
    ...crews.map(c => ({ value: c.id, label: c.name })),
  ];

  const filtered = useMemo(() => {
    if (!search) return equipment;
    return equipment.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.type ?? 'other').toLowerCase().includes(search.toLowerCase()) ||
      e.make?.toLowerCase().includes(search.toLowerCase())
    );
  }, [equipment, search]);

  const maintenanceDue = equipment.filter(e =>
    e.next_maintenance && new Date(e.next_maintenance) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const totalAssetValue = equipment.reduce((s, e) => s + (e.purchase_price || 0), 0);

  const handleSubmit = async () => {
    if (!formData.name || !formData.type) {
      toast.error('Name and type are required');
      return;
    }
    try {
      await addEquipment({
        name: formData.name,
        type: formData.type,
        make: formData.make || undefined,
        model: formData.model || undefined,
        serial_number: formData.serial_number || undefined,
        purchase_price: parseFloat(formData.purchase_price) || undefined,
        status: 'available',
        hours_used: 0,
      });
      toast.success(`Equipment "${formData.name}" added`);
      setShowAddModal(false);
      setFormData({ name: '', type: '', make: '', model: '', serial_number: '', purchase_price: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add equipment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-earth-100">Equipment</h2>
          <p className="text-sm text-earth-400">{equipment.length} pieces of equipment</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>Add Equipment</Button>
      </div>

      {/* Maintenance alerts */}
      {maintenanceDue.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-600/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Maintenance Due</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {maintenanceDue.map(e => e.name).join(', ')} {maintenanceDue.length === 1 ? 'needs' : 'need'} maintenance within 7 days.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard title="Total Assets" value={equipment.length} icon={<Wrench className="w-5 h-5" />} color="green" />
        <StatCard title="Total Hours" value={equipment.reduce((s, e) => s + e.hours_used, 0).toLocaleString()} icon={<Clock className="w-5 h-5" />} color="sky" />
        <StatCard title="Asset Value" value={`$${totalAssetValue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="amber" />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search equipment..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench className="w-10 h-10" />}
          title="No equipment found"
          description="Track your equipment, maintenance schedules, and assignments."
          actionLabel="Add Equipment"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(eq => {
            const assignedCrew = crews.find(c => c.id === eq.assigned_crew_id);
            return (
              <Card key={eq.id} hover onClick={() => openEditModal(eq)}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-earth-100">{eq.name}</h3>
                      <p className="text-xs text-earth-400">{eq.type}</p>
                    </div>
                    <StatusBadge status={eq.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {eq.make && <div><p className="text-earth-500">Make</p><p className="text-earth-200">{eq.make}</p></div>}
                    {eq.model && <div><p className="text-earth-500">Model</p><p className="text-earth-200">{eq.model}</p></div>}
                    <div><p className="text-earth-500">Hours Used</p><p className="text-earth-200">{eq.hours_used.toLocaleString()}</p></div>
                    {eq.purchase_price && <div><p className="text-earth-500">Value</p><p className="text-earth-200">${eq.purchase_price.toLocaleString()}</p></div>}
                  </div>
                  <div className="pt-2 border-t border-earth-800/50 flex items-center justify-between text-xs">
                    {assignedCrew ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedCrew.color }} />
                        {assignedCrew.name}
                      </span>
                    ) : (
                      <span className="text-earth-500">Unassigned</span>
                    )}
                    {eq.next_maintenance && (
                      <span className="text-earth-400">
                        Next maint: {format(new Date(eq.next_maintenance), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Equipment"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Equipment</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name" required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="John Deere Z930M" />
          <Input label="Type" required value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} placeholder="Zero-Turn Mower" />
          <Input label="Make" value={formData.make} onChange={e => setFormData(f => ({ ...f, make: e.target.value }))} placeholder="John Deere" />
          <Input label="Model" value={formData.model} onChange={e => setFormData(f => ({ ...f, model: e.target.value }))} placeholder="Z930M" />
          <Input label="Serial Number" value={formData.serial_number} onChange={e => setFormData(f => ({ ...f, serial_number: e.target.value }))} />
          <Input label="Purchase Price" type="number" value={formData.purchase_price} onChange={e => setFormData(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0.00" />
        </div>
      </Modal>

      {/* Edit Equipment Modal */}
      <Modal
        isOpen={!!editingEquipment}
        onClose={closeEditModal}
        title="Edit Equipment"
        size="lg"
        footer={
          showDeleteConfirm ? (
            <>
              <p className="text-sm text-red-400 mr-auto">Are you sure? This cannot be undone.</p>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Confirm Delete</Button>
            </>
          ) : (
            <>
              <Button variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteConfirm(true)} className="mr-auto">Delete</Button>
              <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
              <Button onClick={handleEditSubmit}>Save Changes</Button>
            </>
          )
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name" required value={editFormData.name} onChange={e => setEditFormData(f => ({ ...f, name: e.target.value }))} placeholder="John Deere Z930M" />
          <Input label="Type" required value={editFormData.type} onChange={e => setEditFormData(f => ({ ...f, type: e.target.value }))} placeholder="Zero-Turn Mower" />
          <Input label="Make" value={editFormData.make} onChange={e => setEditFormData(f => ({ ...f, make: e.target.value }))} placeholder="John Deere" />
          <Input label="Model" value={editFormData.model} onChange={e => setEditFormData(f => ({ ...f, model: e.target.value }))} placeholder="Z930M" />
          <Input label="Serial Number" value={editFormData.serial_number} onChange={e => setEditFormData(f => ({ ...f, serial_number: e.target.value }))} />
          <Input label="Purchase Price" type="number" value={editFormData.purchase_price} onChange={e => setEditFormData(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0.00" />
          <Select label="Status" value={editFormData.status} onChange={e => setEditFormData(f => ({ ...f, status: e.target.value as Equipment['status'] }))} options={statusOptions} />
          <Input label="Hours Used" type="number" value={editFormData.hours_used} onChange={e => setEditFormData(f => ({ ...f, hours_used: e.target.value }))} placeholder="0" />
          <Select label="Assigned Crew" value={editFormData.assigned_crew_id} onChange={e => setEditFormData(f => ({ ...f, assigned_crew_id: e.target.value }))} options={crewOptions} />
          <div className="sm:col-span-2">
            <Input label="Notes" value={editFormData.notes} onChange={e => setEditFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
