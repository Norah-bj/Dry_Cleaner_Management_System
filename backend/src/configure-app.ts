import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/configuration';

/**
 * Global HTTP setup shared by main.ts and the E2E tests, so the tests
 * exercise the same prefix, CORS, security headers, validation and error
 * shape as production.
 */
export function configureApp(app: INestApplication): void {
  const appConfig = app.get(ConfigService).get<AppConfig>('app');

  // Behind a reverse proxy (Phase 6 hosting), rate limits must see the real
  // client IP, not the proxy's. Set TRUST_PROXY to the number of proxies.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    (app.getHttpAdapter().getInstance() as Express).set(
      'trust proxy',
      Number.isNaN(hops) ? process.env.TRUST_PROXY : hops,
    );
  }

  // Security headers (nosniff, frame protection, HSTS, referrer policy...).
  // CSP is off: this server only returns JSON plus the Swagger UI, whose
  // inline script a default CSP would block. The frontend's own headers
  // are set where it is hosted (docs/deployment/DEPLOYMENT.md).
  app.use(helmet({ contentSecurityPolicy: false }));

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({
    origin: appConfig?.corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
