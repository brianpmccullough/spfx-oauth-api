import type { INestApplication } from '@nestjs/common';
import { ConfigurationService } from './config/configuration.service';

/**
 * Allows the configured origins to call the API with a bearer token.
 * No cookies are used, so credentialed requests stay disabled.
 */
export function configureCors(app: INestApplication): void {
  const { corsAllowedOrigins } = app.get(ConfigurationService).settings;
  app.enableCors({
    origin: [...corsAllowedOrigins],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['WWW-Authenticate'],
    credentials: false,
    maxAge: 600,
  });
}
