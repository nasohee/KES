import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface StepChartCardProps {
  title: string;
  data: any[];
  xKey: string;
  yKey: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
}

export default function StepChartCard({
  title,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  color = '#f59e0b',
  height = 200,
}: StepChartCardProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <h3 className="text-base font-semibold text-slate-200 mb-3">{title}</h3>
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
            domain={[-0.1, 1.1]}
            ticks={[0, 1]}
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
          <ReferenceLine y={0.5} stroke="#475569" strokeDasharray="4 4" />
          <Line
            type="stepAfter"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
