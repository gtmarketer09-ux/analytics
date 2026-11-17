import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "daily_analytics" })
export class DailyAnalytics {
  @PrimaryColumn({ type: "date" })
  date!: string; // Format: YYYY-MM-DD

  @Column({ type: "numeric", precision: 14, scale: 2, name: "total_revenue", default: 0.00 })
  totalRevenue!: number;

  @Column({ type: "numeric", precision: 14, scale: 2, name: "p_l", default: 0.00 })
  pl!: number;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0.0000 })
  roas!: number;

  @Column({ type: "numeric", precision: 14, scale: 2, default: 0.00 })
  ecpm!: number;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp", name: "updated_at" })
  updatedAt!: Date;
}

