import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { WatchProcessor } from './watch.processor';
import { WatchScheduler } from './watch.scheduler';
import { AppointmentsModule } from '../../modules/appointments/appointments.module';
import { Customer } from '../../domain/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), AppointmentsModule],
  providers: [MailService, MailProcessor, WatchProcessor, WatchScheduler],
  exports: [MailService],
})
export class NotificationsModule {}
