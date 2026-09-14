import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get(':driverId/tasks')
  @Public()
  @ApiOperation({
    summary:
      'Public driver task list for driver mobile web view (no auth barrier)',
  })
  getDriverTasks(@Param('driverId') driverId: string) {
    return this.logisticsService.getDriverTasks(driverId);
  }
}
