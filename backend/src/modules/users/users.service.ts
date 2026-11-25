import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User, UserRole } from './entities/user.entity';
import type { PublicUser, UpdateUserDto } from './dto/user.dto';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
}

/** The signed-in user making a change, for permission checks. */
export interface Actor {
  id: string;
  role: UserRole;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Case-insensitive, so logins saved before emails were lower-cased still work. */
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', {
        email: email.trim().toLowerCase(),
      })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /** Low-level create used by the seed script and tests. */
  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException(`A login for ${email} already exists`);
    }
    const passwordHash = await argon2.hash(input.password);
    const user = this.usersRepository.create({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone ?? null,
      role: input.role,
    });
    return this.usersRepository.save(user);
  }

  async list(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find({
      order: { isActive: 'DESC', fullName: 'ASC' },
    });
    return users.map(toPublicUser);
  }

  /** Active drivers, for assigning pickups and deliveries. */
  async listDrivers(): Promise<
    Pick<PublicUser, 'id' | 'fullName' | 'phone'>[]
  > {
    const drivers = await this.usersRepository.find({
      where: { role: UserRole.DRIVER, isActive: true },
      order: { fullName: 'ASC' },
    });
    return drivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      phone: d.phone,
    }));
  }

  async createByStaff(
    input: CreateUserInput,
    actor: Actor,
  ): Promise<PublicUser> {
    this.assertCanGrant(input.role, actor);
    return toPublicUser(await this.create(input));
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: Actor,
  ): Promise<PublicUser> {
    const user = await this.getOrThrow(id);
    this.assertCanManage(user, actor);

    if (dto.role !== undefined && dto.role !== user.role) {
      if (user.id === actor.id) {
        throw new BadRequestException('You cannot change your own role');
      }
      this.assertCanGrant(dto.role, actor);
    }
    if (dto.isActive === false && user.id === actor.id) {
      throw new BadRequestException('You cannot deactivate your own login');
    }

    const losingSuperAdmin =
      user.role === UserRole.SUPER_ADMIN &&
      user.isActive &&
      (dto.isActive === false ||
        (dto.role !== undefined && dto.role !== UserRole.SUPER_ADMIN));
    if (losingSuperAdmin) {
      const activeSuperAdmins = await this.usersRepository.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
      });
      if (activeSuperAdmins <= 1) {
        throw new BadRequestException(
          'This is the last active Super Admin. Make someone else Super Admin first.',
        );
      }
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    return toPublicUser(await this.usersRepository.save(user));
  }

  async resetPassword(
    id: string,
    password: string,
    actor: Actor,
  ): Promise<void> {
    const user = await this.getOrThrow(id);
    this.assertCanManage(user, actor);
    user.passwordHash = await argon2.hash(password);
    await this.usersRepository.save(user);
  }

  private async getOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  /** Only a Super Admin may create or promote someone to Super Admin. */
  private assertCanGrant(role: UserRole, actor: Actor): void {
    if (role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only a Super Admin can grant the Super Admin role',
      );
    }
  }

  /** Managers can manage staff, but not Super Admin accounts. */
  private assertCanManage(target: User, actor: Actor): void {
    if (
      target.role === UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a Super Admin can change a Super Admin account',
      );
    }
  }
}
