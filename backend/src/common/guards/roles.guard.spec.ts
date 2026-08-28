import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/entities/user.entity';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

function makeContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when the handler has no @Roles() metadata', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows the request when the user has one of the required roles', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.MANAGER, UserRole.SUPER_ADMIN],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthenticatedUser = {
      id: '1',
      email: 'm@ebenezer.rw',
      fullName: 'Manager',
      role: UserRole.MANAGER,
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('denies the request when the user lacks the required role', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.SUPER_ADMIN],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: AuthenticatedUser = {
      id: '1',
      email: 'd@ebenezer.rw',
      fullName: 'Driver',
      role: UserRole.DRIVER,
    };

    expect(guard.canActivate(makeContext(user))).toBe(false);
  });

  it('denies the request when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.SUPER_ADMIN],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
