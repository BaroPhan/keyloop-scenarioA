import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Skill } from './skill.entity';
import { Capability } from './capability.entity';

@Entity('service_types')
export class ServiceType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  durationMinutes: number;

  /**
   * Capabilities a service bay must possess (all of them) to perform this
   * service. Normalized via the `service_type_required_capabilities` join.
   */
  @ManyToMany(() => Capability, (capability) => capability.serviceTypes, {
    eager: true,
  })
  @JoinTable({ name: 'service_type_required_capabilities' })
  requiredCapabilities: Capability[];

  /**
   * Skills a technician must hold (all of them) to be qualified for this
   * service.
   */
  @ManyToMany(() => Skill, (skill) => skill.serviceTypes, { eager: true })
  @JoinTable({ name: 'service_type_required_skills' })
  requiredSkills: Skill[];
}
