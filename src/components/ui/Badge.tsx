import clsx from 'clsx';

type BadgeColor = 'green' | 'amber' | 'red' | 'sky' | 'earth' | 'purple';

interface BadgeProps {
  children: string;
  color?: BadgeColor;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  sky: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  earth: 'bg-earth-500/15 text-earth-300 border-earth-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export default function Badge({ children, color = 'earth', size = 'sm', dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        colorClasses[color],
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          color === 'green' && 'bg-green-400',
          color === 'amber' && 'bg-amber-400',
          color === 'red' && 'bg-red-400',
          color === 'sky' && 'bg-sky-400',
          color === 'earth' && 'bg-earth-400',
          color === 'purple' && 'bg-purple-400',
        )} />
      )}
      {children}
    </span>
  );
}
