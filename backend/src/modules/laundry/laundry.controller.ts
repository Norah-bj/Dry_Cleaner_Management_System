import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LaundryService } from './laundry.service';

@ApiTags('laundry')
@ApiBearerAuth()
@Controller('laundry')
export class LaundryController {
  constructor(private readonly laundryService: LaundryService) {}

  @Get('board')
  @ApiOperation({
    summary:
      'Get live laundry Kanban board with orders grouped by processing stage',
  })
  getBoard() {
    return this.laundryService.getBoard();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get stage counts distribution' })
  getMetrics() {
    return this.laundryService.getMetrics();
  }
}
