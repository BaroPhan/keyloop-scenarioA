import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Appointment } from './appointment.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  vin: string;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @ManyToOne(() => Customer, (customer) => customer.vehicles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  customer: Customer;

  @Column()
  customerId: number;

  @OneToMany(() => Appointment, (appointment) => appointment.vehicle)
  appointments: Appointment[];
}
