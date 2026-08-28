import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let activeUser: User;

  beforeEach(async () => {
    activeUser = {
      id: 'user-1',
      email: 'staff@ebenezer.rw',
      passwordHash: await argon2.hash('correct-password'),
      fullName: 'Test Staff',
      role: UserRole.RECEPTIONIST,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
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
    it('signs a JWT with the user id/email/role and returns a public user shape', () => {
      const result = authService.login(activeUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        user: {
          id: activeUser.id,
          email: activeUser.email,
          fullName: activeUser.fullName,
          role: activeUser.role,
        },
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });
});
