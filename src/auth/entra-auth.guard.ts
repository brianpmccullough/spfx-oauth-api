import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import {
  EntraTokenVerifier,
  InvalidTokenError,
} from './entra-token-verifier.service';
import type { AuthenticatedRequest } from './models/authenticated-request';
import { IS_UNAUTHENTICATED_KEY } from './unauthenticated.decorator';

/**
 * Global guard: every route requires a valid Entra ID bearer token unless it
 * is marked with `@Unauthenticated()`.
 */
@Injectable()
export class EntraAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: EntraTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isUnauthenticated = this.reflector.getAllAndOverride<boolean>(
      IS_UNAUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isUnauthenticated) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      response.setHeader('WWW-Authenticate', 'Bearer');
      throw new UnauthorizedException();
    }

    try {
      request.user = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        response.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
        throw new UnauthorizedException();
      }
      throw error;
    }
    return true;
  }

  private extractBearerToken(header: string | undefined): string | undefined {
    const [scheme, token, ...rest] = header?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      return undefined;
    }
    return token;
  }
}
