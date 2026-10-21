import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { AuditService } from './audit/audit.service.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const audit = app.get(AuditService);
  app.useGlobalInterceptors(new DecimalSerializerInterceptor(), new AuditInterceptor(audit));
  app.useGlobalFilters(new AllExceptionsFilter(audit));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`PaisaTrack API listening on http://localhost:${port}/api`);
}

await bootstrap();
