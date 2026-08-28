import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: User['role'];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

  login(user: User): LoginResult {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
