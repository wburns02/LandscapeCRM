import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Gauge, Users, Briefcase, Calendar, Package, FileText,
  Receipt, FileSignature, UsersRound, Wrench, Target, UserSearch, Mail,
  RefreshCw, Send, Camera, BarChart3, Settings, Menu, X, ChevronLeft, ChevronDown,
  Timer, ClipboardList, Globe, BadgeDollarSign, Calculator, Repeat, GitPullRequest, Route, Lightbulb,
  Sparkles, CloudSun,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/', icon: Gauge, label: 'Command Center' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/jobs', icon: Briefcase, label: 'Jobs' },
      { to: '/schedule', icon: Calendar, label: 'Schedule' },
      { to: '/weather', icon: CloudSun, label: 'Weather' },
      { to: '/route-planner', icon: Route, label: 'Route Planner' },
      { to: '/recurring-services', icon: RefreshCw, label: 'Recurring' },
      { to: '/crews', icon: UsersRound, label: 'Crews' },
      { to: '/time-tracking', icon: Timer, label: 'Time Tracking' },
    ],
  },
  {
    title: 'Financial',
    items: [
      { to: '/estimator', icon: Sparkles, label: 'Estimator' },
      { to: '/quotes', icon: FileText, label: 'Quotes' },
      { to: '/invoices', icon: Receipt, label: 'Invoices' },
      { to: '/contracts', icon: FileSignature, label: 'Contracts' },
      { to: '/proposals', icon: ClipboardList, label: 'Proposals' },
      { to: '/expenses', icon: BadgeDollarSign, label: 'Expenses' },
      { to: '/job-costing', icon: Calculator, label: 'Job Costing' },
      { to: '/recurring-billing', icon: Repeat, label: 'Billing' },
      { to: '/pipeline', icon: GitPullRequest, label: 'Pipeline' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/leads', icon: Target, label: 'Leads' },
      { to: '/prospects', icon: UserSearch, label: 'Prospects' },
      { to: '/campaigns', icon: Mail, label: 'Campaigns' },
      { to: '/direct-mail', icon: Send, label: 'Direct Mail' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { to: '/inventory', icon: Package, label: 'Inventory' },
      { to: '/equipment', icon: Wrench, label: 'Equipment' },
      { to: '/photos', icon: Camera, label: 'Photos' },
    ],
  },
  {
    title: '',
    items: [
      { to: '/portal', icon: Globe, label: 'Client Portal' },
      { to: '/insights', icon: Lightbulb, label: 'Intelligence' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isSectionActive = (section: NavSection) =>
    section.items.some(item =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    );

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-earth-800/60">
        <img src="/logo-icon.png" alt="Maas Verde" className="w-10 h-10 shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold font-display text-earth-50 whitespace-nowrap">Maas Verde</h1>
            <p className="text-[10px] text-green-400 uppercase tracking-widest">Landscape Restoration</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navSections.map((section, sIdx) => {
          const isCollapsed = collapsedSections[section.title] && !isSectionActive(section);
          const hasTitle = section.title !== '';

          return (
            <div key={section.title || `section-${sIdx}`} className={clsx(hasTitle && 'mt-3')}>
              {hasTitle && !collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-3 py-1.5 mb-0.5 cursor-pointer group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-earth-500 group-hover:text-earth-400 transition-colors">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={clsx(
                      'w-3 h-3 text-earth-600 group-hover:text-earth-400 transition-all',
                      isCollapsed && '-rotate-90'
                    )}
                  />
                </button>
              )}
              {hasTitle && collapsed && (
                <div className="mx-3 my-2 border-t border-earth-800/60" />
              )}
              {(!hasTitle || !isCollapsed) && (
                <div className="space-y-0.5">
                  {section.items.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                          'min-h-[40px]',
                          isActive
                            ? 'bg-green-600/15 text-green-400 border border-green-500/20'
                            : 'text-earth-300 hover:text-earth-100 hover:bg-earth-800/60 border border-transparent',
                          collapsed && 'justify-center px-0'
                        )
                      }
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="hidden lg:flex px-2 py-3 border-t border-earth-800/60">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 text-earth-400 hover:text-earth-200 hover:bg-earth-800/60 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronLeft className={clsx('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-earth-900 border border-earth-700 rounded-lg text-earth-300 cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'lg:hidden fixed top-0 left-0 h-full w-64 bg-earth-950 border-r border-earth-800 z-50 flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-earth-400 hover:text-earth-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex flex-col h-screen bg-earth-950 border-r border-earth-800 sticky top-0 transition-all duration-200',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
