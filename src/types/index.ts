export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'crew_lead' | 'crew_member';
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: 'residential' | 'commercial' | 'hoa' | 'municipal';
  tags: string[];
  property_size_sqft?: number;
  notes?: string;
  lat?: number;
  lng?: number;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type JobType = 'mowing' | 'landscaping' | 'irrigation' | 'tree_service' | 'hardscape' | 'planting' | 'cleanup' | 'fertilization' | 'pest_control' | 'snow_removal' | 'design' | 'maintenance' | 'other';

export interface Job {
  id: string;
  customer_id: string;
  customer?: Customer;
  title: string;
  description?: string;
  type: JobType;
  status: JobStatus;
  crew_id?: string;
  crew?: Crew;
  scheduled_date: string;
  scheduled_time?: string;
  estimated_hours: number;
  actual_hours?: number;
  materials_cost: number;
  labor_cost: number;
  total_price: number;
  notes?: string;
  address?: string;
  photos: Photo[];
  created_at: string;
  updated_at: string;
}

export interface Crew {
  id: string;
  name: string;
  color: string;
  foreman_id?: string;
  foreman?: CrewMember;
  members: CrewMember[];
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

export type InventoryCategory = 'plants' | 'trees' | 'mulch' | 'fertilizers' | 'chemicals' | 'hardscape' | 'tools' | 'soil' | 'seed';

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  unit_cost: number;
  retail_price: number;
  min_stock: number;
  location?: string;
  supplier?: string;
  description?: string;
  last_restocked?: string;
  created_at: string;
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
  valid_until: string;
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
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
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
  method: 'cash' | 'check' | 'credit_card' | 'ach' | 'other';
  reference?: string;
  notes?: string;
  paid_at: string;
}

export type ContractFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'seasonal';

export interface Contract {
  id: string;
  customer_id: string;
  customer?: Customer;
  title: string;
  services: string[];
  frequency: ContractFrequency;
  start_date: string;
  end_date: string;
  monthly_value: number;
  total_value: number;
  is_active: boolean;
  auto_renew: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'retired';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  make?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  status: EquipmentStatus;
  assigned_crew_id?: string;
  assigned_crew?: Crew;
  last_maintenance?: string;
  next_maintenance?: string;
  hours_used: number;
  notes?: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  crew_member_id: string;
  crew_member?: CrewMember;
  job_id?: string;
  job?: Job;
  clock_in: string;
  clock_out?: string;
  hours: number;
  notes?: string;
  created_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost';
export type LeadSource = 'website' | 'referral' | 'google' | 'social_media' | 'yard_sign' | 'door_hanger' | 'other';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  source: LeadSource;
  status: LeadStatus;
  service_interest: string;
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
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  tax_rate: number;
  default_payment_terms: number;
  currency: string;
  timezone: string;
  logo_url?: string;
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
