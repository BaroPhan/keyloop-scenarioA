import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Skill } from '../../../domain/entities/skill.entity';
import { CreateSkillDto } from '../presentation/dto/create-skill.dto';
import { UpdateSkillDto } from '../presentation/dto/update-skill.dto';
import { AdminCacheService } from '../../../infrastructure/cache/admin-cache.service';
import {
  PaginationQueryDto,
  PaginatedResult,
  resolvePagination,
  toPaginatedResult,
} from '../../../shared/presentation/dto/pagination-query.dto';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill) private readonly skills: Repository<Skill>,
    private readonly cache: AdminCacheService,
  ) {}

  async listPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Skill>> {
    const { page, limit, skip } = resolvePagination(query);
    const [data, total] = await this.skills.findAndCount({
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    return toPaginatedResult(data, total, page, limit);
  }

  list(): Promise<Skill[]> {
    return this.skills.find({ order: { name: 'ASC' } });
  }

  get(id: number): Promise<Skill> {
    return this.requireOne(id);
  }

  async create(dto: CreateSkillDto): Promise<Skill> {
    const saved = await this.skills.save(
      this.skills.create({ name: dto.name }),
    );
    await this.cache.invalidateReference();
    return saved;
  }

  async update(id: number, dto: UpdateSkillDto): Promise<Skill> {
    const skill = await this.requireOne(id);
    skill.name = dto.name;
    const saved = await this.skills.save(skill);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.requireOne(id);
    await this.skills.delete(id);
    await this.cache.invalidateReference();
    await this.cache.invalidateAvailability();
  }

  async resolveByIds(ids: number[]): Promise<Skill[]> {
    const skills = await this.skills.findBy({ id: In(ids) });
    if (skills.length !== ids.length) {
      throw new NotFoundException('One or more skills not found.');
    }
    return skills;
  }

  async requireOne(id: number): Promise<Skill> {
    const skill = await this.skills.findOne({ where: { id } });
    if (!skill) throw new NotFoundException(`Skill ${id} not found.`);
    return skill;
  }
}
