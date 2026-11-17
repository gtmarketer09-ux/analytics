import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "play_console_daily_reports" })
export class PlayConsoleReport {

  @PrimaryColumn({ type: "date" })
  date!: string; // Format: YYYY-MM-DD

  @Column({ type: "numeric", precision: 12, scale: 2, name: "revenue_with_tax", default: 0.00 })
  revenueWithTax!: number;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "revenue_without_tax", default: 0.00 })
  revenueWithoutTax!: number; // Total revenue (Net)

  @Column({ type: "numeric", precision: 12, scale: 2, name: "in_apps", default: 0.00 })
  inApps!: number; // Number of matching package transactions

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp", name: "updated_at" })
  updatedAt!: Date;
}
