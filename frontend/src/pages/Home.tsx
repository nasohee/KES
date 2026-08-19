import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import type { Battery } from '../types/battery';
import type { BmsStatus } from '../types/bms';
import { fetchBatteries, fetchBmsStatus } from '../services/api';

export default function Home() {
  const navigate = useNavigate();
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [bmsStatus, setBmsStatus] = useState<BmsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [batteryRes, bmsRes] = await Promise.all([
        fetchBatteries(),
        fetchBmsStatus(),
      ]);
      setBatteries(batteryRes.batteries);
      setBmsStatus(bmsRes);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState message="대시보드 데이터를 불러오는 중..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const avgSoh =
    batteries.length > 0
      ? batteries.reduce((sum, b) => sum + b.currentSoh, 0) / batteries.length
      : 0;
  const normalCount = batteries.filter((b) => b.status === 'normal').length;
  const warningCount = batteries.filter((b) => b.status === 'warning').length;
  const criticalCount = batteries.filter((b) => b.status === 'critical').length;

  return (
    <div>
      <Header
        title="종합 대시보드"
        subtitle="전체 배터리 상태 요약 및 BMS 시뮬레이션 현황"
        onRefresh={loadData}
        lastUpdated={lastUpdated}
      />

      {/* ── Section 1: Battery Fleet Summary ── */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          배터리 상태 요약
        </h3>
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="전체 배터리 수" value={batteries.length} variant="default" />
          <StatCard label="평균 SOH" value={avgSoh.toFixed(1)} unit="%" variant="default" />
          <StatCard label="정상" value={normalCount} variant="success" />
          <StatCard label="경고" value={warningCount} variant="warning" />
          <StatCard label="위험" value={criticalCount} variant="danger" />
        </div>

        {/* Battery Table */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  배터리 ID
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  초기 용량 (Ah)
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  현재 용량 (Ah)
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  현재 SOH (%)
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  건강 상태
                </th>
              </tr>
            </thead>
            <tbody>
              {batteries.map((b) => (
                <tr
                  key={b.batteryId}
                  onClick={() => navigate(`/battery?id=${b.batteryId}`)}
                  className="border-b border-slate-700/30 hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">
                    {b.batteryId}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {b.initialCapacity.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {b.currentCapacity.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-200">
                    {b.currentSoh.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 2: BMS Simulation Status ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            BMS 시뮬레이션 상태
          </h3>
          <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
            PSIM 기반 BMS 시뮬레이션 데이터
          </span>
        </div>

        {/* Alert Banner */}
        {bmsStatus?.alert && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-400">BMS 경고</p>
              <p className="text-xs text-amber-300/80">{bmsStatus.message}</p>
            </div>
          </div>
        )}

        {bmsStatus && (
          <div className="grid grid-cols-4 gap-4">
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
              value={bmsStatus.bmsSignal === 1 ? '정상 (ON)' : '차단 (OFF)'}
              variant={bmsStatus.bmsSignal === 1 ? 'success' : 'danger'}
            />
            <StatCard
              label="안전 상태"
              value={bmsStatus.status === 'normal' ? '안전' : '경고'}
              variant={bmsStatus.status === 'normal' ? 'success' : 'warning'}
            />
          </div>
        )}
      </section>
    </div>
  );
}
