import { Inject, Injectable } from '@nestjs/common';
import { errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { ConfigurationService } from '../config/configuration.service';
import type { EntraSettings } from '../config/models/settings';
import { audiences, issuers } from './entra-endpoints';
import type { AuthenticatedUser } from './models/authenticated-user';

/** DI token for the key set used to verify token signatures. */
export const ENTRA_JWKS = Symbol('ENTRA_JWKS');

export class InvalidTokenError extends Error {}

@Injectable()
export class EntraTokenVerifier {
  private readonly entra: EntraSettings;

  constructor(
    configurationService: ConfigurationService,
    @Inject(ENTRA_JWKS) private readonly jwks: JWTVerifyGetKey,
  ) {
    this.entra = configurationService.settings.entra;
  }

  /**
   * Verifies signature, issuer, audience and lifetime, and requires a
   * delegated (user) token, since vendor connections are held per user.
   */
  async verify(token: string): Promise<AuthenticatedUser> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        algorithms: ['RS256'],
        issuer: issuers(this.entra.tenantId),
        audience: audiences(this.entra.clientId),
        requiredClaims: ['exp', 'oid', 'tid', 'scp'],
        clockTolerance: '60s',
      }));
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        throw new InvalidTokenError(error.code);
      }
      throw error;
    }
    return this.toAuthenticatedUser(payload, token);
  }

  private toAuthenticatedUser(
    payload: JWTPayload,
    accessToken: string,
  ): AuthenticatedUser {
    return {
      oid: this.stringClaim(payload, 'oid'),
      tenantId: this.stringClaim(payload, 'tid'),
      // v1.0 tokens carry `upn`; v2.0 tokens carry `preferred_username`.
      upn:
        this.optionalStringClaim(payload, 'upn') ??
        this.optionalStringClaim(payload, 'preferred_username'),
      name: this.optionalStringClaim(payload, 'name'),
      scopes: this.stringClaim(payload, 'scp').split(' ').filter(Boolean),
      roles: Array.isArray(payload.roles)
        ? payload.roles.filter((role) => typeof role === 'string')
        : [],
      accessToken,
    };
  }

  private stringClaim(payload: JWTPayload, name: string): string {
    const value = this.optionalStringClaim(payload, name);
    if (!value) {
      throw new InvalidTokenError(`claim "${name}" is not a string`);
    }
    return value;
  }

  private optionalStringClaim(
    payload: JWTPayload,
    name: string,
  ): string | undefined {
    const value = payload[name];
    return typeof value === 'string' && value ? value : undefined;
  }
}
