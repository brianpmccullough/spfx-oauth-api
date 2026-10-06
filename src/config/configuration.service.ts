import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './environment-variables.schema';
import type { Settings } from './models/settings';

/** Typed, already-validated core and cross-cutting configuration. */
@Injectable()
export class ConfigurationService {
  readonly settings: Settings;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.settings = {
      port: configService.get('PORT', { infer: true }),
      corsAllowedOrigins: configService.get('CORS_ALLOWED_ORIGINS', {
        infer: true,
      }),
      entra: {
        clientId: configService.get('ENTRA_CLIENT_ID', { infer: true }),
        tenantId: configService.get('ENTRA_TENANT_ID', { infer: true }),
      },
    };
  }
}
