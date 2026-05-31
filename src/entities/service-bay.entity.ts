import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Dealership } from './dealership.entity';

@Entity('service_bays')
export class ServiceBay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /**
   * Capabilities this bay provides (e.g. ['LIFT', 'ALIGNMENT_RIG']).
   */
  @Column({ type: 'json' })
  capabilities: string[];

  @ManyToOne(() => Dealership, (dealership) => dealership.serviceBays, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  dealership: Dealership;

  @Column()
  dealershipId: number;
}
