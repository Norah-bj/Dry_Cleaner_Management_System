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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  CreateInventoryItemDto,
  QueryInventoryItemsDto,
  QueryInventoryTransactionsDto,
  RecordInventoryTransactionDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

/** Per docs/design/PAGES.md RBAC matrix: Inventory full for owner/manager, view for laundry staff. */
const CAN_VIEW = [
  UserRole.SUPER_ADMIN,
  UserRole.MANAGER,
  UserRole.LAUNDRY_STAFF,
];
const CAN_MANAGE = [UserRole.SUPER_ADMIN, UserRole.MANAGER];

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  @Roles(...CAN_VIEW)
  @ApiOperation({
    summary:
      'Stock items with status (GOOD/LOW/OUT); status=LOW for the alert list',
  })
  findAll(@Query() query: QueryInventoryItemsDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('summary')
  @Roles(...CAN_VIEW)
  @ApiOperation({ summary: 'Counts of active, low and out-of-stock items' })
  summary() {
    return this.inventoryService.summary();
  }

  @Get('items/:id')
  @Roles(...CAN_VIEW)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post('items')
  @Roles(...CAN_MANAGE)
  @ApiOperation({
    summary: 'Add a stock item, optionally with its opening stock',
  })
  create(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.inventoryService.create(dto, userId);
  }

  @Patch('items/:id')
  @Roles(...CAN_MANAGE)
  @ApiOperation({
    summary:
      'Edit details or hide an item (quantity changes go through transactions)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(id, dto);
  }

  @Post('items/:id/transactions')
  @Roles(...CAN_MANAGE)
  @ApiOperation({
    summary:
      'Record a purchase, usage, or stock count; stock can never go below zero',
  })
  record(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordInventoryTransactionDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.inventoryService.record(id, dto, userId);
  }

  @Get('transactions')
  @Roles(...CAN_VIEW)
  @ApiOperation({ summary: 'Stock history, newest first' })
  transactions(@Query() query: QueryInventoryTransactionsDto) {
    return this.inventoryService.transactions(query);
  }
}
