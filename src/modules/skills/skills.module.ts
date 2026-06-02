import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../../infrastructure/rbac/rbac.module';
import { Skill } from '../../domain/entities/skill.entity';
import { SkillsController } from './presentation/skills.controller';
import { SkillsService } from './application/skills.service';

@Module({
  imports: [AuthModule, RbacModule, TypeOrmModule.forFeature([Skill])],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
