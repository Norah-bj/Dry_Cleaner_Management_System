import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { PublicPickupRequestDto } from './dto/public-pickup-request.dto';
import { QueryPickupsDto } from './dto/query-logistics.dto';
import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../../common/rate-limits';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('pickups')
@ApiBearerAuth()
@Controller('pickups')
export class PickupsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Schedule a pickup for an existing customer (staff)',
  })
  create(@Body() createPickupDto: CreatePickupDto) {
    return this.logisticsService.createPickup(createPickupDto);
  }

  /**
   * Public customer page. Takes name/phone instead of a customer id so the
   * public can't attach pickups to arbitrary customer records.
   */
  @Post('request')
  @Public()
  @Throttle({ default: RATE_LIMITS.publicPickupRequest })
  @ApiOperation({
    summary: 'Customer pickup request from the public page (no login)',
  })
  requestPublic(@Body() dto: PublicPickupRequestDto) {
    return this.logisticsService.requestPickupPublic(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all pickup requests with filters and pagination',
  })
  findAll(@Query() query: QueryPickupsDto) {
    return this.logisticsService.findAllPickups(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pickup request details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.logisticsService.findOnePickup(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.DRIVER,
  )
  @ApiOperation({ summary: 'Update pickup status or driver assignment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePickupDto: UpdatePickupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.logisticsService.updatePickup(id, updatePickupDto, user);
  }
}
