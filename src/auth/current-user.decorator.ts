import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './models/authenticated-request';
import type { AuthenticatedUser } from './models/authenticated-user';

/** Injects the authenticated caller into a route handler parameter. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      // Only reachable if used on an @Unauthenticated() route.
      throw new InternalServerErrorException();
    }
    return user;
  },
);
