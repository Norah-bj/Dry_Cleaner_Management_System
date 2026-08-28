import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
