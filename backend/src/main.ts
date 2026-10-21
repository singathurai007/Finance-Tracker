import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module.js';
import { AuditService } from './audit/audit.service.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
    // Parsers are registered below so the limit can be raised.
    bodyParser: false,
  });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  // Profile pictures arrive as base64 data URLs, which exceed the 100 kb default.
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '2mb' });
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
