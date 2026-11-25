import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, ServiceTier } from '../enums/order-enums';
import { MaterialType } from '../entities/order-material.entity';

/**
 * One garment line. The price is NOT sent by the client: the server looks
 * up the item in the owner's price list at the order's service speed.
 */
export class CreateOrderItemDto {
  @ApiProperty({ description: 'Price list item UUID (GET /catalog/items)' })
  @IsUUID()
  serviceItemId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Small ink mark on collar' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderMaterialDto {
  @ApiProperty({ enum: MaterialType, example: MaterialType.HANGER })
  @IsEnum(MaterialType)
  materialType: MaterialType;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  /** Charged at zero when true (business rule #4). Otherwise the charge comes from Settings. */
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  customerProvided?: boolean;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ enum: ServiceTier, default: ServiceTier.STANDARD })
  @IsEnum(ServiceTier)
  @IsOptional()
  serviceTier?: ServiceTier;

  @ApiPropertyOptional({ enum: OrderStatus, default: OrderStatus.RECEIVED })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 'H-042' })
  @IsString()
  @IsOptional()
  storageHangerId?: string;

  @ApiPropertyOptional({ example: 'B-015' })
  @IsString()
  @IsOptional()
  storageBoxId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ example: '2026-09-16T17:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  expectedCompletion?: string;

  @ApiPropertyOptional({ example: 'Handle silk jacket with care' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ type: [CreateOrderMaterialDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderMaterialDto)
  materials?: CreateOrderMaterialDto[];
}
