import type { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color?: 'green' | 'earth' | 'amber' | 'red' | 'sky';
  prefix?: string;
}

const colorMap = {
  green: 'from-green-600/20 to-green-800/10 border-green-700/40',
  earth: 'from-earth-700/20 to-earth-800/10 border-earth-600/40',
  amber: 'from-amber-600/20 to-amber-800/10 border-amber-700/40',
  red: 'from-red-600/20 to-red-800/10 border-red-700/40',
  sky: 'from-sky-600/20 to-sky-800/10 border-sky-700/40',
};

const iconBgMap = {
  green: 'bg-green-600/20 text-green-400',
  earth: 'bg-earth-600/20 text-earth-300',
  amber: 'bg-amber-600/20 text-amber-400',
  red: 'bg-red-600/20 text-red-400',
  sky: 'bg-sky-600/20 text-sky-400',
};

export default function StatCard({ title, value, change, icon, color = 'green', prefix }: StatCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
        colorMap[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-earth-300">{title}</p>
          <p className="text-2xl font-bold font-display text-earth-50">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={clsx(
              'flex items-center gap-1 text-xs font-medium',
              change >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change)}% vs last month</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', iconBgMap[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
