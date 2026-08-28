import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User, UserRole } from './entities/user.entity';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await argon2.hash(input.password);
    const user = this.usersRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    });
    return this.usersRepository.save(user);
  }
}
