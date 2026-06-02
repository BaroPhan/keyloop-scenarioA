import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Vehicle } from './vehicle.entity';
import { Dealership } from './dealership.entity';
import { ServiceType } from './service-type.entity';
import { Technician } from './technician.entity';
import { ServiceBay } from './service-bay.entity';

export enum AppointmentStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('appointments')
@Index('idx_appointment_technician_window', ['technicianId', 'startTime', 'endTime'])
@Index('idx_appointment_bay_window', ['serviceBayId', 'startTime', 'endTime'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, (customer) => customer.appointments, {
    nullable: false,
  })
  customer: Customer;

  @Column()
  customerId: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.appointments, {
    nullable: false,
  })
  vehicle: Vehicle;

  @Column()
  vehicleId: number;

  @ManyToOne(() => Dealership, { nullable: false })
  dealership: Dealership;

  @Column()
  dealershipId: number;

  @ManyToOne(() => ServiceType, { nullable: false, eager: true })
  serviceType: ServiceType;

  @Column()
  serviceTypeId: number;

  @ManyToOne(() => Technician, { nullable: false, eager: true })
  technician: Technician;

  @Column()
  technicianId: number;

  @ManyToOne(() => ServiceBay, { nullable: false, eager: true })
  serviceBay: ServiceBay;

  @Column()
  serviceBayId: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.CONFIRMED,
  })
  status: AppointmentStatus;

  @CreateDateColumn()
  createdAt: Date;
}
