import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/configuration';

/**
 * Global HTTP setup shared by main.ts and the E2E tests, so the tests
 * exercise the same prefix, CORS and validation rules as production.
 */
export function configureApp(app: INestApplication): void {
  const appConfig = app.get(ConfigService).get<AppConfig>('app');

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
}
