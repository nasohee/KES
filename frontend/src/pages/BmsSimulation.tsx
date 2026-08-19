import { useEffect, useState, useCallback } from 'react';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import LineChartCard from '../components/charts/LineChartCard';
import StepChartCard from '../components/charts/StepChartCard';
import type { BmsDataPoint, BmsStatus } from '../types/bms';
import { fetchBmsData, fetchBmsStatus } from '../services/api';

export default function BmsSimulation() {
  const [bmsData, setBmsData] = useState<BmsDataPoint[]>([]);
  const [bmsStatus, setBmsStatus] = useState<BmsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dataRes, statusRes] = await Promise.all([
        fetchBmsData(),
        fetchBmsStatus(),
      ]);
      setBmsData(dataRes.bmsData);
      setBmsStatus(statusRes);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BMS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState message="BMS 시뮬레이션 데이터를 불러오는 중..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const warningEvents = bmsData.filter(
    (d) => d.status === 'warning' || d.bmsSignal === 0
  );

  return (
    <div>
      <Header
        title="BMS 시뮬레이션 모니터링"
        subtitle="PSIM 기반 전압, 전류 및 보호 신호 분석"
        onRefresh={loadData}
        lastUpdated={lastUpdated}
      />

      {/* ── Summary Cards ── */}
      {bmsStatus && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="최신 전압"
            value={bmsStatus.voltage.toFixed(2)}
            unit="V"
            variant={bmsStatus.voltage < 3.0 ? 'warning' : 'default'}
          />
          <StatCard
            label="최신 전류"
            value={bmsStatus.current.toFixed(2)}
            unit="A"
            variant="default"
          />
          <StatCard
            label="BMS 신호"
            value={bmsStatus.bmsSignal === 1 ? '정상 (1)' : '차단 (0)'}
            variant={bmsStatus.bmsSignal === 1 ? 'success' : 'danger'}
          />
          <StatCard
            label="안전 상태"
            value={bmsStatus.status === 'normal' ? '안전' : '경고'}
            variant={bmsStatus.status === 'normal' ? 'success' : 'warning'}
          />
        </div>
      )}

      {/* Alert Banner */}
      {bmsStatus?.alert && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-400">BMS 경고</p>
            <p className="text-xs text-amber-300/80">{bmsStatus.message}</p>
          </div>
        </div>
      )}

      {bmsData.length === 0 ? (
        <EmptyState message="BMS 시뮬레이션 데이터가 없습니다." />
      ) : (
        <>
          {/* ── Main Charts ── */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            <LineChartCard
              title="시간에 따른 전압 변화"
              data={bmsData}
              xKey="time"
              xLabel="시간 (s)"
              yLabel="전압 (V)"
              lines={[{ dataKey: 'voltage', name: '전압', color: '#3b82f6' }]}
              height={250}
            />
            <LineChartCard
              title="시간에 따른 전류 변화"
              data={bmsData}
              xKey="time"
              xLabel="시간 (s)"
              yLabel="전류 (A)"
              lines={[{ dataKey: 'current', name: '전류', color: '#06b6d4' }]}
              height={250}
            />
            <StepChartCard
              title="시간에 따른 BMS 신호 변화"
              data={bmsData}
              xKey="time"
              yKey="bmsSignal"
              xLabel="시간 (s)"
              yLabel="BMS 신호"
              color="#f59e0b"
              height={200}
            />
          </div>

          {/* ── Warning / Cutoff Log ── */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              경고 및 차단(Cutoff) 로그
            </h3>
            {warningEvents.length === 0 ? (
              <EmptyState message="감지된 경고 이벤트가 없습니다." />
            ) : (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">
                        시간 (s)
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">
                        전압 (V)
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">
                        전류 (A)
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">
                        BMS 신호
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">
                        상태
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">
                        경고 메시지
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {warningEvents.map((event, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-700/30 ${
                          event.bmsSignal === 0
                            ? 'bg-red-500/5'
                            : 'bg-amber-500/5'
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-slate-300">
                          {event.time.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-300">
                          {event.voltage.toFixed(4)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-300">
                          {event.current.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`font-mono font-bold ${
                              event.bmsSignal === 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {event.bmsSignal}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <StatusBadge status={event.status} />
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-400">
                          {event.alertMsg || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
