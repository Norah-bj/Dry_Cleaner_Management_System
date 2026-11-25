import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { AuthConfig } from '../../config/configuration';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { JwtPayload } from './strategies/jwt.strategy';

export interface LoginResult {
  accessToken: string;
  /** Opaque, single-use. Exchange at POST /auth/refresh for a new pair. */
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: User['role'];
  };
}

/**
 * Two tabs can refresh with the same token at the same moment. The loser of
 * that race sees a token rotated a few seconds ago; that is not theft, so it
 * gets a plain 401 (the client then re-reads the newer token) instead of
 * revoking the whole family.
 */
const ROTATION_GRACE_MS = 30_000;

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    configService: ConfigService,
  ) {
    this.refreshTtlDays =
      configService.get<AuthConfig>('auth')?.refreshTokenTtlDays ?? 30;
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  /** Starts a new session (a new refresh-token family). */
  async login(user: User): Promise<LoginResult> {
    const { token } = await this.issueRefreshToken(user.id, randomUUID());
    return this.result(user, token);
  }

  /**
   * Rotates a refresh token: the presented one is revoked and a new one in
   * the same family is returned. Presenting an already-used token (outside
   * the short race window) revokes the entire family - that token was
   * probably stolen.
   */
  async refresh(presented: string): Promise<LoginResult> {
    const existing = await this.refreshTokens.findOne({
      where: { tokenHash: hashToken(presented) },
    });
    if (!existing)
      throw new UnauthorizedException('Session expired. Please sign in again.');

    if (existing.revokedAt) {
      const recentlyRotated =
        existing.replacedById !== null &&
        Date.now() - existing.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (!recentlyRotated) await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const user = await this.usersService.findById(existing.userId);
    if (!user || !user.isActive) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const { token, row } = await this.issueRefreshToken(
      user.id,
      existing.familyId,
    );
    // Conditional update: only one concurrent refresh can win the rotation.
    const res = await this.refreshTokens.update(
      { id: existing.id, revokedAt: IsNull() },
      { revokedAt: new Date(), replacedById: row.id },
    );
    if (!res.affected) {
      await this.refreshTokens.update(
        { id: row.id },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    return this.result(user, token);
  }

  /** Signs this session out (the whole family, so older copies die too). */
  async logout(presented: string): Promise<void> {
    const existing = await this.refreshTokens.findOne({
      where: { tokenHash: hashToken(presented) },
    });
    if (existing) await this.revokeFamily(existing.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueRefreshToken(userId: string, familyId: string) {
    const token = randomBytes(48).toString('base64url');
    const row = await this.refreshTokens.save(
      this.refreshTokens.create({
        userId,
        familyId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + this.refreshTtlDays * 86_400_000),
      }),
    );
    return { token, row };
  }

  private result(user: User, refreshToken: string): LoginResult {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
