import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Admin } from '../../../domain/entities/admin.entity';
import { CreateAdminDto } from '../presentation/dto/create-admin.dto';
import { UpdateAdminDto } from '../presentation/dto/update-admin.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';
import { AdminGroupsService } from '../../admin-groups/application/admin-groups.service';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    private readonly adminGroups: AdminGroupsService,
    private readonly cache: AdminCacheService,
  ) {}

  list(): Promise<Admin[]> {
    return this.admins.find({ order: { id: 'ASC' } });
  }

  async get(id: number): Promise<Omit<Admin, 'passwordHash'>> {
    const admin = await this.requireOne(id);
    const { passwordHash: _, ...safe } = admin;
    return safe;
  }

  async create(dto: CreateAdminDto): Promise<Omit<Admin, 'passwordHash'>> {
    await this.adminGroups.requireOne(dto.adminGroupId);
    const passwordHash = await argon2.hash(dto.password);
    const saved = await this.admins.save(
      this.admins.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
        adminGroupId: dto.adminGroupId,
      }),
    );
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async update(
    id: number,
    dto: UpdateAdminDto,
  ): Promise<Omit<Admin, 'passwordHash'>> {
    const admin = await this.requireOne(id);
    if (dto.adminGroupId !== undefined) {
      await this.adminGroups.requireOne(dto.adminGroupId);
      admin.adminGroupId = dto.adminGroupId;
    }
    if (dto.email !== undefined) admin.email = dto.email.toLowerCase();
    if (dto.displayName !== undefined) admin.displayName = dto.displayName;
    if (dto.password !== undefined) {
      admin.passwordHash = await argon2.hash(dto.password);
    }
    const saved = await this.admins.save(admin);
    await this.cache.invalidateAdminPrivileges(id);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    await this.admins.delete(id);
  }

  private async requireOne(id: number): Promise<Admin> {
    const admin = await this.admins.findOne({
      where: { id },
      relations: { group: { privileges: true } },
    });
    if (!admin) throw new NotFoundException(`Admin ${id} not found.`);
    return admin;
  }
}
