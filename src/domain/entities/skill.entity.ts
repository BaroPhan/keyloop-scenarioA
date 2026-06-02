import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceType } from './service-type.entity';
import { Technician } from './technician.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => ServiceType, (serviceType) => serviceType.requiredSkills)
  serviceTypes: ServiceType[];

  @ManyToMany(() => Technician, (technician) => technician.skills)
  technicians: Technician[];
}
