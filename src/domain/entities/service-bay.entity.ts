import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Dealership } from './dealership.entity';
import { Capability } from './capability.entity';

@Entity('service_bays')
export class ServiceBay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /**
   * Capabilities this bay provides (e.g. LIFT, ALIGNMENT_RIG). Normalized into
   * the `capabilities` table via the `service_bay_capabilities` join.
   */
  @ManyToMany(() => Capability, (capability) => capability.serviceBays, {
    eager: true,
  })
  @JoinTable({ name: 'service_bay_capabilities' })
  capabilities: Capability[];

  @ManyToOne(() => Dealership, (dealership) => dealership.serviceBays, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  dealership: Dealership;

  @Column()
  dealershipId: number;
}
