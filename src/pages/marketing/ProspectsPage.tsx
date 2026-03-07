import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown,
  Phone, Mail, MapPin, Home, Star, ArrowRight, X, Download,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import SlidePanel from '../../components/ui/SlidePanel';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import type { Prospect, ProspectListResponse, ProspectStats } from '../../types';

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<string, 'green' | 'sky' | 'amber' | 'earth' | 'purple' | 'red'> = {
  new: 'sky',
  contacted: 'amber',
  qualified: 'green',
  do_not_contact: 'red',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  new_construction: 'New Construction',
  remodel: 'Remodel',
  addition: 'Addition',
  repair: 'Repair',
  commercial: 'Commercial',
  residential: 'Residential',
};

export default function ProspectsPage() {
  const toast = useToast();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [workTypes, setWorkTypes] = useState<{ work_type: string; count: number }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [converting, setConverting] = useState(false);

  // Filters
  const [filterCity, setFilterCity] = useState('');
  const [filterWorkType, setFilterWorkType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterMaxScore, setFilterMaxScore] = useState('');
  const [filterMinValue, setFilterMinValue] = useState('');
  const [filterMaxValue, setFilterMaxValue] = useState('');
  const [sortBy, setSortBy] = useState('lead_score');
  const [sortDir, setSortDir] = useState('desc');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterCity) params.set('city', filterCity);
      if (filterWorkType) params.set('work_type', filterWorkType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterMinScore) params.set('min_score', filterMinScore);
      if (filterMaxScore) params.set('max_score', filterMaxScore);
      if (filterMinValue) params.set('min_property_value', filterMinValue);
      if (filterMaxValue) params.set('max_property_value', filterMaxValue);

      const data = await api.get<ProspectListResponse>(`/prospects?${params}`);
      setProspects(data.items);
      setTotal(data.total);
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterCity, filterWorkType, filterStatus, filterMinScore, filterMaxScore, filterMinValue, filterMaxValue, sortBy, sortDir]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  // Load stats and filter options once
  useEffect(() => {
    api.get<ProspectStats>('/prospects/stats').then(setStats).catch(() => {});
    api.get<{ city: string; count: number }[]>('/prospects/cities').then(setCities).catch(() => {});
    api.get<{ work_type: string; count: number }[]>('/prospects/work-types').then(setWorkTypes).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  };

  const convertToLead = async (id: string) => {
    setConverting(true);
    try {
      await api.post(`/prospects/${id}/convert-to-lead`);
      toast.success('Prospect converted to lead');
      fetchProspects();
    } catch {
      toast.error('Failed to convert prospect');
    } finally {
      setConverting(false);
    }
  };

  const bulkConvert = async () => {
    setConverting(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        await api.post(`/prospects/${id}/convert-to-lead`);
        success++;
      } catch { /* skip */ }
    }
    toast.success(`Converted ${success} prospects to leads`);
    setSelectedIds(new Set());
    setConverting(false);
    fetchProspects();
  };

  const clearFilters = () => {
    setFilterCity('');
    setFilterWorkType('');
    setFilterStatus('');
    setFilterMinScore('');
    setFilterMaxScore('');
    setFilterMinValue('');
    setFilterMaxValue('');
    setPage(1);
  };

  const hasActiveFilters = filterCity || filterWorkType || filterStatus || filterMinScore || filterMaxScore || filterMinValue || filterMaxValue;

  const formatCurrency = (v?: number) => v != null ? `$${v.toLocaleString()}` : '—';
  const formatNumber = (v?: number) => v != null ? v.toLocaleString() : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-earth-50">Prospects</h1>
          <p className="text-sm text-earth-400 mt-1">
            {total.toLocaleString()} Austin-metro property owners
            {stats ? ` · Avg score: ${stats.avg_lead_score}` : ''}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button onClick={bulkConvert} loading={converting}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Convert {selectedIds.size} to Leads
          </Button>
        )}
      </div>

      {/* Stats cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-xs text-earth-400 uppercase tracking-wide">Total Prospects</p>
              <p className="text-2xl font-bold text-earth-50 mt-1">{stats.total.toLocaleString()}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-earth-400 uppercase tracking-wide">Avg Lead Score</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stats.avg_lead_score}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-earth-400 uppercase tracking-wide">Avg Property Value</p>
              <p className="text-2xl font-bold text-earth-50 mt-1">{formatCurrency(stats.avg_property_value)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-earth-400 uppercase tracking-wide">Cities</p>
              <p className="text-2xl font-bold text-earth-50 mt-1">{stats.by_city.length}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, address, phone, or email..."
            className="w-full pl-10 pr-10 py-2.5 bg-earth-900 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors min-h-[44px]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-earth-400 hover:text-earth-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-earth-400 mb-1">City</label>
              <select
                value={filterCity}
                onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
              >
                <option value="">All Cities</option>
                {cities.map(c => (
                  <option key={c.city} value={c.city}>{c.city} ({c.count.toLocaleString()})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Work Type</label>
              <select
                value={filterWorkType}
                onChange={(e) => { setFilterWorkType(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
              >
                <option value="">All Types</option>
                {workTypes.map(w => (
                  <option key={w.work_type} value={w.work_type}>
                    {WORK_TYPE_LABELS[w.work_type] || w.work_type} ({w.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-earth-400 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-earth-400 mb-1">Min Score</label>
                <input
                  type="number"
                  value={filterMinScore}
                  onChange={(e) => { setFilterMinScore(e.target.value); setPage(1); }}
                  placeholder="0"
                  className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-earth-400 mb-1">Max Score</label>
                <input
                  type="number"
                  value={filterMaxScore}
                  onChange={(e) => { setFilterMaxScore(e.target.value); setPage(1); }}
                  placeholder="100"
                  className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-earth-400 mb-1">Min Value</label>
                <input
                  type="number"
                  value={filterMinValue}
                  onChange={(e) => { setFilterMinValue(e.target.value); setPage(1); }}
                  placeholder="$0"
                  className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-earth-400 mb-1">Max Value</label>
                <input
                  type="number"
                  value={filterMaxValue}
                  onChange={(e) => { setFilterMaxValue(e.target.value); setPage(1); }}
                  placeholder="$∞"
                  className="w-full py-2 px-3 bg-earth-800 border border-earth-700 rounded-lg text-earth-100 text-sm"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" /> Clear Filters
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Results table */}
      <Card>
        {loading ? (
          <div className="p-12 text-center text-earth-400">Loading prospects...</div>
        ) : prospects.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No Prospects Found"
            description={total === 0 ? "Import Austin metro prospects to get started." : "Try adjusting your search or filters."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-earth-800">
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === prospects.length && prospects.length > 0}
                        onChange={selectAll}
                        className="rounded border-earth-600"
                      />
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase cursor-pointer" onClick={() => handleSort('full_name')}>
                      <div className="flex items-center gap-1">Name <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden lg:table-cell">Address</th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden md:table-cell">City</th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden lg:table-cell">Phone</th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden xl:table-cell">Work Type</th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase cursor-pointer" onClick={() => handleSort('lead_score')}>
                      <div className="flex items-center gap-1">Score <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase cursor-pointer hidden md:table-cell" onClick={() => handleSort('property_value')}>
                      <div className="flex items-center gap-1">Value <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-earth-400 uppercase hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map(p => (
                    <tr
                      key={p.id}
                      className="border-b border-earth-800/50 hover:bg-earth-800/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedProspect(p)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-earth-600"
                        />
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium text-earth-100">{p.full_name}</div>
                        {p.email && <div className="text-xs text-earth-500">{p.email}</div>}
                      </td>
                      <td className="p-3 text-sm text-earth-300 hidden lg:table-cell max-w-[200px] truncate">{p.address}</td>
                      <td className="p-3 text-sm text-earth-300 hidden md:table-cell">{p.city}</td>
                      <td className="p-3 text-sm text-earth-300 hidden lg:table-cell">{p.phone}</td>
                      <td className="p-3 hidden xl:table-cell">
                        {p.work_type && <Badge color="earth">{WORK_TYPE_LABELS[p.work_type] || p.work_type}</Badge>}
                      </td>
                      <td className="p-3">
                        <span className={clsx(
                          'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                          (p.lead_score ?? 0) >= 70 ? 'bg-green-500/20 text-green-400' :
                          (p.lead_score ?? 0) >= 40 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-earth-700/50 text-earth-400'
                        )}>
                          {p.lead_score ?? '—'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-earth-300 hidden md:table-cell">{formatCurrency(p.property_value)}</td>
                      <td className="p-3 hidden sm:table-cell">
                        <Badge color={STATUS_COLORS[p.status] || 'earth'}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-earth-800">
              <span className="text-sm text-earth-400">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 text-earth-400 hover:text-earth-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-earth-300">
                  Page {page} of {totalPages.toLocaleString()}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 text-earth-400 hover:text-earth-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Detail slide panel */}
      <SlidePanel
        isOpen={!!selectedProspect}
        onClose={() => setSelectedProspect(null)}
        title={selectedProspect?.full_name || 'Prospect Details'}
        width="md"
      >
        {selectedProspect && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge color={STATUS_COLORS[selectedProspect.status] || 'earth'} >
                {selectedProspect.status}
              </Badge>
              <span className={clsx(
                'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold',
                (selectedProspect.lead_score ?? 0) >= 70 ? 'bg-green-500/20 text-green-400' :
                (selectedProspect.lead_score ?? 0) >= 40 ? 'bg-amber-500/20 text-amber-400' :
                'bg-earth-700/50 text-earth-400'
              )}>
                {selectedProspect.lead_score ?? '—'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-earth-400 mt-0.5" />
                <div>
                  <p className="text-sm text-earth-100">{selectedProspect.phone}</p>
                  {selectedProspect.phone_2 && <p className="text-xs text-earth-400">{selectedProspect.phone_2}</p>}
                </div>
              </div>
              {selectedProspect.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-earth-400" />
                  <p className="text-sm text-earth-100">{selectedProspect.email}</p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-earth-400 mt-0.5" />
                <p className="text-sm text-earth-100">
                  {selectedProspect.address}<br />
                  {selectedProspect.city}, {selectedProspect.state} {selectedProspect.zip_code}
                </p>
              </div>
            </div>

            <div className="border-t border-earth-800 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-earth-400">Property Value</p>
                <p className="text-sm font-medium text-earth-100">{formatCurrency(selectedProspect.property_value)}</p>
              </div>
              <div>
                <p className="text-xs text-earth-400">Square Footage</p>
                <p className="text-sm font-medium text-earth-100">{formatNumber(selectedProspect.sqft)}</p>
              </div>
              <div>
                <p className="text-xs text-earth-400">Year Built</p>
                <p className="text-sm font-medium text-earth-100">{selectedProspect.year_built ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-earth-400">Work Type</p>
                <p className="text-sm font-medium text-earth-100">
                  {selectedProspect.work_type ? (WORK_TYPE_LABELS[selectedProspect.work_type] || selectedProspect.work_type) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-earth-400">Source</p>
                <p className="text-sm font-medium text-earth-100">{selectedProspect.source ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-earth-400">Email Status</p>
                <p className="text-sm font-medium text-earth-100">{selectedProspect.email_status}</p>
              </div>
            </div>

            {selectedProspect.notes && (
              <div className="border-t border-earth-800 pt-4">
                <p className="text-xs text-earth-400 mb-1">Notes</p>
                <p className="text-sm text-earth-300">{selectedProspect.notes}</p>
              </div>
            )}

            <div className="border-t border-earth-800 pt-4">
              <Button
                onClick={() => {
                  convertToLead(selectedProspect.id);
                  setSelectedProspect(null);
                }}
                loading={converting}
                className="w-full"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Convert to Lead
              </Button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
