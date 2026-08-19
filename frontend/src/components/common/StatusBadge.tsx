interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical' | string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  normal: {
    label: 'Normal',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  critical: {
    label: 'Critical',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.normal;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${config.className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
}
