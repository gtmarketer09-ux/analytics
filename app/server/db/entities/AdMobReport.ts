import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "admob_daily_reports" })
export class AdMobReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "date", unique: true })
  date!: string; // Format: YYYY-MM-DD

  // --- core volume metrics ---
  @Column({ type: "bigint", default: 0 })
  requests!: number;

  @Column({ type: "bigint", default: 0 })
  impressions!: number;

  @Column({ type: "int", default: 0 })
  clicks!: number;

  // --- performance rates (percentages stored as decimals, e.g., 0.1234 for 12.34%) ---
  @Column({ type: "numeric", precision: 6, scale: 4, name: "motion_rate", default: 0.0000 })
  motionRate!: number;

  @Column({ type: "numeric", precision: 6, scale: 4, name: "show_rate", default: 0.0000 })
  showRate!: number;

  @Column({ type: "numeric", precision: 6, scale: 4, default: 0.0000 })
  ctr!: number; // Click-Through Rate

  // --- financial value metrics ---
  @Column({ type: "numeric", precision: 10, scale: 2, default: 0.00 })
  ecpm!: number; // Effective Cost Per Mille

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0.00 })
  revenue!: number;

  @Column({ type: "numeric", precision: 10, scale: 2, name: "revenue_usd", default: 0.00 })
  revenueUsd!: number;

  // --- system metadata ---
  @Column({ type: "varchar", length: 10, default: "AUD" })
  currency!: string;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;
}
