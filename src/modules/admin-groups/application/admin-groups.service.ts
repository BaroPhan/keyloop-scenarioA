import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminGroup } from '../../../domain/entities/admin-group.entity';
import { Admin } from '../../../domain/entities/admin.entity';
import { Privilege } from '../../../domain/entities/privilege.entity';
import { CreateAdminGroupDto } from '../presentation/dto/create-admin-group.dto';
import { UpdateAdminGroupDto } from '../presentation/dto/update-admin-group.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';

@Injectable()
export class AdminGroupsService {
  constructor(
    @InjectRepository(AdminGroup)
    private readonly adminGroups: Repository<AdminGroup>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @InjectRepository(Privilege)
    private readonly privileges: Repository<Privilege>,
    private readonly cache: AdminCacheService,
  ) { }

  list(): Promise<AdminGroup[]> {
    return this.adminGroups.find({ order: { name: 'ASC' } });
  }

  get(id: number): Promise<AdminGroup> {
    return this.requireOne(id);
  }

  async create(dto: CreateAdminGroupDto): Promise<AdminGroup> {
    const privilegeEntities = await this.resolvePrivileges(dto.privilegeIds);
    return this.adminGroups.save(
      this.adminGroups.create({ name: dto.name, privileges: privilegeEntities }),
    );
  }

  async update(id: number, dto: UpdateAdminGroupDto): Promise<AdminGroup> {
    const group = await this.requireOne(id);
    if (dto.name !== undefined) group.name = dto.name;
    if (dto.privilegeIds !== undefined) {
      group.privileges = await this.resolvePrivileges(dto.privilegeIds);
    }
    const saved = await this.adminGroups.save(group);
    await this.cache.invalidateAllPrivileges();
    return saved;
  }

  async delete(id: number): Promise<void> {
    const group = await this.requireOne(id);
    const adminCount = await this.admins.count({ where: { adminGroupId: id } });
    if (adminCount > 0) {
      throw new ConflictException(
        'Cannot delete admin group that still has members.',
      );
    }
    await this.adminGroups.remove(group);
  }

  async requireOne(id: number): Promise<AdminGroup> {
    const group = await this.adminGroups.findOne({
      where: { id },
      relations: { privileges: true },
    });
    if (!group) throw new NotFoundException(`Admin group ${id} not found.`);
    return group;
  }

  private async resolvePrivileges(ids: number[]): Promise<Privilege[]> {
    const privileges = await this.privileges.findBy({ id: In(ids) });
    if (privileges.length !== ids.length) {
      throw new NotFoundException('One or more privileges not found.');
    }
    return privileges;
  }
}
