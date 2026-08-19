import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import LineChartCard from '../components/charts/LineChartCard';
import type { Battery, Measurement, DegradationPoint, ModelMetrics } from '../types/battery';
import {
  fetchBatteries,
  fetchBatteryDetail,
  fetchMeasurements,
  fetchDegradation,
  fetchModelMetrics,
} from '../services/api';

export default function BatteryAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id') || '';

  const [batteryList, setBatteryList] = useState<Battery[]>([]);
  const [detail, setDetail] = useState<Battery | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [degradation, setDegradation] = useState<DegradationPoint[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load battery list on mount
  useEffect(() => {
    fetchBatteries().then((res) => {
      setBatteryList(res.batteries);
      if (!selectedId && res.batteries.length > 0) {
        setSearchParams({ id: res.batteries[0].batteryId }, { replace: true });
      }
    });
  }, []);

  // Load detail data when selectedId changes
  const loadBatteryData = useCallback(async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setError(null);
      const [detailRes, measRes, degRes, metricsRes] = await Promise.all([
        fetchBatteryDetail(selectedId),
        fetchMeasurements(selectedId),
        fetchDegradation(selectedId),
        fetchModelMetrics(),
      ]);
      setDetail(detailRes as Battery);
      setMeasurements(measRes.measurements);
      setDegradation(degRes.degradation);
      setMetrics(metricsRes);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load battery data');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadBatteryData();
  }, [loadBatteryData]);

  return (
    <div>
      <Header
        title="배터리 분석"
        subtitle="AI 기반 배터리 열화 분석 및 수명 예측"
        onRefresh={loadBatteryData}
        lastUpdated={lastUpdated}
      />

      {/* Battery Selector */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">배터리 선택:</label>
          <select
            value={selectedId}
            onChange={(e) => setSearchParams({ id: e.target.value })}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            {batteryList.map((b) => (
              <option key={b.batteryId} value={b.batteryId}>
                {b.batteryId}
              </option>
            ))}
          </select>
        </div>

        {detail && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              SOH:{' '}
              <span className="text-slate-200 font-semibold">
                {detail.currentSoh.toFixed(2)}%
              </span>
            </span>
            <span className="text-slate-400">
              초기:{' '}
              <span className="text-slate-200">{detail.initialCapacity.toFixed(3)} Ah</span>
            </span>
            <span className="text-slate-400">
              현재:{' '}
              <span className="text-slate-200">{detail.currentCapacity.toFixed(3)} Ah</span>
            </span>
            <StatusBadge status={detail.status} />
          </div>
        )}
      </div>

      {loading && <LoadingState message="배터리 분석 데이터를 불러오는 중..." />}
      {error && <ErrorState message={error} onRetry={loadBatteryData} />}

      {!loading && !error && degradation.length === 0 && (
        <EmptyState message="이 배터리에 대한 열화 데이터가 없습니다." />
      )}

      {!loading && !error && degradation.length > 0 && (
        <>
          {/* ── AI-Based Degradation Prediction ── */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              AI 기반 수명 열화 예측
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <LineChartCard
                title="실제 vs 예측 용량 (Capacity)"
                data={degradation}
                xKey="cycle"
                xLabel="Cycle"
                yLabel="Capacity (Ah)"
                lines={[
                  { dataKey: 'actualCapacity', name: '실제 용량', color: '#3b82f6' },
                  {
                    dataKey: 'predictedCapacity',
                    name: 'AI 예측 용량',
                    color: '#f59e0b',
                    strokeDasharray: '5 3',
                  },
                ]}
                height={280}
              />
              <LineChartCard
                title="실제 vs 예측 SOH"
                data={degradation}
                xKey="cycle"
                xLabel="Cycle"
                yLabel="SOH (%)"
                lines={[
                  { dataKey: 'actualSoh', name: '실제 SOH', color: '#06b6d4' },
                  {
                    dataKey: 'predictedSoh',
                    name: 'AI 예측 SOH',
                    color: '#f59e0b',
                    strokeDasharray: '5 3',
                  },
                ]}
                height={280}
              />
            </div>
          </section>

          {/* ── Electrochemical Degradation Trends ── */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              전기화학적 열화 추이
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <LineChartCard
                title="용량 (Capacity)"
                data={measurements}
                xKey="cycle"
                xLabel="Cycle"
                yLabel="Ah"
                lines={[{ dataKey: 'capacity', name: 'Capacity', color: '#3b82f6' }]}
                height={180}
                compact
              />
              <LineChartCard
                title="Re (전해질 저항)"
                data={measurements}
                xKey="cycle"
                xLabel="Cycle"
                yLabel="Ω"
                lines={[{ dataKey: 're', name: 'Re', color: '#8b5cf6' }]}
                height={180}
                compact
              />
              <LineChartCard
                title="Rct (전하 전달 저항)"
                data={measurements}
                xKey="cycle"
                xLabel="Cycle"
                yLabel="Ω"
                lines={[{ dataKey: 'rct', name: 'Rct', color: '#ec4899' }]}
                height={180}
                compact
              />
              <LineChartCard
                title="주변 온도"
                data={measurements}
                xKey="cycle"
                xLabel="Cycle"
                yLabel="°C"
                lines={[{ dataKey: 'ambientTemp', name: 'Temp', color: '#22c55e' }]}
                height={180}
                compact
              />
            </div>
          </section>

          {/* ── AI Model Evaluation Metrics (Preview) ── */}
          {metrics && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  AI 모델 평가 지표
                </h3>
                <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
                  미리보기 — 가상 데이터
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="모델" value={metrics.modelName} variant="default" />
                <StatCard label="RMSE" value={metrics.rmse.toFixed(4)} variant="default" />
                <StatCard label="MAE" value={metrics.mae.toFixed(4)} variant="default" />
                <StatCard label="R²" value={metrics.r2.toFixed(4)} variant="success" />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
