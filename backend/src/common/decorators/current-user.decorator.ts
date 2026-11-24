import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';
import type { RequestWithUser } from '../types/request-with-user';

/**
 * Pure resolver, exported so it can be unit-tested without Nest's decorator
 * machinery. `@CurrentUser()` returns the whole authenticated user;
 * `@CurrentUser('id')` returns just that field.
 */
export function resolveCurrentUser(
  data: keyof AuthenticatedUser | undefined,
  ctx: ExecutionContext,
): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined {
  const user = ctx.switchToHttp().getRequest<RequestWithUser>().user;
  return data ? user?.[data] : user;
}

export const CurrentUser = createParamDecorator(resolveCurrentUser);
