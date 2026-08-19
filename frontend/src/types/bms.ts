export interface BmsDataPoint {
  time: number;
  voltage: number;
  current: number;
  bmsSignal: number;
  status: string;
  alertMsg: string | null;
}

export interface BmsDataResponse {
  bmsData: BmsDataPoint[];
}

export interface BmsStatus {
  status: string;
  voltage: number;
  current: number;
  bmsSignal: number;
  alert: boolean;
  message: string;
}
