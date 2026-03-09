import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, LogOut, User, Search, X,
  DollarSign, Target, CheckCircle, FileText, Users, AlertTriangle,
  Briefcase, Receipt, UsersRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface Notification {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  message: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: '1',
    icon: DollarSign,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/15',
    message: 'Invoice INV-2026-001 paid — $1,800',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    icon: Target,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    message: 'New lead: Jennifer Wallace — $15,000 estimate',
    time: '3 hours ago',
    read: false,
  },
  {
    id: '3',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/15',
    message: 'Job completed: Park Tree Trimming',
    time: 'Yesterday',
    read: false,
  },
  {
    id: '4',
    icon: FileText,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    message: 'Quote accepted: Front Yard Redesign — $5,160',
    time: 'Yesterday',
    read: false,
  },
  {
    id: '5',
    icon: Users,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    message: 'Crew Alpha started: Spring Mulch Installation',
    time: '2 days ago',
    read: true,
  },
  {
    id: '6',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/15',
    message: 'Low stock alert: Flagstone Pavers (3 pallets)',
    time: '2 days ago',
    read: true,
  },
];

// --- Global Search types & config ---

interface SearchResult {
  id: string;
  category: 'customers' | 'jobs' | 'quotes' | 'invoices' | 'leads' | 'crews';
  name: string;
  subtitle: string;
  route: string;
}

const categoryConfig: Record<SearchResult['category'], { label: string; icon: React.ElementType }> = {
  customers: { label: 'Customers', icon: Users },
  jobs: { label: 'Jobs', icon: Briefcase },
  quotes: { label: 'Quotes', icon: FileText },
  invoices: { label: 'Invoices', icon: Receipt },
  leads: { label: 'Leads', icon: Target },
  crews: { label: 'Crews', icon: UsersRound },
};

const MAX_PER_CATEGORY = 3;

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, logout } = useAuth();
  const { customers, jobs, quotes, invoices, leads, crews } = useData();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cmd+K / Ctrl+K to toggle search, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => {
          if (prev) {
            setSearchQuery('');
            setDebouncedQuery('');
          }
          return !prev;
        });
      }
      if (e.key === 'Escape' && showSearch) {
        closeSearch();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showSearch]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Debounce the search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // --- Search logic ---

  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResult[] = [];

    const matches = (value: string | number | undefined | null): boolean => {
      if (value == null) return false;
      return String(value).toLowerCase().includes(q);
    };

    // Search customers
    let count = 0;
    for (const c of customers) {
      if (count >= MAX_PER_CATEGORY) break;
      if (matches(c.name) || matches(c.email) || matches(c.phone) || matches(c.company_name) || matches(c.address) || matches(c.city)) {
        results.push({
          id: c.id,
          category: 'customers',
          name: c.name,
          subtitle: c.email || c.phone || c.address || '',
          route: `/customers/${c.id}`,
        });
        count++;
      }
    }

    // Search jobs
    count = 0;
    for (const j of jobs) {
      if (count >= MAX_PER_CATEGORY) break;
      if (matches(j.title) || matches(j.description) || matches(j.status) || matches(j.type) || matches(j.address)) {
        results.push({
          id: j.id,
          category: 'jobs',
          name: j.title,
          subtitle: `${j.status.charAt(0).toUpperCase() + j.status.slice(1).replace(/_/g, ' ')}${j.scheduled_date ? ' \u2014 ' + j.scheduled_date : ''}`,
          route: `/jobs/${j.id}`,
        });
        count++;
      }
    }

    // Search quotes
    count = 0;
    for (const qt of quotes) {
      if (count >= MAX_PER_CATEGORY) break;
      if (matches(qt.title) || matches(qt.quote_number) || matches(qt.status) || matches(qt.notes)) {
        results.push({
          id: qt.id,
          category: 'quotes',
          name: qt.title,
          subtitle: `${qt.status.charAt(0).toUpperCase() + qt.status.slice(1)} \u2014 $${qt.total.toLocaleString()}`,
          route: '/quotes',
        });
        count++;
      }
    }

    // Search invoices
    count = 0;
    for (const inv of invoices) {
      if (count >= MAX_PER_CATEGORY) break;
      if (matches(inv.invoice_number) || matches(inv.status) || matches(inv.notes) || matches(inv.total)) {
        results.push({
          id: inv.id,
          category: 'invoices',
          name: `Invoice #${inv.invoice_number}`,
          subtitle: `${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)} \u2014 $${inv.total.toLocaleString()}`,
          route: '/invoices',
        });
        count++;
      }
    }

    // Search leads
    count = 0;
    for (const l of leads) {
      if (count >= MAX_PER_CATEGORY) break;
      if (matches(l.name) || matches(l.email) || matches(l.phone) || matches(l.source) || matches(l.service_interest)) {
        results.push({
          id: l.id,
          category: 'leads',
          name: l.name || 'Unknown Lead',
          subtitle: `${l.status.charAt(0).toUpperCase() + l.status.slice(1)}${l.source ? ' \u2014 ' + l.source : ''}`,
          route: '/leads',
        });
        count++;
      }
    }

    // Search crews
    count = 0;
    for (const cr of crews) {
      if (count >= MAX_PER_CATEGORY) break;
      if (matches(cr.name) || matches(cr.vehicle)) {
        const memberCount = cr.members?.length ?? 0;
        results.push({
          id: cr.id,
          category: 'crews',
          name: cr.name,
          subtitle: `${memberCount} member${memberCount !== 1 ? 's' : ''}${cr.vehicle ? ' \u2014 ' + cr.vehicle : ''}`,
          route: '/crews',
        });
        count++;
      }
    }

    return results;
  }, [debouncedQuery, customers, jobs, quotes, invoices, leads, crews]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Partial<Record<SearchResult['category'], SearchResult[]>> = {};
    for (const r of searchResults) {
      if (!groups[r.category]) {
        groups[r.category] = [];
      }
      groups[r.category]!.push(r);
    }
    return groups;
  }, [searchResults]);

  const handleResultClick = useCallback((route: string) => {
    navigate(route);
    closeSearch();
  }, [navigate, closeSearch]);

  const hasResults = searchResults.length > 0;
  const showDropdown = showSearch && debouncedQuery.trim().length > 0;

  return (
    <header className="sticky top-0 z-30 bg-earth-950/80 backdrop-blur-xl border-b border-earth-800/60">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        <div className="flex items-center gap-4 pl-12 lg:pl-0">
          <h1 className="text-xl font-bold font-display text-earth-50">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <button
            onClick={() => {
              setShowSearch(s => {
                if (s) {
                  setSearchQuery('');
                  setDebouncedQuery('');
                }
                return !s;
              });
            }}
            className="p-2.5 text-earth-400 hover:text-earth-100 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
            title="Search (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((s) => !s)}
              className="relative p-2.5 text-earth-400 hover:text-earth-100 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-earth-950" />
              )}
            </button>

            {/* Notification dropdown */}
            <div
              className={clsx(
                'absolute right-0 top-full mt-2 w-[22rem] bg-earth-900 border border-earth-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 origin-top-right',
                showNotifications
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-earth-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-earth-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-600 text-white rounded-full leading-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => {
                  const NIcon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className={clsx(
                        'flex items-start gap-3 px-4 py-3 hover:bg-earth-800/60 transition-colors cursor-pointer border-b border-earth-800/40 last:border-b-0',
                        !notif.read && 'bg-earth-800/30'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
                          notif.iconBg
                        )}
                      >
                        <NIcon className={clsx('w-4 h-4', notif.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={clsx(
                            'text-sm leading-snug',
                            notif.read ? 'text-earth-300' : 'text-earth-100'
                          )}
                        >
                          {notif.message}
                        </p>
                        <p className="text-xs text-earth-500 mt-0.5">{notif.time}</p>
                      </div>
                      {!notif.read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-earth-800 text-center">
                <button className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors cursor-pointer">
                  View all notifications
                </button>
              </div>
            </div>
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((s) => !s)}
              className="flex items-center gap-2 p-1.5 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0) || 'G'}
              </div>
              <span className="hidden sm:block text-sm text-earth-200 font-medium">
                {user?.name || 'Maas Verde Admin'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-earth-900 border border-earth-700 rounded-xl shadow-xl py-1 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-earth-800">
                  <p className="text-sm font-medium text-earth-100">{user?.name || 'Maas Verde Admin'}</p>
                  <p className="text-xs text-earth-400">{user?.email || 'admin@maasverde.com'}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-earth-300 hover:bg-earth-800 hover:text-earth-100 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-earth-800 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar (expandable) with results dropdown */}
      {showSearch && (
        <div className="px-4 lg:px-6 pb-3 relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers, jobs, invoices... (Ctrl+K)"
              className="w-full pl-10 pr-10 py-2.5 bg-earth-900 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showDropdown && (
            <div className="absolute left-4 right-4 lg:left-6 lg:right-6 top-full mt-1 bg-earth-900 border border-earth-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
              {hasResults ? (
                <div className="py-2">
                  {(Object.entries(groupedResults) as [SearchResult['category'], SearchResult[]][]).map(([category, items]) => {
                    const config = categoryConfig[category];
                    const CatIcon = config.icon;
                    return (
                      <div key={category}>
                        <div className="px-3 py-1.5 text-xs text-earth-400 uppercase tracking-wider font-semibold">
                          {config.label}
                        </div>
                        {items.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result.route)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-earth-800 transition-colors cursor-pointer text-left"
                          >
                            <CatIcon className="w-4 h-4 text-earth-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-earth-100 truncate">{result.name}</p>
                              <p className="text-xs text-earth-400 truncate">{result.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-earth-400">
                  No results found for &ldquo;{debouncedQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
