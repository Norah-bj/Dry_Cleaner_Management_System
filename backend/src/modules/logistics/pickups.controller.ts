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
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { QueryPickupsDto } from './dto/query-logistics.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('pickups')
@ApiBearerAuth()
@Controller('pickups')
export class PickupsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Request / schedule a garment pickup (open to public / customers)',
  })
  create(@Body() createPickupDto: CreatePickupDto) {
    return this.logisticsService.createPickup(createPickupDto);
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
  ) {
    return this.logisticsService.updatePickup(id, updatePickupDto);
  }
}
