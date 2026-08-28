import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../modules/users/entities/user.entity';

/**
 * One-off bootstrap for the first SUPER_ADMIN account. There is no
 * user-management UI yet (that's the Employees module, a later phase),
 * so this is the only way to create a login until then - see
 * docs/KNOWN-ISSUES.md.
 *
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run seed
 */
async function seed() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD to seed the initial account.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.log(`User ${email} already exists - skipping.`);
  } else {
    await usersService.create({
      email,
      password,
      fullName,
      role: UserRole.SUPER_ADMIN,
    });
    console.log(`Created SUPER_ADMIN user ${email}.`);
  }

  await app.close();
}

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
