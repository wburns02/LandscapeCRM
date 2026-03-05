import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-earth-950/80 backdrop-blur-xl border-b border-earth-800/60">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        <div className="flex items-center gap-4 pl-12 lg:pl-0">
          <h1 className="text-xl font-bold font-display text-earth-50">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(s => !s)}
            className="p-2.5 text-earth-400 hover:text-earth-100 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="relative p-2.5 text-earth-400 hover:text-earth-100 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(s => !s)}
              className="flex items-center gap-2 p-1.5 hover:bg-earth-800 rounded-lg transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0) || 'G'}
              </div>
              <span className="hidden sm:block text-sm text-earth-200 font-medium">
                {user?.name || 'GreenScape Admin'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-earth-900 border border-earth-700 rounded-xl shadow-xl py-1 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-earth-800">
                  <p className="text-sm font-medium text-earth-100">{user?.name || 'GreenScape Admin'}</p>
                  <p className="text-xs text-earth-400">{user?.email || 'admin@greenscape.com'}</p>
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

      {/* Search bar (expandable) */}
      {showSearch && (
        <div className="px-4 lg:px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers, jobs, invoices..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-earth-900 border border-earth-700 rounded-lg text-earth-100 placeholder-earth-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
            />
          </div>
        </div>
      )}
    </header>
  );
}
