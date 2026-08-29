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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

/**
 * RBAC per docs/design/PAGES.md's permission matrix (front-of-house
 * roles manage customers; everyone authenticated can look one up for
 * context - e.g. laundry staff confirming whose order they're holding).
 * Not an explicit client-confirmed rule - a judgment call, easy to
 * tighten later.
 */
const CAN_MANAGE_CUSTOMERS = [
  UserRole.SUPER_ADMIN,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
  UserRole.CASHIER,
];

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Roles(...CAN_MANAGE_CUSTOMERS)
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Roles(...CAN_MANAGE_CUSTOMERS)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }
}
