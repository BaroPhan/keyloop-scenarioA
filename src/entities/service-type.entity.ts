import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Skill } from './skill.entity';

@Entity('service_types')
export class ServiceType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  durationMinutes: number;

  /**
   * Capabilities a service bay must possess to perform this service
   * (e.g. ['LIFT', 'ALIGNMENT_RIG']).
   */
  @Column({ type: 'json' })
  requiredCapabilities: string[];

  /**
   * Skills a technician must hold (all of them) to be qualified for this
   * service.
   */
  @ManyToMany(() => Skill, (skill) => skill.serviceTypes, { eager: true })
  @JoinTable({ name: 'service_type_required_skills' })
  requiredSkills: Skill[];
}
