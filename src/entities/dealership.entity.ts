import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceBay } from './service-bay.entity';
import { Technician } from './technician.entity';

@Entity('dealerships')
export class Dealership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @OneToMany(() => ServiceBay, (bay) => bay.dealership)
  serviceBays: ServiceBay[];

  @OneToMany(() => Technician, (technician) => technician.dealership)
  technicians: Technician[];
}
