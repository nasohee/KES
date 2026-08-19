import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantColors: Record<string, string> = {
  default: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

export default function StatCard({
  label,
  value,
  unit,
  icon,
  variant = 'default',
}: StatCardProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className={`${variantColors[variant]} opacity-70`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${variantColors[variant]}`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-slate-400 font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}
