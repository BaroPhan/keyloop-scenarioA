import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdminGroup } from './admin-group.entity';

/**
 * Admin operator with their own credentials. Belongs to one AdminGroup whose
 * privileges determine which admin actions are allowed.
 */
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  displayName: string;

  @ManyToOne(() => AdminGroup, (group) => group.admins, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'adminGroupId' })
  group: AdminGroup;

  @Column()
  adminGroupId: number;
}
