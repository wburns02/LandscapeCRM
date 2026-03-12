import { useState, useMemo, useCallback } from 'react';
import {
  Calculator, Zap, TrendingUp, Target, DollarSign, Clock, Users, Wrench,
  ChevronRight, Plus, Trash2, ArrowLeft, FileText, Send,
  Bookmark, BarChart3, CheckCircle2, XCircle, AlertCircle,
  Sparkles, TreePine, Droplets, Sun, Fence, Shovel,
  Lightbulb, Flower2, Leaf, Building2, Layers, PaintBucket,
  ChevronDown, ChevronUp, Copy, Star, TrendingDown, Award,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EstimateLineItem {
  id: string;
  category: 'labor' | 'materials' | 'equipment' | 'subcontractor' | 'other';
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  markup_pct: number;
  total: number;
}

interface JobTemplate {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
  avg_price: number;
  avg_hours: number;
  win_rate: number;
  popularity: number; // 1-5 stars
  default_items: Omit<EstimateLineItem, 'id' | 'total'>[];
}

interface Estimate {
  id: string;
  template_id?: string;
  customer_name: string;
  customer_id?: string;
  property_address: string;
  property_size_sqft: number;
  job_type: string;
  line_items: EstimateLineItem[];
  subtotal: number;
  overhead_pct: number;
  overhead_amount: number;
  profit_margin_pct: number;
  profit_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'won' | 'lost';
  notes: string;
  created_at: string;
  sent_at?: string;
  decided_at?: string;
}

type View = 'templates' | 'builder' | 'history';

// ─── Demo Data ───────────────────────────────────────────────────────────────

const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'lawn-maintenance',
    name: 'Lawn Maintenance',
    icon: Leaf,
    color: '#22c55e',
    description: 'Weekly/biweekly mowing, edging, blowing, and trimming',
    avg_price: 185,
    avg_hours: 2,
    win_rate: 78,
    popularity: 5,
    default_items: [
      { category: 'labor', description: 'Mowing & edging (2 crew)', quantity: 2, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'labor', description: 'Trimming & blowing', quantity: 1, unit: 'hrs', unit_cost: 35, markup_pct: 0 },
      { category: 'materials', description: 'Fuel & consumables', quantity: 1, unit: 'lot', unit_cost: 15, markup_pct: 20 },
      { category: 'equipment', description: 'Mower & trimmer wear', quantity: 1, unit: 'visit', unit_cost: 12, markup_pct: 0 },
    ],
  },
  {
    id: 'landscape-design',
    name: 'Landscape Design & Install',
    icon: Flower2,
    color: '#ec4899',
    description: 'Custom design, plant selection, grading, and installation',
    avg_price: 8500,
    avg_hours: 40,
    win_rate: 52,
    popularity: 4,
    default_items: [
      { category: 'labor', description: 'Design consultation & planning', quantity: 4, unit: 'hrs', unit_cost: 85, markup_pct: 0 },
      { category: 'labor', description: 'Site preparation & grading', quantity: 8, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Planting & installation crew (3)', quantity: 16, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'materials', description: 'Trees (shade & ornamental)', quantity: 4, unit: 'ea', unit_cost: 185, markup_pct: 35 },
      { category: 'materials', description: 'Shrubs & perennials', quantity: 24, unit: 'ea', unit_cost: 28, markup_pct: 35 },
      { category: 'materials', description: 'Mulch (hardwood)', quantity: 8, unit: 'yd³', unit_cost: 45, markup_pct: 25 },
      { category: 'materials', description: 'Soil amendment & compost', quantity: 4, unit: 'yd³', unit_cost: 38, markup_pct: 25 },
      { category: 'equipment', description: 'Skid steer rental (1 day)', quantity: 1, unit: 'day', unit_cost: 285, markup_pct: 15 },
    ],
  },
  {
    id: 'hardscape',
    name: 'Hardscape / Patio',
    icon: Layers,
    color: '#f59e0b',
    description: 'Patios, walkways, retaining walls, fire pits, and outdoor kitchens',
    avg_price: 12400,
    avg_hours: 48,
    win_rate: 45,
    popularity: 4,
    default_items: [
      { category: 'labor', description: 'Excavation & base prep (3 crew)', quantity: 16, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Paver installation (3 crew)', quantity: 24, unit: 'hrs', unit_cost: 65, markup_pct: 0 },
      { category: 'labor', description: 'Finishing & polymeric sand', quantity: 6, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'materials', description: 'Pavers (travertine)', quantity: 400, unit: 'sqft', unit_cost: 8.50, markup_pct: 30 },
      { category: 'materials', description: 'Crusher base & leveling sand', quantity: 12, unit: 'ton', unit_cost: 42, markup_pct: 20 },
      { category: 'materials', description: 'Edge restraint & spikes', quantity: 80, unit: 'ft', unit_cost: 2.25, markup_pct: 25 },
      { category: 'materials', description: 'Polymeric sand', quantity: 4, unit: 'bag', unit_cost: 28, markup_pct: 25 },
      { category: 'equipment', description: 'Plate compactor rental', quantity: 3, unit: 'day', unit_cost: 95, markup_pct: 15 },
      { category: 'equipment', description: 'Mini excavator rental', quantity: 1, unit: 'day', unit_cost: 375, markup_pct: 15 },
    ],
  },
  {
    id: 'tree-service',
    name: 'Tree Trimming & Removal',
    icon: TreePine,
    color: '#84cc16',
    description: 'Pruning, crown thinning, hazardous limb removal, full tree removal',
    avg_price: 2200,
    avg_hours: 8,
    win_rate: 65,
    popularity: 5,
    default_items: [
      { category: 'labor', description: 'Certified arborist assessment', quantity: 1, unit: 'hrs', unit_cost: 95, markup_pct: 0 },
      { category: 'labor', description: 'Climbing & trimming crew (2)', quantity: 6, unit: 'hrs', unit_cost: 75, markup_pct: 0 },
      { category: 'labor', description: 'Ground crew & cleanup (2)', quantity: 6, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'materials', description: 'Rigging supplies', quantity: 1, unit: 'lot', unit_cost: 35, markup_pct: 15 },
      { category: 'equipment', description: 'Chipper & chainsaws', quantity: 1, unit: 'day', unit_cost: 175, markup_pct: 10 },
      { category: 'other', description: 'Debris hauling & dump fees', quantity: 1, unit: 'load', unit_cost: 125, markup_pct: 0 },
    ],
  },
  {
    id: 'irrigation',
    name: 'Irrigation System',
    icon: Droplets,
    color: '#06b6d4',
    description: 'Sprinkler install, drip zones, smart controller, rain sensor',
    avg_price: 4800,
    avg_hours: 24,
    win_rate: 58,
    popularity: 3,
    default_items: [
      { category: 'labor', description: 'System design & layout', quantity: 3, unit: 'hrs', unit_cost: 85, markup_pct: 0 },
      { category: 'labor', description: 'Trenching & pipe install (2 crew)', quantity: 12, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Head installation & wiring', quantity: 8, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'materials', description: 'PVC pipe & fittings', quantity: 1, unit: 'lot', unit_cost: 420, markup_pct: 30 },
      { category: 'materials', description: 'Spray heads & rotors', quantity: 28, unit: 'ea', unit_cost: 12, markup_pct: 35 },
      { category: 'materials', description: 'Drip line & emitters', quantity: 200, unit: 'ft', unit_cost: 1.15, markup_pct: 35 },
      { category: 'materials', description: 'Smart controller (Wi-Fi)', quantity: 1, unit: 'ea', unit_cost: 245, markup_pct: 40 },
      { category: 'materials', description: 'Rain sensor', quantity: 1, unit: 'ea', unit_cost: 48, markup_pct: 35 },
      { category: 'equipment', description: 'Trencher rental', quantity: 1, unit: 'day', unit_cost: 225, markup_pct: 10 },
    ],
  },
  {
    id: 'spring-cleanup',
    name: 'Spring Cleanup',
    icon: Sun,
    color: '#facc15',
    description: 'Debris removal, bed cleanup, pruning, first mow, mulch refresh',
    avg_price: 650,
    avg_hours: 6,
    win_rate: 82,
    popularity: 5,
    default_items: [
      { category: 'labor', description: 'Leaf & debris cleanup (2 crew)', quantity: 3, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'labor', description: 'Bed edging & pruning', quantity: 2, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'labor', description: 'First mow & edging', quantity: 1.5, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'materials', description: 'Mulch top-dress', quantity: 3, unit: 'yd³', unit_cost: 45, markup_pct: 25 },
      { category: 'other', description: 'Debris disposal', quantity: 1, unit: 'load', unit_cost: 65, markup_pct: 0 },
    ],
  },
  {
    id: 'sod-install',
    name: 'Sod Installation',
    icon: PaintBucket,
    color: '#10b981',
    description: 'Soil prep, grading, sod delivery, installation, and initial watering',
    avg_price: 3200,
    avg_hours: 16,
    win_rate: 61,
    popularity: 3,
    default_items: [
      { category: 'labor', description: 'Soil prep & grading (2 crew)', quantity: 6, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Sod laying & seaming (3 crew)', quantity: 8, unit: 'hrs', unit_cost: 50, markup_pct: 0 },
      { category: 'materials', description: 'Bermuda sod (pallet)', quantity: 2000, unit: 'sqft', unit_cost: 0.55, markup_pct: 30 },
      { category: 'materials', description: 'Topsoil & amendments', quantity: 5, unit: 'yd³', unit_cost: 38, markup_pct: 20 },
      { category: 'materials', description: 'Starter fertilizer', quantity: 2, unit: 'bag', unit_cost: 32, markup_pct: 25 },
      { category: 'equipment', description: 'Sod roller rental', quantity: 1, unit: 'day', unit_cost: 65, markup_pct: 10 },
    ],
  },
  {
    id: 'drainage',
    name: 'Drainage Solution',
    icon: Shovel,
    color: '#8b5cf6',
    description: 'French drains, catch basins, downspout extensions, grading corrections',
    avg_price: 3800,
    avg_hours: 20,
    win_rate: 55,
    popularity: 2,
    default_items: [
      { category: 'labor', description: 'Site assessment & surveying', quantity: 2, unit: 'hrs', unit_cost: 85, markup_pct: 0 },
      { category: 'labor', description: 'Trenching crew (2)', quantity: 10, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Pipe install & backfill', quantity: 8, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'materials', description: 'Corrugated drain pipe (4")', quantity: 100, unit: 'ft', unit_cost: 3.50, markup_pct: 25 },
      { category: 'materials', description: 'Gravel (washed #57)', quantity: 6, unit: 'ton', unit_cost: 48, markup_pct: 20 },
      { category: 'materials', description: 'Catch basins & fittings', quantity: 3, unit: 'ea', unit_cost: 65, markup_pct: 25 },
      { category: 'materials', description: 'Filter fabric', quantity: 1, unit: 'roll', unit_cost: 85, markup_pct: 20 },
      { category: 'equipment', description: 'Mini excavator rental', quantity: 1, unit: 'day', unit_cost: 375, markup_pct: 15 },
    ],
  },
  {
    id: 'outdoor-lighting',
    name: 'Outdoor Lighting',
    icon: Lightbulb,
    color: '#eab308',
    description: 'Path lights, uplighting, spotlights, deck lights, smart controls',
    avg_price: 3400,
    avg_hours: 14,
    win_rate: 60,
    popularity: 3,
    default_items: [
      { category: 'labor', description: 'Lighting design & layout', quantity: 2, unit: 'hrs', unit_cost: 85, markup_pct: 0 },
      { category: 'labor', description: 'Wire trenching & burial', quantity: 4, unit: 'hrs', unit_cost: 50, markup_pct: 0 },
      { category: 'labor', description: 'Fixture installation', quantity: 6, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'materials', description: 'LED path lights', quantity: 12, unit: 'ea', unit_cost: 65, markup_pct: 40 },
      { category: 'materials', description: 'LED spot/uplights', quantity: 6, unit: 'ea', unit_cost: 85, markup_pct: 40 },
      { category: 'materials', description: 'Low-voltage transformer (600W)', quantity: 1, unit: 'ea', unit_cost: 195, markup_pct: 35 },
      { category: 'materials', description: 'Direct-burial cable', quantity: 300, unit: 'ft', unit_cost: 0.85, markup_pct: 30 },
      { category: 'materials', description: 'Smart timer & photocell', quantity: 1, unit: 'ea', unit_cost: 78, markup_pct: 35 },
    ],
  },
  {
    id: 'fence-install',
    name: 'Fence Installation',
    icon: Fence,
    color: '#a78bfa',
    description: 'Wood, vinyl, or metal fencing with posts, gates, and staining',
    avg_price: 5600,
    avg_hours: 24,
    win_rate: 50,
    popularity: 2,
    default_items: [
      { category: 'labor', description: 'Layout & post hole digging', quantity: 8, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Post setting & concrete', quantity: 8, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Panel/picket installation', quantity: 12, unit: 'hrs', unit_cost: 50, markup_pct: 0 },
      { category: 'materials', description: 'Cedar fence pickets', quantity: 150, unit: 'ea', unit_cost: 5.50, markup_pct: 25 },
      { category: 'materials', description: '4x4 posts (8ft)', quantity: 25, unit: 'ea', unit_cost: 18, markup_pct: 25 },
      { category: 'materials', description: '2x4 rails (8ft)', quantity: 50, unit: 'ea', unit_cost: 8, markup_pct: 25 },
      { category: 'materials', description: 'Concrete mix (60lb)', quantity: 50, unit: 'bag', unit_cost: 5.50, markup_pct: 20 },
      { category: 'materials', description: 'Gate hardware kit', quantity: 1, unit: 'ea', unit_cost: 65, markup_pct: 30 },
      { category: 'equipment', description: 'Auger rental', quantity: 1, unit: 'day', unit_cost: 125, markup_pct: 10 },
    ],
  },
  {
    id: 'retaining-wall',
    name: 'Retaining Wall',
    icon: Building2,
    color: '#78716c',
    description: 'Segmental block walls with drainage, geogrid, and cap stones',
    avg_price: 9200,
    avg_hours: 36,
    win_rate: 48,
    popularity: 2,
    default_items: [
      { category: 'labor', description: 'Excavation & leveling (2 crew)', quantity: 12, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'labor', description: 'Block laying & stacking (2 crew)', quantity: 20, unit: 'hrs', unit_cost: 65, markup_pct: 0 },
      { category: 'labor', description: 'Cap installation & cleanup', quantity: 4, unit: 'hrs', unit_cost: 55, markup_pct: 0 },
      { category: 'materials', description: 'Retaining wall blocks', quantity: 280, unit: 'ea', unit_cost: 6.50, markup_pct: 25 },
      { category: 'materials', description: 'Cap stones', quantity: 40, unit: 'ea', unit_cost: 12, markup_pct: 25 },
      { category: 'materials', description: 'Gravel backfill', quantity: 8, unit: 'ton', unit_cost: 48, markup_pct: 20 },
      { category: 'materials', description: 'Geogrid reinforcement', quantity: 60, unit: 'ft', unit_cost: 4.50, markup_pct: 20 },
      { category: 'materials', description: 'Drain pipe & filter fabric', quantity: 1, unit: 'lot', unit_cost: 145, markup_pct: 20 },
      { category: 'materials', description: 'Masonry adhesive', quantity: 6, unit: 'tube', unit_cost: 8, markup_pct: 20 },
      { category: 'equipment', description: 'Mini excavator (2 days)', quantity: 2, unit: 'day', unit_cost: 375, markup_pct: 15 },
    ],
  },
  {
    id: 'mulching',
    name: 'Mulch & Bed Refresh',
    icon: Layers,
    color: '#92400e',
    description: 'Bed edging, weed removal, mulch delivery and spreading',
    avg_price: 850,
    avg_hours: 5,
    win_rate: 85,
    popularity: 5,
    default_items: [
      { category: 'labor', description: 'Bed edging & weed removal', quantity: 2, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'labor', description: 'Mulch spreading (2 crew)', quantity: 3, unit: 'hrs', unit_cost: 45, markup_pct: 0 },
      { category: 'materials', description: 'Hardwood mulch', quantity: 6, unit: 'yd³', unit_cost: 45, markup_pct: 30 },
      { category: 'materials', description: 'Pre-emergent herbicide', quantity: 1, unit: 'bag', unit_cost: 28, markup_pct: 25 },
    ],
  },
];

// Historical estimate data for analytics
const DEMO_ESTIMATES: Estimate[] = [
  { id: 'est-1', template_id: 'hardscape', customer_name: 'Sarah Mitchell', customer_id: '1', property_address: '1425 Oak Hollow Dr, Austin TX', property_size_sqft: 12000, job_type: 'Hardscape / Patio', line_items: [], subtotal: 11200, overhead_pct: 8, overhead_amount: 896, profit_margin_pct: 18, profit_amount: 2177, tax_rate: 8.25, tax_amount: 1178, total: 15451, status: 'won', notes: 'Travertine patio with fire pit', created_at: '2026-01-15T10:00:00Z', sent_at: '2026-01-16T08:00:00Z', decided_at: '2026-01-22T14:00:00Z' },
  { id: 'est-2', template_id: 'irrigation', customer_name: 'Riverside Office Park', customer_id: '2', property_address: '8800 Business Blvd, Austin TX', property_size_sqft: 85000, job_type: 'Irrigation System', line_items: [], subtotal: 6800, overhead_pct: 8, overhead_amount: 544, profit_margin_pct: 15, profit_amount: 1102, tax_rate: 8.25, tax_amount: 697, total: 9143, status: 'won', notes: 'Commercial drip system upgrade', created_at: '2026-01-20T09:00:00Z', sent_at: '2026-01-20T14:00:00Z', decided_at: '2026-01-28T10:00:00Z' },
  { id: 'est-3', template_id: 'landscape-design', customer_name: 'David Chen', customer_id: '4', property_address: '742 Pecan St, Round Rock TX', property_size_sqft: 8500, job_type: 'Landscape Design & Install', line_items: [], subtotal: 7200, overhead_pct: 8, overhead_amount: 576, profit_margin_pct: 20, profit_amount: 1555, tax_rate: 8.25, tax_amount: 769, total: 10100, status: 'sent', notes: 'Complete backyard redesign', created_at: '2026-02-10T11:00:00Z', sent_at: '2026-02-11T08:00:00Z' },
  { id: 'est-4', template_id: 'tree-service', customer_name: 'Lakewood HOA', customer_id: '3', property_address: '200 Lakewood Blvd, Cedar Park TX', property_size_sqft: 250000, job_type: 'Tree Trimming & Removal', line_items: [], subtotal: 4800, overhead_pct: 8, overhead_amount: 384, profit_margin_pct: 15, profit_amount: 778, tax_rate: 8.25, tax_amount: 492, total: 6454, status: 'won', notes: '12 trees - annual trim program', created_at: '2026-02-05T08:00:00Z', sent_at: '2026-02-05T15:00:00Z', decided_at: '2026-02-08T09:00:00Z' },
  { id: 'est-5', template_id: 'lawn-maintenance', customer_name: 'Maria Garcia', customer_id: '6', property_address: '315 Bluebonnet Ln, Austin TX', property_size_sqft: 6500, job_type: 'Lawn Maintenance', line_items: [], subtotal: 145, overhead_pct: 8, overhead_amount: 12, profit_margin_pct: 22, profit_amount: 35, tax_rate: 8.25, tax_amount: 16, total: 208, status: 'won', notes: 'Biweekly service', created_at: '2026-02-22T10:00:00Z', sent_at: '2026-02-22T10:30:00Z', decided_at: '2026-02-22T16:00:00Z' },
  { id: 'est-6', template_id: 'hardscape', customer_name: 'Tom & Lisa Peterson', property_address: '890 Elm Creek Dr, Austin TX', property_size_sqft: 15000, job_type: 'Hardscape / Patio', line_items: [], subtotal: 14500, overhead_pct: 8, overhead_amount: 1160, profit_margin_pct: 18, profit_amount: 2819, tax_rate: 8.25, tax_amount: 1525, total: 20004, status: 'lost', notes: 'Outdoor kitchen — went with competitor', created_at: '2026-02-01T14:00:00Z', sent_at: '2026-02-02T08:00:00Z', decided_at: '2026-02-12T11:00:00Z' },
  { id: 'est-7', template_id: 'outdoor-lighting', customer_name: 'City of Pflugerville', customer_id: '5', property_address: '100 E Main St, Pflugerville TX', property_size_sqft: 500000, job_type: 'Outdoor Lighting', line_items: [], subtotal: 8200, overhead_pct: 8, overhead_amount: 656, profit_margin_pct: 12, profit_amount: 1063, tax_rate: 0, tax_amount: 0, total: 9919, status: 'sent', notes: 'Park pathway lighting', created_at: '2026-03-01T09:00:00Z', sent_at: '2026-03-02T08:00:00Z' },
  { id: 'est-8', template_id: 'spring-cleanup', customer_name: 'Sarah Mitchell', customer_id: '1', property_address: '1425 Oak Hollow Dr, Austin TX', property_size_sqft: 12000, job_type: 'Spring Cleanup', line_items: [], subtotal: 580, overhead_pct: 8, overhead_amount: 46, profit_margin_pct: 20, profit_amount: 125, tax_rate: 8.25, tax_amount: 62, total: 813, status: 'won', notes: 'Annual spring prep', created_at: '2026-03-05T08:00:00Z', sent_at: '2026-03-05T09:00:00Z', decided_at: '2026-03-05T12:00:00Z' },
  { id: 'est-9', template_id: 'fence-install', customer_name: 'James Walker', property_address: '456 Ridge Oak Ct, Round Rock TX', property_size_sqft: 11000, job_type: 'Fence Installation', line_items: [], subtotal: 4900, overhead_pct: 8, overhead_amount: 392, profit_margin_pct: 15, profit_amount: 794, tax_rate: 8.25, tax_amount: 502, total: 6588, status: 'lost', notes: 'Cedar privacy fence — budget too high', created_at: '2026-01-28T13:00:00Z', sent_at: '2026-01-29T08:00:00Z', decided_at: '2026-02-05T10:00:00Z' },
  { id: 'est-10', template_id: 'mulching', customer_name: 'Riverside Office Park', customer_id: '2', property_address: '8800 Business Blvd, Austin TX', property_size_sqft: 85000, job_type: 'Mulch & Bed Refresh', line_items: [], subtotal: 2400, overhead_pct: 8, overhead_amount: 192, profit_margin_pct: 18, profit_amount: 467, tax_rate: 8.25, tax_amount: 252, total: 3311, status: 'won', notes: 'Annual mulch refresh - all beds', created_at: '2026-03-02T11:00:00Z', sent_at: '2026-03-02T14:00:00Z', decided_at: '2026-03-03T09:00:00Z' },
  { id: 'est-11', template_id: 'sod-install', customer_name: 'Amanda Brooks', property_address: '1102 Sunset Blvd, Cedar Park TX', property_size_sqft: 9000, job_type: 'Sod Installation', line_items: [], subtotal: 2800, overhead_pct: 8, overhead_amount: 224, profit_margin_pct: 18, profit_amount: 544, tax_rate: 8.25, tax_amount: 295, total: 3863, status: 'draft', notes: 'Front yard renovation', created_at: '2026-03-08T15:00:00Z' },
  { id: 'est-12', template_id: 'retaining-wall', customer_name: 'Lakewood HOA', customer_id: '3', property_address: '200 Lakewood Blvd, Cedar Park TX', property_size_sqft: 250000, job_type: 'Retaining Wall', line_items: [], subtotal: 11500, overhead_pct: 8, overhead_amount: 920, profit_margin_pct: 15, profit_amount: 1863, tax_rate: 8.25, tax_amount: 1178, total: 15461, status: 'won', notes: 'Clubhouse entrance retaining wall', created_at: '2026-01-10T09:00:00Z', sent_at: '2026-01-11T08:00:00Z', decided_at: '2026-01-18T14:00:00Z' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// ─── Pricing Intelligence Engine ─────────────────────────────────────────────

function getPricingIntelligence(templateId: string, estimates: Estimate[]) {
  const related = estimates.filter(e => e.template_id === templateId);
  const won = related.filter(e => e.status === 'won');
  const lost = related.filter(e => e.status === 'lost');
  const decided = [...won, ...lost];

  const avgPrice = related.length > 0
    ? related.reduce((s, e) => s + e.total, 0) / related.length
    : 0;

  const winRate = decided.length > 0
    ? (won.length / decided.length) * 100
    : 0;

  const avgWonPrice = won.length > 0
    ? won.reduce((s, e) => s + e.total, 0) / won.length
    : 0;

  const avgLostPrice = lost.length > 0
    ? lost.reduce((s, e) => s + e.total, 0) / lost.length
    : 0;

  const avgMargin = related.length > 0
    ? related.reduce((s, e) => s + e.profit_margin_pct, 0) / related.length
    : 0;

  // Generate price points for the win probability curve
  const pricePoints = [];
  const basePrice = avgPrice || 1000;
  for (let mult = 0.6; mult <= 1.5; mult += 0.1) {
    const price = basePrice * mult;
    // Simple logistic-ish curve: lower price = higher win rate
    const normalizedDiff = (price - basePrice) / basePrice;
    const winProb = Math.max(5, Math.min(95, 65 - normalizedDiff * 80 + (Math.random() * 8 - 4)));
    const margin = Math.max(0, ((price - basePrice * 0.6) / price) * 100);
    pricePoints.push({ price, winProb: Math.round(winProb), margin: Math.round(margin) });
  }

  // Sweet spot: price where win probability × margin is maximized
  const sweetSpot = pricePoints.reduce<{ price: number; winProb: number; margin: number; score: number }>((best, point) => {
    const score = point.winProb * point.margin;
    return score > best.score ? { ...point, score } : best;
  }, { price: 0, winProb: 0, margin: 0, score: 0 });

  return {
    totalEstimates: related.length,
    wonCount: won.length,
    lostCount: lost.length,
    avgPrice,
    winRate,
    avgWonPrice,
    avgLostPrice,
    avgMargin,
    pricePoints,
    sweetSpot,
    revenueFromWon: won.reduce((s, e) => s + e.total, 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SmartEstimatorPage() {
  const { customers, addQuote } = useData();
  const { addToast } = useToast();

  const [view, setView] = useState<View>('templates');
  const [estimates, setEstimates] = useState<Estimate[]>(DEMO_ESTIMATES);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);

  // Builder state
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertySqft, setPropertySqft] = useState(0);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [overheadPct, setOverheadPct] = useState(8);
  const [profitMarginPct, setProfitMarginPct] = useState(18);
  const [taxRate, setTaxRate] = useState(8.25);
  const [notes, setNotes] = useState('');
  const [showIntelligence, setShowIntelligence] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    labor: true, materials: true, equipment: true, subcontractor: true, other: true
  });

  // History filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'draft' | 'sent' | 'won' | 'lost'>('all');

  // ─── Calculations ────────────────────────────────────────────────────────

  const subtotal = useMemo(() =>
    lineItems.reduce((sum, item) => sum + item.total, 0),
    [lineItems]
  );

  const overheadAmount = useMemo(() => subtotal * (overheadPct / 100), [subtotal, overheadPct]);
  const preMarginTotal = subtotal + overheadAmount;
  const profitAmount = useMemo(() => preMarginTotal * (profitMarginPct / 100), [preMarginTotal, profitMarginPct]);
  const preTaxTotal = preMarginTotal + profitAmount;
  const taxAmount = useMemo(() => preTaxTotal * (taxRate / 100), [preTaxTotal, taxRate]);
  const grandTotal = preTaxTotal + taxAmount;

  const laborTotal = useMemo(() =>
    lineItems.filter(i => i.category === 'labor').reduce((s, i) => s + i.total, 0),
    [lineItems]
  );
  const materialsTotal = useMemo(() =>
    lineItems.filter(i => i.category === 'materials').reduce((s, i) => s + i.total, 0),
    [lineItems]
  );
  const equipmentTotal = useMemo(() =>
    lineItems.filter(i => i.category === 'equipment').reduce((s, i) => s + i.total, 0),
    [lineItems]
  );

  const costOfGoods = subtotal;
  const grossMarginPct = grandTotal > 0 ? ((grandTotal - costOfGoods) / grandTotal) * 100 : 0;

  // Pricing intelligence for current template
  const intelligence = useMemo(() =>
    selectedTemplate ? getPricingIntelligence(selectedTemplate.id, estimates) : null,
    [selectedTemplate, estimates]
  );

  // ─── Template Selection ──────────────────────────────────────────────────

  const selectTemplate = useCallback((template: JobTemplate) => {
    setSelectedTemplate(template);
    const items: EstimateLineItem[] = template.default_items.map(item => ({
      ...item,
      id: generateId(),
      total: item.quantity * item.unit_cost * (1 + item.markup_pct / 100),
    }));
    setLineItems(items);
    setOverheadPct(8);
    setProfitMarginPct(template.avg_price > 5000 ? 18 : 22);
    setCustomerName('');
    setCustomerId('');
    setPropertyAddress('');
    setPropertySqft(0);
    setNotes('');
    setView('builder');
  }, []);

  const startBlank = useCallback(() => {
    setSelectedTemplate(null);
    setLineItems([]);
    setOverheadPct(8);
    setProfitMarginPct(18);
    setCustomerName('');
    setCustomerId('');
    setPropertyAddress('');
    setPropertySqft(0);
    setNotes('');
    setView('builder');
  }, []);

  // ─── Line Item CRUD ──────────────────────────────────────────────────────

  const addLineItem = useCallback((category: EstimateLineItem['category']) => {
    setLineItems(prev => [...prev, {
      id: generateId(),
      category,
      description: '',
      quantity: 1,
      unit: category === 'labor' ? 'hrs' : 'ea',
      unit_cost: 0,
      markup_pct: category === 'materials' ? 30 : 0,
      total: 0,
    }]);
  }, []);

  const updateLineItem = useCallback((id: string, field: string, value: number | string) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.unit_cost * (1 + updated.markup_pct / 100);
      return updated;
    }));
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // ─── Save & Convert ──────────────────────────────────────────────────────

  const saveEstimate = useCallback((status: Estimate['status'] = 'draft') => {
    const estimate: Estimate = {
      id: generateId(),
      template_id: selectedTemplate?.id,
      customer_name: customerName || 'Unnamed Customer',
      customer_id: customerId || undefined,
      property_address: propertyAddress || 'Address TBD',
      property_size_sqft: propertySqft,
      job_type: selectedTemplate?.name || 'Custom Estimate',
      line_items: lineItems,
      subtotal,
      overhead_pct: overheadPct,
      overhead_amount: overheadAmount,
      profit_margin_pct: profitMarginPct,
      profit_amount: profitAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total: grandTotal,
      status,
      notes,
      created_at: new Date().toISOString(),
      sent_at: status === 'sent' ? new Date().toISOString() : undefined,
    };
    setEstimates(prev => [estimate, ...prev]);
    addToast('success', status === 'sent' ? 'Estimate sent to customer!' : 'Estimate saved as draft');
    return estimate;
  }, [customerName, customerId, propertyAddress, propertySqft, selectedTemplate, lineItems, subtotal, overheadPct, overheadAmount, profitMarginPct, profitAmount, taxRate, taxAmount, grandTotal, notes, addToast]);

  const convertToQuote = useCallback(async () => {
    const quoteItems = lineItems.map(item => ({
      id: generateId(),
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_cost * (1 + item.markup_pct / 100),
      total: item.total,
    }));

    try {
      await addQuote({
        customer_id: customerId || '1',
        title: `${selectedTemplate?.name || 'Custom'} - ${customerName || 'New Customer'}`,
        status: 'draft',
        line_items: quoteItems,
        subtotal: preTaxTotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: grandTotal,
        notes: notes || `Generated from Smart Estimator`,
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      saveEstimate('sent');
      addToast('success', 'Estimate converted to Quote! View it in Quotes.');
    } catch {
      addToast('success', 'Quote created in demo mode');
    }
  }, [lineItems, customerId, selectedTemplate, customerName, preTaxTotal, taxRate, taxAmount, grandTotal, notes, addQuote, saveEstimate, addToast]);

  // Fill customer info from selection
  const selectCustomer = useCallback((cId: string) => {
    const c = customers.find(c => c.id === cId);
    if (c) {
      setCustomerId(c.id);
      setCustomerName(c.name);
      setPropertyAddress(`${c.address}, ${c.city} ${c.state} ${c.zip || ''}`);
      setPropertySqft(c.property_size_sqft || 0);
    }
  }, [customers]);

  // ─── Analytics ───────────────────────────────────────────────────────────

  const analytics = useMemo(() => {
    const total = estimates.length;
    const won = estimates.filter(e => e.status === 'won');
    const lost = estimates.filter(e => e.status === 'lost');
    const sent = estimates.filter(e => e.status === 'sent');
    const decided = [...won, ...lost];
    const winRate = decided.length > 0 ? (won.length / decided.length) * 100 : 0;
    const totalRevenue = won.reduce((s, e) => s + e.total, 0);
    const avgEstimateValue = total > 0 ? estimates.reduce((s, e) => s + e.total, 0) / total : 0;
    const avgDaysToClose = decided.length > 0
      ? decided.reduce((s, e) => {
          const sent = new Date(e.sent_at || e.created_at).getTime();
          const decided_at = new Date(e.decided_at || e.created_at).getTime();
          return s + (decided_at - sent) / 86400000;
        }, 0) / decided.length
      : 0;

    return { total, wonCount: won.length, lostCount: lost.length, pendingCount: sent.length, winRate, totalRevenue, avgEstimateValue, avgDaysToClose };
  }, [estimates]);

  const filteredEstimates = useMemo(() =>
    historyFilter === 'all' ? estimates : estimates.filter(e => e.status === historyFilter),
    [estimates, historyFilter]
  );

  // ─── Price Comparison Indicator ──────────────────────────────────────────

  const priceComparison = useMemo(() => {
    if (!intelligence || intelligence.avgPrice === 0) return null;
    const diff = ((grandTotal - intelligence.avgPrice) / intelligence.avgPrice) * 100;
    if (diff < -10) return { label: 'Below market', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: TrendingDown };
    if (diff > 10) return { label: 'Above market', color: 'text-red-400', bg: 'bg-red-500/10', icon: TrendingUp };
    return { label: 'Market rate', color: 'text-green-400', bg: 'bg-green-500/10', icon: Target };
  }, [grandTotal, intelligence]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {view === 'builder' && (
            <button
              onClick={() => setView('templates')}
              className="p-2 text-earth-400 hover:text-earth-100 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold font-display text-earth-50 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Smart Estimator
            </h1>
            <p className="text-sm text-earth-400 mt-0.5">
              {view === 'templates' && 'Choose a template or start from scratch'}
              {view === 'builder' && (selectedTemplate ? `Building: ${selectedTemplate.name}` : 'Custom Estimate')}
              {view === 'history' && 'Track estimates and analyze win rates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-earth-800/60 rounded-lg p-0.5 border border-earth-700/50">
            {(['templates', 'builder', 'history'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer capitalize',
                  view === v
                    ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                    : 'text-earth-400 hover:text-earth-200'
                )}
              >
                {v === 'templates' ? 'Templates' : v === 'builder' ? 'Builder' : 'History'}
              </button>
            ))}
          </div>
          {view !== 'builder' && (
            <button
              onClick={startBlank}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Estimate</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ TEMPLATES VIEW ═══ */}
      {view === 'templates' && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Estimates This Month"
              value={estimates.filter(e => new Date(e.created_at) > new Date(Date.now() - 30 * 86400000)).length}
              icon={<FileText className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title="Win Rate"
              value={`${analytics.winRate.toFixed(0)}%`}
              icon={<Target className="w-5 h-5" />}
              color="sky"
              change={8}
            />
            <StatCard
              title="Revenue from Estimates"
              value={fmtShort(analytics.totalRevenue)}
              icon={<DollarSign className="w-5 h-5" />}
              color="amber"
              change={12}
            />
            <StatCard
              title="Avg. Days to Close"
              value={`${analytics.avgDaysToClose.toFixed(1)}d`}
              icon={<Clock className="w-5 h-5" />}
              color="earth"
            />
          </div>

          {/* Template Gallery */}
          <div>
            <h2 className="text-lg font-semibold font-display text-earth-100 mb-4">Job Templates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {JOB_TEMPLATES.map(template => {
                const Icon = template.icon;
                const ti = getPricingIntelligence(template.id, estimates);
                return (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className="group relative bg-earth-900/60 border border-earth-800 rounded-xl p-5 text-left hover:border-earth-600 hover:bg-earth-900/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 cursor-pointer"
                  >
                    {/* Icon */}
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: template.color }} />
                    </div>

                    {/* Name & Description */}
                    <h3 className="text-sm font-semibold text-earth-100 mb-1 group-hover:text-earth-50">{template.name}</h3>
                    <p className="text-xs text-earth-500 mb-3 line-clamp-2">{template.description}</p>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-earth-400">
                        Avg: <span className="text-earth-200 font-medium">${template.avg_price.toLocaleString()}</span>
                      </span>
                      <span className={clsx(
                        'font-medium',
                        template.win_rate >= 70 ? 'text-green-400' : template.win_rate >= 50 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {ti.totalEstimates > 0 ? `${ti.winRate.toFixed(0)}%` : `${template.win_rate}%`} win
                      </span>
                    </div>

                    {/* Popularity */}
                    <div className="flex items-center gap-0.5 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={clsx(
                            'w-3 h-3',
                            i < template.popularity ? 'text-amber-400 fill-amber-400' : 'text-earth-700'
                          )}
                        />
                      ))}
                      <span className="text-[10px] text-earth-500 ml-1">~{template.avg_hours}h</span>
                    </div>

                    {/* Hover arrow */}
                    <ChevronRight className="absolute top-5 right-4 w-4 h-4 text-earth-700 group-hover:text-green-400 transition-colors" />
                  </button>
                );
              })}

              {/* Blank template */}
              <button
                onClick={startBlank}
                className="group bg-earth-900/30 border border-dashed border-earth-700 rounded-xl p-5 text-left hover:border-green-600/50 hover:bg-earth-900/40 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[180px]"
              >
                <div className="w-11 h-11 rounded-lg bg-earth-800/60 flex items-center justify-center mb-3 group-hover:bg-green-600/20 transition-colors">
                  <Plus className="w-5 h-5 text-earth-500 group-hover:text-green-400 transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-earth-400 group-hover:text-earth-200">Start from Scratch</h3>
                <p className="text-xs text-earth-600 mt-1">Build a custom estimate</p>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ BUILDER VIEW ═══ */}
      {view === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Builder (2 cols) */}
          <div className="xl:col-span-2 space-y-5">

            {/* Customer & Property */}
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-earth-400 mb-1.5">Customer</label>
                  <select
                    value={customerId}
                    onChange={e => e.target.value ? selectCustomer(e.target.value) : null}
                    className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 focus:outline-none focus:border-green-600 transition-colors"
                  >
                    <option value="">Select existing or type below...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Or enter new customer name"
                    className="w-full mt-2 bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder:text-earth-600 focus:outline-none focus:border-green-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth-400 mb-1.5">Property Address</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={e => setPropertyAddress(e.target.value)}
                    placeholder="123 Main St, Austin TX 78745"
                    className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder:text-earth-600 focus:outline-none focus:border-green-600 transition-colors"
                  />
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-earth-400 mb-1.5">Property Size (sqft)</label>
                    <input
                      type="number"
                      value={propertySqft || ''}
                      onChange={e => setPropertySqft(parseInt(e.target.value) || 0)}
                      placeholder="e.g. 12000"
                      className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder:text-earth-600 focus:outline-none focus:border-green-600 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Line Items by Category */}
            {(['labor', 'materials', 'equipment', 'subcontractor', 'other'] as const).map(category => {
              const items = lineItems.filter(i => i.category === category);
              if (items.length === 0 && category !== 'labor' && category !== 'materials') return null;
              const catTotal = items.reduce((s, i) => s + i.total, 0);
              const isExpanded = expandedCategories[category] !== false;
              const catIcons: Record<string, LucideIcon> = {
                labor: Users, materials: Layers, equipment: Wrench, subcontractor: Building2, other: FileText,
              };
              const CatIcon = catIcons[category] || FileText;

              return (
                <Card key={category} padding={false}>
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !isExpanded }))}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-earth-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4 text-earth-400" />
                      <h3 className="text-sm font-semibold text-earth-200 capitalize">{category}</h3>
                      <span className="text-xs text-earth-500">({items.length} items)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-earth-200">${fmt(catTotal)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-earth-500" /> : <ChevronDown className="w-4 h-4 text-earth-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4">
                      {/* Column Headers */}
                      {items.length > 0 && (
                        <div className="grid grid-cols-12 gap-2 mb-2 text-[10px] font-medium text-earth-500 uppercase tracking-wider">
                          <div className="col-span-4 sm:col-span-5">Description</div>
                          <div className="col-span-2 sm:col-span-1 text-right">Qty</div>
                          <div className="col-span-1 hidden sm:block">Unit</div>
                          <div className="col-span-2 text-right">Cost</div>
                          <div className="col-span-1 hidden sm:block text-right">Markup</div>
                          <div className="col-span-2 text-right">Total</div>
                          <div className="col-span-1"></div>
                        </div>
                      )}

                      {/* Items */}
                      {items.map(item => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-center group">
                          <div className="col-span-4 sm:col-span-5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Line item description"
                              className="w-full bg-earth-800/60 border border-earth-700/50 rounded px-2 py-1.5 text-xs text-earth-100 placeholder:text-earth-600 focus:outline-none focus:border-green-600 transition-colors"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-earth-800/60 border border-earth-700/50 rounded px-2 py-1.5 text-xs text-earth-100 text-right focus:outline-none focus:border-green-600 transition-colors"
                            />
                          </div>
                          <div className="col-span-1 hidden sm:block">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => updateLineItem(item.id, 'unit', e.target.value)}
                              className="w-full bg-earth-800/60 border border-earth-700/50 rounded px-2 py-1.5 text-xs text-earth-100 focus:outline-none focus:border-green-600 transition-colors"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={item.unit_cost || ''}
                              onChange={e => updateLineItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                              className="w-full bg-earth-800/60 border border-earth-700/50 rounded px-2 py-1.5 text-xs text-earth-100 text-right focus:outline-none focus:border-green-600 transition-colors"
                              step="0.01"
                            />
                          </div>
                          <div className="col-span-1 hidden sm:block">
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={item.markup_pct || ''}
                                onChange={e => updateLineItem(item.id, 'markup_pct', parseFloat(e.target.value) || 0)}
                                className="w-full bg-earth-800/60 border border-earth-700/50 rounded px-2 py-1.5 text-xs text-earth-100 text-right focus:outline-none focus:border-green-600 transition-colors"
                              />
                              <span className="text-xs text-earth-500 ml-0.5">%</span>
                            </div>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-xs font-medium text-earth-200">${fmt(item.total)}</span>
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="p-1 text-earth-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Item Button */}
                      <button
                        onClick={() => addLineItem(category)}
                        className="flex items-center gap-1.5 text-xs text-earth-500 hover:text-green-400 mt-2 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add {category} item
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Notes */}
            <Card>
              <label className="block text-xs font-medium text-earth-400 mb-1.5">Estimate Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about scope, exclusions, or special conditions..."
                rows={3}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg px-3 py-2 text-sm text-earth-100 placeholder:text-earth-600 focus:outline-none focus:border-green-600 transition-colors resize-none"
              />
            </Card>

            {/* Totals Card */}
            <Card>
              <div className="space-y-3">
                {/* Cost Breakdown */}
                <div className="grid grid-cols-3 gap-4 pb-3 border-b border-earth-800">
                  <div>
                    <p className="text-xs text-earth-500">Labor</p>
                    <p className="text-sm font-medium text-earth-200">${fmt(laborTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-500">Materials</p>
                    <p className="text-sm font-medium text-earth-200">${fmt(materialsTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-earth-500">Equipment + Other</p>
                    <p className="text-sm font-medium text-earth-200">${fmt(equipmentTotal + subtotal - laborTotal - materialsTotal - equipmentTotal)}</p>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-earth-400">Subtotal (cost of work)</span>
                  <span className="text-earth-200 font-medium">${fmt(subtotal)}</span>
                </div>

                {/* Overhead */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-earth-400">Overhead</span>
                    <input
                      type="number"
                      value={overheadPct}
                      onChange={e => setOverheadPct(parseFloat(e.target.value) || 0)}
                      className="w-14 bg-earth-800 border border-earth-700 rounded px-2 py-0.5 text-xs text-earth-100 text-right focus:outline-none focus:border-green-600"
                      step="0.5"
                    />
                    <span className="text-earth-500 text-xs">%</span>
                  </div>
                  <span className="text-earth-200">${fmt(overheadAmount)}</span>
                </div>

                {/* Profit Margin */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-earth-400">Profit Margin</span>
                    <input
                      type="number"
                      value={profitMarginPct}
                      onChange={e => setProfitMarginPct(parseFloat(e.target.value) || 0)}
                      className="w-14 bg-earth-800 border border-earth-700 rounded px-2 py-0.5 text-xs text-earth-100 text-right focus:outline-none focus:border-green-600"
                      step="0.5"
                    />
                    <span className="text-earth-500 text-xs">%</span>
                  </div>
                  <span className="text-green-400 font-medium">${fmt(profitAmount)}</span>
                </div>

                {/* Tax */}
                <div className="flex items-center justify-between text-sm pb-3 border-b border-earth-800">
                  <div className="flex items-center gap-2">
                    <span className="text-earth-400">Tax</span>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-14 bg-earth-800 border border-earth-700 rounded px-2 py-0.5 text-xs text-earth-100 text-right focus:outline-none focus:border-green-600"
                      step="0.25"
                    />
                    <span className="text-earth-500 text-xs">%</span>
                  </div>
                  <span className="text-earth-200">${fmt(taxAmount)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-bold font-display text-earth-50">Total Estimate</span>
                    {priceComparison && (
                      <span className={clsx('ml-2 text-xs font-medium px-2 py-0.5 rounded-full', priceComparison.bg, priceComparison.color)}>
                        {priceComparison.label}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-bold font-display text-green-400">${fmt(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-earth-500">
                  <span>Gross margin: {grossMarginPct.toFixed(1)}%</span>
                  <span>Profit: ${fmt(profitAmount + overheadAmount)}</span>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => saveEstimate('draft')}
                className="flex items-center gap-2 px-4 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 text-earth-200 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Bookmark className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => saveEstimate('sent')}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Send to Customer
              </button>
              <button
                onClick={convertToQuote}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                Convert to Quote
              </button>
              <button
                onClick={() => {
                  selectTemplate(selectedTemplate || JOB_TEMPLATES[0]);
                  addToast('success', 'Template duplicated — customize and save');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-earth-800 hover:bg-earth-700 border border-earth-700 text-earth-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
            </div>
          </div>

          {/* ─── Intelligence Sidebar ─────────────────────────────────────── */}
          <div className="space-y-5">
            <button
              onClick={() => setShowIntelligence(!showIntelligence)}
              className="xl:hidden flex items-center gap-2 text-sm text-earth-400 hover:text-earth-200 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              {showIntelligence ? 'Hide' : 'Show'} Pricing Intelligence
            </button>

            {(showIntelligence || typeof window !== 'undefined') && (
              <>
                {/* Price Intelligence Card */}
                {intelligence && intelligence.totalEstimates > 0 && (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-earth-100">Pricing Intelligence</h3>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-earth-800/60 rounded-lg p-3">
                        <p className="text-[10px] text-earth-500 uppercase">Your Avg Price</p>
                        <p className="text-lg font-bold text-earth-100">${intelligence.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-earth-800/60 rounded-lg p-3">
                        <p className="text-[10px] text-earth-500 uppercase">Win Rate</p>
                        <p className={clsx('text-lg font-bold', intelligence.winRate >= 60 ? 'text-green-400' : intelligence.winRate >= 40 ? 'text-amber-400' : 'text-red-400')}>
                          {intelligence.winRate.toFixed(0)}%
                        </p>
                      </div>
                      <div className="bg-earth-800/60 rounded-lg p-3">
                        <p className="text-[10px] text-earth-500 uppercase">Avg Won Price</p>
                        <p className="text-sm font-bold text-green-400">{intelligence.avgWonPrice > 0 ? `$${intelligence.avgWonPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</p>
                      </div>
                      <div className="bg-earth-800/60 rounded-lg p-3">
                        <p className="text-[10px] text-earth-500 uppercase">Avg Lost Price</p>
                        <p className="text-sm font-bold text-red-400">{intelligence.avgLostPrice > 0 ? `$${intelligence.avgLostPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</p>
                      </div>
                    </div>

                    {/* Win Probability Curve (CSS-based) */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-earth-400 mb-2">Price vs Win Probability</p>
                      <div className="space-y-1">
                        {intelligence.pricePoints.filter((_, i) => i % 2 === 0).map((point, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-earth-500 w-12 text-right">{fmtShort(point.price)}</span>
                            <div className="flex-1 h-4 bg-earth-800 rounded-full overflow-hidden relative">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all duration-500',
                                  point.winProb >= 65 ? 'bg-green-500/70' : point.winProb >= 45 ? 'bg-amber-500/70' : 'bg-red-500/70'
                                )}
                                style={{ width: `${point.winProb}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-earth-100">
                                {point.winProb}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sweet Spot */}
                    {intelligence.sweetSpot.price > 0 && (
                      <div className="bg-gradient-to-br from-amber-600/10 to-amber-800/5 border border-amber-700/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-300">Sweet Spot Price</span>
                        </div>
                        <p className="text-xl font-bold text-amber-200">${intelligence.sweetSpot.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-[10px] text-earth-400 mt-1">
                          ~{intelligence.sweetSpot.winProb}% win probability at {intelligence.sweetSpot.margin}% margin
                        </p>
                        <button
                          onClick={() => {
                            // Adjust margin to match sweet spot
                            const targetTotal = intelligence!.sweetSpot.price;
                            const neededMargin = ((targetTotal / (1 + taxRate/100)) - subtotal - overheadAmount) / (subtotal + overheadAmount);
                            setProfitMarginPct(Math.max(0, Math.round(neededMargin * 100)));
                            addToast('success', 'Margin adjusted to sweet spot price');
                          }}
                          className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer"
                        >
                          Apply this price
                        </button>
                      </div>
                    )}
                  </Card>
                )}

                {/* Current Estimate Health */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-green-400" />
                    <h3 className="text-sm font-semibold text-earth-100">Estimate Health</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Margin Indicator */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-earth-400">Gross Margin</span>
                        <span className={clsx(
                          'font-medium',
                          grossMarginPct >= 30 ? 'text-green-400' : grossMarginPct >= 20 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {grossMarginPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-earth-800 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-500',
                            grossMarginPct >= 30 ? 'bg-green-500' : grossMarginPct >= 20 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(100, grossMarginPct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-earth-600 mt-0.5">
                        <span>0%</span>
                        <span className="text-earth-500">Target: 30%+</span>
                        <span>50%</span>
                      </div>
                    </div>

                    {/* Smart Tips */}
                    <div className="space-y-2 mt-3">
                      {grossMarginPct < 20 && (
                        <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 rounded-lg p-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Margin is below 20%. Consider increasing markup on materials or raising profit margin.</span>
                        </div>
                      )}
                      {grossMarginPct >= 20 && grossMarginPct < 30 && (
                        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 rounded-lg p-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Margin is acceptable but below the 30% target. Room to improve on material markups.</span>
                        </div>
                      )}
                      {grossMarginPct >= 30 && (
                        <div className="flex items-start gap-2 text-xs text-green-300 bg-green-500/10 rounded-lg p-2.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Healthy margin! This estimate is priced well for profitability.</span>
                        </div>
                      )}
                      {lineItems.length === 0 && (
                        <div className="flex items-start gap-2 text-xs text-sky-300 bg-sky-500/10 rounded-lg p-2.5">
                          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Add line items to see cost analysis and pricing recommendations.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Quick Reference */}
                <Card>
                  <h3 className="text-sm font-semibold text-earth-100 mb-3">Quick Cost Reference</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-earth-400">
                      <span>Avg labor rate (crew)</span>
                      <span className="text-earth-200">$45-65/hr</span>
                    </div>
                    <div className="flex justify-between text-earth-400">
                      <span>Mulch (hardwood)</span>
                      <span className="text-earth-200">$45/yd³</span>
                    </div>
                    <div className="flex justify-between text-earth-400">
                      <span>Pavers (mid-range)</span>
                      <span className="text-earth-200">$6-12/sqft</span>
                    </div>
                    <div className="flex justify-between text-earth-400">
                      <span>Sod (Bermuda)</span>
                      <span className="text-earth-200">$0.45-0.65/sqft</span>
                    </div>
                    <div className="flex justify-between text-earth-400">
                      <span>LED path light</span>
                      <span className="text-earth-200">$55-85/ea</span>
                    </div>
                    <div className="flex justify-between text-earth-400">
                      <span>Mini excavator</span>
                      <span className="text-earth-200">$350-425/day</span>
                    </div>
                    <div className="flex justify-between text-earth-400">
                      <span>Topsoil</span>
                      <span className="text-earth-200">$35-45/yd³</span>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ HISTORY VIEW ═══ */}
      {view === 'history' && (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Estimates"
              value={analytics.total}
              icon={<FileText className="w-5 h-5" />}
              color="earth"
            />
            <StatCard
              title="Win Rate"
              value={`${analytics.winRate.toFixed(0)}%`}
              icon={<Target className="w-5 h-5" />}
              color={analytics.winRate >= 60 ? 'green' : 'amber'}
              change={8}
            />
            <StatCard
              title="Revenue Won"
              value={fmtShort(analytics.totalRevenue)}
              icon={<DollarSign className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title="Pending"
              value={analytics.pendingCount}
              icon={<Clock className="w-5 h-5" />}
              color="sky"
            />
          </div>

          {/* Win/Loss by Job Type */}
          <Card>
            <h3 className="text-sm font-semibold text-earth-100 mb-4">Win Rate by Job Type</h3>
            <div className="space-y-3">
              {JOB_TEMPLATES.map(template => {
                const ti = getPricingIntelligence(template.id, estimates);
                if (ti.totalEstimates === 0) return null;
                const Icon = template.icon;
                return (
                  <div key={template.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${template.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: template.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-earth-200 truncate">{template.name}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-400">{ti.wonCount}W</span>
                          <span className="text-red-400">{ti.lostCount}L</span>
                          <span className={clsx(
                            'font-semibold',
                            ti.winRate >= 60 ? 'text-green-400' : ti.winRate >= 40 ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {ti.winRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-earth-800 rounded-full overflow-hidden flex">
                        <div className="bg-green-500 rounded-l-full" style={{ width: `${ti.winRate}%` }} />
                        <div className="bg-red-500 rounded-r-full" style={{ width: `${100 - ti.winRate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-earth-800 pb-2">
            {(['all', 'draft', 'sent', 'won', 'lost'] as const).map(filter => {
              const count = filter === 'all' ? estimates.length : estimates.filter(e => e.status === filter).length;
              return (
                <button
                  key={filter}
                  onClick={() => setHistoryFilter(filter)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize cursor-pointer',
                    historyFilter === filter
                      ? 'bg-green-600/20 text-green-400'
                      : 'text-earth-400 hover:text-earth-200'
                  )}
                >
                  {filter} ({count})
                </button>
              );
            })}
          </div>

          {/* Estimate List */}
          <div className="space-y-3">
            {filteredEstimates.map(estimate => {
              const statusConfig = {
                draft: { icon: FileText, color: 'text-earth-400', bg: 'bg-earth-600/20', label: 'Draft' },
                sent: { icon: Send, color: 'text-sky-400', bg: 'bg-sky-600/20', label: 'Sent' },
                won: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-600/20', label: 'Won' },
                lost: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-600/20', label: 'Lost' },
              }[estimate.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={estimate.id}
                  className="bg-earth-900/60 border border-earth-800 rounded-xl p-4 hover:border-earth-600 transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={clsx('p-2 rounded-lg shrink-0', statusConfig.bg)}>
                        <StatusIcon className={clsx('w-4 h-4', statusConfig.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-earth-100">{estimate.job_type}</h4>
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-earth-400 mt-0.5">{estimate.customer_name}</p>
                        <p className="text-xs text-earth-500">{estimate.property_address}</p>
                        {estimate.notes && (
                          <p className="text-xs text-earth-500 mt-1 italic">{estimate.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <p className="text-lg font-bold font-display text-earth-100">${estimate.total.toLocaleString()}</p>
                        <p className="text-xs text-earth-500">
                          {new Date(estimate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {estimate.decided_at && (
                            <span>
                              {' '}&rarr; {new Date(estimate.decided_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-earth-500">
                        <p>Margin: {estimate.profit_margin_pct}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
