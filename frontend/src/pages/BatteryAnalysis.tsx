import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import LineChartCard from '../components/charts/LineChartCard';
import type {
    Battery,
    Measurement,
    DegradationPoint,
    ModelMetrics,
} from '../types/battery';
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

    // 배터리 목록 최초 조회
    useEffect(() => {
        fetchBatteries()
            .then((res) => {
                setBatteryList(res.batteries);

                // 선택된 배터리가 없으면 첫 번째 배터리를 기본 선택
                if (!selectedId && res.batteries.length > 0) {
                    setSearchParams(
                        { id: res.batteries[0].batteryId },
                        { replace: true }
                    );
                }
            })
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : '배터리 목록을 불러오지 못했습니다.'
                );
            });
    }, []);

    // 선택된 배터리의 상세 데이터 조회
    const loadBatteryData = useCallback(async () => {
        if (!selectedId) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const [
                detailRes,
                measRes,
                degRes,
                metricsRes,
            ] = await Promise.all([
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
            setError(
                err instanceof Error
                    ? err.message
                    : '배터리 분석 데이터를 불러오지 못했습니다.'
            );
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
                    <label className="text-xs text-slate-400 font-medium">
                        배터리 선택:
                    </label>

                    <select
                        value={selectedId}
                        onChange={(e) =>
                            setSearchParams({
                                id: e.target.value,
                            })
                        }
                        className="
              bg-slate-800
              border
              border-slate-700
              text-slate-200
              rounded-lg
              px-3
              py-1.5
              text-sm
              focus:outline-none
              focus:border-blue-500
            "
                    >
                        {batteryList.map((battery) => (
                            <option
                                key={battery.batteryId}
                                value={battery.batteryId}
                            >
                                {battery.batteryId}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 선택된 배터리 요약 정보 */}
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
                            <span className="text-slate-200">
                {detail.initialCapacity.toFixed(3)} Ah
              </span>
            </span>

                        <span className="text-slate-400">
              현재:{' '}
                            <span className="text-slate-200">
                {detail.currentCapacity.toFixed(3)} Ah
              </span>
            </span>

                        <StatusBadge status={detail.status} />
                    </div>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <LoadingState message="배터리 분석 데이터를 불러오는 중..." />
            )}

            {/* Error */}
            {error && (
                <ErrorState
                    message={error}
                    onRetry={loadBatteryData}
                />
            )}

            {/* Empty */}
            {!loading &&
                !error &&
                degradation.length === 0 && (
                    <EmptyState message="이 배터리에 대한 열화 데이터가 없습니다." />
                )}

            {/* Main Content */}
            {!loading &&
                !error &&
                degradation.length > 0 && (
                    <>
                        {/* ── AI-Based Degradation Prediction ── */}
                        <section className="mb-8">
                            <h3 className="
                text-sm
                font-semibold
                text-slate-400
                uppercase
                tracking-wider
                mb-4
              ">
                                AI 기반 수명 열화 예측
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Capacity */}
                                <LineChartCard
                                    title="실제 vs 예측 용량 (Capacity)"
                                    data={degradation}
                                    xKey="cycle"
                                    xLabel="Cycle"
                                    yLabel="Capacity (Ah)"
                                    lines={[
                                        {
                                            dataKey: 'actualCapacity',
                                            name: '실제 용량',
                                            color: '#3b82f6',
                                        },
                                        {
                                            dataKey: 'predictedCapacity',
                                            name: 'AI 예측 용량',
                                            color: '#f59e0b',
                                            strokeDasharray: '5 3',
                                        },
                                    ]}
                                    height={280}
                                />

                                {/* SOH */}
                                <LineChartCard
                                    title="실제 vs 예측 SOH"
                                    data={degradation}
                                    xKey="cycle"
                                    xLabel="Cycle"
                                    yLabel="SOH (%)"
                                    lines={[
                                        {
                                            dataKey: 'actualSoh',
                                            name: '실제 SOH',
                                            color: '#06b6d4',
                                        },
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
                            <h3 className="
                text-sm
                font-semibold
                text-slate-400
                uppercase
                tracking-wider
                mb-4
              ">
                                전기화학적 열화 추이
                            </h3>

                            <div className="grid grid-cols-4 gap-4">
                                {/* Capacity */}
                                <LineChartCard
                                    title="용량 (Capacity)"
                                    data={measurements}
                                    xKey="cycle"
                                    xLabel="Cycle"
                                    yLabel="Ah"
                                    lines={[
                                        {
                                            dataKey: 'capacity',
                                            name: 'Capacity',
                                            color: '#3b82f6',
                                        },
                                    ]}
                                    height={180}
                                    compact
                                />

                                {/* Re */}
                                <LineChartCard
                                    title="Re (전해질 저항)"
                                    data={measurements}
                                    xKey="cycle"
                                    xLabel="Cycle"
                                    yLabel="Ω"
                                    lines={[
                                        {
                                            dataKey: 're',
                                            name: 'Re',
                                            color: '#8b5cf6',
                                        },
                                    ]}
                                    height={180}
                                    compact
                                />

                                {/* Rct */}
                                <LineChartCard
                                    title="Rct (전하 전달 저항)"
                                    data={measurements}
                                    xKey="cycle"
                                    xLabel="Cycle"
                                    yLabel="Ω"
                                    lines={[
                                        {
                                            dataKey: 'rct',
                                            name: 'Rct',
                                            color: '#ec4899',
                                        },
                                    ]}
                                    height={180}
                                    compact
                                />

                                {/* Temperature */}
                                <LineChartCard
                                    title="주변 온도"
                                    data={measurements}
                                    xKey="cycle"
                                    xLabel="Cycle"
                                    yLabel="°C"
                                    lines={[
                                        {
                                            dataKey: 'ambientTemp',
                                            name: 'Temp',
                                            color: '#22c55e',
                                        },
                                    ]}
                                    height={180}
                                    compact
                                />
                            </div>
                        </section>

                        {/* ── AI Model Evaluation Metrics ── */}
                        {metrics && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="
                    text-sm
                    font-semibold
                    text-slate-400
                    uppercase
                    tracking-wider
                  ">
                                        AI 모델 평가 지표
                                    </h3>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <StatCard
                                        label="모델"
                                        value={metrics.modelName}
                                        variant="default"
                                    />

                                    <StatCard
                                        label="RMSE"
                                        value={metrics.rmse.toFixed(4)}
                                        variant="default"
                                    />

                                    <StatCard
                                        label="MAE"
                                        value={metrics.mae.toFixed(4)}
                                        variant="default"
                                    />

                                    <StatCard
                                        label="R²"
                                        value={metrics.r2Score.toFixed(4)}
                                        variant="success"
                                    />
                                </div>
                            </section>
                        )}
                    </>
                )}
        </div>
    );
}