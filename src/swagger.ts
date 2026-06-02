import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Unified Service Scheduler')
    .setDescription(
      'Vehicle service appointment API. Books only when a capable service bay and ' +
        'qualified technician are both free for the full service duration. ' +
        'Use **Customer login** (`POST /auth/login`) for `/me/*` and watch endpoints. ' +
        'Use **Admin login** (`POST /auth/admin/login`) and a bearer token for management endpoints ' +
        '(guards enforce admin role and privileges; routes are not prefixed with `/admin`).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /auth/login (customer) or POST /auth/admin/login (admin)',
      },
      'JWT',
    )
    .addTag('Auth', 'Customer and admin authentication')
    .addTag('Customers', 'Customer and vehicle lookup')
    .addTag('Appointments', 'Booking, cancel, reschedule, order history')
    .addTag('Availability', 'Probes, slot discovery, watches')
    .addTag('Admin', 'Management operations (admin JWT + privileges required)')
    .addTag('Health', 'Liveness / readiness')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
