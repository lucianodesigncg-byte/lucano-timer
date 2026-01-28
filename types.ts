
export interface ProjectData {
  id: number;
  client: string;
  project: string;
  seconds: number;
  targetSeconds: number;
  isActive: boolean;
  notes: string;
  startDate: string;
  endDate: string;
}

export interface AppConfig {
  rate: number;
  alarmSound: string | null;
  logo: string | null;
  signature: string;
}
