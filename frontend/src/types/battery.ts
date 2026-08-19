export interface Battery {
  batteryId: string;
  initialCapacity: number;
  currentCapacity: number;
  currentSoh: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface BatteryListResponse {
  batteries: Battery[];
}

export interface BatteryDetailResponse {
  batteryId: string;
  initialCapacity: number;
  currentCapacity: number;
  currentSoh: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface Measurement {
  cycle: number;
  capacity: number;
  re: number;
  rct: number;
  soh: number;
  ambientTemp: number;
  measuredAt: string;
}

export interface MeasurementResponse {
  batteryId: string;
  measurements: Measurement[];
}

export interface DegradationPoint {
  cycle: number;
  actualCapacity: number;
  predictedCapacity: number;
  actualSoh: number;
  predictedSoh: number;
  modelName: string;
}

export interface DegradationResponse {
  batteryId: string;
  degradation: DegradationPoint[];
}

export interface ModelMetrics {
    modelName: string;
    rmse: number;
    mae: number;
    r2Score: number;
    trainedAt: string;
}
