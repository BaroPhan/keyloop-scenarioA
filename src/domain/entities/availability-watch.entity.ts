import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Dealership } from './dealership.entity';
import { ServiceType } from './service-type.entity';

export enum WatchStatus {
  ACTIVE = 'ACTIVE',
  NOTIFIED = 'NOTIFIED',
  CANCELLED = 'CANCELLED',
}

/**
 * A customer's request to be emailed when a slot for a given service at a
 * dealership opens within a desired window.
 */
@Entity('availability_watches')
@Index('idx_watch_active', ['status', 'dealershipId', 'serviceTypeId'])
export class AvailabilityWatch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, (customer) => customer.watches, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  customer: Customer;

  @Column()
  customerId: number;

  @ManyToOne(() => Dealership, { nullable: false, onDelete: 'CASCADE' })
  dealership: Dealership;

  @Column()
  dealershipId: number;

  @ManyToOne(() => ServiceType, { nullable: false, onDelete: 'CASCADE' })
  serviceType: ServiceType;

  @Column()
  serviceTypeId: number;

  @Column({ type: 'datetime' })
  windowStart: Date;

  @Column({ type: 'datetime' })
  windowEnd: Date;

  @Column({ type: 'enum', enum: WatchStatus, default: WatchStatus.ACTIVE })
  status: WatchStatus;

  @Column({ type: 'datetime', nullable: true })
  notifiedSlot: Date | null;

  @Column({ type: 'datetime', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
