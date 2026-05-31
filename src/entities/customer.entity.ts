import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Appointment } from './appointment.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.customer)
  vehicles: Vehicle[];

  @OneToMany(() => Appointment, (appointment) => appointment.customer)
  appointments: Appointment[];
}
