import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'google_ads_daily_reports' })
export class GoogleAdsReport {
  @PrimaryColumn({ type: 'date' })
  date!: string;

  @Column({ type: 'bigint', default: 0 })
  impressions!: number;

  @Column({ type: 'bigint', default: 0 })
  clicks!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  adSpend!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'ad_spend_usd', default: 0 })
  adSpendUsd!: number;

  @Column({ type: 'numeric', precision: 12, scale: 1, default: 0 })
  conversions!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  conversionValue!: number;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  ctr!: number;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  roas!: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;
}
