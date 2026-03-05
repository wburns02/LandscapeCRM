import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  Customer, Job, Crew, InventoryItem, Quote, Invoice, Contract,
  Equipment, Lead, Photo, DashboardData, SystemSettings, ScheduleEvent,
} from '../types';
import api from '../api/client';
import { useAuth } from './AuthContext';

// Normalize API responses to match frontend field names
function normalizeCustomer(c: Customer): Customer {
  return {
    ...c,
    name: c.name || c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown',
    type: c.type || c.customer_type || 'residential',
    zip: c.zip || c.zip_code || '',
  };
}

function normalizeJob(j: Job): Job {
  return {
    ...j,
    type: j.type || j.job_type || 'other',
    estimated_hours: j.estimated_hours ?? j.estimated_duration_hours ?? 0,
    actual_hours: j.actual_hours ?? j.actual_duration_hours,
  };
}

function normalizeLead(l: Lead): Lead {
  return {
    ...l,
    name: l.name || [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Unknown',
  };
}

function normalizeEquipment(e: Equipment): Equipment {
  return {
    ...e,
    type: e.type || e.equipment_type || 'other',
    last_maintenance: e.last_maintenance || e.last_maintenance_date,
    next_maintenance: e.next_maintenance || e.next_maintenance_date,
  };
}

function normalizeContract(c: Contract): Contract {
  return {
    ...c,
    is_active: c.is_active ?? (c.status === 'active'),
    frequency: c.frequency || (c.visit_frequency as Contract['frequency']) || 'monthly',
    monthly_value: c.monthly_value ?? c.price_per_visit ?? 0,
  };
}

function normalizeInventory(i: InventoryItem): InventoryItem {
  return {
    ...i,
    quantity: i.quantity ?? i.quantity_on_hand ?? 0,
    min_stock: i.min_stock ?? i.reorder_level ?? 0,
    retail_price: i.retail_price ?? i.unit_price ?? 0,
    supplier: i.supplier || i.supplier_name || '',
  };
}

interface DataContextType {
  customers: Customer[];
  jobs: Job[];
  crews: Crew[];
  inventory: InventoryItem[];
  quotes: Quote[];
  invoices: Invoice[];
  contracts: Contract[];
  equipment: Equipment[];
  leads: Lead[];
  photos: Photo[];
  scheduleEvents: ScheduleEvent[];
  dashboard: DashboardData | null;
  settings: SystemSettings | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshInvoices: () => Promise<void>;
  refreshLeads: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Demo data for development without backend
function getDemoData(): {
  customers: Customer[];
  jobs: Job[];
  crews: Crew[];
  inventory: InventoryItem[];
  quotes: Quote[];
  invoices: Invoice[];
  contracts: Contract[];
  equipment: Equipment[];
  leads: Lead[];
  photos: Photo[];
  scheduleEvents: ScheduleEvent[];
  dashboard: DashboardData;
  settings: SystemSettings;
} {
  const customers: Customer[] = [
    { id: '1', name: 'Sarah Mitchell', email: 'sarah@example.com', phone: '(512) 555-0101', address: '1425 Oak Hollow Dr', city: 'Austin', state: 'TX', zip: '78745', type: 'residential', tags: ['premium', 'weekly'], property_size_sqft: 12000, notes: 'Large backyard with pool area', created_at: '2025-01-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '2', name: 'Riverside Office Park', email: 'manager@riverside.com', phone: '(512) 555-0202', address: '8800 Business Blvd', city: 'Austin', state: 'TX', zip: '78759', type: 'commercial', tags: ['contract', 'monthly'], property_size_sqft: 85000, notes: '3 buildings, common areas', created_at: '2024-06-01T00:00:00Z', updated_at: '2026-02-15T00:00:00Z' },
    { id: '3', name: 'Lakewood HOA', email: 'board@lakewood.org', phone: '(512) 555-0303', address: '200 Lakewood Blvd', city: 'Cedar Park', state: 'TX', zip: '78613', type: 'hoa', tags: ['contract', 'premium'], property_size_sqft: 250000, notes: '150 homes, clubhouse, 2 pools', created_at: '2024-03-10T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '4', name: 'David Chen', email: 'david@example.com', phone: '(512) 555-0404', address: '742 Pecan St', city: 'Round Rock', state: 'TX', zip: '78664', type: 'residential', tags: ['biweekly'], property_size_sqft: 8500, created_at: '2025-08-20T00:00:00Z', updated_at: '2026-02-28T00:00:00Z' },
    { id: '5', name: 'City of Pflugerville', email: 'parks@pflugerville.gov', phone: '(512) 555-0505', address: '100 E Main St', city: 'Pflugerville', state: 'TX', zip: '78660', type: 'municipal', tags: ['contract', 'seasonal'], property_size_sqft: 500000, notes: 'Parks and median maintenance', created_at: '2024-01-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '6', name: 'Maria Garcia', email: 'maria@example.com', phone: '(512) 555-0606', address: '315 Bluebonnet Ln', city: 'Austin', state: 'TX', zip: '78748', type: 'residential', tags: ['new'], property_size_sqft: 6500, created_at: '2026-02-20T00:00:00Z', updated_at: '2026-02-20T00:00:00Z' },
  ];

  const crews: Crew[] = [
    { id: '1', name: 'Alpha Crew', color: '#22c55e', is_active: true, vehicle: '2024 Ford F-250 #101', members: [
      { id: '1', name: 'Carlos Ramirez', phone: '(512) 555-1001', role: 'foreman', hourly_rate: 28, certifications: ['pesticide_applicator', 'irrigation'], is_active: true, hire_date: '2022-03-15' },
      { id: '2', name: 'Jake Wilson', phone: '(512) 555-1002', role: 'crew_member', hourly_rate: 18, certifications: [], is_active: true, hire_date: '2023-06-01' },
      { id: '3', name: 'Tyrone Brooks', phone: '(512) 555-1003', role: 'crew_member', hourly_rate: 18, certifications: ['tree_care'], is_active: true, hire_date: '2023-09-15' },
    ], created_at: '2022-01-01T00:00:00Z' },
    { id: '2', name: 'Bravo Crew', color: '#3b82f6', is_active: true, vehicle: '2023 Ford F-250 #102', members: [
      { id: '4', name: 'Miguel Santos', phone: '(512) 555-1004', role: 'foreman', hourly_rate: 26, certifications: ['hardscape', 'irrigation'], is_active: true, hire_date: '2022-08-01' },
      { id: '5', name: 'Alex Turner', phone: '(512) 555-1005', role: 'crew_member', hourly_rate: 17, certifications: [], is_active: true, hire_date: '2024-01-15' },
    ], created_at: '2022-06-01T00:00:00Z' },
    { id: '3', name: 'Charlie Crew', color: '#f59e0b', is_active: true, vehicle: '2022 Chevy 2500 #103', members: [
      { id: '6', name: 'Sam Patterson', phone: '(512) 555-1006', role: 'foreman', hourly_rate: 25, certifications: ['pesticide_applicator'], is_active: true, hire_date: '2023-01-10' },
      { id: '7', name: 'Dylan Reed', phone: '(512) 555-1007', role: 'apprentice', hourly_rate: 15, certifications: [], is_active: true, hire_date: '2025-06-01' },
    ], created_at: '2023-01-01T00:00:00Z' },
  ];

  const jobs: Job[] = [
    { id: '1', customer_id: '1', customer: customers[0], title: 'Weekly Lawn Maintenance', type: 'mowing', status: 'scheduled', crew_id: '1', crew: crews[0], scheduled_date: '2026-03-06', scheduled_time: '08:00', estimated_hours: 2, materials_cost: 15, labor_cost: 120, total_price: 175, address: '1425 Oak Hollow Dr, Austin TX', photos: [], created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '2', customer_id: '2', customer: customers[1], title: 'Spring Mulch Installation', type: 'landscaping', status: 'in_progress', crew_id: '2', crew: crews[1], scheduled_date: '2026-03-05', scheduled_time: '07:00', estimated_hours: 8, materials_cost: 1200, labor_cost: 640, total_price: 2400, address: '8800 Business Blvd, Austin TX', photos: [], created_at: '2026-02-20T00:00:00Z', updated_at: '2026-03-05T00:00:00Z' },
    { id: '3', customer_id: '3', customer: customers[2], title: 'HOA Common Area Mowing', type: 'mowing', status: 'scheduled', crew_id: '1', crew: crews[0], scheduled_date: '2026-03-07', scheduled_time: '06:30', estimated_hours: 6, materials_cost: 50, labor_cost: 480, total_price: 850, address: '200 Lakewood Blvd, Cedar Park TX', photos: [], created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '4', customer_id: '4', customer: customers[3], title: 'Patio Pavers Installation', type: 'hardscape', status: 'scheduled', crew_id: '2', crew: crews[1], scheduled_date: '2026-03-10', scheduled_time: '07:00', estimated_hours: 16, materials_cost: 3500, labor_cost: 1600, total_price: 6200, address: '742 Pecan St, Round Rock TX', photos: [], created_at: '2026-02-25T00:00:00Z', updated_at: '2026-02-25T00:00:00Z' },
    { id: '5', customer_id: '5', customer: customers[4], title: 'Park Tree Trimming', type: 'tree_service', status: 'completed', crew_id: '3', crew: crews[2], scheduled_date: '2026-03-03', scheduled_time: '07:00', estimated_hours: 8, actual_hours: 7.5, materials_cost: 100, labor_cost: 600, total_price: 1800, address: '100 E Main St, Pflugerville TX', photos: [], created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-03T00:00:00Z' },
    { id: '6', customer_id: '6', customer: customers[5], title: 'New Flower Bed Design & Install', type: 'planting', status: 'scheduled', crew_id: '3', crew: crews[2], scheduled_date: '2026-03-12', scheduled_time: '08:00', estimated_hours: 5, materials_cost: 450, labor_cost: 400, total_price: 1100, address: '315 Bluebonnet Ln, Austin TX', photos: [], created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '7', customer_id: '1', customer: customers[0], title: 'Irrigation System Repair', type: 'irrigation', status: 'on_hold', crew_id: '1', crew: crews[0], scheduled_date: '2026-03-15', scheduled_time: '09:00', estimated_hours: 3, materials_cost: 200, labor_cost: 240, total_price: 550, address: '1425 Oak Hollow Dr, Austin TX', photos: [], created_at: '2026-02-28T00:00:00Z', updated_at: '2026-03-04T00:00:00Z', notes: 'Waiting on parts from supplier' },
    { id: '8', customer_id: '2', customer: customers[1], title: 'Parking Lot Cleanup', type: 'cleanup', status: 'completed', crew_id: '1', crew: crews[0], scheduled_date: '2026-03-01', scheduled_time: '06:00', estimated_hours: 3, actual_hours: 2.5, materials_cost: 25, labor_cost: 200, total_price: 350, address: '8800 Business Blvd, Austin TX', photos: [], created_at: '2026-02-25T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
  ];

  const inventory: InventoryItem[] = [
    { id: '1', name: 'Bermuda Grass Sod', category: 'plants', quantity: 450, unit: 'sq ft', unit_cost: 0.35, retail_price: 0.65, min_stock: 200, supplier: 'TX Turf Farms', created_at: '2025-01-01T00:00:00Z' },
    { id: '2', name: 'Cedar Mulch', category: 'mulch', quantity: 85, unit: 'cu yd', unit_cost: 22, retail_price: 45, min_stock: 30, supplier: 'Austin Mulch Co', created_at: '2025-01-01T00:00:00Z' },
    { id: '3', name: 'Live Oak (3" caliper)', category: 'trees', quantity: 8, unit: 'each', unit_cost: 250, retail_price: 550, min_stock: 3, supplier: 'Lone Star Nursery', created_at: '2025-01-01T00:00:00Z' },
    { id: '4', name: 'Roundup Pro Max', category: 'chemicals', quantity: 12, unit: 'gal', unit_cost: 38, retail_price: 0, min_stock: 5, supplier: 'SiteOne Landscape', created_at: '2025-01-01T00:00:00Z' },
    { id: '5', name: '10-10-10 Fertilizer', category: 'fertilizers', quantity: 40, unit: 'bags (50lb)', unit_cost: 18, retail_price: 0, min_stock: 15, supplier: 'SiteOne Landscape', created_at: '2025-01-01T00:00:00Z' },
    { id: '6', name: 'Flagstone Pavers', category: 'hardscape', quantity: 3, unit: 'pallets', unit_cost: 800, retail_price: 1500, min_stock: 2, supplier: 'Stone Center', last_restocked: '2026-02-15T00:00:00Z', created_at: '2025-01-01T00:00:00Z' },
    { id: '7', name: 'Mexican Heather (4")', category: 'plants', quantity: 180, unit: 'flats', unit_cost: 2.5, retail_price: 5.99, min_stock: 50, supplier: 'Color Spot Nursery', created_at: '2025-01-01T00:00:00Z' },
    { id: '8', name: 'Drip Irrigation Kit', category: 'tools', quantity: 25, unit: 'each', unit_cost: 45, retail_price: 89, min_stock: 10, supplier: 'SiteOne Landscape', created_at: '2025-01-01T00:00:00Z' },
    { id: '9', name: 'Premium Topsoil', category: 'soil', quantity: 60, unit: 'cu yd', unit_cost: 18, retail_price: 35, min_stock: 20, supplier: 'Austin Mulch Co', created_at: '2025-01-01T00:00:00Z' },
    { id: '10', name: 'Zoysia Seed', category: 'seed', quantity: 8, unit: 'bags (25lb)', unit_cost: 85, retail_price: 150, min_stock: 5, supplier: 'TX Turf Farms', created_at: '2025-01-01T00:00:00Z', description: 'Shade-tolerant warm season grass' },
  ];

  const quotes: Quote[] = [
    { id: '1', customer_id: '6', customer: customers[5], title: 'Full Front Yard Redesign', status: 'sent', line_items: [
      { id: '1', description: 'Design consultation', quantity: 1, unit_price: 250, total: 250 },
      { id: '2', description: 'Remove existing landscape', quantity: 1, unit_price: 800, total: 800 },
      { id: '3', description: 'Soil amendment (10 cu yd)', quantity: 10, unit_price: 35, total: 350 },
      { id: '4', description: 'Plant material', quantity: 1, unit_price: 2200, total: 2200 },
      { id: '5', description: 'Installation labor', quantity: 24, unit_price: 65, total: 1560 },
    ], subtotal: 5160, tax_rate: 8.25, tax_amount: 425.70, total: 5585.70, valid_until: '2026-04-05', sent_at: '2026-03-02T00:00:00Z', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-02T00:00:00Z' },
    { id: '2', customer_id: '4', customer: customers[3], title: 'Backyard Patio Extension', status: 'accepted', line_items: [
      { id: '6', description: 'Patio pavers (200 sq ft)', quantity: 200, unit_price: 12, total: 2400 },
      { id: '7', description: 'Base material & sand', quantity: 1, unit_price: 600, total: 600 },
      { id: '8', description: 'Installation labor', quantity: 16, unit_price: 75, total: 1200 },
      { id: '9', description: 'Edging & finishing', quantity: 1, unit_price: 400, total: 400 },
    ], subtotal: 4600, tax_rate: 8.25, tax_amount: 379.50, total: 4979.50, valid_until: '2026-03-20', sent_at: '2026-02-22T00:00:00Z', accepted_at: '2026-02-25T00:00:00Z', created_at: '2026-02-20T00:00:00Z', updated_at: '2026-02-25T00:00:00Z' },
    { id: '3', customer_id: '1', customer: customers[0], title: 'Pool Area Landscaping', status: 'draft', line_items: [
      { id: '10', description: 'Tropical plantings around pool', quantity: 1, unit_price: 1800, total: 1800 },
      { id: '11', description: 'Decorative rock border', quantity: 40, unit_price: 15, total: 600 },
      { id: '12', description: 'Labor', quantity: 12, unit_price: 65, total: 780 },
    ], subtotal: 3180, tax_rate: 8.25, tax_amount: 262.35, total: 3442.35, valid_until: '2026-04-01', created_at: '2026-03-04T00:00:00Z', updated_at: '2026-03-04T00:00:00Z' },
  ];

  const invoices: Invoice[] = [
    { id: '1', invoice_number: 'INV-2026-001', customer_id: '5', customer: customers[4], job_id: '5', status: 'paid', line_items: [
      { id: '1', description: 'Park tree trimming - 15 trees', quantity: 15, unit_price: 90, total: 1350 },
      { id: '2', description: 'Debris removal & cleanup', quantity: 1, unit_price: 300, total: 300 },
      { id: '3', description: 'Stump grinding (2 stumps)', quantity: 2, unit_price: 75, total: 150 },
    ], subtotal: 1800, tax_rate: 0, tax_amount: 0, total: 1800, amount_paid: 1800, due_date: '2026-03-15', paid_at: '2026-03-04T00:00:00Z', created_at: '2026-03-03T00:00:00Z', updated_at: '2026-03-04T00:00:00Z' },
    { id: '2', invoice_number: 'INV-2026-002', customer_id: '2', customer: customers[1], status: 'sent', line_items: [
      { id: '4', description: 'Spring mulch - 40 cu yd cedar', quantity: 40, unit_price: 45, total: 1800 },
      { id: '5', description: 'Installation labor', quantity: 8, unit_price: 65, total: 520 },
      { id: '6', description: 'Bed edging & cleanup', quantity: 1, unit_price: 80, total: 80 },
    ], subtotal: 2400, tax_rate: 8.25, tax_amount: 198, total: 2598, amount_paid: 0, due_date: '2026-03-20', sent_at: '2026-03-05T00:00:00Z', created_at: '2026-03-05T00:00:00Z', updated_at: '2026-03-05T00:00:00Z' },
    { id: '3', invoice_number: 'INV-2026-003', customer_id: '3', customer: customers[2], status: 'overdue', line_items: [
      { id: '7', description: 'February HOA maintenance', quantity: 1, unit_price: 4200, total: 4200 },
    ], subtotal: 4200, tax_rate: 0, tax_amount: 0, total: 4200, amount_paid: 0, due_date: '2026-02-28', sent_at: '2026-02-15T00:00:00Z', created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '4', invoice_number: 'INV-2026-004', customer_id: '1', customer: customers[0], status: 'partial', line_items: [
      { id: '8', description: 'Weekly maintenance - February (4 visits)', quantity: 4, unit_price: 175, total: 700 },
    ], subtotal: 700, tax_rate: 8.25, tax_amount: 57.75, total: 757.75, amount_paid: 400, due_date: '2026-03-10', sent_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-03T00:00:00Z' },
  ];

  const contracts: Contract[] = [
    { id: '1', customer_id: '1', customer: customers[0], title: 'Weekly Lawn Maintenance', services: ['mowing', 'edging', 'blowing', 'weed_control'], frequency: 'weekly', start_date: '2026-01-01', end_date: '2026-12-31', monthly_value: 700, total_value: 8400, is_active: true, auto_renew: true, created_at: '2025-12-15T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: '2', customer_id: '3', customer: customers[2], title: 'HOA Full Service Contract', services: ['mowing', 'irrigation', 'fertilization', 'tree_trimming', 'seasonal_color'], frequency: 'monthly', start_date: '2026-01-01', end_date: '2026-12-31', monthly_value: 4200, total_value: 50400, is_active: true, auto_renew: true, created_at: '2025-11-20T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: '3', customer_id: '5', customer: customers[4], title: 'Municipal Parks Maintenance', services: ['mowing', 'tree_care', 'irrigation', 'cleanup'], frequency: 'biweekly', start_date: '2026-01-01', end_date: '2027-06-30', monthly_value: 8500, total_value: 153000, is_active: true, auto_renew: false, notes: '18-month contract, reviewed quarterly', created_at: '2025-12-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: '4', customer_id: '2', customer: customers[1], title: 'Commercial Grounds Maintenance', services: ['mowing', 'edging', 'mulching', 'seasonal_color'], frequency: 'weekly', start_date: '2025-04-01', end_date: '2025-12-31', monthly_value: 2800, total_value: 25200, is_active: false, auto_renew: false, notes: 'Expired - pending renewal discussion', created_at: '2025-03-15T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ];

  const equipment: Equipment[] = [
    { id: '1', name: 'John Deere Z930M', type: 'Zero-Turn Mower', make: 'John Deere', model: 'Z930M', serial_number: 'JD-2024-001', purchase_date: '2024-03-15', purchase_price: 12500, status: 'in_use', assigned_crew_id: '1', hours_used: 1850, last_maintenance: '2026-02-15', next_maintenance: '2026-03-15', created_at: '2024-03-15T00:00:00Z' },
    { id: '2', name: 'Kubota SVL75-2', type: 'Skid Steer', make: 'Kubota', model: 'SVL75-2', serial_number: 'KU-2023-001', purchase_date: '2023-08-01', purchase_price: 48000, status: 'available', hours_used: 920, last_maintenance: '2026-02-01', next_maintenance: '2026-04-01', created_at: '2023-08-01T00:00:00Z' },
    { id: '3', name: 'Stihl MS 261', type: 'Chainsaw', make: 'Stihl', model: 'MS 261', serial_number: 'ST-2025-003', purchase_date: '2025-01-10', purchase_price: 650, status: 'in_use', assigned_crew_id: '3', hours_used: 180, last_maintenance: '2026-01-20', next_maintenance: '2026-03-20', created_at: '2025-01-10T00:00:00Z' },
    { id: '4', name: 'Toro Dingo TX 525', type: 'Compact Loader', make: 'Toro', model: 'Dingo TX 525', serial_number: 'TO-2024-002', purchase_date: '2024-06-20', purchase_price: 22000, status: 'maintenance', hours_used: 650, last_maintenance: '2026-03-01', next_maintenance: '2026-03-10', notes: 'Track replacement in progress', created_at: '2024-06-20T00:00:00Z' },
    { id: '5', name: 'Exmark Lazer Z 60"', type: 'Zero-Turn Mower', make: 'Exmark', model: 'Lazer Z', purchase_date: '2023-04-01', purchase_price: 14200, status: 'in_use', assigned_crew_id: '2', hours_used: 2200, last_maintenance: '2026-02-20', next_maintenance: '2026-03-20', created_at: '2023-04-01T00:00:00Z' },
    { id: '6', name: 'Vermeer BC700XL', type: 'Wood Chipper', make: 'Vermeer', model: 'BC700XL', purchase_date: '2022-09-15', purchase_price: 28000, status: 'available', hours_used: 480, last_maintenance: '2026-01-15', next_maintenance: '2026-04-15', created_at: '2022-09-15T00:00:00Z' },
  ];

  const leads: Lead[] = [
    { id: '1', name: 'Jennifer Wallace', phone: '(512) 555-2001', email: 'jen@example.com', address: '890 Sunset Dr, Austin TX', source: 'website', status: 'new', service_interest: 'Full landscape design for new construction home', estimated_value: 15000, created_at: '2026-03-04T00:00:00Z', updated_at: '2026-03-04T00:00:00Z' },
    { id: '2', name: 'Oakmont Business Center', phone: '(512) 555-2002', email: 'facilities@oakmont.com', source: 'referral', status: 'contacted', service_interest: 'Commercial grounds maintenance contract', estimated_value: 36000, notes: 'Referred by Riverside Office Park', follow_up_date: '2026-03-08', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-03T00:00:00Z' },
    { id: '3', name: 'Tom Bradley', phone: '(512) 555-2003', source: 'yard_sign', status: 'qualified', service_interest: 'Backyard patio and outdoor kitchen', estimated_value: 22000, follow_up_date: '2026-03-06', created_at: '2026-02-25T00:00:00Z', updated_at: '2026-03-02T00:00:00Z' },
    { id: '4', name: 'Green Valley Estates HOA', phone: '(512) 555-2004', email: 'admin@greenvalley.org', source: 'google', status: 'quoted', service_interest: 'HOA common area maintenance', estimated_value: 42000, created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    { id: '5', name: 'Lisa Park', phone: '(512) 555-2005', source: 'social_media', status: 'new', service_interest: 'Irrigation system installation', estimated_value: 4500, created_at: '2026-03-05T00:00:00Z', updated_at: '2026-03-05T00:00:00Z' },
    { id: '6', name: 'Westlake Country Club', phone: '(512) 555-2006', email: 'grounds@westlakecc.com', source: 'referral', status: 'won', service_interest: 'Annual grounds maintenance', estimated_value: 85000, converted_customer_id: '7', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-02-15T00:00:00Z' },
    { id: '7', name: 'Robert Simmons', phone: '(512) 555-2007', source: 'door_hanger', status: 'lost', service_interest: 'Weekly lawn mowing', estimated_value: 3600, notes: 'Went with cheaper competitor', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-20T00:00:00Z' },
  ];

  const dashboard: DashboardData = {
    active_jobs: 5,
    revenue_mtd: 12450,
    revenue_ytd: 87320,
    pending_quotes: 2,
    overdue_invoices: 1,
    active_crews: 3,
    low_stock_items: 2,
    new_leads: 3,
    upcoming_jobs: jobs.filter(j => j.status === 'scheduled').slice(0, 5),
    recent_activity: [
      { id: '1', type: 'job_completed', message: 'Park Tree Trimming completed by Charlie Crew', timestamp: '2026-03-03T16:30:00Z' },
      { id: '2', type: 'invoice_paid', message: 'Invoice INV-2026-001 paid by City of Pflugerville ($1,800)', timestamp: '2026-03-04T10:15:00Z' },
      { id: '3', type: 'lead_created', message: 'New lead: Jennifer Wallace - landscape design', timestamp: '2026-03-04T14:00:00Z' },
      { id: '4', type: 'quote_accepted', message: 'Backyard Patio Extension quote accepted by David Chen', timestamp: '2026-02-25T09:00:00Z' },
      { id: '5', type: 'customer_added', message: 'New customer: Maria Garcia', timestamp: '2026-02-20T11:30:00Z' },
    ],
    revenue_by_month: [
      { month: 'Jan', revenue: 28500, expenses: 18200 },
      { month: 'Feb', revenue: 32400, expenses: 19800 },
      { month: 'Mar', revenue: 12450, expenses: 8100 },
      { month: 'Apr', revenue: 0, expenses: 0 },
      { month: 'May', revenue: 0, expenses: 0 },
      { month: 'Jun', revenue: 0, expenses: 0 },
      { month: 'Jul', revenue: 0, expenses: 0 },
      { month: 'Aug', revenue: 0, expenses: 0 },
      { month: 'Sep', revenue: 0, expenses: 0 },
      { month: 'Oct', revenue: 0, expenses: 0 },
      { month: 'Nov', revenue: 0, expenses: 0 },
      { month: 'Dec', revenue: 0, expenses: 0 },
    ],
    job_status_distribution: [
      { status: 'Scheduled', count: 4 },
      { status: 'In Progress', count: 1 },
      { status: 'Completed', count: 2 },
      { status: 'On Hold', count: 1 },
    ],
  };

  const settings: SystemSettings = {
    company_name: 'GreenScape Landscaping',
    company_email: 'info@greenscape.com',
    company_phone: '(512) 555-0000',
    company_address: '4500 Landscape Way, Austin, TX 78745',
    tax_rate: 8.25,
    default_payment_terms: 30,
    currency: 'USD',
    timezone: 'America/Chicago',
  };

  return {
    customers,
    jobs,
    crews,
    inventory,
    quotes,
    invoices,
    contracts,
    equipment,
    leads,
    photos: [],
    scheduleEvents: jobs.map(j => ({
      id: j.id,
      job_id: j.id,
      job: j,
      title: j.title,
      start: `${j.scheduled_date}T${j.scheduled_time || '08:00'}:00`,
      end: `${j.scheduled_date}T${String(parseInt(j.scheduled_time?.split(':')[0] || '8') + (j.estimated_hours ?? 0)).padStart(2, '0')}:00:00`,
      crew_id: j.crew_id,
      crew: j.crew,
      color: j.crew?.color,
      all_day: false,
      type: 'job' as const,
    })),
    dashboard,
    settings,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDemoData = useCallback(() => {
    const demo = getDemoData();
    setCustomers(demo.customers);
    setJobs(demo.jobs);
    setCrews(demo.crews);
    setInventory(demo.inventory);
    setQuotes(demo.quotes);
    setInvoices(demo.invoices);
    setContracts(demo.contracts);
    setEquipment(demo.equipment);
    setLeads(demo.leads);
    setPhotos(demo.photos);
    setScheduleEvents(demo.scheduleEvents);
    setDashboard(demo.dashboard);
    setSettings(demo.settings);
    setIsLoading(false);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [c, j, cr, inv, q, i, co, eq, l, p, d, s] = await Promise.allSettled([
        api.get<Customer[]>('/customers'),
        api.get<Job[]>('/jobs'),
        api.get<Crew[]>('/crews'),
        api.get<InventoryItem[]>('/inventory'),
        api.get<Quote[]>('/quotes'),
        api.get<Invoice[]>('/invoices'),
        api.get<Contract[]>('/contracts'),
        api.get<Equipment[]>('/equipment'),
        api.get<Lead[]>('/leads'),
        api.get<Photo[]>('/photos'),
        api.get<DashboardData>('/dashboard'),
        api.get<SystemSettings>('/settings'),
      ]);

      if (c.status === 'fulfilled') setCustomers(c.value.map(normalizeCustomer));
      if (j.status === 'fulfilled') setJobs(j.value.map(normalizeJob));
      if (cr.status === 'fulfilled') setCrews(cr.value);
      if (inv.status === 'fulfilled') setInventory(inv.value.map(normalizeInventory));
      if (q.status === 'fulfilled') setQuotes(q.value);
      if (i.status === 'fulfilled') setInvoices(i.value);
      if (co.status === 'fulfilled') setContracts(co.value.map(normalizeContract));
      if (eq.status === 'fulfilled') setEquipment(eq.value.map(normalizeEquipment));
      if (l.status === 'fulfilled') setLeads(l.value.map(normalizeLead));
      if (p.status === 'fulfilled') setPhotos(p.value);
      if (d.status === 'fulfilled') setDashboard(d.value);
      if (s.status === 'fulfilled') setSettings(s.value);

      // If all failed, use demo data
      const allFailed = [c, j, cr, inv, q, i, co, eq, l, p, d, s].every(r => r.status === 'rejected');
      if (allFailed) {
        loadDemoData();
      }
    } catch {
      loadDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [loadDemoData]);

  const refreshCustomers = useCallback(async () => {
    try { const data = await api.get<Customer[]>('/customers'); setCustomers(data.map(normalizeCustomer)); } catch { /* keep current */ }
  }, []);
  const refreshJobs = useCallback(async () => {
    try { const data = await api.get<Job[]>('/jobs'); setJobs(data.map(normalizeJob)); } catch { /* keep current */ }
  }, []);
  const refreshInventory = useCallback(async () => {
    try { const data = await api.get<InventoryItem[]>('/inventory'); setInventory(data.map(normalizeInventory)); } catch { /* keep current */ }
  }, []);
  const refreshQuotes = useCallback(async () => {
    try { const data = await api.get<Quote[]>('/quotes'); setQuotes(data); } catch { /* keep current */ }
  }, []);
  const refreshInvoices = useCallback(async () => {
    try { const data = await api.get<Invoice[]>('/invoices'); setInvoices(data); } catch { /* keep current */ }
  }, []);
  const refreshLeads = useCallback(async () => {
    try { const data = await api.get<Lead[]>('/leads'); setLeads(data.map(normalizeLead)); } catch { /* keep current */ }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
    } else {
      loadDemoData();
    }
  }, [isAuthenticated, fetchAll, loadDemoData]);

  return (
    <DataContext.Provider
      value={{
        customers, jobs, crews, inventory, quotes, invoices, contracts,
        equipment, leads, photos, scheduleEvents, dashboard, settings,
        isLoading, error, refresh: fetchAll, refreshCustomers, refreshJobs,
        refreshInventory, refreshQuotes, refreshInvoices, refreshLeads,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
