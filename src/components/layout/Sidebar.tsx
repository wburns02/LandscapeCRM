import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, Calendar, Package, FileText,
  Receipt, FileSignature, UsersRound, Wrench, Target, Camera,
  BarChart3, Settings, TreePine, Menu, X, ChevronLeft,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/quotes', icon: FileText, label: 'Quotes' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/contracts', icon: FileSignature, label: 'Contracts' },
  { to: '/crews', icon: UsersRound, label: 'Crews' },
  { to: '/equipment', icon: Wrench, label: 'Equipment' },
  { to: '/leads', icon: Target, label: 'Leads' },
  { to: '/photos', icon: Camera, label: 'Photos' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-earth-800/60">
        <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-xl shrink-0">
          <TreePine className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold font-display text-earth-50 whitespace-nowrap">Maas Verde</h1>
            <p className="text-[10px] text-green-400 uppercase tracking-widest">Landscape Restoration</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                'min-h-[44px]',
                isActive
                  ? 'bg-green-600/15 text-green-400 border border-green-500/20'
                  : 'text-earth-300 hover:text-earth-100 hover:bg-earth-800/60 border border-transparent',
                collapsed && 'justify-center px-0'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
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
