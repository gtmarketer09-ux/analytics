export type PlayConsoleMetrics = {
  date: string;
  revenueWithTax: number;
  revenueWithoutTax: number;
  inApps: number;
};

export type PlayConsoleReport = {
  days: PlayConsoleMetrics[];
  total: Omit<PlayConsoleMetrics, 'date'>;
  lastUpdated: Date | null;
};