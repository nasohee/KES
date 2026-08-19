interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
}

export default function Header({
  title,
  subtitle,
  onRefresh,
  lastUpdated,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-xs text-slate-500">
            Last updated:{' '}
            {lastUpdated.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            title="Refresh data"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
