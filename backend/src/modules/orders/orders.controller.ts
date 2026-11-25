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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../../common/rate-limits';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Create a new order intake' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List orders with optional search, filters, and pagination',
  })
  findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get('track/:orderNumber')
  @Public()
  @Throttle({ default: RATE_LIMITS.publicTracking })
  @ApiOperation({
    summary: 'Public order tracking by order number (no auth required)',
  })
  trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.trackPublic(orderNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full order details by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update editable order metadata' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.update(id, updateOrderDto, user);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.LAUNDRY_STAFF,
    UserRole.DRIVER,
  )
  @ApiOperation({ summary: 'Advance order laundry stage / status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, userId);
  }
}
