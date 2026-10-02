import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import { ConfigurationModule } from '../config/configuration.module';
import { ConfigurationService } from '../config/configuration.service';
import { EntraAuthGuard } from './entra-auth.guard';
import { jwksUri } from './entra-endpoints';
import { ENTRA_JWKS, EntraTokenVerifier } from './entra-token-verifier.service';

@Module({
  imports: [ConfigurationModule],
  providers: [
    {
      provide: ENTRA_JWKS,
      inject: [ConfigurationService],
      // Caches keys and refetches on an unknown `kid`, so key rollover is handled.
      useFactory: ({ settings }: ConfigurationService) =>
        createRemoteJWKSet(jwksUri(settings.entra.tenantId)),
    },
    EntraTokenVerifier,
    { provide: APP_GUARD, useClass: EntraAuthGuard },
  ],
})
export class AuthModule {}
