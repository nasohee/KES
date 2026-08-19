import axios from 'axios';
import type {
  BatteryListResponse,
  BatteryDetailResponse,
  MeasurementResponse,
  DegradationResponse,
  ModelMetrics,
} from '../types/battery';
import type { BmsDataResponse, BmsStatus } from '../types/bms';
import {
  getMockBatteries,
  getMockBatteryDetail,
  getMockMeasurements,
  getMockDegradation,
  getMockBmsData,
  getMockBmsStatus,
  getMockModelMetrics,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'; // default: true

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Battery APIs
// ---------------------------------------------------------------------------

export async function fetchBatteries(): Promise<BatteryListResponse> {
  if (USE_MOCK) return getMockBatteries();
  const { data } = await apiClient.get<BatteryListResponse>('/api/batteries');
  return data;
}

export async function fetchBatteryDetail(
  batteryId: string
): Promise<BatteryDetailResponse> {
  if (USE_MOCK) return getMockBatteryDetail(batteryId);
  const { data } = await apiClient.get<BatteryDetailResponse>(
    `/api/batteries/${batteryId}`
  );
  return data;
}

export async function fetchMeasurements(
  batteryId: string
): Promise<MeasurementResponse> {
  if (USE_MOCK) return getMockMeasurements(batteryId);
  const { data } = await apiClient.get<MeasurementResponse>(
    `/api/batteries/${batteryId}/measurements`
  );
  return data;
}

export async function fetchDegradation(
  batteryId: string
): Promise<DegradationResponse> {
  if (USE_MOCK) return getMockDegradation(batteryId);
  const { data } = await apiClient.get<DegradationResponse>(
    `/api/batteries/${batteryId}/degradation`
  );
  return data;
}

// ---------------------------------------------------------------------------
// BMS APIs
// ---------------------------------------------------------------------------

export async function fetchBmsData(): Promise<BmsDataResponse> {
  if (USE_MOCK) return getMockBmsData();
  const { data } = await apiClient.get<BmsDataResponse>('/api/bms/data');
  return data;
}

export async function fetchBmsStatus(): Promise<BmsStatus> {
  if (USE_MOCK) return getMockBmsStatus();
  const { data } = await apiClient.get<BmsStatus>('/api/bms/status');
  return data;
}

// ---------------------------------------------------------------------------
// Model Metrics (mock only for now — no backend endpoint)
// ---------------------------------------------------------------------------

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  return getMockModelMetrics();
}
