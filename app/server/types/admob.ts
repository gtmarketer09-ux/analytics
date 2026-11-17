export type AdmobMetrics = {
  date: string;
  requests: number;
  match_rate: number;
  show_rate: number;
  impressions: number;
  clicks: number;
  ctr: number;
  ecpm: number;
  revenue: number;
  revenue_usd: number;
};

export type AdmobReport = {
  days: AdmobMetrics[];
  total: AdmobMetrics;
  lastUpdated: Date | null;
};