import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Privilege } from './privilege.entity';
import { Admin } from './admin.entity';

/** A named bundle of privileges (e.g. SUPER_ADMIN, SUPPORT). */
@Entity('admin_groups')
export class AdminGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Privilege, (privilege) => privilege.groups, { eager: true })
  @JoinTable({ name: 'admin_group_privileges' })
  privileges: Privilege[];

  @OneToMany(() => Admin, (admin) => admin.group)
  admins: Admin[];
}
