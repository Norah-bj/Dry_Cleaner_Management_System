import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserRole } from './entities/user.entity';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

const CAN_MANAGE_STAFF = [UserRole.SUPER_ADMIN, UserRole.MANAGER];

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(...CAN_MANAGE_STAFF)
  @ApiOperation({ summary: 'All staff logins' })
  list() {
    return this.usersService.list();
  }

  @Get('drivers')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.CASHIER,
  )
  @ApiOperation({
    summary: 'Active drivers, for assigning pickups and deliveries',
  })
  drivers() {
    return this.usersService.listDrivers();
  }

  @Post()
  @Roles(...CAN_MANAGE_STAFF)
  @ApiOperation({ summary: 'Create a staff login' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.createByStaff(dto, actor);
  }

  @Patch(':id')
  @Roles(...CAN_MANAGE_STAFF)
  @ApiOperation({
    summary: 'Edit name/phone/role, or deactivate/reactivate a login',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Post(':id/reset-password')
  @Roles(...CAN_MANAGE_STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password for a staff member' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.resetPassword(id, dto.password, actor);
  }
}
