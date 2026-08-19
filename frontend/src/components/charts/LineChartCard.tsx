import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
  strokeDasharray?: string;
}

interface LineChartCardProps {
  title: string;
  data: any[];
  xKey: string;
  xLabel?: string;
  yLabel?: string;
  lines: LineConfig[];
  height?: number;
  compact?: boolean;
}

export default function LineChartCard({
  title,
  data,
  xKey,
  xLabel,
  yLabel,
  lines,
  height = 300,
  compact = false,
}: LineChartCardProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <h3
        className={`font-semibold text-slate-200 mb-3 ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey={xKey}
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={
              xLabel
                ? { value: xLabel, position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }
                : undefined
            }
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 11 }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
          />
          {!compact && <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={compact ? 1.5 : 2}
              dot={false}
              strokeDasharray={line.strokeDasharray}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
