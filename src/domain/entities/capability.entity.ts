import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceBay } from './service-bay.entity';
import { ServiceType } from './service-type.entity';

/**
 * A normalized capability (e.g. LIFT, EV_CHARGER, ALIGNMENT_RIG).
 *
 * Replaces the previous denormalized `json string[]` columns on ServiceBay and
 * ServiceType so capability values are consistent, referentially enforced, and
 * carry metadata (display name, description, active flag).
 */
@Entity('capabilities')
export class Capability {
  @PrimaryGeneratedColumn()
  id: number;

  /** Stable machine code, e.g. 'EV_CHARGER'. */
  @Column({ unique: true })
  code: string;

  /** Human-friendly label, e.g. 'EV Charger'. */
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  active: boolean;

  @ManyToMany(() => ServiceBay, (bay) => bay.capabilities)
  serviceBays: ServiceBay[];

  @ManyToMany(() => ServiceType, (serviceType) => serviceType.requiredCapabilities)
  serviceTypes: ServiceType[];
}
