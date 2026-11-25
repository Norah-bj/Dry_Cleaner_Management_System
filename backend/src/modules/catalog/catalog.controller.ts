import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../../common/rate-limits';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CatalogService } from './catalog.service';
import {
  CreateServiceItemDto,
  UpdateServiceItemDto,
} from './dto/service-item.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('items')
  @ApiOperation({
    summary: 'Price list (active items unless includeInactive=true)',
  })
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.catalogService.findAll(includeInactive ?? false);
  }

  @Post('items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a service to the price list' })
  create(
    @Body() dto: CreateServiceItemDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.catalogService.create(dto, userId);
  }

  @Patch('items/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Change a price, rename, or (de)activate an item' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceItemDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.catalogService.update(id, dto, userId);
  }

  @Get('public')
  @Public()
  @Throttle({ default: RATE_LIMITS.publicRead })
  @ApiOperation({ summary: 'Active price list for the customer page' })
  async findPublic() {
    const items = await this.catalogService.findAll(false);
    return items.map(
      ({ id, name, category, priceStandard, priceExpress, priceSameDay }) => ({
        id,
        name,
        category,
        priceStandard,
        priceExpress,
        priceSameDay,
      }),
    );
  }
}
