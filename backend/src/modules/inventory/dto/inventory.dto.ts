import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MaterialType } from '../../orders/entities/order-material.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InventoryTransactionType } from '../entities/inventory-transaction.entity';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Plastic covers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Packaging' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string | null;

  @ApiPropertyOptional({ example: 'pcs', default: 'pcs' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ description: 'Show as Low at or below this level' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumStock?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplier?: string | null;

  @ApiPropertyOptional({
    enum: MaterialType,
    description: 'Orders using this packaging take it out of this stock',
  })
  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType | null;

  @ApiPropertyOptional({ description: 'Quantity on hand right now' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingStock?: number;
}

/** Quantity is never edited directly - use a transaction. */
export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumStock?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplier?: string | null;

  @ApiPropertyOptional({ enum: MaterialType })
  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * PURCHASE: add `quantity`. USAGE: remove `quantity`.
 * ADJUSTMENT (a stock count): set the level to `countedQuantity`; a note is
 * required so the reason is on record.
 */
export class RecordInventoryTransactionDto {
  @ApiProperty({ enum: InventoryTransactionType })
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @ApiPropertyOptional({ description: 'For PURCHASE and USAGE' })
  @ValidateIf(
    (o: RecordInventoryTransactionDto) =>
      o.type !== InventoryTransactionType.ADJUSTMENT,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({ description: 'For ADJUSTMENT: the counted quantity' })
  @ValidateIf(
    (o: RecordInventoryTransactionDto) =>
      o.type === InventoryTransactionType.ADJUSTMENT,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedQuantity?: number;

  @ApiPropertyOptional({ description: 'For PURCHASE: price paid per unit' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplier?: string;

  @ApiPropertyOptional({ description: 'Required for ADJUSTMENT' })
  @ValidateIf(
    (o: RecordInventoryTransactionDto) =>
      o.type === InventoryTransactionType.ADJUSTMENT || o.notes !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  notes?: string;
}

export class QueryInventoryTransactionsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ enum: InventoryTransactionType })
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  type?: InventoryTransactionType;
}

export class QueryInventoryItemsDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeInactive?: 'true' | 'false';

  @ApiPropertyOptional({ enum: ['LOW'] })
  @IsOptional()
  @IsIn(['LOW'])
  status?: 'LOW';
}
