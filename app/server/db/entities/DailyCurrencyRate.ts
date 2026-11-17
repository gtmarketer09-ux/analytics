import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'daily_currency_rates' })
export class DailyCurrencyRate {
  @PrimaryColumn({ type: 'date' })
  date!: string;
  
  @PrimaryColumn({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'numeric', precision: 18, scale: 10, name: 'exchange_rate' })
  exchangeRate!: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
