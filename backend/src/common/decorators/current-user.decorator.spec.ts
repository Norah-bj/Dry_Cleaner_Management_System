import type { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';
import { resolveCurrentUser } from './current-user.decorator';

function contextWithUser(
  user: AuthenticatedUser | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('resolveCurrentUser', () => {
  const user: AuthenticatedUser = {
    id: 'b43eb48a-ecde-413b-831e-d3653708a4ea',
    email: 'admin@example.com',
    fullName: 'Admin',
    role: UserRole.SUPER_ADMIN,
  };

  it('returns the whole user when no field is requested', () => {
    expect(resolveCurrentUser(undefined, contextWithUser(user))).toBe(user);
  });

  // Regression: @CurrentUser('id') used to return the whole user object,
  // which was then written into uuid columns (created_by, received_by,
  // changed_by) and made order creation, status changes and payments fail
  // with a 500 against a real database.
  it("returns only the requested field for @CurrentUser('id')", () => {
    expect(resolveCurrentUser('id', contextWithUser(user))).toBe(user.id);
  });

  it('returns undefined for a field when there is no user', () => {
    expect(
      resolveCurrentUser('id', contextWithUser(undefined)),
    ).toBeUndefined();
  });
});
