import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LogisticsService } from './logistics.service';

/**
 * Driver job lists. This used to be public (anyone with a driver id could
 * read customers' names, phones and addresses); drivers now sign in and
 * see only their own jobs.
 */
@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly logisticsService: LogisticsService) {}

  // Declared before ':driverId/tasks' so "me" isn't read as a driver id.
  @Get('me/tasks')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: "The signed-in driver's pickups and deliveries" })
  myTasks(@CurrentUser('id') driverId: string) {
    return this.logisticsService.getDriverTasks(driverId);
  }

  @Get(':driverId/tasks')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "A driver's jobs, for the dispatcher" })
  driverTasks(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.logisticsService.getDriverTasks(driverId);
  }
}
