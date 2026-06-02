import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AdminGroup } from './admin-group.entity';

/** A single, fine-grained permission grantable to an admin group. */
@Entity('privileges')
export class Privilege {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => AdminGroup, (group) => group.privileges)
  groups: AdminGroup[];
}
