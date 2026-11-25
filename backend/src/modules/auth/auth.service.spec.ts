import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService, hashToken } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let refreshTokens: Record<string, jest.Mock>;
  let activeUser: User;

  beforeEach(async () => {
    activeUser = {
      id: 'user-1',
      email: 'staff@ebenezer.rw',
      phone: null,
      passwordHash: await argon2.hash('correct-password'),
      fullName: 'Test Staff',
      role: UserRole.RECEPTIONIST,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    refreshTokens = {
      create: jest.fn((v: object) => v),
      save: jest.fn((v: object) => Promise.resolve({ id: 'rt-1', ...v })),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      refreshTokens as never,
      { get: () => ({ refreshTokenTtlDays: 30 }) } as never,
    );
  });

  describe('validateUser', () => {
    it('returns the user when credentials are correct', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);

      const result = await authService.validateUser(
        activeUser.email,
        'correct-password',
      );

      expect(result).toBe(activeUser);
    });

    it('throws when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser('nobody@ebenezer.rw', 'anything'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });

      await expect(
        authService.validateUser(activeUser.email, 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);

      await expect(
        authService.validateUser(activeUser.email, 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('signs a JWT, issues a refresh token, and returns a public user shape', async () => {
      const result = await authService.login(activeUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: expect.any(String) as string,
        user: {
          id: activeUser.id,
          email: activeUser.email,
          fullName: activeUser.fullName,
          role: activeUser.role,
        },
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      // Only a hash of the refresh token is stored, never the token itself.
      const stored = (
        refreshTokens.save.mock.calls[0] as [{ tokenHash: string }]
      )[0];
      expect(stored.tokenHash).toBe(hashToken(result.refreshToken));
      expect(stored.tokenHash).not.toBe(result.refreshToken);
    });
  });
});
