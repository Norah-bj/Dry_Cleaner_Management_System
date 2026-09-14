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
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-logistics.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Schedule a delivery for a processed order' })
  create(@Body() createDeliveryDto: CreateDeliveryDto) {
    return this.logisticsService.createDelivery(createDeliveryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all delivery requests with filters and pagination',
  })
  findAll(@Query() query: QueryDeliveriesDto) {
    return this.logisticsService.findAllDeliveries(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery request details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.logisticsService.findOneDelivery(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.DRIVER,
  )
  @ApiOperation({
    summary:
      'Update delivery status, driver assignment, or cash collectable',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
  ) {
    return this.logisticsService.updateDelivery(id, updateDeliveryDto);
  }
}
