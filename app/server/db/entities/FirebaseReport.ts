import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'firebase_daily_reports' })
export class FirebaseReport {
  @PrimaryColumn({ type: 'date' })
  date!: string;

  @Column({ type: 'bigint', default: 0 })
  inApps!: number;

  @Column({ type: 'bigint', default: 0, name: 'subscriptions' })
  subscriptionRenewals!: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;
}
