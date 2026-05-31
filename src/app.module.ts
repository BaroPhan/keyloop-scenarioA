import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './config/data-source-options';
import { AppointmentsModule } from './appointments/appointments.module';
import { ReferenceModule } from './reference/reference.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Async so the factory runs after ConfigModule has loaded .env into process.env.
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(),
    }),
    AppointmentsModule,
    ReferenceModule,
  ],
})
export class AppModule {}
