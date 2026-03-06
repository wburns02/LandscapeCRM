export interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'crew_lead' | 'crew_member';
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  // API fields
  first_name?: string;
  last_name?: string;
  company_name?: string;
  customer_type?: string;
  zip_code?: string;
  // Frontend-compatible fields
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  type: string;
  tags: string[];
  property_size_sqft?: number;
  notes?: string;
  lat?: number;
  lng?: number;
  source?: string;
  total_spent?: number;
  job_count?: number;
  site_photos?: string[];
  site_map_url?: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'pending';
export type JobType = 'landscape_design' | 'construction' | 'landscape_maintenance' | 'irrigation' | 'carpentry' | 'invasive_vegetation' | 'steel_fabrication' | 'masonry' | 'tree_trimming' | 'outdoor_lighting' | 'erosion_control' | 'earthwork' | 'stream_reclamation' | 'other';

export interface Job {
  id: string;
  customer_id: string;
  customer?: Customer;
  title: string;
  description?: string;
  // API uses job_type, frontend uses type
  job_type?: string;
  type?: JobType | string;
  status: JobStatus;
  priority?: string;
  crew_id?: string;
  crew?: Crew;
  scheduled_date: string;
  scheduled_time?: string;
  // API uses estimated_duration_hours, frontend uses estimated_hours
  estimated_duration_hours?: number;
  estimated_hours?: number;
  actual_duration_hours?: number;
  actual_hours?: number;
  materials_cost?: number;
  labor_cost?: number;
  total_price?: number;
  notes?: string;
  address?: string;
  lat?: number;
  lng?: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  materials_used?: unknown[];
  before_photos?: string[];
  after_photos?: string[];
  photos?: Photo[];
  created_at: string;
  updated_at: string;
}

export interface Crew {
  id: string;
  name: string;
  color?: string;
  leader_id?: string;
  foreman_id?: string;
  foreman?: CrewMember;
  members?: CrewMember[];
  is_active: boolean;
  current_job_id?: string;
  vehicle?: string;
  created_at: string;
}

export interface CrewMember {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'foreman' | 'crew_member' | 'apprentice';
  hourly_rate: number;
  crew_id?: string;
  certifications: string[];
  is_active: boolean;
  hire_date: string;
  avatar_url?: string;
}

export interface ScheduleEvent {
  id: string;
  job_id?: string;
  job?: Job;
  title: string;
  start: string;
  end: string;
  crew_id?: string;
  crew?: Crew;
  color?: string;
  all_day: boolean;
  type: 'job' | 'meeting' | 'delivery' | 'maintenance' | 'time_off';
}

export type InventoryCategory = 'plants' | 'trees' | 'mulch' | 'fertilizers' | 'chemicals' | 'hardscape' | 'tools' | 'soil' | 'seed' | string;

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category: InventoryCategory;
  description?: string;
  unit: string;
  // API fields
  quantity_on_hand?: number;
  reorder_level?: number;
  unit_cost: number;
  unit_price?: number;
  supplier_name?: string;
  supplier_contact?: string;
  lot_number?: string;
  image_url?: string;
  is_active?: boolean;
  // Frontend-compatible fields
  quantity?: number;
  retail_price?: number;
  min_stock?: number;
  location?: string;
  supplier?: string;
  last_restocked?: string;
  created_at: string;
  updated_at?: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  quote_number?: string;
  customer_id: string;
  customer?: Customer;
  title: string;
  status: QuoteStatus;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  valid_until?: string;
  sent_at?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  job_id?: string;
  quote_id?: string;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  paid_amount?: number;
  amount_paid?: number;
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'cash' | 'check' | 'credit_card' | 'ach' | 'other' | 'card';
  reference?: string;
  reference_number?: string;
  notes?: string;
  paid_at: string;
}

export type ContractFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'seasonal';

export interface ContractService {
  description: string;
  included?: boolean;
}

export interface Contract {
  id: string;
  customer_id: string;
  customer?: Customer;
  title: string;
  // API returns objects, frontend may use strings
  services?: (string | ContractService)[];
  // API uses visit_frequency, frontend uses frequency
  visit_frequency?: string;
  frequency?: ContractFrequency;
  // API uses status string, frontend uses is_active boolean
  status?: string;
  contract_type?: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  price_per_visit?: number;
  monthly_value?: number;
  total_value?: number;
  auto_renew?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'retired';

export interface Equipment {
  id: string;
  name: string;
  // API uses equipment_type, frontend uses type
  equipment_type?: string;
  type?: string;
  make?: string;
  model?: string;
  serial_number?: string;
  year?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  status: EquipmentStatus;
  assigned_crew_id?: string;
  assigned_crew?: Crew;
  fuel_type?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  hours_used: number;
  notes?: string;
  image_url?: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id?: string;
  crew_member_id?: string;
  crew_member?: CrewMember;
  job_id?: string;
  job?: Job;
  clock_in: string;
  clock_out?: string;
  hours: number;
  break_minutes?: number;
  notes?: string;
  gps_clock_in?: { lat: number; lng: number };
  gps_clock_out?: { lat: number; lng: number };
  created_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost';
export type LeadSource = 'website' | 'referral' | 'google' | 'social_media' | 'yard_sign' | 'door_hanger' | 'other';

export interface Lead {
  id: string;
  // API fields
  first_name?: string;
  last_name?: string;
  // Frontend-compatible
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  source: LeadSource | string;
  status: LeadStatus;
  service_interest?: string;
  estimated_value?: number;
  notes?: string;
  assigned_to?: string;
  follow_up_date?: string;
  converted_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  type: 'before' | 'after' | 'progress' | 'issue' | 'property';
  job_id?: string;
  customer_id?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface SystemSettings {
  id?: string;
  company_name: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  company_logo_url?: string;
  tax_rate: number;
  default_payment_terms?: number;
  default_payment_terms_days?: number;
  currency?: string;
  timezone?: string;
  logo_url?: string;
  business_hours?: Record<string, unknown>;
  service_area?: Record<string, unknown>;
  pricing_templates?: unknown[];
}

export interface DashboardData {
  // API fields
  total_customers?: number;
  active_jobs: number;
  revenue_mtd: number;
  revenue_ytd: number;
  upcoming_jobs: number | Job[];
  overdue_invoices: number;
  low_stock_count?: number;
  crew_utilization?: number;
  // Derived/mock fields
  pending_quotes?: number;
  active_crews?: number;
  low_stock_items?: number;
  new_leads?: number;
  recent_activity?: ActivityItem[];
  revenue_by_month?: { month: string; revenue: number; expenses: number }[];
  job_status_distribution?: { status: string; count: number }[];
}

export interface ActivityItem {
  id: string;
  type: 'job_completed' | 'invoice_paid' | 'quote_accepted' | 'lead_created' | 'customer_added';
  message: string;
  timestamp: string;
  icon?: string;
}

export interface RevenueReport {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
}

export interface JobProfitability {
  job_id: string;
  title: string;
  revenue: number;
  labor_cost: number;
  materials_cost: number;
  profit: number;
  margin: number;
}

export interface CrewPerformance {
  crew_id: string;
  crew_name: string;
  jobs_completed: number;
  total_hours: number;
  avg_job_time: number;
  revenue_generated: number;
  customer_rating: number;
}

// Helper to get display name from various entities
export function getCustomerName(c: Customer): string {
  return c.name || c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown';
}

export function getLeadName(l: Lead): string {
  return l.name || [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Unknown';
}

export function getJobType(j: Job): string {
  return j.type || j.job_type || 'other';
}

export function getEquipmentType(e: Equipment): string {
  return e.type || e.equipment_type || 'other';
}

export function getInventoryQuantity(i: InventoryItem): number {
  return i.quantity ?? i.quantity_on_hand ?? 0;
}

export function getInventoryMinStock(i: InventoryItem): number {
  return i.min_stock ?? i.reorder_level ?? 0;
}

export function getContractServiceName(s: string | ContractService): string {
  return typeof s === 'string' ? s : s.description ?? '';
}
