import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Dealership } from './dealership.entity';
import { Skill } from './skill.entity';

@Entity('technicians')
export class Technician {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /**
   * Daily shift window expressed as minutes from midnight (UTC).
   * Default 08:00-17:00.
   */
  @Column({ default: 8 * 60 })
  shiftStartMinutes: number;

  @Column({ default: 17 * 60 })
  shiftEndMinutes: number;

  @ManyToOne(() => Dealership, (dealership) => dealership.technicians, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  dealership: Dealership;

  @Column()
  dealershipId: number;

  @ManyToMany(() => Skill, (skill) => skill.technicians, { eager: true })
  @JoinTable({ name: 'technician_skills' })
  skills: Skill[];
}
